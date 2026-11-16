/**
 * LEONIDA VI - Tactical Database Companion
 * Ultra-fast Vanilla JavaScript logic
 */

(function () {
  'use strict';

  // Constants & Storage Keys
  const STORAGE_KEY = 'leonida_vi_completed_items';
  
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

  // Initialize LocalStorage
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

  // Update Header Progress
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
      resultsCount.textContent = 'Cargando datos de Leonida...';
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
      resultsCount.textContent = 'Error al cargar la base de datos.';
      itemsGrid.innerHTML = `
        <div class="col-span-full p-6 text-center rounded-2xl bg-rose-950/30 border border-rose-900/50 text-rose-300">
          <p class="font-bold">No se pudo cargar data.json</p>
          <p class="text-xs mt-1 text-zinc-400">Verifica que el archivo exista en la raíz y que el servidor web local esté activo.</p>
        </div>
      `;
    }
  }

  // Category counts badge updater
  function updateCategoryCounts() {
    const counts = {
      'Todos': itemsData.length,
      'Trucos PS5': 0,
      'Trucos Xbox': 0,
      'Secretos': 0,
      'Vehículos': 0
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

  // Helper: platform badge styling
  function getPlatformBadge(category, platform) {
    if (category.includes('PS5')) {
      return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-950/90 text-sky-400 border border-sky-800/40">PLAYSTATION 5</span>`;
    }
    if (category.includes('Xbox')) {
      return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950/90 text-emerald-400 border border-emerald-800/40">XBOX SERIES X|S</span>`;
    }
    if (category === 'Secretos') {
      return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-950/90 text-purple-300 border border-purple-800/40">SECRETO / MAPA</span>`;
    }
    if (category === 'Vehículos') {
      return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-950/90 text-amber-300 border border-amber-800/40">VEHÍCULO</span>`;
    }
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">${platform || 'GENERAL'}</span>`;
  }

  // Helper: render button keycaps
  function renderKeycaps(keys) {
    if (!Array.isArray(keys) || keys.length === 0) return '';
    return keys.map(key => {
      const cleanKey = key.trim();
      return `<span class="keycap" data-key="${cleanKey}">${cleanKey}</span>`;
    }).join('');
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
        const codeMatch = item.code && item.code.toLowerCase().includes(q);
        const locMatch = item.location && item.location.toLowerCase().includes(q);
        const tagsMatch = Array.isArray(item.tags) && item.tags.some(t => t.toLowerCase().includes(q));

        if (!titleMatch && !effectMatch && !descMatch && !catMatch && !codeMatch && !locMatch && !tagsMatch) {
          return false;
        }
      }

      return true;
    });
  }

  // Render Grid Cards
  function renderItems() {
    const filtered = getFilteredItems();

    // Update Status text
    if (searchQuery.trim()) {
      resultsCount.innerHTML = `Mostrando <strong class="text-white">${filtered.length}</strong> de ${itemsData.length} resultados para "<span class="text-neon-cyan">${escapeHtml(searchQuery)}</span>"`;
    } else if (currentCategory !== 'Todos') {
      resultsCount.innerHTML = `Filtrado por <strong class="text-neon-pink">${currentCategory}</strong>: <strong class="text-white">${filtered.length}</strong> disponibles`;
    } else {
      resultsCount.innerHTML = `Mostrando <strong class="text-white">${filtered.length}</strong> trucos y secretos disponibles`;
    }

    if (filtered.length === 0) {
      itemsGrid.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    const html = filtered.map(item => {
      const isCompleted = completedItems.has(item.id);
      const platformBadge = getPlatformBadge(item.category, item.platform);
      const keycapsHtml = renderKeycaps(item.code_keys);

      return `
        <article 
          class="glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group ${isCompleted ? 'is-completed' : ''}" 
          id="card-${item.id}"
          data-id="${item.id}"
        >
          <!-- Top subtle glow highlight bar -->
          <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ff2a85]/40 to-[#00f0ff]/40 opacity-0 group-hover:opacity-100 transition-opacity"></div>

          <div>
            <!-- Header: Category & Platform Badge -->
            <div class="flex items-center justify-between gap-2 mb-2.5">
              ${platformBadge}
              ${item.location ? `
                <span class="text-[11px] text-zinc-400 flex items-center gap-1 truncate max-w-[50%]">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-neon-pink flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span class="truncate">${escapeHtml(item.location)}</span>
                </span>
              ` : ''}
            </div>

            <!-- Title -->
            <h2 class="font-vice text-lg sm:text-xl font-bold tracking-wide text-white group-hover:text-neon-cyan transition-colors mb-2 leading-tight">
              ${escapeHtml(item.title)}
            </h2>

            <!-- Effect description -->
            <p class="text-xs sm:text-sm text-zinc-300 mb-3 leading-relaxed">
              <span class="text-neon-pink font-semibold">Efecto:</span> ${escapeHtml(item.effect)}
            </p>

            <!-- Code display / Keycaps container -->
            <div class="bg-black/40 rounded-xl p-3 border border-zinc-800/80 mb-3 space-y-2">
              <div class="text-[10px] font-mono uppercase tracking-wider text-zinc-500 flex items-center justify-between">
                <span>SECUENCIA DE ACTIVACIÓN</span>
                <span class="text-zinc-600 font-mono text-[9px]">EN JUEGO</span>
              </div>
              <div class="flex flex-wrap items-center gap-1.5 py-0.5">
                ${keycapsHtml || `<span class="font-mono text-xs text-neon-cyan font-bold">${escapeHtml(item.code)}</span>`}
              </div>
            </div>

            <!-- Lore / Context tip -->
            ${item.description ? `
              <p class="text-[11px] sm:text-xs text-zinc-400 italic mb-4 leading-normal bg-zinc-900/40 p-2.5 rounded-lg border-l-2 border-neon-cyan/40">
                ${escapeHtml(item.description)}
              </p>
            ` : ''}
          </div>

          <!-- Bottom Actions: Copy Code & Completed Checkbox -->
          <div class="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-3 mt-auto">
            
            <!-- Checkbox: Completado/Usado -->
            <label class="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-300 hover:text-white py-1">
              <input 
                type="checkbox" 
                class="completed-checkbox w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-neon-cyan focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#00f0ff]"
                data-id="${item.id}"
                ${isCompleted ? 'checked' : ''}
                aria-label="Marcar como usado o completado"
              >
              <span class="text-[11px] sm:text-xs font-medium text-zinc-400 group-hover:text-zinc-200">
                ${isCompleted ? '<span class="text-emerald-400 font-semibold">✓ Usado</span>' : 'Completado'}
              </span>
            </label>

            <!-- Copy Code Button (Touch-Friendly Large Target) -->
            <button 
              type="button" 
              class="copy-btn inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 min-h-[42px] sm:min-h-[38px] rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-semibold border border-zinc-700/80 hover:border-neon-cyan/60 transition-all duration-200 active:scale-95"
              data-code="${escapeHtml(item.code)}"
              data-title="${escapeHtml(item.title)}"
              title="Copiar secuencia al portapapeles"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-neon-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span class="copy-label">Copiar código</span>
            </button>

          </div>
        </article>
      `;
    }).join('');

    itemsGrid.innerHTML = html;
  }

  // Copy to Clipboard with Visual Feedback
  async function copyToClipboard(text, btn) {
    let success = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        success = true;
      }
    } catch (err) {
      // Fallback if permission rejected or unfocused window
    }

    if (!success) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        success = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch (e) {
        console.warn('Fallback copy error:', e);
      }
    }

    // Always give feedback to the user on mobile/desktop
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
      </svg>
      <span class="text-emerald-400 font-bold">¡Copiado!</span>
    `;
    btn.classList.add('border-emerald-500', 'bg-emerald-950/40');

    showToast(`¡Código copiado!: ${text}`);

    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.classList.remove('border-emerald-500', 'bg-emerald-950/40');
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

  // Setup Event Listeners
  function setupListeners() {
    // Search input (instant)
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
          showToast('No hay trucos marcados como usados.');
          return;
        }
        if (confirm('¿Deseas reiniciar todas las marcas de trucos completados/usados?')) {
          completedItems.clear();
          saveCompletedToStorage();
          renderItems();
          showToast('Progreso reiniciado correctamente');
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

    // Grid delegated clicks (Copy Button & Checkbox)
    itemsGrid.addEventListener('click', (e) => {
      // Copy Button
      const copyBtn = e.target.closest('.copy-btn');
      if (copyBtn) {
        const code = copyBtn.getAttribute('data-code');
        const title = copyBtn.getAttribute('data-title');
        copyToClipboard(code, copyBtn, title);
        return;
      }
    });

    // Checkbox change delegated
    itemsGrid.addEventListener('change', (e) => {
      const checkbox = e.target.closest('.completed-checkbox');
      if (checkbox) {
        const id = checkbox.getAttribute('data-id');
        const card = document.getElementById(`card-${id}`);

        if (checkbox.checked) {
          completedItems.add(id);
          if (card) card.classList.add('is-completed');
          showToast('Marcado como usado');
        } else {
          completedItems.delete(id);
          if (card) card.classList.remove('is-completed');
        }

        saveCompletedToStorage();

        // If "hide completed" is active, re-render
        if (hideCompleted) {
          renderItems();
        } else {
          // Update the label text inside the card immediately
          const labelSpan = checkbox.parentElement.querySelector('span');
          if (labelSpan) {
            labelSpan.innerHTML = checkbox.checked
              ? '<span class="text-emerald-400 font-semibold">✓ Usado</span>'
              : 'Completado';
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
      // Shortcut '/' to focus search
      if (e.key === '/' && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }

      // Shortcut 'Escape' to clear or close modal
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

  // Entry Point
  function init() {
    loadCompletedFromStorage();
    setupListeners();
    loadData();
  }

  // Start app
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
