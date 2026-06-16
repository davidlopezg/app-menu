// ============================================
// App — Main Router + Controller
// ============================================

const App = {
  currentView: 'menu',
  currentRecipeId: null,
  pendingMeal: null, // For assigning recipes: { day, mealType }

  // ============================================
  // Initialize
  // ============================================
  async init() {
    // Init modules
    Recipes.init();
    Menu.init();

    // Try to sync from GitHub (María will get David's data)
    await Sync.load();

    // Setup event listeners
    this._setupEventListeners();

    // Handle hash routing
    this._handleRoute();

    // Listen for hash changes
    window.addEventListener('hashchange', () => this._handleRoute());
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

    // Click handlers for meal cells
    main.innerHTML = html;
    this._attachMealCellListeners();
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

  showSettings() {
    Components.modal.open('⚙️ Ajustes', Sync.renderSettings());
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

    main.innerHTML = `
      <div class="recipe-detail__header">
        <div class="recipe-detail__icon">${icon}</div>
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

      <div class="form-actions">
        <button class="btn btn--outline" onclick="App.deleteRecipe('${id}')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
          ${T.actions.delete}
        </button>
        <button class="btn btn--primary" onclick="App.navigate('recipe', { id: '${id}' })">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          ${T.actions.edit}
        </button>
      </div>
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
      nutricion
    };

    if (isEdit && id) {
      Recipes.update(id, recipeData);
    } else {
      Recipes.create(recipeData);
    }

    Components.toast.show(T.toast.recipeSaved);
    Components.modal.close();
    this.navigate('recipes');
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
  }
};

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
