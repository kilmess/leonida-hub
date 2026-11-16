/**
 * LEONIDA VI - Tactical Database & Pre-Launch Companion
 * Ultra-fast Vanilla JavaScript logic
 */

(function () {
  'use strict';

  // Constants & Storage
  const STORAGE_KEY = 'leonida_vi_completed_items';
  // Target: 19 de Noviembre de 2026 a las 00:00:00
  const TARGET_LAUNCH_DATE = new Date('2026-11-19T00:00:00');

  // State
  let itemsData = [];
  let currentCategory = 'Todos';
  let searchQuery = '';
  let hideCompleted = false;
  let completedItems = new Set();

  // DOM Elements
  const itemsGrid = document.getElementById('items-grid');
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const categoryFilters = document.getElementById('category-filters');
  const resultsCount = document.getElementById('results-count');
  const emptyState = document.getElementById('empty-state');
  const progressSummary = document.getElementById('progress-summary');
  const progressCount = document.getElementById('progress-count');
  const hideCompletedToggle = document.getElementById('hide-completed-toggle');
  const resetProgressBtn = document.getElementById('reset-progress-btn');
  const resetAllFiltersBtn = document.getElementById('reset-all-filters-btn');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  const supportBtn = document.getElementById('support-btn');
  const supportModal = document.getElementById('support-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const phoneClock = document.getElementById('phone-clock');
  const cdDays = document.getElementById('cd-days');
  const cdHours = document.getElementById('cd-hours');
  const cdMins = document.getElementById('cd-mins');
  const cdSecs = document.getElementById('cd-secs');

  // In-Game Phone Clock
  function updatePhoneClock() {
    if (!phoneClock) return;
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    phoneClock.textContent = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  }

  // Real-time Countdown Timer (Target: 19 Nov 2026 00:00)
  function updateCountdown() {
    if (!cdDays || !cdHours || !cdMins || !cdSecs) return;
    const now = new Date();
    const diff = TARGET_LAUNCH_DATE.getTime() - now.getTime();

    if (diff <= 0) {
      cdDays.textContent = '000';
      cdHours.textContent = '00';
      cdMins.textContent = '00';
      cdSecs.textContent = '00';
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    cdDays.textContent = String(days).padStart(3, '0');
    cdHours.textContent = String(hours).padStart(2, '0');
    cdMins.textContent = String(minutes).padStart(2, '0');
    cdSecs.textContent = String(seconds).padStart(2, '0');
  }

  // LocalStorage Management
  function loadCompletedFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          completedItems = new Set(parsed);
        }
      }
    } catch (e) {
      console.warn('No se pudo acceder a localStorage:', e);
      completedItems = new Set();
    }
  }

  function saveCompletedToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...completedItems]));
    } catch (e) {
      console.warn('Error al guardar en localStorage:', e);
    }
    updateProgressDisplay();
  }

  // Toast Notification
  let toastTimer = null;
  function showToast(message) {
    if (toastTimer) clearTimeout(toastTimer);
    toastMessage.textContent = message;
    toast.classList.add('show');
    toast.classList.remove('opacity-0');
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
      toast.classList.add('opacity-0');
    }, 2200);
  }

  // Progress counter in header
  function updateProgressDisplay() {
    const total = itemsData.length;
    const completed = completedItems.size;
    if (progressCount) {
      progressCount.textContent = `${completed}/${total}`;
    }
    if (progressSummary && total > 0) {
      progressSummary.classList.remove('hidden');
    }
  }

  // Fetch Data from data.json
  async function loadData() {
    try {
      resultsCount.textContent = 'Cargando base de datos de Leonida...';
      const response = await fetch('data.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      itemsData = await response.json();
      updateCategoryCounts();
      updateProgressDisplay();
      renderItems();
    } catch (error) {
      console.error('Error cargando data.json:', error);
      resultsCount.textContent = 'Error al cargar la información.';
      itemsGrid.innerHTML = `
        <div class="col-span-full p-6 text-center rounded-2xl bg-rose-950/30 border border-rose-900/50 text-rose-300">
          <p class="font-bold">No se pudo cargar data.json</p>
          <p class="text-xs mt-1 text-zinc-400">Verifica que data.json exista en la raíz del proyecto.</p>
        </div>
      `;
    }
  }

  // Category counts badge updater
  function updateCategoryCounts() {
    const counts = {
      'Todos': itemsData.length,
      'Ubicaciones': 0,
      'Vehículos': 0,
      'Radios & Música': 0,
      'Trucos (19 Nov)': 0
    };

    itemsData.forEach(item => {
      if (counts[item.category] !== undefined) {
        counts[item.category]++;
      }
    });

    const pills = categoryFilters.querySelectorAll('.filter-pill');
    pills.forEach(pill => {
      const cat = pill.getAttribute('data-category');
      const badge = pill.querySelector('.count-badge');
      if (badge && counts[cat] !== undefined) {
        badge.textContent = counts[cat];
      }
    });
  }

  // Helper: Category badge styling
  function getCategoryBadge(item) {
    const cat = item.category;
    if (cat === 'Ubicaciones') {
      return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-950/80 text-neon-cyan border border-sky-800/40">📍 DISTRITO</span>`;
    }
    if (cat === 'Vehículos') {
      return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800/40">🏎️ VEHÍCULO</span>`;
    }
    if (cat === 'Radios & Música') {
      return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-fuchsia-950/80 text-neon-pink border border-fuchsia-800/40">📻 MÚSICA</span>`;
    }
    if (cat === 'Trucos (19 Nov)') {
      return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-800/40">🔒 TRUCOS</span>`;
    }
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">${escapeHtml(item.badge || cat)}</span>`;
  }

  // Filter & Search Logic
  function getFilteredItems() {
    const q = searchQuery.toLowerCase().trim();

    return itemsData.filter(item => {
      // Category match
      if (currentCategory !== 'Todos' && item.category !== currentCategory) {
        return false;
      }

      // Hide completed toggle
      if (hideCompleted && completedItems.has(item.id)) {
        return false;
      }

      // Search match
      if (q) {
        const titleMatch = item.title && item.title.toLowerCase().includes(q);
        const effectMatch = item.effect && item.effect.toLowerCase().includes(q);
        const descMatch = item.description && item.description.toLowerCase().includes(q);
        const catMatch = item.category && item.category.toLowerCase().includes(q);
        const locMatch = item.location && item.location.toLowerCase().includes(q);
        const tagsMatch = Array.isArray(item.tags) && item.tags.some(t => t.toLowerCase().includes(q));

        if (!titleMatch && !effectMatch && !descMatch && !catMatch && !locMatch && !tagsMatch) {
          return false;
        }
      }

      return true;
    });
  }

  // Render Compact Cards
  function renderItems() {
    const filtered = getFilteredItems();

    // Clean status text
    if (searchQuery.trim()) {
      resultsCount.innerHTML = `Mostrando <strong class="text-white">${filtered.length}</strong> de ${itemsData.length} registros para "<span class="text-neon-cyan">${escapeHtml(searchQuery)}</span>"`;
    } else if (currentCategory !== 'Todos') {
      resultsCount.innerHTML = `<strong class="text-neon-pink">${currentCategory}</strong>: <strong class="text-white">${filtered.length}</strong> registros confirmados`;
    } else {
      resultsCount.innerHTML = `<strong class="text-white">${filtered.length}</strong> registros oficiales confirmados`;
    }

    if (filtered.length === 0) {
      itemsGrid.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    const html = filtered.map(item => {
      const isCompleted = completedItems.has(item.id);
      const catBadge = getCategoryBadge(item);
      const isLockedCheat = item.category === 'Trucos (19 Nov)';

      return `
        <article 
          class="glass-card p-3.5 sm:p-4 flex flex-col justify-between relative overflow-hidden group ${isCompleted ? 'is-completed' : ''}" 
          id="card-${item.id}"
          data-id="${item.id}"
        >
          <!-- Top subtle glow highlight bar -->
          <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ff2a85]/35 to-[#00f0ff]/35 opacity-0 group-hover:opacity-100 transition-opacity"></div>

          <div>
            <!-- Top Meta Row -->
            <div class="flex items-center justify-between gap-2 mb-2">
              <div class="flex items-center gap-1.5 flex-wrap">
                ${catBadge}
                ${item.badge ? `
                  <span class="text-[9px] font-mono tracking-wider text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                    ${escapeHtml(item.badge)}
                  </span>
                ` : ''}
              </div>

              ${item.location ? `
                <span class="text-[10px] text-zinc-400 flex items-center gap-1 truncate max-w-[45%]" title="${escapeHtml(item.location)}">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-neon-pink flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span class="truncate">${escapeHtml(item.location)}</span>
                </span>
              ` : ''}
            </div>

            <!-- Title -->
            <h2 class="font-vice text-base sm:text-lg font-bold tracking-wide text-white group-hover:text-neon-cyan transition-colors mb-1.5 leading-snug">
              ${escapeHtml(item.title)}
            </h2>

            <!-- Effect / Summary -->
            <p class="text-xs text-zinc-300 mb-2 leading-relaxed">
              ${escapeHtml(item.effect)}
            </p>

            <!-- Locked / Status Banner -->
            ${isLockedCheat ? `
              <div class="bg-amber-950/30 border border-amber-900/40 rounded-lg p-2 mb-2.5 flex items-center gap-2 text-[11px] text-amber-300">
                <span class="text-sm">🔒</span>
                <span>Se desbloquea a las 00:00 del <strong>19 de Noviembre de 2026</strong>.</span>
              </div>
            ` : ''}

            <!-- Context / Description -->
            ${item.description ? `
              <p class="text-[11px] text-zinc-400 italic mb-3 leading-normal bg-black/30 p-2 rounded-lg border-l-2 border-neon-cyan/40">
                ${escapeHtml(item.description)}
              </p>
            ` : ''}
          </div>

          <!-- Bottom Action Bar (Compact & Mobile-First) -->
          <div class="pt-2.5 border-t border-zinc-800/80 flex items-center justify-between gap-2 mt-auto">
            
            <!-- Checkbox: Guardado / Visto -->
            <label class="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-300 hover:text-white py-1">
              <input 
                type="checkbox" 
                class="completed-checkbox w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-neon-cyan focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#00f0ff]"
                data-id="${item.id}"
                ${isCompleted ? 'checked' : ''}
                aria-label="Guardar ficha"
              >
              <span class="text-[11px] font-medium text-zinc-400 group-hover:text-zinc-200">
                ${isCompleted ? '<span class="text-emerald-400 font-semibold">✓ Guardado</span>' : 'Guardar'}
              </span>
            </label>

            <!-- Discreet Share Button -->
            <button 
              type="button" 
              class="share-btn inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium border border-zinc-800 hover:border-zinc-700 transition-all duration-150 active:scale-95"
              data-id="${item.id}"
              data-title="${escapeHtml(item.title)}"
              data-summary="${escapeHtml(item.effect)}"
              title="Compartir ficha"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-neon-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span>Compartir</span>
            </button>

          </div>
        </article>
      `;
    }).join('');

    itemsGrid.innerHTML = html;
  }

  // Share functionality with Toast feedback
  async function shareItem(title, summary, btn) {
    const shareUrl = window.location.href.split('#')[0];
    const textToShare = `🌴 GTA 6 Leonida Hub: ${title} — ${summary}\n🔗 ${shareUrl}`;

    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToShare);
        copied = true;
      }
    } catch (e) {
      // Fallback
    }

    if (!copied) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = textToShare;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        copied = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch (e) {
        console.warn('Fallback share error:', e);
      }
    }

    // Button visual feedback
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
      </svg>
      <span class="text-emerald-400 font-semibold">¡Copiado!</span>
    `;
    btn.classList.add('border-emerald-500/50', 'bg-emerald-950/30');

    showToast('¡Copiado para compartir!');

    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.classList.remove('border-emerald-500/50', 'bg-emerald-950/30');
    }, 1800);
  }

  // Escape HTML helper
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Event Listeners
  function setupListeners() {
    // Search input
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      if (searchQuery.length > 0) {
        clearSearchBtn.classList.remove('hidden');
      } else {
        clearSearchBtn.classList.add('hidden');
      }
      renderItems();
    });

    // Clear search button
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.classList.add('hidden');
      searchInput.focus();
      renderItems();
    });

    // Category filter tabs
    categoryFilters.addEventListener('click', (e) => {
      const pill = e.target.closest('.filter-pill');
      if (!pill) return;

      const category = pill.getAttribute('data-category');
      if (!category) return;

      categoryFilters.querySelectorAll('.filter-pill').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      });

      pill.classList.add('active');
      pill.setAttribute('aria-selected', 'true');
      currentCategory = category;
      renderItems();
    });

    // Hide completed toggle
    if (hideCompletedToggle) {
      hideCompletedToggle.addEventListener('change', (e) => {
        hideCompleted = e.target.checked;
        renderItems();
      });
    }

    // Reset progress button
    if (resetProgressBtn) {
      resetProgressBtn.addEventListener('click', () => {
        if (completedItems.size === 0) {
          showToast('No hay fichas guardadas.');
          return;
        }
        if (confirm('¿Deseas reiniciar todas las marcas de guardado?')) {
          completedItems.clear();
          saveCompletedToStorage();
          renderItems();
          showToast('Marcas reiniciadas');
        }
      });
    }

    // Reset all filters in empty state
    if (resetAllFiltersBtn) {
      resetAllFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.classList.add('hidden');
        currentCategory = 'Todos';
        if (hideCompletedToggle) hideCompletedToggle.checked = false;
        hideCompleted = false;

        categoryFilters.querySelectorAll('.filter-pill').forEach(btn => {
          if (btn.getAttribute('data-category') === 'Todos') {
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
          } else {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
          }
        });

        renderItems();
      });
    }

    // Grid delegated clicks (Share Button & Checkbox)
    itemsGrid.addEventListener('click', (e) => {
      // Share button click
      const shareBtn = e.target.closest('.share-btn');
      if (shareBtn) {
        const title = shareBtn.getAttribute('data-title');
        const summary = shareBtn.getAttribute('data-summary');
        shareItem(title, summary, shareBtn);
        return;
      }
    });

    // Checkbox toggle
    itemsGrid.addEventListener('change', (e) => {
      const checkbox = e.target.closest('.completed-checkbox');
      if (checkbox) {
        const id = checkbox.getAttribute('data-id');
        const card = document.getElementById(`card-${id}`);

        if (checkbox.checked) {
          completedItems.add(id);
          if (card) card.classList.add('is-completed');
          showToast('Guardado en favoritos');
        } else {
          completedItems.delete(id);
          if (card) card.classList.remove('is-completed');
        }

        saveCompletedToStorage();

        if (hideCompleted) {
          renderItems();
        } else {
          const labelSpan = checkbox.parentElement.querySelector('span');
          if (labelSpan) {
            labelSpan.innerHTML = checkbox.checked
              ? '<span class="text-emerald-400 font-semibold">✓ Guardado</span>'
              : 'Guardar';
          }
        }
      }
    });

    // Support Modal
    if (supportBtn && supportModal && closeModalBtn) {
      supportBtn.addEventListener('click', () => {
        supportModal.classList.remove('hidden');
      });

      closeModalBtn.addEventListener('click', () => {
        supportModal.classList.add('hidden');
      });

      supportModal.addEventListener('click', (e) => {
        if (e.target === supportModal) {
          supportModal.classList.add('hidden');
        }
      });
    }

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }

      if (e.key === 'Escape') {
        if (supportModal && !supportModal.classList.contains('hidden')) {
          supportModal.classList.add('hidden');
        } else if (searchInput.value) {
          searchInput.value = '';
          searchQuery = '';
          clearSearchBtn.classList.add('hidden');
          renderItems();
        }
      }
    });
  }

  // Timers setup
  function setupTimers() {
    updatePhoneClock();
    updateCountdown();
    setInterval(updatePhoneClock, 10000);
    setInterval(updateCountdown, 1000);
  }

  // Entry Point
  function init() {
    loadCompletedFromStorage();
    setupTimers();
    setupListeners();
    loadData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
