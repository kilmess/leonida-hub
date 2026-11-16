import subprocess
import time
import json
import socket
import os
import sys
import base64
import urllib.request

# Start Chrome in headless mode with remote debugging
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
USER_DATA = r"C:\Users\sebas\Desktop\leonida\test_chrome_profile"
PORT = 9222

print("Starting Headless Chrome on port", PORT)
chrome_proc = subprocess.Popen([
    CHROME_PATH,
    "--headless=new",
    f"--remote-debugging-port={PORT}",
    f"--user-data-dir={USER_DATA}",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank"
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

time.sleep(2)

# Simple WebSocket client using standard socket
class SimpleWS:
    def __init__(self, ws_url):
        # ws_url: ws://127.0.0.1:9222/devtools/page/...
        from urllib.parse import urlparse
        parsed = urlparse(ws_url)
        self.host = parsed.hostname
        self.port = parsed.port or 80
        self.path = parsed.path + ('?' + parsed.query if parsed.query else '')
        self.sock = socket.create_connection((self.host, self.port))
        self.handshake()
        self.msg_id = 0

    def handshake(self):
        sec_key = base64.b64encode(os.urandom(16)).decode('utf-8')
        headers = [
            f"GET {self.path} HTTP/1.1",
            f"Host: {self.host}:{self.port}",
            "Upgrade: websocket",
            "Connection: Upgrade",
            f"Sec-WebSocket-Key: {sec_key}",
            "Sec-WebSocket-Version: 13",
            "\r\n"
        ]
        self.sock.sendall("\r\n".join(headers).encode('utf-8'))
        resp = b""
        while b"\r\n\r\n" not in resp:
            resp += self.sock.recv(1024)
        if b"101" not in resp:
            raise RuntimeError(f"WebSocket handshake failed: {resp.decode('utf-8', errors='ignore')}")

    def send_cmd(self, method, params=None):
        self.msg_id += 1
        msg = {"id": self.msg_id, "method": method}
        if params:
            msg["params"] = params
        payload = json.dumps(msg).encode('utf-8')
        
        # Frame RFC 6455 (client to server masked)
        frame = bytearray()
        frame.append(0x81) # fin + text opcode
        length = len(payload)
        mask_key = os.urandom(4)
        if length <= 125:
            frame.append(0x80 | length)
        elif length <= 65535:
            frame.append(0x80 | 126)
            frame.extend(length.to_bytes(2, 'big'))
        else:
            frame.append(0x80 | 127)
            frame.extend(length.to_bytes(8, 'big'))
        frame.extend(mask_key)
        
        masked = bytearray(len(payload))
        for i in range(len(payload)):
            masked[i] = payload[i] ^ mask_key[i % 4]
        frame.extend(masked)
        
        self.sock.sendall(frame)
        return self.msg_id

    def recv_msg(self):
        # Read header
        header = self.sock.recv(2)
        if not header:
            return None
        fin = (header[0] & 0x80) != 0
        opcode = header[0] & 0x0F
        masked = (header[1] & 0x80) != 0
        payload_len = header[1] & 0x7F
        
        if payload_len == 126:
            payload_len = int.from_bytes(self.sock.recv(2), 'big')
        elif payload_len == 127:
            payload_len = int.from_bytes(self.sock.recv(8), 'big')
            
        mask = b""
        if masked:
            mask = self.sock.recv(4)
            
        data = bytearray()
        while len(data) < payload_len:
            chunk = self.sock.recv(payload_len - len(data))
            if not chunk:
                break
            data.extend(chunk)
            
        if masked:
            for i in range(len(data)):
                data[i] ^= mask[i % 4]
                
        return json.loads(data.decode('utf-8', errors='ignore'))

    def call(self, method, params=None, timeout=5.0):
        target_id = self.send_cmd(method, params)
        start = time.time()
        while time.time() - start < timeout:
            msg = self.recv_msg()
            if msg and msg.get("id") == target_id:
                return msg.get("result", {})
        raise TimeoutError(f"Timed out waiting for response to {method}")

    def eval(self, expr):
        res = self.call("Runtime.evaluate", {"expression": expr, "returnByValue": True})
        if "exceptionDetails" in res:
            raise RuntimeError(f"JS Exception: {res['exceptionDetails']}")
        return res.get("result", {}).get("value")

try:
    # 1. Connect to Chrome target
    targets = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json").read())
    ws_url = targets[0]["webSocketDebuggerUrl"]
    print("Connecting to CDP target:", ws_url)
    ws = SimpleWS(ws_url)

    # Enable Runtime and Page
    ws.send_cmd("Runtime.enable")
    ws.send_cmd("Page.enable")

    # Set mobile viewport emulation (iPhone 14 Pro: 393 x 852)
    ws.call("Emulation.setDeviceMetricsOverride", {
        "width": 393,
        "height": 852,
        "deviceScaleFactor": 2.0,
        "mobile": True
    })

    # Navigate to app
    print("\n[TEST 1] Navigating to http://localhost:8080/index.html...")
    ws.call("Page.navigate", {"url": "http://localhost:8080/index.html"})
    time.sleep(2)

    # Verify no console errors logged
    title = ws.eval("document.title")
    print("Page title:", title)
    assert "LEONIDA" in title, "Title mismatch!"

    # Count loaded cards
    card_count = ws.eval("document.querySelectorAll('#items-grid article').length")
    print(f"Initial rendered cards count: {card_count}")
    assert card_count == 8, f"Expected 8 cards, got {card_count}"

    # Verify Categories and Counts
    cat_badges = ws.eval("""
      Array.from(document.querySelectorAll('#category-filters .filter-pill')).map(p => ({
        category: p.getAttribute('data-category'),
        count: p.querySelector('.count-badge').textContent.trim()
      }))
    """)
    print("Category tabs loaded:", cat_badges)

    # [TEST 2] Category Filter Test
    print("\n[TEST 2] Testing Category Filtering...")
    ws.eval("""
      const ps5Tab = document.querySelector('[data-category="Trucos PS5"]');
      ps5Tab.click();
    """)
    time.sleep(0.5)
    ps5_cards = ws.eval("document.querySelectorAll('#items-grid article').length")
    active_cat = ws.eval("document.querySelector('.filter-pill.active').getAttribute('data-category')")
    print(f"Filtered by 'Trucos PS5': active tab='{active_cat}', visible cards={ps5_cards}")
    assert active_cat == "Trucos PS5", "Active category tab mismatch!"
    assert ps5_cards == 2, f"Expected 2 PS5 cards, got {ps5_cards}"

    # Test 'Secretos' category
    ws.eval("""
      const secTab = document.querySelector('[data-category="Secretos"]');
      secTab.click();
    """)
    time.sleep(0.5)
    sec_cards = ws.eval("document.querySelectorAll('#items-grid article').length")
    print(f"Filtered by 'Secretos': visible cards={sec_cards}")
    assert sec_cards == 2, f"Expected 2 Secretos cards, got {sec_cards}"

    # Reset to 'Todos'
    ws.eval("""
      const allTab = document.querySelector('[data-category="Todos"]');
      allTab.click();
    """)
    time.sleep(0.5)
    all_cards = ws.eval("document.querySelectorAll('#items-grid article').length")
    print(f"Reset to 'Todos': visible cards={all_cards}")
    assert all_cards == 8, f"Expected 8 cards on reset, got {all_cards}"

    # [TEST 3] Real-time Search Test
    print("\n[TEST 3] Testing Instant Search...")
    ws.eval("""
      const input = document.getElementById('search-input');
      input.value = 'Buzzard';
      input.dispatchEvent(new Event('input'));
    """)
    time.sleep(0.5)
    search_cards = ws.eval("document.querySelectorAll('#items-grid article').length")
    search_card_title = ws.eval("document.querySelector('#items-grid article h2').textContent.trim()")
    print(f"Search for 'Buzzard': found {search_cards} card: '{search_card_title}'")
    assert search_cards == 1, f"Expected 1 card for 'Buzzard', got {search_cards}"
    assert "Buzzard" in search_card_title

    # Test Search clear
    ws.eval("""
      const clearBtn = document.getElementById('clear-search-btn');
      clearBtn.click();
    """)
    time.sleep(0.5)
    cleared_cards = ws.eval("document.querySelectorAll('#items-grid article').length")
    print(f"After clearing search: visible cards={cleared_cards}")
    assert cleared_cards == 8, f"Expected 8 cards after clearing search, got {cleared_cards}"

    # [TEST 4] Checkbox & LocalStorage Persistence Test
    print("\n[TEST 4] Testing 'Completado/Usado' Checkbox & LocalStorage...")
    # Clean storage first
    ws.eval("localStorage.clear()")
    
    # Check the first item
    first_item_id = ws.eval("document.querySelector('#items-grid article').getAttribute('data-id')")
    print(f"Toggling completion checkbox for item: '{first_item_id}'")
    
    ws.eval(f"""
      const cb = document.querySelector('#card-{first_item_id} input.completed-checkbox');
      cb.checked = true;
      cb.dispatchEvent(new Event('change', {{ bubbles: true }}));
    """)
    time.sleep(0.5)

    stored_items = ws.eval("JSON.parse(localStorage.getItem('leonida_vi_completed_items') || '[]')")
    print("LocalStorage stored items:", stored_items)
    assert first_item_id in stored_items, "Item ID was not persisted in LocalStorage!"

    card_has_class = ws.eval(f"document.getElementById('card-{first_item_id}').classList.contains('is-completed')")
    print(f"Card has '.is-completed' class: {card_has_class}")
    assert card_has_class is True, "Card missing 'is-completed' styling class!"

    # Reload page to verify persistence
    print("Reloading page to test persistence across page loads...")
    ws.call("Page.reload")
    time.sleep(2)

    persisted_items = ws.eval("JSON.parse(localStorage.getItem('leonida_vi_completed_items') || '[]')")
    persisted_cb_checked = ws.eval(f"document.querySelector('#card-{first_item_id} input.completed-checkbox').checked")
    persisted_card_class = ws.eval(f"document.getElementById('card-{first_item_id}').classList.contains('is-completed')")
    print(f"After reload: checkbox checked={persisted_cb_checked}, card is-completed={persisted_card_class}")
    assert persisted_cb_checked is True, "Checkbox state was lost after reload!"
    assert persisted_card_class is True, "Card completion visual styling lost after reload!"

    # [TEST 5] Copy Code Button Test
    print("\n[TEST 5] Testing 'Copiar codigo' button & feedback...")
    ws.eval("""
      const copyBtn = document.querySelector('#items-grid article .copy-btn');
      copyBtn.click();
    """)
    time.sleep(0.3)
    btn_text = ws.eval("document.querySelector('#items-grid article .copy-btn').textContent.trim()")
    toast_visible = ws.eval("document.getElementById('toast').classList.contains('show')")
    toast_msg = ws.eval("document.getElementById('toast-message').textContent.trim()")
    print(f"Button text after click: '{btn_text.encode('ascii', 'ignore').decode()}'")
    print(f"Toast visible: {toast_visible}")
    assert "Copiado" in btn_text, f"Expected button to show 'Copiado', got '{btn_text}'"
    assert toast_visible is True, "Toast should be shown!"

    # [TEST 6] Support Modal Test
    print("\n[TEST 6] Testing Support Modal...")
    modal_initially_hidden = ws.eval("document.getElementById('support-modal').classList.contains('hidden')")
    assert modal_initially_hidden is True, "Modal should be initially hidden"

    ws.eval("document.getElementById('support-btn').click()")
    time.sleep(0.3)
    modal_opened = not ws.eval("document.getElementById('support-modal').classList.contains('hidden')")
    print(f"Support modal opened: {modal_opened}")
    assert modal_opened is True, "Support modal failed to open!"

    ws.eval("document.getElementById('close-modal-btn').click()")
    time.sleep(0.3)
    modal_closed = ws.eval("document.getElementById('support-modal').classList.contains('hidden')")
    print(f"Support modal closed: {modal_closed}")
    assert modal_closed is True, "Support modal failed to close!"

    # [TEST 7] Ad Slots Verification
    print("\n[TEST 7] Verifying Ad Slots...")
    ad_top_exists = ws.eval("document.querySelector('section[aria-label=\"Espacio Publicitario Superior\"]') !== null")
    ad_bottom_exists = ws.eval("document.querySelector('section[aria-label=\"Espacio Publicitario Inferior\"]') !== null")
    print(f"AD_SLOT_TOP exists in DOM: {ad_top_exists}")
    print(f"AD_SLOT_BOTTOM exists in DOM: {ad_bottom_exists}")
    assert ad_top_exists and ad_bottom_exists, "Ad slots missing!"

    # [TEST 8] Mobile & Desktop Visual Captures
    print("\n[TEST 8] Capturing screenshots for visual verification...")
    # Mobile screenshot
    screenshot_data = ws.call("Page.captureScreenshot", {"format": "png"})
    with open("mobile_preview.png", "wb") as f:
        f.write(base64.b64decode(screenshot_data["data"]))
    print("Saved mobile_preview.png (393x852)")

    # Desktop screenshot
    ws.call("Emulation.setDeviceMetricsOverride", {
        "width": 1280,
        "height": 900,
        "deviceScaleFactor": 1.0,
        "mobile": False
    })
    time.sleep(0.5)
    desktop_screenshot_data = ws.call("Page.captureScreenshot", {"format": "png"})
    with open("desktop_preview.png", "wb") as f:
        f.write(base64.b64decode(desktop_screenshot_data["data"]))
    print("Saved desktop_preview.png (1280x900)")

    print("\n==========================================")
    print(">>> ALL VERIFICATION TESTS PASSED 100%! <<<")
    print("==========================================")

finally:
    chrome_proc.terminate()
    print("Headless Chrome process terminated.")
