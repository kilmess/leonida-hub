/**
 * LEONIDA VI HUB — GTA.wiki Editorial Style
 * Vanilla JavaScript — Full Data & UI Logic
 */

(function () {
  'use strict';

  // =====================================================
  // CONSTANTS
  // =====================================================
  const STORAGE_KEY = 'leonida_vi_saved';
  const LAUNCH_DATE = new Date('2026-11-19T00:00:00');

  // Category meta
  const CATEGORY_META = {
    'Ubicaciones': { id: 'ubicaciones', badgeClass: 'badge-ubicaciones', label: 'DISTRITO' },
    'Vehículos':   { id: 'vehiculos',   badgeClass: 'badge-vehiculos',   label: 'VEHÍCULO' },
    'Radios & Música': { id: 'musica',  badgeClass: 'badge-musica',      label: 'RADIO / MÚSICA' },
    'Trucos (19 Nov)': { id: 'trucos',  badgeClass: 'badge-trucos',      label: 'TRUCOS' },
    'Tips & FAQ': { id: 'faq',          badgeClass: 'badge-faq',         label: 'TIPS & FAQ' },
  };

  const CATALOG_HEADER_LABELS = {
    'Todos': 'Base de Datos de Trucos, Secretos &amp; Vehículos',
    'Ubicaciones': 'Distritos &amp; Zonas de Leonida — Confirmados',
    'Vehículos': 'Vehículos Confirmados en GTA VI',
    'Radios & Música': 'Emisoras &amp; Banda Sonora Oficial',
    'Trucos (19 Nov)': 'Base de Datos de Trucos — Se Desbloquean el 19 Nov 2026',
    'Tips & FAQ': 'Guía para Principiantes &amp; Preguntas Frecuentes',
  };

  // =====================================================
  // STATE
  // =====================================================
  let itemsData = [];
  let currentCategory = 'Todos';
  let searchQuery = '';
  let hideSaved = false;
  let savedItems = new Set();

  // =====================================================
  // DOM REFERENCES
  // =====================================================
  const itemsGrid        = document.getElementById('items-grid');
  const resultsCount     = document.getElementById('results-count');
  const emptyState       = document.getElementById('empty-state');
  const catalogTitle     = document.getElementById('catalog-title');
  const totalItemsCount  = document.getElementById('total-items-count');
  const hideSavedToggle  = document.getElementById('hide-saved-toggle');
  const resetMarksBtn    = document.getElementById('reset-marks-btn');
  const resetAllFiltersBtn = document.getElementById('reset-all-filters-btn');
  const toast            = document.getElementById('toast');
  const toastMessage     = document.getElementById('toast-message');
  const supportBtn       = document.getElementById('support-btn');
  const supportModal     = document.getElementById('support-modal');
  const closeModalBtn    = document.getElementById('close-modal-btn');

  // Search inputs (desktop & mobile)
  const searchInputDesktop = document.getElementById('search-input');
  const searchInputMobile  = document.getElementById('search-input-mobile');
  const clearSearchBtn     = document.getElementById('clear-search-btn');

  // Nav elements
  const topnavTabs       = document.getElementById('topnav-tabs');
  const sidebarNavBtns   = document.getElementById('sidebar-nav-buttons');

  // Countdown
  const cdDays  = document.getElementById('cd-days');
  const cdHours = document.getElementById('cd-hours');
  const cdMins  = document.getElementById('cd-mins');
  const cdSecs  = document.getElementById('cd-secs');

  // Sidebar counts
  const sidebarCounts = {
    'Todos':          document.getElementById('count-todos'),
    'Ubicaciones':    document.getElementById('count-ubicaciones'),
    'Vehículos':      document.getElementById('count-vehiculos'),
    'Radios & Música': document.getElementById('count-musica'),
    'Trucos (19 Nov)': document.getElementById('count-trucos'),
    'Tips & FAQ':     document.getElementById('count-faq'),
  };

  // =====================================================
  // LOCAL STORAGE
  // =====================================================
  function loadSaved() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) savedItems = new Set(parsed);
      }
    } catch (e) { savedItems = new Set(); }
  }

  function persistSaved() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...savedItems]));
    } catch (e) {}
    updateTotalCount();
  }

  // =====================================================
  // COUNTDOWN TIMER
  // =====================================================
  function tickCountdown() {
    if (!cdDays) return;
    const diff = LAUNCH_DATE - new Date();
    if (diff <= 0) {
      cdDays.textContent = '000'; cdHours.textContent = '00';
      cdMins.textContent = '00';  cdSecs.textContent = '00';
      return;
    }
    const s = Math.floor(diff / 1000);
    cdDays.textContent  = String(Math.floor(s / 86400)).padStart(3, '0');
    cdHours.textContent = String(Math.floor((s % 86400) / 3600)).padStart(2, '0');
    cdMins.textContent  = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    cdSecs.textContent  = String(s % 60).padStart(2, '0');
  }

  // =====================================================
  // TOAST
  // =====================================================
  let toastTimer = null;
  function showToast(msg) {
    if (toastTimer) clearTimeout(toastTimer);
    toastMessage.textContent = msg;
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  // =====================================================
  // DATA LOADING
  // =====================================================
  async function loadData() {
    try {
      resultsCount.textContent = 'Cargando base de datos...';
      const resp = await fetch('data.json');
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      itemsData = await resp.json();
      updateSidebarCounts();
      updateTotalCount();
      renderItems();
    } catch (err) {
      console.error('data.json error:', err);
      resultsCount.textContent = 'Error cargando la base de datos.';
      itemsGrid.innerHTML = `
        <div style="padding:20px; text-align:center; color:#f08080; border:1px solid #5c3636; border-radius:4px; background:#2a1a1a;">
          <strong>No se pudo cargar data.json</strong><br>
          <span style="font-size:11px; color:#888;">Verifica que el servidor local esté activo (puerto 8080).</span>
        </div>`;
    }
  }

  // =====================================================
  // SIDEBAR + HEADER COUNTS
  // =====================================================
  function updateSidebarCounts() {
    const counts = { 'Todos': itemsData.length, 'Ubicaciones': 0, 'Vehículos': 0, 'Radios & Música': 0, 'Trucos (19 Nov)': 0, 'Tips & FAQ': 0 };
    itemsData.forEach(item => { if (counts[item.category] !== undefined) counts[item.category]++; });
    Object.entries(sidebarCounts).forEach(([cat, el]) => { if (el) el.textContent = counts[cat] ?? '0'; });
  }

  function updateTotalCount() {
    if (totalItemsCount) totalItemsCount.textContent = itemsData.length;
  }

  // =====================================================
  // FILTERING
  // =====================================================
  function getFiltered() {
    const q = searchQuery.toLowerCase().trim();
    return itemsData.filter(item => {
      if (currentCategory !== 'Todos' && item.category !== currentCategory) return false;
      if (hideSaved && savedItems.has(item.id)) return false;
      if (q) {
        const hay = [item.title, item.effect, item.description, item.category, item.location, ...(item.tags || [])]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  // =====================================================
  // HTML HELPERS
  // =====================================================
  function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  function getCatBadge(item) {
    const meta = CATEGORY_META[item.category];
    if (!meta) return `<span class="item-cat-badge" style="background:rgba(90,80,110,0.4);color:#9b93ab;border:1px solid #3c344c;">${escHtml(item.category)}</span>`;
    return `<span class="item-cat-badge ${meta.badgeClass}">${escHtml(item.badge || meta.label)}</span>`;
  }

  // Format multi-line FAQ description (numbered steps)
  function formatFaqDescription(desc) {
    if (!desc) return '';
    return desc.split('\n').filter(l => l.trim()).map(line => `<p>${escHtml(line.trim())}</p>`).join('');
  }

  // =====================================================
  // RENDER: Normal catalog item
  // =====================================================
  function renderNormalCard(item) {
    const isSaved = savedItems.has(item.id);
    const isLocked = item.category === 'Trucos (19 Nov)';
    const confirmedDot = item.confirmed_in ? `<span class="item-confirmed"><span class="item-confirmed-dot"></span>${escHtml(item.confirmed_in)}</span>` : '';

    return `
      <div class="item-card" id="card-${item.id}" data-id="${item.id}">
        <div class="item-card-header">
          ${getCatBadge(item)}
          ${confirmedDot}
        </div>
        <div class="item-card-body">
          <div class="item-title">${escHtml(item.title)}</div>
          <div class="item-effect">${escHtml(item.effect)}</div>
          ${isLocked ? `
            <div class="item-locked-banner">
              🔒 <span>Trucos bloqueados — disponibles el <strong>19 de Noviembre de 2026</strong>.</span>
            </div>
          ` : ''}
          ${item.description && !isLocked ? `<div class="item-desc">${escHtml(item.description)}</div>` : ''}
          ${item.location ? `
            <div class="item-location">
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              ${escHtml(item.location)}
            </div>
          ` : ''}
        </div>
        <div class="item-card-footer">
          <label style="display:flex;align-items:center;gap:5px;font-size:11px;cursor:pointer;">
            <input type="checkbox" class="save-checkbox" data-id="${item.id}" ${isSaved ? 'checked' : ''} style="accent-color:#68b68d;width:12px;height:12px;">
            <span class="save-label" style="color:${isSaved ? '#68b68d' : '#6a6075'};font-weight:${isSaved ? '600' : '400'};">
              ${isSaved ? '✓ Guardado' : 'Guardar'}
            </span>
          </label>
          <button
            class="card-action-btn btn-share share-btn"
            data-id="${item.id}"
            data-title="${escHtml(item.title)}"
            data-summary="${escHtml(item.effect)}"
          >
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
            </svg>
            Compartir
          </button>
        </div>
      </div>
    `;
  }

  // =====================================================
  // RENDER: FAQ Accordion card
  // =====================================================
  function renderFaqCard(item) {
    const isSaved = savedItems.has(item.id);
    return `
      <div class="faq-card" id="card-${item.id}" data-id="${item.id}">
        <button class="faq-toggle" data-faq-id="${item.id}" aria-expanded="false">
          <span class="faq-toggle-icon">+</span>
          <span class="faq-toggle-content">
            <span class="faq-badge">${escHtml(item.badge || 'FAQ')}</span>
            <span class="faq-question">${escHtml(item.title)}</span>
          </span>
          <span class="faq-toggle-arrow">▼</span>
        </button>
        <div class="faq-answer" id="faq-answer-${item.id}">
          <div class="faq-answer-steps">${formatFaqDescription(item.description)}</div>
          <div class="faq-answer-footer">
            <label style="display:flex;align-items:center;gap:5px;font-size:11px;cursor:pointer;">
              <input type="checkbox" class="save-checkbox" data-id="${item.id}" ${isSaved ? 'checked' : ''} style="accent-color:#68b68d;width:12px;height:12px;">
              <span class="save-label" style="color:${isSaved ? '#68b68d' : '#6a6075'};font-weight:${isSaved ? '600' : '400'};">
                ${isSaved ? '✓ Guardado' : 'Guardar'}
              </span>
            </label>
            <button
              class="card-action-btn btn-share share-btn"
              data-id="${item.id}"
              data-title="${escHtml(item.title)}"
              data-summary="${escHtml(item.effect)}"
            >
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
              </svg>
              Compartir
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // =====================================================
  // RENDER ITEMS (main)
  // =====================================================
  function renderItems() {
    const filtered = getFiltered();
    const total = itemsData.length;
    const isFaqView = currentCategory === 'Tips & FAQ';

    // Update catalog header
    if (catalogTitle) {
      catalogTitle.innerHTML = CATALOG_HEADER_LABELS[currentCategory] || CATALOG_HEADER_LABELS['Todos'];
    }

    // Update results bar
    if (searchQuery.trim()) {
      resultsCount.innerHTML = `Mostrando <strong>${filtered.length}</strong> de ${total} para "<span class="results-text-accent">${escHtml(searchQuery)}</span>"`;
    } else if (currentCategory !== 'Todos') {
      resultsCount.innerHTML = `<strong style="color:#d4ccdb;">${currentCategory}</strong>: <strong>${filtered.length}</strong> registros`;
    } else {
      resultsCount.innerHTML = `<strong>${filtered.length}</strong> registros confirmados en la base de datos`;
    }

    if (filtered.length === 0) {
      itemsGrid.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    // Separate FAQ from regular items when viewing All
    let html = '';
    if (!isFaqView && currentCategory === 'Todos') {
      const regular = filtered.filter(i => i.type !== 'faq');
      const faqs = filtered.filter(i => i.type === 'faq');
      html += regular.map(item => renderNormalCard(item)).join('');
      if (faqs.length > 0) {
        html += `<div style="grid-column:1/-1; margin:10px 0 4px;">
          <div class="module-box" style="margin-bottom:0;"><div class="module-header"><h2>Guía para Principiantes &amp; FAQ</h2></div></div>
        </div>`;
        html += faqs.map(item => renderFaqCard(item)).join('');
      }
    } else if (isFaqView || (searchQuery && filtered.some(i => i.type === 'faq'))) {
      // Render FAQs as accordion, others as normal cards
      const faqs = filtered.filter(i => i.type === 'faq');
      const regular = filtered.filter(i => i.type !== 'faq');
      html += regular.map(item => renderNormalCard(item)).join('');
      html += faqs.map(item => renderFaqCard(item)).join('');
    } else {
      html = filtered.map(item => renderNormalCard(item)).join('');
    }

    itemsGrid.innerHTML = html;
  }

  // =====================================================
  // SHARE
  // =====================================================
  async function handleShare(title, summary, btn) {
    const url = window.location.href.split('#')[0];
    const text = `🌴 LEONIDA HUB — GTA 6\n${title}\n${summary}\n🔗 ${url}`;
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text); ok = true;
      }
    } catch (e) {}
    if (!ok) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
        document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (e) {}
    }
    const orig = btn.innerHTML;
    btn.textContent = '✓ ¡Copiado!';
    btn.classList.add('copied');
    showToast('¡Copiado para compartir!');
    setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 1800);
  }

  // =====================================================
  // ACTIVE CATEGORY — sync tabs and sidebar
  // =====================================================
  function setCategory(cat) {
    currentCategory = cat;

    // Sync top nav tabs
    document.querySelectorAll('#topnav-tabs .nav-tab').forEach(btn => {
      const tabCat = btn.getAttribute('data-category');
      btn.classList.toggle('active', tabCat === cat || (cat === 'Todos' && btn.dataset.tab === 'todos'));
      btn.setAttribute('aria-selected', btn.classList.contains('active') ? 'true' : 'false');
    });

    // Sync sidebar nav
    document.querySelectorAll('#sidebar-nav-buttons .sidebar-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-category') === cat);
    });

    renderItems();
  }

  // =====================================================
  // SEARCH SYNC (desktop ↔ mobile)
  // =====================================================
  function handleSearch(val) {
    searchQuery = val;
    // Sync both inputs
    if (searchInputDesktop && searchInputDesktop.value !== val) searchInputDesktop.value = val;
    if (searchInputMobile && searchInputMobile.value !== val) searchInputMobile.value = val;
    // Show/hide clear btn
    if (clearSearchBtn) clearSearchBtn.style.display = val ? 'flex' : 'none';
    renderItems();
  }

  // =====================================================
  // RESET ALL
  // =====================================================
  function resetAll() {
    handleSearch('');
    setCategory('Todos');
    if (hideSavedToggle) hideSavedToggle.checked = false;
    hideSaved = false;
  }

  // =====================================================
  // EVENT LISTENERS
  // =====================================================
  function setupListeners() {

    // Desktop search
    if (searchInputDesktop) {
      searchInputDesktop.addEventListener('input', e => handleSearch(e.target.value));
    }

    // Mobile search
    if (searchInputMobile) {
      searchInputMobile.addEventListener('input', e => handleSearch(e.target.value));
    }

    // Clear search
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => handleSearch(''));
    }

    // Top nav tabs
    if (topnavTabs) {
      topnavTabs.addEventListener('click', e => {
        const tab = e.target.closest('.nav-tab');
        if (!tab) return;
        const cat = tab.getAttribute('data-category');
        if (cat) setCategory(cat);
      });
    }

    // Sidebar nav
    if (sidebarNavBtns) {
      sidebarNavBtns.addEventListener('click', e => {
        const btn = e.target.closest('.sidebar-nav-item');
        if (!btn) return;
        const cat = btn.getAttribute('data-category');
        if (cat) setCategory(cat);
      });
    }

    // Hide saved toggle
    if (hideSavedToggle) {
      hideSavedToggle.addEventListener('change', e => {
        hideSaved = e.target.checked;
        renderItems();
      });
    }

    // Reset marks
    if (resetMarksBtn) {
      resetMarksBtn.addEventListener('click', () => {
        if (savedItems.size === 0) { showToast('No hay fichas guardadas.'); return; }
        if (confirm('¿Reiniciar todas las marcas de guardado?')) {
          savedItems.clear(); persistSaved(); renderItems();
          showToast('Marcas eliminadas');
        }
      });
    }

    // Reset all filters (empty state btn)
    if (resetAllFiltersBtn) {
      resetAllFiltersBtn.addEventListener('click', resetAll);
    }

    // Logo → reset
    const logoHome = document.getElementById('logo-home');
    if (logoHome) {
      logoHome.addEventListener('click', e => { e.preventDefault(); resetAll(); });
    }

    // Grid: delegated events (save checkbox, share btn, faq accordion)
    if (itemsGrid) {
      // Checkbox: save / unsave
      itemsGrid.addEventListener('change', e => {
        const cb = e.target.closest('.save-checkbox');
        if (!cb) return;
        const id = cb.getAttribute('data-id');
        if (cb.checked) {
          savedItems.add(id);
          showToast('Guardado en favoritos');
        } else {
          savedItems.delete(id);
        }
        persistSaved();

        // Update label inline
        const lbl = cb.parentElement.querySelector('.save-label');
        if (lbl) {
          lbl.textContent = cb.checked ? '✓ Guardado' : 'Guardar';
          lbl.style.color = cb.checked ? '#68b68d' : '#6a6075';
          lbl.style.fontWeight = cb.checked ? '600' : '400';
        }

        // Toggle card dim if hide-saved active
        if (hideSaved) renderItems();
      });

      // Share button
      itemsGrid.addEventListener('click', e => {
        const shareBtn = e.target.closest('.share-btn');
        if (shareBtn) {
          const title   = shareBtn.getAttribute('data-title');
          const summary = shareBtn.getAttribute('data-summary');
          handleShare(title, summary, shareBtn);
          return;
        }

        // FAQ accordion toggle
        const faqToggle = e.target.closest('.faq-toggle');
        if (faqToggle) {
          const id    = faqToggle.getAttribute('data-faq-id');
          const card  = document.getElementById(`card-${id}`);
          if (!card) return;
          const isOpen = card.classList.contains('open');
          // Close all others
          document.querySelectorAll('.faq-card.open').forEach(c => {
            c.classList.remove('open');
            const btn = c.querySelector('.faq-toggle');
            if (btn) btn.setAttribute('aria-expanded', 'false');
          });
          // Open clicked if was closed
          if (!isOpen) {
            card.classList.add('open');
            faqToggle.setAttribute('aria-expanded', 'true');
            // Smooth scroll to card on mobile
            if (window.innerWidth < 900) {
              setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
            }
          }
        }
      });
    }

    // Support modal
    if (supportBtn && supportModal && closeModalBtn) {
      supportBtn.addEventListener('click', () => supportModal.classList.add('open'));
      closeModalBtn.addEventListener('click', () => supportModal.classList.remove('open'));
      supportModal.addEventListener('click', e => {
        if (e.target === supportModal) supportModal.classList.remove('open');
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if (e.key === '/' && document.activeElement !== searchInputDesktop && document.activeElement !== searchInputMobile) {
        e.preventDefault();
        (searchInputDesktop || searchInputMobile)?.focus();
      }
      if (e.key === 'Escape') {
        if (supportModal?.classList.contains('open')) {
          supportModal.classList.remove('open');
        } else if (searchQuery) {
          handleSearch('');
        }
      }
    });
  }

  // =====================================================
  // ENTRY POINT
  // =====================================================
  function init() {
    loadSaved();
    setupListeners();
    tickCountdown();
    setInterval(tickCountdown, 1000);
    loadData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
