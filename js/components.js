// ============================================
// Components — UI Reusable Components
// ============================================

const Components = {
  // ============================================
  // Modal
  // ============================================
  modal: {
    open(title, content) {
      const backdrop = document.getElementById('modal-backdrop');
      const modal = document.getElementById('modal');
      const modalTitle = document.getElementById('modal-title');
      const modalContent = document.getElementById('modal-content');

      modalTitle.textContent = title;
      modalContent.innerHTML = content;
      backdrop.classList.remove('hidden');
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      // Focus first input
      setTimeout(() => {
        const firstInput = modalContent.querySelector('input, textarea, select');
        if (firstInput) firstInput.focus();
      }, 100);
    },

    close() {
      const backdrop = document.getElementById('modal-backdrop');
      backdrop.classList.add('hidden');
      document.body.style.overflow = '';
    }
  },

  // ============================================
  // Toast
  // ============================================
  toast: {
    show(message, duration = 3000) {
      const toast = document.getElementById('toast');
      const msg = document.getElementById('toast-message');
      
      msg.textContent = message;
      toast.classList.remove('hidden');
      
      setTimeout(() => {
        toast.classList.add('hidden');
      }, duration);
    }
  },

  // ============================================
  // Recipe Card
  // ============================================
  recipeCard(recipe, onClick) {
    const nutrition = recipe.nutricion || {};
    const kcal = nutrition.cal || 0;
    const protein = nutrition.proteinas || 0;
    const fat = nutrition.grasas || 0;
    
    const tags = recipe.tags.slice(0, 2).map(t => 
      `<span class="tag">${T.tags[t] || t}</span>`
    ).join('');

    const icon = this.getRecipeIcon(recipe.tags);
    
    // Meal type badge
    const tipoComida = recipe.tipoComida || 'ambos';
    const badgeClass = `badge--${tipoComida}`;
    const badgeText = T.mealType[tipoComida] || 'Ambos';

    return `
      <div class="recipe-card" data-recipe-id="${recipe.id}">
        <div class="recipe-card__icon">${icon}</div>
        <div class="recipe-card__info">
          <div class="recipe-card__header">
            <div class="recipe-card__name">${this.escapeHtml(recipe.nombre)}</div>
            <span class="badge ${badgeClass}">${badgeText}</span>
          </div>
          <div class="recipe-card__nutrition">
            <span>${kcal} ${T.nutrition.kcal}</span>
            <span>|</span>
            <span>${protein}P</span>
            <span>|</span>
            <span>${fat}G</span>
          </div>
          ${tags ? `<div class="recipe-card__tags">${tags}</div>` : ''}
        </div>
      </div>
    `;
  },

  // ============================================
  // Meal Cell
  // ============================================
  mealCell(mealType, recipe = null, onClick) {
    const mealLabel = T.meals[mealType];
    
    if (recipe) {
      const nutrition = recipe.nutricion || {};
      // Warning for dinner with carbs/sugar
      const hasWarning = mealType === 'dinner' && !Recipes.isLowCarb(recipe);
      const warningClass = hasWarning ? 'meal-cell--warning' : '';
      const warningIcon = hasWarning ? '<span class="meal-cell__warning">⚠️</span>' : '';
      
      return `
        <div class="meal-cell ${warningClass}" data-meal="${mealType}" data-recipe-id="${recipe.id}">
          <div class="meal-cell__type">${mealLabel} ${warningIcon}</div>
          <div class="meal-cell__name">${this.escapeHtml(recipe.nombre)}</div>
          <div class="meal-cell__kcal">${nutrition.cal || 0} kcal</div>
        </div>
      `;
    }

    return `
      <div class="meal-cell meal-cell--vacant" data-meal="${mealType}">
        <div class="meal-cell__type">${mealLabel}</div>
      </div>
    `;
  },

  // ============================================
  // Nutrition Panel
  // ============================================
  nutritionPanel(nutrition) {
    if (!nutrition) return '';

    const maxCal = 600;
    const maxMacro = 50;

    const calPct = Math.min((nutrition.cal || 0) / maxCal * 100, 100);
    const hcPct = Math.min((nutrition.hc || 0) / maxMacro * 100, 100);
    const protPct = Math.min((nutrition.proteinas || 0) / maxMacro * 100, 100);
    const fatPct = Math.min((nutrition.grasas || 0) / maxMacro * 100, 100);

    return `
      <div class="nutrition-panel">
        <div class="nutrition-panel__title">
          <span>📊</span>
          <span>${T.nutrition.porRacion}</span>
        </div>
        
        <div class="nutrition-row">
          <span class="nutrition-row__label">${T.nutrition.calories}</span>
          <div class="nutrition-row__bar">
            <div class="nutrition-row__fill nutrition-row__fill--calories" style="width: ${calPct}%"></div>
          </div>
          <span class="nutrition-row__value">${nutrition.cal || 0} ${T.nutrition.kcal}</span>
        </div>
        
        <div class="nutrition-row">
          <span class="nutrition-row__label">${T.nutrition.carbs}</span>
          <div class="nutrition-row__bar">
            <div class="nutrition-row__fill nutrition-row__fill--carbs" style="width: ${hcPct}%"></div>
          </div>
          <span class="nutrition-row__value">${nutrition.hc || 0}g</span>
        </div>
        
        <div class="nutrition-row">
          <span class="nutrition-row__label">${T.nutrition.protein}</span>
          <div class="nutrition-row__bar">
            <div class="nutrition-row__fill nutrition-row__fill--protein" style="width: ${protPct}%"></div>
          </div>
          <span class="nutrition-row__value">${nutrition.proteinas || 0}g</span>
        </div>
        
        <div class="nutrition-row">
          <span class="nutrition-row__label">${T.nutrition.fat}</span>
          <div class="nutrition-row__bar">
            <div class="nutrition-row__fill nutrition-row__fill--fat" style="width: ${fatPct}%"></div>
          </div>
          <span class="nutrition-row__value">${nutrition.grasas || 0}g</span>
        </div>
      </div>
    `;
  },

  // ============================================
  // Recipe Form
  // ============================================
  recipeForm(recipe = null, isEdit = false) {
    const title = isEdit ? T.recipe.editRecipe : T.recipe.newRecipe;
    const name = recipe ? this.escapeHtml(recipe.nombre) : '';
    const existingNutrition = recipe ? recipe.nutricion : null;

    // Ingredients
    const ingredients = recipe && recipe.ingredientes.length > 0
      ? recipe.ingredientes.map(ing => this.ingredientRow(ing))
      : [this.ingredientRow()];

    // Steps
    const steps = recipe && recipe.pasos.length > 0
      ? recipe.pasos.map((step, i) => this.stepRow(step, i + 1))
      : [this.stepRow('', 1)];

    // Existing nutrition inputs
    const nutritionInputs = this.nutritionInputs(existingNutrition);

    return `
      <form id="recipe-form" class="recipe-form">
        <input type="hidden" name="id" value="${recipe?.id || ''}">
        
        <div class="form-group">
          <label class="form-label">${T.recipe.recipeName}</label>
          <input type="text" name="nombre" class="form-input" 
                 value="${name}" required 
                 placeholder="${T.recipe.namePlaceholder}">
        </div>

        <div class="form-group">
          <label class="form-label">${T.recipe.ingredients}</label>
          <div id="ingredients-list" class="dynamic-list">
            ${ingredients.join('')}
          </div>
          <button type="button" class="btn btn--outline btn--sm dynamic-list__add" 
                  onclick="Components.addIngredient()">
            ${T.recipe.addIngredient}
          </button>
        </div>

        <div class="form-group">
          <label class="form-label">${T.recipe.steps}</label>
          <div id="steps-list" class="dynamic-list recipe-detail__steps">
            ${steps.join('')}
          </div>
          <button type="button" class="btn btn--outline btn--sm dynamic-list__add" 
                  onclick="Components.addStep()">
            ${T.recipe.addStep}
          </button>
        </div>

        <div class="form-group">
          <label class="form-label">${T.recipe.nutrition}</label>
          <div id="nutrition-manual">
            ${nutritionInputs}
          </div>
          <button type="button" class="btn btn--secondary btn--sm mt-md" 
                  onclick="Components.buscarNutrientes()">
            ${T.recipe.buscarNutrientes}
          </button>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn--outline" onclick="Components.modal.close()">
            ${T.actions.cancel}
          </button>
          <button type="submit" class="btn btn--primary">
            ${T.actions.save}
          </button>
        </div>
      </form>
    `;
  },

  // ============================================
  // Ingredient Row
  // ============================================
  ingredientRow(data = {}) {
    const name = data.nombre ? this.escapeHtml(data.nombre) : '';
    const qty = data.cantidad ? this.escapeHtml(data.cantidad) : '';
    
    const units = Object.entries(T.units).map(([key, label]) => 
      `<option value="${key}" ${data.unidad === key ? 'selected' : ''}>${label}</option>`
    ).join('');

    return `
      <div class="dynamic-list__item">
        <input type="text" name="ing_nombre[]" class="form-input" 
               value="${name}" placeholder="${T.recipe.namePlaceholder}">
        <input type="text" name="ing_cantidad[]" class="form-input" 
               value="${qty}" placeholder="${T.recipe.quantityPlaceholder}" style="width: 60px">
        <select name="ing_unidad[]" class="form-input" style="width: 80px">
          ${units}
        </select>
        <button type="button" class="dynamic-list__remove" onclick="Components.removeRow(this)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `;
  },

  // ============================================
  // Step Row
  // ============================================
  stepRow(text = '', num = 1) {
    const content = text ? this.escapeHtml(text) : '';
    return `
      <div class="dynamic-list__item">
        <span class="step-number">${num}</span>
        <textarea name="pasos[]" class="form-input" rows="2" 
                  placeholder="${T.recipe.stepPlaceholder}">${content}</textarea>
        <button type="button" class="dynamic-list__remove" onclick="Components.removeStep(this)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `;
  },

  // ============================================
  // Nutrition Inputs
  // ============================================
  nutritionInputs(data = null) {
    const cal = data?.cal || 0;
    const hc = data?.hc || 0;
    const prot = data?.proteinas || 0;
    const fat = data?.grasas || 0;

    return `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <div class="form-group">
          <label class="form-label">${T.nutrition.calories}</label>
          <input type="number" name="nut_cal" class="form-input" 
                 value="${cal}" min="0" placeholder="0">
        </div>
        <div class="form-group">
          <label class="form-label">${T.nutrition.carbs} (g)</label>
          <input type="number" name="nut_hc" class="form-input" 
                 value="${hc}" min="0" placeholder="0">
        </div>
        <div class="form-group">
          <label class="form-label">${T.nutrition.protein} (g)</label>
          <input type="number" name="nut_proteinas" class="form-input" 
                 value="${prot}" min="0" placeholder="0">
        </div>
        <div class="form-group">
          <label class="form-label">${T.nutrition.fat} (g)</label>
          <input type="number" name="nut_grasas" class="form-input" 
                 value="${fat}" min="0" placeholder="0">
        </div>
      </div>
    `;
  },

  // ============================================
  // Recipe Selector (for modal)
  // ============================================
  recipeSelector(recipes, onSelect, mealType = null) {
    if (recipes.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state__icon">📚</div>
          <div class="empty-state__title">${T.recipe.sinRecetas}</div>
          <p>${T.recipe.sinRecetasHint}</p>
        </div>
      `;
    }

    const cards = recipes.map(r => `
      <div class="recipe-card" onclick="App.selectRecipeForMeal('${r.id}')">
        ${this.recipeCard(r)}
      </div>
    `).join('');

    // Filter tabs
    const showFilters = true;
    const filterTabs = showFilters ? `
      <div class="filter-tabs" id="meal-type-filter">
        <button class="filter-tab active" data-filter="all">${T.filter.all}</button>
        <button class="filter-tab" data-filter="almuerzo">${T.filter.almuerzo}</button>
        <button class="filter-tab" data-filter="cena">${T.filter.cena}</button>
      </div>
    ` : '';

    return `
      ${filterTabs}
      <div class="search-bar">
        <input type="text" id="recipe-search" class="form-input" 
               placeholder="${T.actions.search}" oninput="App.filterRecipes()">
      </div>
      <div id="recipe-list">
        ${cards}
      </div>
    `;
  },

  // ============================================
  // Empty State
  // ============================================
  emptyState(icon, title, hint) {
    return `
      <div class="empty-state">
        <div class="empty-state__icon">${icon}</div>
        <div class="empty-state__title">${title}</div>
        <p>${hint}</p>
      </div>
    `;
  },

  // ============================================
  // Recipe Icon based on tags
  // ============================================
  getRecipeIcon(tags) {
    if (!tags || tags.length === 0) return '🍽️';
    
    if (tags.includes('vegetariana') || tags.includes('vegana')) return '🥗';
    if (tags.includes('desayuno')) return '🥣';
    if (tags.includes('baja en carbs')) return '🥩';
    if (tags.includes('rápida')) return '⚡';
    
    return '🍽️';
  },

  // ============================================
  // Dynamic Actions
  // ============================================
  addIngredient() {
    const list = document.getElementById('ingredients-list');
    const row = document.createElement('div');
    row.innerHTML = this.ingredientRow();
    list.appendChild(row.firstElementChild);
  },

  addStep() {
    const list = document.getElementById('steps-list');
    const num = list.children.length + 1;
    const row = document.createElement('div');
    row.innerHTML = this.stepRow('', num);
    list.appendChild(row.firstElementChild);
  },

  removeRow(btn) {
    const list = btn.closest('.dynamic-list');
    if (list.children.length > 1) {
      btn.closest('.dynamic-list__item').remove();
    }
  },

  removeStep(btn) {
    const list = document.getElementById('steps-list');
    if (list.children.length > 1) {
      btn.closest('.dynamic-list__item').remove();
      // Renumber remaining steps
      Array.from(list.children).forEach((item, i) => {
        item.querySelector('.step-number').textContent = i + 1;
      });
    }
  },

  async buscarNutrientes() {
    const form = document.getElementById('recipe-form');
    const nombre = form.querySelector('[name="nombre"]').value;
    
    if (!nombre) {
      this.toast.show(T.validation.nameRequired);
      return;
    }

    // Collect ingredients
    const ingredients = [];
    const names = form.querySelectorAll('[name="ing_nombre[]"]');
    const quantities = form.querySelectorAll('[name="ing_cantidad[]"]');
    const units = form.querySelectorAll('[name="ing_unidad[]"]');

    names.forEach((input, i) => {
      if (input.value.trim()) {
        ingredients.push({
          nombre: input.value.trim(),
          cantidad: quantities[i].value.trim(),
          unidad: units[i].value
        });
      }
    });

    if (ingredients.length === 0) {
      this.toast.show(T.validation.ingredientsRequired);
      return;
    }

    // Show loading
    const nutritionDiv = document.getElementById('nutrition-manual');
    nutritionDiv.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <div class="spinner" style="margin: 0 auto;"></div>
        <p style="margin-top: 10px;">${T.nutrition.searching}</p>
      </div>
    `;

    try {
      const result = await Nutrition.calculateFromIngredients(ingredients);
      
      // Update form inputs
      form.querySelector('[name="nut_cal"]').value = result.totals.cal;
      form.querySelector('[name="nut_hc"]').value = result.totals.hc;
      form.querySelector('[name="nut_proteinas"]').value = result.totals.proteinas;
      form.querySelector('[name="nut_grasas"]').value = result.totals.grasas;

      if (result.errors.length > 0) {
        this.toast.show(`${T.nutrition.notFound}: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      console.error('Error calculating nutrition:', error);
      this.toast.show(T.toast.error);
    }
  },

  // ============================================
  // Helpers
  // ============================================
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
