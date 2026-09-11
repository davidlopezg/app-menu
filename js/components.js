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

    // Imagen si existe, si no emoji
    const thumb = recipe.imagen
      ? `<img class="recipe-card__img" src="${this.escapeHtml(recipe.imagen)}" alt="" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
      : '';
    const iconFallback = `<div class="recipe-card__icon" style="${recipe.imagen ? 'display:none' : ''}">${icon}</div>`;

    return `
      <div class="recipe-card" data-recipe-id="${recipe.id}">
        ${thumb}${iconFallback}
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
  // Tags field (chips clickeables)
  // ============================================
  _tagsField(currentTags) {
    // Tags reconocidos por el panel nutricional (ordenados por categoría)
    const suggested = [
      // Categorías nutricionales (las que usa el panel)
      ...NutritionPanel.CATEGORIES.map(c => ({ tag: c.tagKey, label: c.label, icon: c.icon })),
      { tag: 'verdura',     label: 'Verdura',     icon: '🥬' },
      { tag: 'fritura',     label: 'Fritura',     icon: '🔥' },
      // Tags de uso general
      { tag: 'vegetariana', label: 'Vegetariana', icon: '🥗' },
      { tag: 'vegana',      label: 'Vegana',      icon: '🌱' },
      { tag: 'sin gluten',  label: 'Sin gluten',  icon: '🌾' },
      { tag: 'rápida',      label: 'Rápida',      icon: '⚡' },
    ];

    const cur = (currentTags || []).map(t => String(t));
    const suggestedTags = new Set(suggested.map(s => s.tag));
    const customTags = cur.filter(t => !suggestedTags.has(t));

    const renderChip = (tag, label, icon, isOn) => `
      <button type="button" class="tag-chip ${isOn ? 'tag-chip--on' : ''}"
              data-tag="${this.escapeHtml(tag)}"
              onclick="Components.toggleTag(this)">
        <span class="tag-chip__icon">${icon}</span>
        <span>${label}</span>
      </button>
    `;

    const suggestedChips = suggested
      .map(s => renderChip(s.tag, s.label, s.icon, cur.includes(s.tag)))
      .join('');

    const customChips = customTags
      .map(t => renderChip(t, t, '🏷️', true))
      .join('');

    return `
      <div class="tags-field" id="tags-field">
        <div class="tags-field__group">
          <div class="tags-field__label">Para el panel nutricional:</div>
          <div class="tags-field__chips">${suggestedChips}</div>
        </div>
        ${customTags.length ? `
          <div class="tags-field__group">
            <div class="tags-field__label">Custom:</div>
            <div class="tags-field__chips">${customChips}</div>
          </div>
        ` : ''}
        <div class="tags-field__add">
          <input type="text" id="tag-custom-input" class="form-input form-input--sm"
                 placeholder="Agregar tag custom y Enter"
                 onkeydown="if(event.key==='Enter'){event.preventDefault();Components.addCustomTag();}">
        </div>
        <input type="hidden" name="tags" id="tags-hidden" value="${this.escapeHtml(cur.join(','))}">
      </div>
    `;
  },

  // Toggle de un chip (sugerido o custom)
  toggleTag(chip) {
    const field = document.getElementById('tags-field');
    if (!field) return;
    chip.classList.toggle('tag-chip--on');
    Components._syncTagsHidden(field);
  },

  // Agrega un tag custom desde el input
  addCustomTag() {
    const input = document.getElementById('tag-custom-input');
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    // Si ya existe, no duplicar
    if (document.querySelector(`.tag-chip[data-tag="${CSS.escape(val)}"]`)) {
      input.value = '';
      return;
    }
    const field = document.getElementById('tags-field');
    // Insertar en el grupo "Custom" (o crearlo)
    let customGroup = field.querySelector('.tags-field__group:nth-of-type(2) .tags-field__chips');
    if (!customGroup) {
      const group = document.createElement('div');
      group.className = 'tags-field__group';
      group.innerHTML = '<div class="tags-field__label">Custom:</div><div class="tags-field__chips"></div>';
      const chips = group.querySelector('.tags-field__chips');
      field.querySelector('.tags-field__add').before(group);
      customGroup = chips;
    }
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'tag-chip tag-chip--on';
    chip.dataset.tag = val;
    chip.onclick = function() { Components.toggleTag(this); };
    chip.innerHTML = `<span class="tag-chip__icon">🏷️</span><span>${this.escapeHtml(val)}</span>`;
    customGroup.appendChild(chip);
    input.value = '';
    this._syncTagsHidden(field);
  },

  // Sincroniza el hidden input con los chips activos
  _syncTagsHidden(field) {
    const active = Array.from(field.querySelectorAll('.tag-chip--on'))
      .map(c => c.dataset.tag);
    const hidden = document.getElementById('tags-hidden');
    if (hidden) hidden.value = active.join(',');
  },

  // ============================================
  // Recipe Form
  // ============================================
  recipeForm(recipe = null, isEdit = false) {
    const title = isEdit ? T.recipe.editRecipe : T.recipe.newRecipe;
    const name = recipe ? this.escapeHtml(recipe.nombre) : '';
    const existingNutrition = recipe ? recipe.nutricion : null;
    const existingTags = recipe && recipe.tags ? recipe.tags.join(', ') : '';
    const existingTipo = recipe ? (recipe.tipoComida || 'ambos') : 'ambos';
    const existingImg = recipe && recipe.imagen ? this.escapeHtml(recipe.imagen) : '';
    const existingLink = recipe && recipe.link ? this.escapeHtml(recipe.link) : '';

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

    // Tipo de comida
    const tipos = [
      { v: 'almuerzo', l: T.filter.almuerzo },
      { v: 'cena',     l: T.filter.cena },
      { v: 'ambos',    l: T.filter.all },
    ];
    const tipoRadios = tipos.map(t => `
      <label class="radio-pill">
        <input type="radio" name="tipoComida" value="${t.v}" ${existingTipo === t.v ? 'checked' : ''}>
        <span>${t.l}</span>
      </label>
    `).join('');

    return `
      <form id="recipe-form" class="recipe-form"
            onsubmit="event.preventDefault(); App.saveRecipe(${isEdit});">
        <input type="hidden" name="id" value="${recipe?.id || ''}">

        <div class="form-group">
          <label class="form-label">${T.recipe.recipeName}</label>
          <input type="text" name="nombre" class="form-input"
                 value="${name}" required
                 placeholder="${T.recipe.namePlaceholder}">
        </div>

        <div class="form-group">
          <label class="form-label">Imagen</label>
          <div class="image-field">
            <div class="image-field__preview" id="img-preview">
              ${existingImg ? `<img src="${existingImg}" alt="">` : '<span class="image-field__placeholder">🍽️</span>'}
            </div>
            <div class="image-field__controls">
              <input type="file" id="img-file" accept="image/*" capture="environment"
                     style="display:none" onchange="Components.handleImageUpload(this)">
              <button type="button" class="btn btn--outline btn--sm"
                      onclick="document.getElementById('img-file').click()">
                📷 Subir foto
              </button>
              <button type="button" class="btn btn--ghost btn--sm"
                      onclick="Components.clearImage()">
                Quitar
              </button>
              <input type="url" name="imagen" id="img-url" class="form-input"
                     value="${existingImg}" placeholder="o pegá una URL"
                     style="margin-top: 8px;"
                     oninput="Components.previewImageUrl(this.value)">
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Tags</label>
          ${this._tagsField(recipe?.tags || [])}
          <div class="form-hint">
            Tags se usan para filtrar y para el panel nutricional. Tocá los sugeridos
            o escribí uno custom y dale Enter.
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Enlace (receta original)</label>
          <input type="url" name="link" class="form-input"
                 value="${existingLink}"
                 placeholder="https://www.ejemplo.com/receta">
          <div class="form-hint">Link al blog, video o receta original.</div>
        </div>

        <div class="form-group">
          <label class="form-label">Tipo de comida</label>
          <div class="radio-pills">${tipoRadios}</div>
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

  // ============================================
  // Image handling
  // ============================================
  previewImageUrl(url) {
    const preview = document.getElementById('img-preview');
    if (!preview) return;
    if (url && /^https?:\/\//.test(url)) {
      preview.innerHTML = `<img src="${this.escapeHtml(url)}" alt="">`;
    } else if (!url) {
      preview.innerHTML = '<span class="image-field__placeholder">🍽️</span>';
    }
  },

  clearImage() {
    const preview = document.getElementById('img-preview');
    const urlInput = document.getElementById('img-url');
    const fileInput = document.getElementById('img-file');
    if (preview) preview.innerHTML = '<span class="image-field__placeholder">🍽️</span>';
    if (urlInput) urlInput.value = '';
    if (fileInput) fileInput.value = '';
  },

  async handleImageUpload(input) {
    const file = input.files && input.files[0];
    if (!file) return;

    // Preview local mientras sube
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById('img-preview');
      if (preview) preview.innerHTML = `<img src="${e.target.result}" alt="">`;
    };
    reader.readAsDataURL(file);

    this.toast.show('Subiendo imagen...');

    try {
      // Subir a Supabase Storage (la anon key tiene policy permisiva en recipe-images)
      const url = await this.uploadToStorage(file);
      if (url) {
        const urlInput = document.getElementById('img-url');
        if (urlInput) urlInput.value = url;
        const preview = document.getElementById('img-preview');
        if (preview) preview.innerHTML = `<img src="${url}" alt="">`;
        this.toast.show('✅ Imagen subida');
      } else {
        this.toast.show('❌ Error subiendo imagen');
      }
    } catch (err) {
      console.error('Upload error:', err);
      this.toast.show('❌ Error: ' + (err.message || err));
    }
  },

  async uploadToStorage(file) {
    const SUPABASE_URL = (typeof DB !== 'undefined' && DB.SUPABASE_URL) || 'https://flpxuyrtdmkqzzdcjqbr.supabase.co';
    const SUPABASE_KEY = (typeof DB !== 'undefined' && DB.SUPABASE_KEY) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZscHh1eXJ0ZG1rcXp6ZGNqcWJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NzE1MDcsImV4cCI6MjEwNDU0NzUwN30.dA9CmjXMkduZjDPUZw29IDPG3lPiSn-BrH3neGEzDxw';
    const BUCKET = 'recipe-images';

    const ext = (file.name.match(/\.[a-zA-Z0-9]+$/) || ['.jpg'])[0];
    const remoteName = `recetas/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${remoteName}`);
      xhr.setRequestHeader('apikey', SUPABASE_KEY);
      xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_KEY}`);
      xhr.setRequestHeader('Content-Type', file.type || 'image/jpeg');
      xhr.setRequestHeader('x-upsert', 'true');
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(`${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${remoteName}`);
        } else {
          console.error('Storage upload failed:', xhr.status, xhr.responseText);
          reject(new Error(`HTTP ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(file);
    });
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
  // Shopping List
  // ============================================
  renderShoppingList(ingredients) {
    if (ingredients.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state__icon">🛒</div>
          <div class="empty-state__title">${T.menu.shoppingListEmpty}</div>
        </div>
      `;
    }

    const items = ingredients.map((ing, i) => `
      <li class="shopping-item" data-index="${i}">
        <label class="shopping-item__label">
          <input type="checkbox" class="shopping-item__checkbox">
          <span class="shopping-item__text">
            <span class="shopping-item__name">${this.escapeHtml(ing.nombre)}</span>
            <span class="shopping-item__qty">${ing.cantidad} ${T.units[ing.unidad] || ing.unidad}</span>
          </span>
        </label>
      </li>
    `).join('');

    return `
      <div class="shopping-list">
        <div class="shopping-list__header">
          <button class="btn btn--secondary btn--sm" onclick="Components.copyShoppingList(${ingredients.length})">
            📋 ${T.menu.copyList}
          </button>
        </div>
        <ul class="shopping-list__items">
          ${items}
        </ul>
      </div>
    `;
  },

  copyShoppingList(itemCount) {
    const ingredients = Menu.getShoppingList();
    const text = ingredients.map(ing => 
      `- ${ing.nombre}: ${ing.cantidad} ${T.units[ing.unidad] || ing.unidad}`
    ).join('\n');

    navigator.clipboard.writeText(text).then(() => {
      this.toast.show(T.menu.listCopied);
    }).catch(() => {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.toast.show(T.menu.listCopied);
    });
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
