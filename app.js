/**
 * LEONIDA VI HUB — Full-Width Layout
 * Vanilla JS — Zero emojis, single search input, Cheats (pink) & Guides (orange) 2-col grid
 */

(function () {
  'use strict';

  // =====================================================
  // CONSTANTS
  // =====================================================

  const CATEGORY_META = {
    'Ubicaciones':     { badgeClass: 'badge-ubicaciones', stripClass: 'strip-ubicaciones', label: 'DISTRITO' },
    'Vehículos':       { badgeClass: 'badge-vehiculos',   stripClass: 'strip-vehiculos',   label: 'VEHÍCULO' },
    'Radios & Música': { badgeClass: 'badge-musica',      stripClass: 'strip-musica',      label: 'RADIO' },
    'Cheats':          { badgeClass: 'badge-cheats',      stripClass: 'strip-cheats',      label: 'CHEAT CODE' },
    'Tips & FAQ':      { badgeClass: 'badge-faq',         stripClass: 'strip-faq',         label: 'FAQ' },
  };

  // =====================================================
  // STATE
  // =====================================================
  let itemsData      = [];
  let currentCat     = 'Todos';
  let searchQuery    = '';

  // =====================================================
  // DOM REFERENCES
  // =====================================================
  const itemsGrid          = document.getElementById('items-grid');
  const faqGrid            = document.getElementById('faq-grid');
  const emptyState         = document.getElementById('empty-state');
  const resetAllFiltersBtn = document.getElementById('reset-all-filters-btn');
  const toast              = document.getElementById('toast');
  const toastMessage       = document.getElementById('toast-message');
  const supportBtn         = document.getElementById('support-btn');
  const supportModal       = document.getElementById('support-modal');
  const closeModalBtn      = document.getElementById('close-modal-btn');

  // Single desktop search + mobile search
  const searchInputDesktop = document.getElementById('search-input');
  const searchInputMobile  = document.getElementById('search-input-mobile');
  const clearSearchBtn     = document.getElementById('clear-search-btn');

  const topnavTabs = document.getElementById('topnav-tabs');

  // =====================================================
  // INJECT CHEAT (PINK) & GUIDE (ORANGE) CARD STYLES
  // =====================================================
  function injectAccordionStyles() {
    if (document.getElementById('leonida-cheat-styles')) return;
    const style = document.createElement('style');
    style.id = 'leonida-cheat-styles';
    style.textContent = `
      /* Cheats — Rosa Vice City */
      .faq-card.cheat-card {
        border: 1px solid rgba(244, 114, 182, 0.55) !important;
        box-shadow: 0 0 0 1px rgba(244, 114, 182, 0.1);
      }
      .faq-card.cheat-card:hover,
      .faq-card.cheat-card.open {
        border-color: #f472b6 !important;
      }
      .faq-card.cheat-card .faq-toggle-icon {
        color: #f472b6 !important;
      }
      .cheat-header-inline {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 8px;
      }
      .cheat-summary-inline {
        font-size: 13px;
        font-weight: 400;
        color: #a1a1aa;
      }

      /* Guías / Tips & FAQ — Naranja Leonida */
      .faq-card.guide-card {
        border: 1px solid rgba(230, 157, 69, 0.55) !important;
        box-shadow: 0 0 0 1px rgba(230, 157, 69, 0.1);
      }
      .faq-card.guide-card:hover,
      .faq-card.guide-card.open {
        border-color: #e69d45 !important;
      }
      .faq-card.guide-card .faq-toggle-icon,
      .faq-card.guide-card .faq-badge {
        color: #e69d45 !important;
      }
    `;
    document.head.appendChild(style);
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
      if (q) {
        const hay = [item.title, item.code, item.effect, item.description, item.category, item.location, ...(item.tags || [])]
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

  // Format multi-line FAQ / Cheat steps
  function formatFaqSteps(desc) {
    if (!desc) return '';
    return desc.split('\n').filter(l => l.trim())
      .map(line => {
        const escaped = esc(line.trim()).replace(
          'la combinación de arriba.',
          '<strong style="color:#fff;">la combinación de arriba.</strong>'
        );
        return `<p>${escaped}</p>`;
      }).join('');
  }

  // Uniform vector SVG arrows & button pills for Cheat Codes
  function renderCheatToken(token) {
    const arrowPaths = {
      '↑': 'M12 19V5M5 12l7-7 7 7',
      '↓': 'M12 5v14M19 12l-7 7-7-7',
      '←': 'M19 12H5M12 19l-7-7 7-7',
      '→': 'M5 12h14M12 5l7 7-7 7'
    };

    if (arrowPaths[token]) {
      return `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="${arrowPaths[token]}"/>
        </svg>`;
    }
    return `<span style="font-size:13px;font-weight:800;letter-spacing:.03em;">${esc(token)}</span>`;
  }

  function renderCheatCombo(item) {
    if (!item.code) return '';
    const tokens = item.code.trim().split(/\s+/);
    const pillsHtml = tokens.map(token => `
      <span style="
        display:inline-flex;
        align-items:center;
        justify-content:center;
        width:36px;
        height:36px;
        background:rgba(255,255,255,0.07);
        border:1px solid rgba(255,255,255,0.18);
        border-radius:6px;
        color:#f5f5f7;
        box-shadow:0 2px 4px rgba(0,0,0,0.25);
      ">${renderCheatToken(token)}</span>
    `).join('');

    return `
      <div style="
        display:flex;
        flex-wrap:wrap;
        align-items:center;
        gap:8px;
        margin-bottom:14px;
        padding:10px 12px;
        background:rgba(0,0,0,0.28);
        border:1px solid rgba(255,255,255,0.08);
        border-radius:6px;
      ">
        ${pillsHtml}
      </div>`;
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
  // RENDER: Normal card
  // =====================================================
  function renderNormalCard(item) {
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
          ${locationHtml}
        </div>
        <div class="card-footer">
          ${shareBtnHtml(item.id, item.title, item.effect)}
        </div>
      </div>`;
  }

  // =====================================================
  // RENDER: Accordion card (Cheats & Guía para Principiantes)
  // =====================================================
  function renderFaqCard(item) {
    const isCheat      = item.category === 'Cheats';
    const cardClass    = isCheat ? 'faq-card cheat-card' : 'faq-card guide-card';
    const shareSummary = item.code ? `${item.code} — ${item.effect}` : item.effect;

    const headerContent = isCheat
      ? `<span class="faq-toggle-content">
           <span class="cheat-header-inline">
             <span class="faq-question">${esc(item.title)}</span>
             ${item.effect ? `<span class="cheat-summary-inline">${esc(item.effect)}</span>` : ''}
           </span>
         </span>`
      : `<span class="faq-toggle-content">
           <span class="faq-badge">${esc(item.badge || 'FAQ')}</span>
           <span class="faq-question">${esc(item.title)}</span>
         </span>`;

    return `
      <div class="${cardClass}" id="card-${item.id}" data-id="${item.id}">
        <button class="faq-toggle" data-faq-id="${item.id}" aria-expanded="false">
          <span class="faq-toggle-icon">+</span>
          ${headerContent}
          <span class="faq-toggle-arrow">&#9660;</span>
        </button>
        <div class="faq-answer" id="faq-answer-${item.id}">
          ${renderCheatCombo(item)}
          <div class="faq-answer-steps">${formatFaqSteps(item.description)}</div>
          <div class="faq-answer-footer">
            ${shareBtnHtml(item.id, item.title, shareSummary)}
          </div>
        </div>
      </div>`;
  }

  // =====================================================
  // RENDER ITEMS (main)
  // =====================================================
  function renderItems() {
    const filtered = getFiltered();
    const isAccordionView = currentCat === 'Tips & FAQ' || currentCat === 'Cheats';

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

    if (isAccordionView) {
      // Vista dedicada de Cheats o Tips & FAQ (2 columnas)
      itemsGrid.style.display = 'none';
      itemsGrid.innerHTML = '';
      if (faqGrid) {
        faqGrid.style.display = 'grid';
        faqGrid.style.alignItems = 'start';
        faqGrid.innerHTML = filtered.map(item =>
          item.type === 'faq' ? renderFaqCard(item) : renderNormalCard(item)
        ).join('');
      }
    } else {
      // Vista general ("Todos" o búsqueda)
      if (faqGrid) { faqGrid.style.display = 'none'; faqGrid.innerHTML = ''; }
      itemsGrid.style.display = 'grid';

      const regular = filtered.filter(i => i.type !== 'faq');
      const cheats  = filtered.filter(i => i.type === 'faq' && i.category === 'Cheats');
      const guides  = filtered.filter(i => i.type === 'faq' && i.category !== 'Cheats');

      let html = regular.map(item => renderNormalCard(item)).join('');

      // 1. Sección CHEAT CODES (bloque rosado arriba de Guía para Principiantes)
      if (cheats.length > 0) {
        html += `
          <div style="grid-column:1/-1; margin:20px 0 4px;">
            <div style="background:var(--header-bar-bg);border-radius:var(--radius-sm);
              padding:5px 12px;display:inline-block;">
              <span style="font-family:var(--font-title);font-weight:800;font-size:12px;
                letter-spacing:.08em;text-transform:uppercase;color:var(--header-bar-text);">
                CHEAT CODES
              </span>
            </div>
          </div>
          <div style="grid-column:1/-1;" id="cheats-inline-wrapper">
            <div class="faq-grid" id="cheats-inline" style="align-items:start;">
              ${cheats.map(item => renderFaqCard(item)).join('')}
            </div>
          </div>`;
      }

      // 2. Sección GUÍA PARA PRINCIPIANTES (bloque naranja)
      if (guides.length > 0) {
        html += `
          <div style="grid-column:1/-1; margin:20px 0 4px;">
            <div style="background:#e69d45;border-radius:var(--radius-sm);
              padding:5px 12px;display:inline-block;">
              <span style="font-family:var(--font-title);font-weight:800;font-size:12px;
                letter-spacing:.08em;text-transform:uppercase;color:#141526;">
                GUÍA PARA PRINCIPIANTES
              </span>
            </div>
          </div>
          <div style="grid-column:1/-1;" id="faq-inline-wrapper">
            <div class="faq-grid" id="faq-inline" style="align-items:start;">
              ${guides.map(item => renderFaqCard(item)).join('')}
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

    // Grid: delegated events (share btn, accordion)
    function setupGridListeners(grid) {
      if (!grid) return;
      grid.addEventListener('click', e => {

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

        // Accordion toggle (Cheats & Guía para Principiantes)
        const faqToggle = e.target.closest('.faq-toggle');
        if (faqToggle) {
          const card = faqToggle.closest('.faq-card');
          if (!card) return;
          const isOpen = card.classList.contains('open');
          const container = card.closest('.faq-grid') || document;
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
    injectAccordionStyles();
    setupListeners();
    loadData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();