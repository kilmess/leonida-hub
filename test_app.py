import subprocess
import time
import json
import socket
import os
import sys
import base64
import urllib.request

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
USER_DATA = r"C:\Users\sebas\Desktop\leonida\test_chrome_profile"
PORT = 9222

print("Launching Headless Chrome on port", PORT)
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

class SimpleWS:
    def __init__(self, ws_url):
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
        
        frame = bytearray()
        frame.append(0x81)
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
        header = self.sock.recv(2)
        if not header:
            return None
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
    targets = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json").read())
    ws_url = targets[0]["webSocketDebuggerUrl"]
    print("Connecting to CDP target:", ws_url)
    ws = SimpleWS(ws_url)

    ws.send_cmd("Runtime.enable")
    ws.send_cmd("Page.enable")

    # Mobile viewport
    ws.call("Emulation.setDeviceMetricsOverride", {
        "width": 393,
        "height": 852,
        "deviceScaleFactor": 2.0,
        "mobile": True
    })

    print("\n[TEST 1] Loading http://localhost:8080/index.html...")
    ws.call("Page.navigate", {"url": "http://localhost:8080/index.html"})
    time.sleep(2)

    title = ws.eval("document.title")
    print("Title:", title)
    assert "LEONIDA" in title

    # Test Phone Status Bar
    phone_time = ws.eval("document.getElementById('phone-clock').textContent.trim()")
    print("Phone status bar time:", phone_time)
    assert ":" in phone_time

    # Test Countdown Timer
    cd_days = ws.eval("document.getElementById('cd-days').textContent.trim()")
    cd_hours = ws.eval("document.getElementById('cd-hours').textContent.trim()")
    cd_mins = ws.eval("document.getElementById('cd-mins').textContent.trim()")
    cd_secs = ws.eval("document.getElementById('cd-secs').textContent.trim()")
    print(f"Countdown: {cd_days}d {cd_hours}h {cd_mins}m {cd_secs}s")
    assert int(cd_days) > 0, "Countdown days should be greater than 0!"

    # Test Ad Slots Hidden
    ad_top_display = ws.eval("window.getComputedStyle(document.getElementById('ad-slot-top')).display")
    ad_bottom_display = ws.eval("window.getComputedStyle(document.getElementById('ad-slot-bottom')).display")
    print(f"Ad slots computed display: TOP='{ad_top_display}', BOTTOM='{ad_bottom_display}'")
    assert ad_top_display == 'none', "AD_SLOT_TOP should be hidden by default!"
    assert ad_bottom_display == 'none', "AD_SLOT_BOTTOM should be hidden by default!"

    # Test Total Cards Count
    card_count = ws.eval("document.querySelectorAll('#items-grid article').length")
    print(f"Rendered cards count: {card_count}")
    assert card_count == 8, f"Expected 8 cards, got {card_count}"

    # Test Categories
    categories = ws.eval("""
      Array.from(document.querySelectorAll('#category-filters .filter-pill')).map(p => ({
        category: p.getAttribute('data-category'),
        count: p.querySelector('.count-badge').textContent.trim()
      }))
    """)
    print("Categories:", categories)

    # Test Filtering: Radios & Música
    print("\n[TEST 2] Testing Filter: Radios & Música...")
    ws.eval("document.querySelector('[data-category=\"Radios & Música\"]').click()")
    time.sleep(0.4)
    music_cards = ws.eval("document.querySelectorAll('#items-grid article').length")
    print(f"Music cards visible: {music_cards}")
    assert music_cards == 2, f"Expected 2 music cards, got {music_cards}"

    # Test Filtering: Trucos (19 Nov)
    print("\n[TEST 3] Testing Filter: Trucos (19 Nov)...")
    ws.eval("document.querySelector('[data-category=\"Trucos (19 Nov)\"]').click()")
    time.sleep(0.4)
    cheat_cards = ws.eval("document.querySelectorAll('#items-grid article').length")
    print(f"Trucos cards visible: {cheat_cards}")
    assert cheat_cards == 1, f"Expected 1 locked cheat card, got {cheat_cards}"

    # Reset to Todos
    ws.eval("document.querySelector('[data-category=\"Todos\"]').click()")
    time.sleep(0.4)

    # Test Search
    print("\n[TEST 4] Testing Search for 'Petty'...")
    ws.eval("""
      const input = document.getElementById('search-input');
      input.value = 'Petty';
      input.dispatchEvent(new Event('input'));
    """)
    time.sleep(0.4)
    petty_cards = ws.eval("document.querySelectorAll('#items-grid article').length")
    petty_title = ws.eval("document.querySelector('#items-grid article h2').textContent.trim()")
    print(f"Search 'Petty': found {petty_cards} card: '{petty_title}'")
    assert petty_cards == 1
    assert "Petty" in petty_title

    # Clear search
    ws.eval("document.getElementById('clear-search-btn').click()")
    time.sleep(0.4)

    # Test Share Button
    print("\n[TEST 5] Testing 'Compartir' Button & Toast...")
    ws.eval("""
      const shareBtn = document.querySelector('#items-grid article .share-btn');
      shareBtn.click();
    """)
    time.sleep(0.3)
    toast_visible = ws.eval("document.getElementById('toast').classList.contains('show')")
    toast_msg = ws.eval("document.getElementById('toast-message').textContent.trim()")
    print(f"Toast visible: {toast_visible}, message: '{toast_msg}'")
    assert toast_visible is True, "Toast should be visible"
    assert "compartir" in toast_msg.lower() or "copiado" in toast_msg.lower()

    # Capture Mobile Screenshot
    print("\n[TEST 6] Capturing Mobile and Desktop screenshots...")
    screenshot_data = ws.call("Page.captureScreenshot", {"format": "png"})
    with open("mobile_preview.png", "wb") as f:
        f.write(base64.b64decode(screenshot_data["data"]))
    print("Saved mobile_preview.png (393x852)")

    # Desktop Screenshot
    ws.call("Emulation.setDeviceMetricsOverride", {
        "width": 1280,
        "height": 900,
        "deviceScaleFactor": 1.0,
        "mobile": False
    })
    time.sleep(0.5)
    desktop_data = ws.call("Page.captureScreenshot", {"format": "png"})
    with open("desktop_preview.png", "wb") as f:
        f.write(base64.b64decode(desktop_data["data"]))
    print("Saved desktop_preview.png (1280x900)")

    print("\n==========================================")
    print(">>> ALL POLISHING VERIFICATION TESTS PASSED! <<<")
    print("==========================================")

finally:
    chrome_proc.terminate()
