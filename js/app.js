// ============================================
// App — Main Router + Controller
// ============================================

const App = {
  currentView: 'menu',
  currentRecipeId: null,
  pendingMeal: null, // For assigning recipes: { day, mealType }

  // Version visible en el footer. Cambiá este string cada vez que hagas
  // commit+push para poder verificar si el celular esta sincronizado.
  VERSION: 'v14 (2025-09-10)',

  // ============================================
  // Initialize
  // ============================================
  async init() {
    // Init modules (from localStorage — instant)
    Recipes.init();
    Menu.init();
    if (typeof AI !== 'undefined') AI.init();

    this._setupEventListeners();

    // Supabase: setup + (si ya hay user logueado) pullAll + subscribe
    let dbOk = false;
    try {
      dbOk = await DB.init();
    } catch (err) {
      console.error('Error iniciando Supabase:', err);
    }

    if (!dbOk || !DB.client) {
      // Supabase no se cargo (CDN fallo o error de config).
      // Mostramos mensaje visible en vez de dejar la app vacia.
      this.currentView = 'signin';
      this._renderFatalError(
        'No se pudo conectar con Supabase. ' +
        'Revisa tu conexion a internet y recarga la pagina.'
      );
      return;
    }

    // DB OK — si hay user en localStorage, ir directo al menú; si no, signin.
    if (DB.isAuth()) {
      this._handleRoute();
    } else {
      this.currentView = 'signin';
      DB.renderSignInView();
    }

    // Listen for hash changes
    window.addEventListener('hashchange', () => this._handleRoute());
  },

  // Muestra un mensaje de error visible en la UI
  _renderFatalError(message) {
    const main = document.getElementById('main-content');
    if (main) {
      main.innerHTML = `
        <div class="signin-view">
          <div class="signin-card">
            <div class="signin-card__icon">⚠️</div>
            <h2 class="signin-card__title">No se pudo cargar la app</h2>
            <p class="signin-card__hint">${Components.escapeHtml(message)}</p>
            <button class="btn btn--primary btn--full" onclick="location.reload()">
              Reintentar
            </button>
          </div>
        </div>`;
    }
    // Ocultar nav tabs (no se puede navegar sin DB)
    const nav = document.getElementById('nav-tabs');
    if (nav) nav.classList.add('hidden');
  },

  // ============================================
  // Event Listeners
  // ============================================
  _setupEventListeners() {
    // Navigation tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const view = tab.dataset.view;
        this.navigate(view);
      });
    });

    // Back button
    document.getElementById('btn-back').addEventListener('click', () => {
      this.navigate('menu');
    });

    // Modal close
    document.getElementById('modal-close').addEventListener('click', () => {
      Components.modal.close();
    });

    document.getElementById('modal-backdrop').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        Components.modal.close();
      }
    });

    // ESC to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        Components.modal.close();
      }
    });
  },

  // ============================================
  // Routing
  // ============================================
  _handleRoute() {
    const hash = window.location.hash || '#menu';
    const parts = hash.slice(1).split('/');
    const route = parts[0];

    switch (route) {
      case 'menu':
        this.renderMenuView();
        break;
      case 'recipes':
        this.renderRecipesView();
        break;
      case 'recipe':
        const id = parts[1];
        if (id === 'new') {
          this.renderRecipeForm();
        } else {
          this.renderRecipeDetail(id);
        }
        break;
      default:
        this.renderMenuView();
    }
  },

  navigate(view, params = {}) {
    switch (view) {
      case 'menu':
        window.location.hash = 'menu';
        break;
      case 'recipes':
        window.location.hash = 'recipes';
        break;
      case 'recipe':
        if (params.id) {
          window.location.hash = `recipe/${params.id}`;
        } else {
          window.location.hash = 'recipe/new';
        }
        break;
    }
  },

  // ============================================
  // View: Menu
  // ============================================
  renderMenuView() {
    this.currentView = 'menu';
    this._updateNav('menu');
    this._updateHeader(T.menu.title, false);
    this._showShoppingListBtn();
    
    const main = document.getElementById('main-content');
    
    // Week navigation
    let html = `
      <div class="week-nav">
        <button class="week-nav__btn" onclick="App.prevWeek()" aria-label="Semana anterior">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <span class="week-nav__label">${Menu.getWeekLabel()}</span>
        <button class="week-nav__btn" onclick="App.nextWeek()" aria-label="Semana siguiente">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>
    `;

    // Days grid
    html += '<div class="menu-grid">';
    
    const daysOrder = Store.getDaysOrder();
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    
    daysOrder.forEach((day, index) => {
      const week = Menu.getCurrentWeek();
      const dayMeals = week[day] || {};
      
      html += `
        <div class="menu-day">
          <div class="menu-day__header">${dayNames[index]}</div>
          <div class="menu-day__meals">
      `;
      
      Store.getMealTypes().forEach(mealType => {
        const recipeId = dayMeals[mealType];
        const recipe = recipeId ? Recipes.getById(recipeId) : null;
        html += Components.mealCell(mealType, recipe);
      });
      
      html += `
          </div>
        </div>
      `;
    });
    
    html += '</div>';

    html += this._renderFooter();

    // Click handlers for meal cells
    main.innerHTML = html;
    this._attachMealCellListeners();

    // Botón flotante del chat IA
    this._renderChatButton();
  },

  // Botón flotante que abre el chat IA
  _renderChatButton() {
    // Quitar uno previo si existe
    const existing = document.getElementById('ai-chat-fab');
    if (existing) existing.remove();

    const fab = document.createElement('button');
    fab.id = 'ai-chat-fab';
    fab.className = 'ai-chat-fab';
    fab.innerHTML = '🤖';
    fab.title = 'Chat con agente IA';
    fab.onclick = () => App.openAiChat();
    document.body.appendChild(fab);
  },

  // Abre el chat IA en un modal
  async openAiChat() {
    if (!AI.hasKey()) {
      Components.toast.show('Configurá tu API key en Ajustes → 🤖 Agente IA');
      return;
    }

    // Modal con la UI del chat
    Components.modal.open('🤖 Agente IA', `
      <div class="ai-chat">
        <div class="ai-chat__messages" id="ai-chat-messages">
          <div class="ai-chat__msg ai-chat__msg--agent">
            Hola! Puedo sugerirte un menú para la semana. Decime qué tipo de cocina te gusta, cuántos días, si querés cenas light, etc.
          </div>
        </div>
        <div class="ai-chat__input-wrap">
          <input type="text" id="ai-chat-input" class="form-input"
                 placeholder="Ej: Menu ligero para 3 días, cenas sin carbos..."
                 onkeydown="if(event.key==='Enter') App.sendAiMessage()">
          <button class="btn btn--primary" onclick="App.sendAiMessage()">Enviar</button>
        </div>
      </div>
    `);

    // Focus en el input
    setTimeout(() => document.getElementById('ai-chat-input')?.focus(), 200);
  },

  async sendAiMessage() {
    const input = document.getElementById('ai-chat-input');
    const msgEl = document.getElementById('ai-chat-messages');
    if (!input || !msgEl) return;
    const text = input.value.trim();
    if (!text) return;

    // Pintar mensaje del usuario
    msgEl.insertAdjacentHTML('beforeend', `
      <div class="ai-chat__msg ai-chat__msg--user">${Components.escapeHtml(text)}</div>
    `);
    input.value = '';
    msgEl.scrollTop = msgEl.scrollHeight;

    // Indicador "pensando"
    const thinkingId = 'ai-thinking-' + Date.now();
    msgEl.insertAdjacentHTML('beforeend', `
      <div class="ai-chat__msg ai-chat__msg--agent" id="${thinkingId}">
        <span class="ai-spinner ai-spinner--inline"></span> Pensando...
      </div>
    `);
    msgEl.scrollTop = msgEl.scrollHeight;

    try {
      const result = await AI.chatMenu(text, {
        recipes: Recipes.getAll().map(r => ({
          nombre: r.nombre,
          tipo_comida: r.tipoComida,
        })),
        currentMenu: Menu.getCurrentWeek(),
      });

      // Reemplazar el "pensando" con la respuesta
      const thinking = document.getElementById(thinkingId);
      if (thinking) thinking.remove();

      // Si hay menu propuesto, pintarlo como una card con botón Aplicar
      let menuCardHtml = '';
      if (result.menu_propuesto && typeof result.menu_propuesto === 'object') {
        const mp = result.menu_propuesto;
        const days = [['lunes','Lun'],['martes','Mar'],['miercoles','Mié'],['jueves','Jue'],['viernes','Vie'],['sabado','Sáb'],['domingo','Dom']];
        const rows = days.map(([k, label]) => {
          const d = mp[k];
          if (!d) return '';
          const c = d.comida ? `<strong>Comida:</strong> ${Components.escapeHtml(d.comida)}` : '';
          const ce = d.cena ? `<strong>Cena:</strong> ${Components.escapeHtml(d.cena)}` : '';
          return `<div class="ai-chat__menu-row"><span class="ai-chat__menu-day">${label}</span><span>${c}${c && ce ? ' · ' : ''}${ce}</span></div>`;
        }).filter(Boolean).join('');

        if (rows) {
          menuCardHtml = `
            <div class="ai-chat__menu-card">
              <div style="font-weight:600; margin-bottom: 8px;">📋 Propuesta de menú</div>
              ${rows}
              <button class="btn btn--primary btn--sm" style="margin-top: 12px; width: 100%;"
                      onclick='App.applyAiMenu(${JSON.stringify(mp).replace(/'/g, "&apos;")})'>
                💾 Aplicar este menú a esta semana
              </button>
            </div>`;
        }
      }

      msgEl.insertAdjacentHTML('beforeend', `
        <div class="ai-chat__msg ai-chat__msg--agent">
          ${Components.escapeHtml(result.respuesta || '(sin respuesta)')}
          ${menuCardHtml}
        </div>
      `);
      msgEl.scrollTop = msgEl.scrollHeight;
    } catch (err) {
      const thinking = document.getElementById(thinkingId);
      if (thinking) thinking.remove();
      msgEl.insertAdjacentHTML('beforeend', `
        <div class="ai-chat__msg ai-chat__msg--agent" style="color: var(--color-error);">
          ❌ ${Components.escapeHtml(err.message)}
        </div>
      `);
      msgEl.scrollTop = msgEl.scrollHeight;
    }
  },

  // Aplica un menu propuesto por la IA a la semana actual
  async applyAiMenu(menuPropuesto) {
    // menuPropuesto viene como {lunes: {comida, cena}, ...}
    // Necesito mapear a {monday: {lunch, dinner}, ...} y resolver IDs
    const dayMap = {
      lunes: 'monday', martes: 'tuesday', miercoles: 'wednesday',
      jueves: 'thursday', viernes: 'friday', sabado: 'saturday', domingo: 'sunday',
    };
    const menuData = {};
    let found = 0, missing = [];

    for (const [esDay, enDay] of Object.entries(dayMap)) {
      const day = menuPropuesto[esDay];
      if (!day) continue;
      menuData[enDay] = { lunch: null, dinner: null };

      if (day.comida) {
        const r = Recipes.getAll().find(x => x.nombre.toLowerCase() === day.comida.toLowerCase());
        if (r) { menuData[enDay].lunch = r.id; found++; }
        else missing.push(`${esDay} comida: ${day.comida}`);
      }
      if (day.cena) {
        const r = Recipes.getAll().find(x => x.nombre.toLowerCase() === day.cena.toLowerCase());
        if (r) { menuData[enDay].dinner = r.id; found++; }
        else missing.push(`${esDay} cena: ${day.cena}`);
      }
    }

    if (missing.length > 0) {
      Components.toast.show(`⚠️ ${missing.length} recetas no encontradas: ${missing.slice(0,2).join(', ')}${missing.length>2?'...':''}`);
    }

    // Guardar directamente en Supabase via DB.pushMenu (que ya existe)
    const currentMenu = Menu._menu || {};
    const wk = Menu.getWeekKey();
    currentMenu[wk] = menuData;
    await DB.pushMenu(currentMenu);
    Menu._menu = currentMenu;

    Components.toast.show(`✅ Menú aplicado (${found} celdas)`);
    Components.modal.close();
    App.renderMenuView();
  },

  _showShoppingListBtn() {
    const menuBtn = document.getElementById('btn-menu');
    menuBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 6h16M4 12h10M4 18h16"/>
      </svg>
    `;
    menuBtn.setAttribute('aria-label', 'Menú');
    menuBtn.onclick = () => App.showMenuOptions();
  },

  showMenuOptions() {
    const optionsHtml = `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <button class="btn btn--secondary btn--full" onclick="App.showShoppingList(); Components.modal.close();">
          🛒 ${T.menu.shoppingList}
        </button>
        <button class="btn btn--secondary btn--full" onclick="App.showSettings();">
          ⚙️ Ajustes / Sync
        </button>
      </div>
    `;
    Components.modal.open('Opciones', optionsHtml);
  },

  async showSettings() {
    const html = await DB.renderSettings();
    Components.modal.open('⚙️ Ajustes', html);
  },

  showShoppingList() {
    const ingredients = Menu.getShoppingList();
    Components.modal.open(
      T.menu.shoppingListTitle,
      Components.renderShoppingList(ingredients)
    );
  },

  // ============================================
  // View: Recipes List
  // ============================================
  renderRecipesView() {
    this.currentView = 'recipes';
    this._updateNav('recipes');
    this._updateHeader('📚 ' + T.nav.recipes, false);
    
    const main = document.getElementById('main-content');
    const recipes = Recipes.getAll();

    let html = `
      <div class="search-bar">
        <input type="text" id="recipe-search" class="form-input" 
               placeholder="${T.actions.search}" oninput="App.filterRecipes()">
      </div>
      <div id="recipe-list-container">
    `;

    if (recipes.length === 0) {
      html += Components.emptyState('📚', T.recipe.sinRecetas, T.recipe.sinRecetasHint);
    } else {
      html += recipes.map(r => Components.recipeCard(r)).join('');
    }

    html += '</div>';
    html += `
      <button class="btn btn--primary btn--full" style="margin-top: 16px;"
              onclick="App.navigate('recipe', { id: 'new' })">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        ${T.recipe.newRecipe}
      </button>
    `;

    html += this._renderFooter();

    main.innerHTML = html;

    // Click handlers for recipe cards
    main.querySelectorAll('.recipe-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.recipeId;
        this.navigate('recipe', { id });
      });
    });
  },

  // ============================================
  // View: Recipe Detail
  // ============================================
  renderRecipeDetail(id) {
    const recipe = Recipes.getById(id);
    if (!recipe) {
      Components.toast.show(T.toast.error);
      this.navigate('recipes');
      return;
    }

    this.currentRecipeId = id;
    this._updateNav(null);
    this._updateHeader(T.actions.back, true);
    this._updateHeaderTitle('📋 ' + recipe.nombre);

    const main = document.getElementById('main-content');
    
    const ingredients = recipe.ingredientes.map(ing => `
      <li>
        <span>${Components.escapeHtml(ing.nombre)}</span>
        <span>${ing.cantidad} ${T.units[ing.unidad] || ''}</span>
      </li>
    `).join('');

    const steps = recipe.pasos.map((step, i) => `
      <li>
        <span class="step-number">${i + 1}</span>
        <span>${Components.escapeHtml(step)}</span>
      </li>
    `).join('');

    const tags = recipe.tags.map(t => 
      `<span class="tag">${T.tags[t] || t}</span>`
    ).join('');

    const icon = Components.getRecipeIcon(recipe.tags);

    const heroImage = recipe.imagen
      ? `<img class="recipe-detail__hero" src="${Components.escapeHtml(recipe.imagen)}" alt="${Components.escapeHtml(recipe.nombre)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
         <div class="recipe-detail__icon" style="display:none">${icon}</div>`
      : `<div class="recipe-detail__icon">${icon}</div>`;

    main.innerHTML = `
      <div class="recipe-detail__header">
        ${heroImage}
        <h2 class="recipe-detail__name">${Components.escapeHtml(recipe.nombre)}</h2>
        ${tags ? `<div class="recipe-card__tags" style="justify-content: center;">${tags}</div>` : ''}
      </div>

      ${Components.nutritionPanel(recipe.nutricion)}

      <div class="card recipe-detail__section">
        <h3 class="recipe-detail__section-title">${T.recipe.ingredients}</h3>
        <ul class="recipe-detail__list">
          ${ingredients || '<li>Añade ingredientes</li>'}
        </ul>
      </div>

      <div class="card recipe-detail__section">
        <h3 class="recipe-detail__section-title">${T.recipe.steps}</h3>
        <ol class="recipe-detail__list recipe-detail__steps">
          ${steps || '<li>Añade pasos</li>'}
        </ol>
      </div>

      ${recipe.link ? `
      <div class="card recipe-detail__section recipe-detail__link">
        <a href="${Components.escapeHtml(recipe.link)}" target="_blank" rel="noopener noreferrer" class="recipe-link-btn">
          🔗 Ver receta original
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
          </svg>
        </a>
      </div>` : ''}

      <div class="form-actions">
        <button class="btn btn--outline" onclick="App.deleteRecipe('${id}')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
          ${T.actions.delete}
        </button>
        <button class="btn btn--ai" onclick="App.aiCompleteRecipe('${recipe.id}')" title="Rellenar ingredientes y pasos con IA">
          🤖 Rellenar con IA
        </button>
        <button class="btn btn--primary" onclick="App.editRecipe('${id}')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          ${T.actions.edit}
        </button>
      </div>
      ${this._renderFooter()}
    `;
  },

  // ============================================
  // View: Recipe Form
  // ============================================
  renderRecipeForm(id = null) {
    const isEdit = !!id;
    const recipe = isEdit ? Recipes.getById(id) : null;

    this._updateNav(null);
    this._updateHeader(T.actions.back, true);
    this._updateHeaderTitle(isEdit ? T.recipe.editRecipe : T.recipe.newRecipe);

    const main = document.getElementById('main-content');
    main.innerHTML = Components.recipeForm(recipe, isEdit);

    // Form submit handler
    document.getElementById('recipe-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveRecipe(isEdit);
    });
  },

  // ============================================
  // Week Navigation
  // ============================================
  prevWeek() {
    Menu.prevWeek();
    this.renderMenuView();
  },

  nextWeek() {
    Menu.nextWeek();
    this.renderMenuView();
  },

  // ============================================
  // Meal Cell Interactions
  // ============================================
  _attachMealCellListeners() {
    document.querySelectorAll('.meal-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const mealType = cell.dataset.meal;
        const day = cell.closest('.menu-day').querySelector('.menu-day__header').textContent.toLowerCase();
        const dayKey = Store.getDaysOrder()[['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].indexOf(day)];
        
        if (cell.classList.contains('meal-cell--vacant')) {
          // Open recipe selector
          this.openRecipeSelector(dayKey, mealType);
        } else {
          // Show options menu
          const recipeId = cell.dataset.recipeId;
          this.openMealOptions(dayKey, mealType, recipeId);
        }
      });
    });
  },

  openRecipeSelector(day, mealType) {
    this.pendingMeal = { day, mealType };
    const recipes = Recipes.getAll();
    
    Components.modal.open(
      T.menu.selectRecipe,
      Components.recipeSelector(recipes, null, mealType)
    );
    
    // Setup filter tabs listener
    this._setupFilterTabs(mealType);
  },

  _setupFilterTabs(mealType) {
    const filterContainer = document.getElementById('meal-type-filter');
    if (!filterContainer) return;
    
    filterContainer.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        // Update active state
        filterContainer.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Filter recipes
        const filter = tab.dataset.filter;
        this._filterRecipesByType(filter);
      });
    });
  },

  _filterRecipesByType(tipo) {
    const query = document.getElementById('recipe-search')?.value || '';
    let recipes;
    
    if (query.trim()) {
      // Combine search with type filter
      const searched = Recipes.search(query);
      recipes = Recipes.getByTipoComida(tipo).filter(r => 
        searched.some(sr => sr.id === r.id)
      );
    } else {
      recipes = Recipes.getByTipoComida(tipo);
    }
    
    const container = document.getElementById('recipe-list');
    if (!container) return;
    
    if (recipes.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">🔍</div>
          <div class="empty-state__title">Sin resultados</div>
        </div>
      `;
    } else {
      container.innerHTML = recipes.map(r => `
        <div class="recipe-card" onclick="App.selectRecipeForMeal('${r.id}')">
          ${Components.recipeCard(r)}
        </div>
      `).join('');
    }
  },

  selectRecipeForMeal(recipeId) {
    if (!this.pendingMeal) return;
    
    const { day, mealType } = this.pendingMeal;
    const recipe = Recipes.getById(recipeId);
    
    // Warning for dinner with carbs/sugar
    if (mealType === 'dinner' && !Recipes.isLowCarb(recipe)) {
      if (!confirm(T.validation.cenaHighCarbs)) {
        return;
      }
    }
    
    Menu.assign(day, mealType, recipeId);
    
    Components.modal.close();
    Components.toast.show(T.toast.mealAssigned);
    this.pendingMeal = null;
    this.renderMenuView();
  },

  openMealOptions(day, mealType, recipeId) {
    const recipe = Recipes.getById(recipeId);
    if (!recipe) return;

    const optionsHtml = `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <button class="btn btn--primary btn--full" onclick="App.navigate('recipe', { id: '${recipeId}' })">
          ${T.actions.viewRecipe}
        </button>
        <button class="btn btn--outline btn--full" onclick="App.replaceMeal('${day}', '${mealType}')">
          ${T.menu.replaceMeal}
        </button>
        <button class="btn btn--danger btn--full" onclick="App.removeMeal('${day}', '${mealType}')">
          ${T.menu.removeMeal}
        </button>
      </div>
    `;

    Components.modal.open(recipe.nombre, optionsHtml);
  },

  replaceMeal(day, mealType) {
    Components.modal.close();
    setTimeout(() => {
      this.openRecipeSelector(day, mealType);
    }, 300);
  },

  removeMeal(day, mealType) {
    Menu.remove(day, mealType);
    Components.modal.close();
    Components.toast.show(T.toast.mealRemoved);
    this.renderMenuView();
  },

  // ============================================
  // Recipe Actions
  // ============================================
  // Abre el form de edición dentro de un modal (mejor UX que cambiar de pagina)
  editRecipe(id) {
    const recipe = Recipes.getById(id);
    if (!recipe) {
      Components.toast.show(T.toast.error || 'Receta no encontrada');
      return;
    }
    Components.modal.open(T.recipe.editRecipe, Components.recipeForm(recipe, true));
    document.getElementById('recipe-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveRecipe(true);
    });
  },

  // ========== AI: completar ingredientes y pasos de una receta ==========
  async aiCompleteRecipe(id) {
    const recipe = Recipes.getById(id);
    if (!recipe) return;

    if (!AI.hasKey()) {
      Components.toast.show('Configurá tu API key en Ajustes → 🤖 Agente IA');
      return;
    }

    // Mostrar modal con estado "generando"
    Components.modal.open('🤖 Generando receta', `
      <div style="text-align: center; padding: var(--space-lg);">
        <div class="ai-spinner"></div>
        <p style="margin-top: 16px; color: var(--color-text-muted);">
          La IA está pensando ingredientes y pasos para<br>
          <strong style="color: var(--color-text);">"${Components.escapeHtml(recipe.nombre)}"</strong>
        </p>
      </div>
    `);

    try {
      const result = await AI.completeRecipe(recipe.nombre);
      const ings = result.ingredientes || [];
      const pasos = result.pasos || [];

      if (ings.length === 0 && pasos.length === 0) {
        Components.modal.open('🤖 Sin resultados', `
          <div style="padding: var(--space-md);">
            <p>La IA no devolvió ingredientes ni pasos para esta receta.</p>
            <button class="btn btn--primary btn--full" onclick="Components.modal.close()">
              Cerrar
            </button>
          </div>
        `);
        return;
      }

      // Mostrar preview + opción de aplicar o descartar
      const previewHtml = `
        <div style="padding: var(--space-md);">
          <p style="color: var(--color-text-muted); margin-bottom: 16px;">
            La IA generó esto para <strong>${Components.escapeHtml(recipe.nombre)}</strong>.
            Revisalo y si te gusta, guardalo. Si no, podés editar después.
          </p>

          ${ings.length > 0 ? `
            <h4 style="margin-bottom: 8px;">Ingredientes (${ings.length})</h4>
            <ul style="margin-bottom: 16px; padding-left: 20px;">
              ${ings.map(i => `<li>${Components.escapeHtml(i.nombre)} ${i.cantidad ? '(' + Components.escapeHtml(i.cantidad) + ' ' + (i.unidad || '') + ')' : ''}</li>`).join('')}
            </ul>
          ` : ''}

          ${pasos.length > 0 ? `
            <h4 style="margin-bottom: 8px;">Pasos (${pasos.length})</h4>
            <ol style="margin-bottom: 16px; padding-left: 20px;">
              ${pasos.map(p => `<li>${Components.escapeHtml(p)}</li>`).join('')}
            </ol>
          ` : ''}

          <div style="display: flex; gap: 8px; margin-top: 16px;">
            <button class="btn btn--outline" onclick="Components.modal.close()">
              Descartar
            </button>
            <button class="btn btn--primary" style="flex: 1;"
                    onclick="App.applyAiRecipe('${id}', ${JSON.stringify(ings).replace(/"/g, '&quot;')}, ${JSON.stringify(pasos).replace(/"/g, '&quot;')})">
              💾 Guardar en la receta
            </button>
          </div>
          <p style="font-size: 12px; color: var(--color-text-muted); margin-top: 12px;">
            También podés tocar "Editar" después para ajustar antes de guardar.
          </p>
        </div>
      `;
      Components.modal.open('🤖 Receta sugerida', previewHtml);
    } catch (err) {
      console.error(err);
      Components.modal.open('🤖 Error', `
        <div style="padding: var(--space-md);">
          <p style="color: var(--color-error); margin-bottom: 12px;">
            ❌ ${Components.escapeHtml(err.message)}
          </p>
          <p style="font-size: 13px; color: var(--color-text-muted); margin-bottom: 16px;">
            Verificá que la API key esté bien y que tengas conexión a internet.
          </p>
          <button class="btn btn--primary btn--full" onclick="Components.modal.close()">
            Cerrar
          </button>
        </div>
      `);
    }
  },

  applyAiRecipe(id, ingredientes, pasos) {
    const recipe = Recipes.getById(id);
    if (!recipe) return;
    Recipes.update(id, { ingredientes, pasos });
    Components.toast.show('✅ Receta actualizada con IA');
    Components.modal.close();
    this.renderRecipeDetail(id);
  },

  saveRecipe(isEdit = false) {
    const form = document.getElementById('recipe-form');
    
    // Collect data
    const id = form.querySelector('[name="id"]').value;
    const nombre = form.querySelector('[name="nombre"]').value.trim();
    
    if (!nombre) {
      Components.toast.show(T.validation.nameRequired);
      return;
    }

    // Ingredients
    const ingredients = [];
    const names = form.querySelectorAll('[name="ing_nombre[]"]');
    const quantities = form.querySelectorAll('[name="ing_cantidad[]"]');
    const units = form.querySelectorAll('[name="ing_unidad[]"]');

    names.forEach((input, i) => {
      if (input.value.trim()) {
        ingredients.push({
          nombre: input.value.trim(),
          cantidad: quantities[i].value.trim(),
          unidad: units[i].value || 'none'
        });
      }
    });

    // Steps
    const pasos = [];
    form.querySelectorAll('[name="pasos[]"]').forEach(textarea => {
      if (textarea.value.trim()) {
        pasos.push(textarea.value.trim());
      }
    });

    // Nutrition
    const nutricion = {
      cal: parseInt(form.querySelector('[name="nut_cal"]').value) || 0,
      hc: parseInt(form.querySelector('[name="nut_hc"]').value) || 0,
      proteinas: parseInt(form.querySelector('[name="nut_proteinas"]').value) || 0,
      grasas: parseInt(form.querySelector('[name="nut_grasas"]').value) || 0
    };

    const recipeData = {
      nombre,
      ingredientes,
      pasos,
      nutricion,
      imagen: (form.querySelector('[name="imagen"]')?.value || '').trim(),
      tipoComida: form.querySelector('[name="tipoComida"]:checked')?.value || 'ambos',
      tags: (form.querySelector('[name="tags"]')?.value || '')
              .split(',')
              .map(t => t.trim().toLowerCase())
              .filter(Boolean),
      link: (form.querySelector('[name="link"]')?.value || '').trim(),
    };

    if (isEdit && id) {
      Recipes.update(id, recipeData);
    } else {
      Recipes.create(recipeData);
    }

    Components.toast.show(T.toast.recipeSaved);
    Components.modal.close();
    // Si estabamos editando, refrescar el detalle con los nuevos datos.
    // Si era nueva, ir a la lista de recetas.
    if (id) {
      this.renderRecipeDetail(id);
    } else {
      this.navigate('recipes');
    }
  },

  deleteRecipe(id) {
    if (confirm('¿Eliminar esta receta?')) {
      Recipes.delete(id);
      Components.toast.show(T.toast.recipeDeleted);
      this.navigate('recipes');
    }
  },

  filterRecipes() {
    const query = document.getElementById('recipe-search').value;
    const recipes = Recipes.search(query);
    
    // Check if we're in the recipes list view
    const listContainer = document.getElementById('recipe-list-container');
    if (listContainer) {
      if (recipes.length === 0) {
        listContainer.innerHTML = Components.emptyState('🔍', 'Sin resultados', 'Prueba con otra búsqueda');
      } else {
        listContainer.innerHTML = recipes.map(r => Components.recipeCard(r)).join('');
        listContainer.querySelectorAll('.recipe-card').forEach(card => {
          card.addEventListener('click', () => {
            const id = card.dataset.recipeId;
            this.navigate('recipe', { id });
          });
        });
      }
      return;
    }
    
    // Check if we're in the recipe selector modal
    const modalList = document.getElementById('recipe-list');
    if (modalList) {
      if (recipes.length === 0) {
        modalList.innerHTML = `
          <div class="empty-state">
            <div class="empty-state__icon">🔍</div>
            <div class="empty-state__title">Sin resultados</div>
          </div>
        `;
      } else {
        modalList.innerHTML = recipes.map(r => `
          <div class="recipe-card" onclick="App.selectRecipeForMeal('${r.id}')">
            ${Components.recipeCard(r)}
          </div>
        `).join('');
      }
    }
  },

  // ============================================
  // UI Helpers
  // ============================================
  _updateNav(active) {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.view === active);
    });
    document.getElementById('nav-tabs').classList.toggle('hidden', active === null);
  },

  _updateHeader(title, showBack) {
    const backBtn = document.getElementById('btn-back');
    const headerTitle = document.getElementById('header-title');
    
    backBtn.classList.toggle('hidden', !showBack);
    if (!showBack) {
      headerTitle.textContent = title;
    }
  },

  _updateHeaderTitle(title) {
    document.getElementById('header-title').textContent = title;
  },

  // Footer con version + timestamp de sincronizacion.
  // Se agrega al final del main-content de cualquier vista activa.
  _renderFooter() {
    return `
      <div class="app-footer">
        <span>${App.VERSION}</span>
        ${DB.isAuth() ? '<span class="app-footer__sync">\u2713 sincronizado</span>' : ''}
      </div>`;
  }
};

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
