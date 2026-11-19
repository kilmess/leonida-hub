/**
 * LEONIDA VI HUB — Full-Width Layout
 * Vanilla JS — Zero emojis, single search input, FAQ 2-col grid
 */

(function () {
  'use strict';

  // =====================================================
  // CONSTANTS
  // =====================================================
  const STORAGE_KEY = 'leonida_vi_saved';
  const LAUNCH_DATE = new Date('2026-11-19T00:00:00');

  const CATEGORY_META = {
    'Ubicaciones':     { badgeClass: 'badge-ubicaciones', stripClass: 'strip-ubicaciones', label: 'DISTRITO' },
    'Vehículos':       { badgeClass: 'badge-vehiculos',   stripClass: 'strip-vehiculos',   label: 'VEHÍCULO' },
    'Radios & Música': { badgeClass: 'badge-musica',      stripClass: 'strip-musica',      label: 'RADIO' },
    'Cheats':          { badgeClass: 'badge-cheats',      stripClass: 'strip-cheats',      label: 'CHEATS' },
    'Tips & FAQ':      { badgeClass: 'badge-faq',         stripClass: 'strip-faq',         label: 'FAQ' },
  };

  // =====================================================
  // STATE
  // =====================================================
  let itemsData      = [];
  let currentCat     = 'Todos';
  let searchQuery    = '';
  let hideSaved      = false;
  let savedItems     = new Set();

  // =====================================================
  // DOM REFERENCES
  // =====================================================
  const itemsGrid        = document.getElementById('items-grid');
  const faqGrid          = document.getElementById('faq-grid');
  const emptyState       = document.getElementById('empty-state');
  const resetAllFiltersBtn = document.getElementById('reset-all-filters-btn');
  const toast            = document.getElementById('toast');
  const toastMessage     = document.getElementById('toast-message');
  const supportBtn       = document.getElementById('support-btn');
  const supportModal     = document.getElementById('support-modal');
  const closeModalBtn    = document.getElementById('close-modal-btn');

  // Single desktop search + mobile search
  const searchInputDesktop = document.getElementById('search-input');
  const searchInputMobile  = document.getElementById('search-input-mobile');
  const clearSearchBtn     = document.getElementById('clear-search-btn');

  const topnavTabs = document.getElementById('topnav-tabs');

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
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...savedItems])); } catch (e) {}
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
      const resp = await fetch('data.json');
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      itemsData = await resp.json();
      renderItems();
    } catch (err) {
      console.error('data.json error:', err);
      itemsGrid.innerHTML = `
        <div style="padding:24px;text-align:center;color:#f08080;border:1px solid #5c3636;border-radius:4px;background:#2a1a1a;grid-column:1/-1;">
          <strong>No se pudo cargar data.json</strong><br>
          <span style="font-size:11px;color:#888;">Verifica que el servidor local este activo.</span>
        </div>`;
    }
  }

  // =====================================================
  // HTML ESCAPE
  // =====================================================
  function esc(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
              .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  // =====================================================
  // FILTERING
  // =====================================================
  function getFiltered() {
    const q = searchQuery.toLowerCase().trim();
    return itemsData.filter(item => {
      if (currentCat !== 'Todos' && item.category !== currentCat) return false;
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
  // BADGE HELPERS
  // =====================================================
  function getCatBadge(item) {
    const meta = CATEGORY_META[item.category];
    const cls  = meta ? meta.badgeClass : 'badge-locked';
    const lbl  = item.badge || (meta ? meta.label : item.category);
    return `<span class="item-cat-badge ${cls}">${esc(lbl)}</span>`;
  }

  function getCatStrip(item) {
    const meta = CATEGORY_META[item.category];
    return `<div class="card-cat-strip ${meta ? meta.stripClass : 'strip-default'}"></div>`;
  }

  // Format multi-line FAQ steps
  function formatFaqSteps(desc) {
    if (!desc) return '';
    return desc.split('\n').filter(l => l.trim())
      .map(line => `<p>${esc(line.trim())}</p>`).join('');
  }

  // Save button HTML
  function saveBtnHtml(id) {
    const isSaved = savedItems.has(id);
    return `
      <button class="card-action-btn btn-save save-btn ${isSaved ? 'saved' : ''}" data-id="${id}">
        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
        </svg>
        <span class="save-label">${isSaved ? 'GUARDADO' : 'GUARDAR'}</span>
      </button>`;
  }

  // Share button HTML
  function shareBtnHtml(id, title, summary) {
    return `
      <button class="card-action-btn btn-share share-btn" data-id="${id}"
        data-title="${esc(title)}" data-summary="${esc(summary)}">
        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342
               m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316
               m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684z
               m0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
        </svg>
        COMPARTIR
      </button>`;
  }

  // =====================================================
  // RENDER: Normal card (clean — no italic box)
  // =====================================================
  function renderNormalCard(item) {
    const isLocked  = false
    const locationHtml = item.location ? `
      <div class="item-location">
        <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
        ${esc(item.location)}
      </div>` : '';

    return `
      <div class="item-card" id="card-${item.id}" data-id="${item.id}">
        ${getCatStrip(item)}
        <div class="card-top">
          ${getCatBadge(item)}
        </div>
        <div class="card-body">
          <div class="item-title">${esc(item.title)}</div>
          <div class="item-effect">${esc(item.effect)}</div>
          ${lockedBanner}
          ${locationHtml}
        </div>
        <div class="card-footer">
          ${saveBtnHtml(item.id)}
          ${shareBtnHtml(item.id, item.title, item.effect)}
        </div>
      </div>`;
  }

  // =====================================================
  // RENDER: FAQ Accordion card
  // =====================================================
  function renderFaqCard(item) {
    return `
      <div class="faq-card" id="card-${item.id}" data-id="${item.id}">
        <button class="faq-toggle" data-faq-id="${item.id}" aria-expanded="false">
          <span class="faq-toggle-icon">+</span>
          <span class="faq-toggle-content">
            <span class="faq-badge">${esc(item.badge || 'FAQ')}</span>
            <span class="faq-question">${esc(item.title)}</span>
          </span>
          <span class="faq-toggle-arrow">&#9660;</span>
        </button>
        <div class="faq-answer" id="faq-answer-${item.id}">
          <div class="faq-answer-steps">${formatFaqSteps(item.description)}</div>
          <div class="faq-answer-footer">
            ${saveBtnHtml(item.id)}
            ${shareBtnHtml(item.id, item.title, item.effect)}
          </div>
        </div>
      </div>`;
  }

  // =====================================================
  // RENDER ITEMS (main)
  // =====================================================
  function renderItems() {
    const filtered = getFiltered();
    const total    = itemsData.length;
    const isFaqView = currentCat === 'Tips & FAQ';

    // Empty state
    if (filtered.length === 0) {
      itemsGrid.innerHTML = '';
      if (faqGrid) faqGrid.innerHTML = '';
      itemsGrid.style.display   = 'none';
      if (faqGrid) faqGrid.style.display = 'none';
      emptyState.style.display  = 'block';
      return;
    }

    emptyState.style.display = 'none';

    if (isFaqView) {
      // FAQ view: use faq-grid (2 col), hide items-grid
      itemsGrid.style.display = 'none';
      itemsGrid.innerHTML = '';
      if (faqGrid) {
        faqGrid.style.display = 'grid';
        faqGrid.innerHTML = filtered.map(item =>
          item.type === 'faq' ? renderFaqCard(item) : renderNormalCard(item)
        ).join('');
      }
    } else {
      // Normal view: use catalog-grid (3-4 col)
      if (faqGrid) { faqGrid.style.display = 'none'; faqGrid.innerHTML = ''; }
      itemsGrid.style.display = 'grid';

      const regular = filtered.filter(i => i.type !== 'faq');
      const faqs    = filtered.filter(i => i.type === 'faq');

      let html = regular.map(item => renderNormalCard(item)).join('');

      // In "Todos" or search, append FAQs with separator
      if (faqs.length > 0) {
        html += `
          <div style="grid-column:1/-1; margin:16px 0 4px;">
            <div style="background:var(--header-bar-bg);border-radius:var(--radius-sm);
              padding:5px 12px;display:inline-block;">
              <span style="font-family:var(--font-title);font-weight:800;font-size:12px;
                letter-spacing:.08em;text-transform:uppercase;color:var(--header-bar-text);">
                GUÍA PARA PRINCIPIANTES & PREGUNTAS FRECUENTES
              </span>
            </div>
          </div>
          <div style="grid-column:1/-1;" id="faq-inline-wrapper">
            <div class="faq-grid" id="faq-inline">
              ${faqs.map(item => renderFaqCard(item)).join('')}
            </div>
          </div>`;
      }

      itemsGrid.innerHTML = html;
    }
  }

  // =====================================================
  // SHARE
  // =====================================================
  async function handleShare(title, summary, btn) {
    const url  = window.location.href.split('#')[0];
    const text = `LEONIDA HUB — GTA 6\n${title}\n${summary}\n${url}`;
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
    btn.innerHTML = `<svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
      COPIADO`;
    btn.classList.add('copied');
    showToast('Copiado para compartir');
    setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 1800);
  }

  // =====================================================
  // SET CATEGORY — syncs top nav tabs
  // =====================================================
  function setCategory(cat) {
    currentCat = cat;
    document.querySelectorAll('#topnav-tabs .nav-tab').forEach(btn => {
      const c = btn.getAttribute('data-category');
      const isActive = c === cat;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    renderItems();
  }

  // =====================================================
  // SEARCH HANDLER
  // =====================================================
  function handleSearch(val) {
    searchQuery = val;
    if (searchInputDesktop && searchInputDesktop.value !== val) searchInputDesktop.value = val;
    if (searchInputMobile  && searchInputMobile.value  !== val) searchInputMobile.value  = val;
    if (clearSearchBtn) clearSearchBtn.style.display = val ? 'flex' : 'none';
    renderItems();
  }

  function resetAll() {
    handleSearch('');
    setCategory('Todos');
    hideSaved = false;
  }

  // =====================================================
  // SAVE BUTTON HANDLER (button, not checkbox)
  // =====================================================
  function handleSaveToggle(btn) {
    const id = btn.getAttribute('data-id');
    if (!id) return;
    if (savedItems.has(id)) {
      savedItems.delete(id);
      btn.classList.remove('saved');
      btn.querySelector('.save-label').textContent = 'GUARDAR';
      showToast('Eliminado de favoritos');
    } else {
      savedItems.add(id);
      btn.classList.add('saved');
      btn.querySelector('.save-label').textContent = 'GUARDADO';
      showToast('Guardado en favoritos');
    }
    persistSaved();
    if (hideSaved) renderItems();
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

    // Reset all filters (empty state btn)
    if (resetAllFiltersBtn) {
      resetAllFiltersBtn.addEventListener('click', resetAll);
    }

    // Logo → reset
    const logoHome = document.getElementById('logo-home');
    if (logoHome) {
      logoHome.addEventListener('click', e => { e.preventDefault(); resetAll(); });
    }

    // Grid: delegated events (save btn, share btn, faq accordion)
    function setupGridListeners(grid) {
      if (!grid) return;
      grid.addEventListener('click', e => {
        // Save button
        const saveBtn = e.target.closest('.save-btn');
        if (saveBtn) { handleSaveToggle(saveBtn); return; }

        // Share button
        const shareBtn = e.target.closest('.share-btn');
        if (shareBtn) {
          handleShare(
            shareBtn.getAttribute('data-title'),
            shareBtn.getAttribute('data-summary'),
            shareBtn
          );
          return;
        }

        // FAQ accordion toggle
        const faqToggle = e.target.closest('.faq-toggle');
        if (faqToggle) {
          const id   = faqToggle.getAttribute('data-faq-id');
          const card = document.getElementById(`card-${id}`);
          if (!card) return;
          const isOpen = card.classList.contains('open');
          // Close all others in same container
          const container = card.closest('.faq-grid, #faq-inline') || document;
          container.querySelectorAll('.faq-card.open').forEach(c => {
            c.classList.remove('open');
            const btn = c.querySelector('.faq-toggle');
            if (btn) btn.setAttribute('aria-expanded', 'false');
          });
          if (!isOpen) {
            card.classList.add('open');
            faqToggle.setAttribute('aria-expanded', 'true');
            if (window.innerWidth < 800) {
              setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
            }
          }
        }
      });
    }

    setupGridListeners(itemsGrid);
    setupGridListeners(faqGrid);

    // Also handle delegated events on dynamically injected inline faq
    document.addEventListener('click', e => {
      const inlineFaq = document.getElementById('faq-inline');
      if (!inlineFaq) return;
      // Events bubble up; just ensure faq-inline is handled
      // (already handled by document-level if not caught by itemsGrid)
    });

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
    loadData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
