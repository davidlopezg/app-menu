// ============================================
// Menu — Weekly Menu State
// ============================================

const Menu = {
  _menu: null,
  _currentWeek: null,

  // Initialize
  init() {
    this._currentWeek = Store.getWeekKey();
    this._menu = Store.get(Store.KEYS.MENU) || {};
    if (!this._menu[this._currentWeek]) {
      this._menu[this._currentWeek] = this._createEmptyWeek();
      this._save();
    }
  },

  // Create empty week structure
  _createEmptyWeek() {
    const week = {};
    Store.getDaysOrder().forEach(day => {
      week[day] = {
        breakfast: null,
        lunch: null,
        dinner: null
      };
    });
    return week;
  },

  // Save to localStorage
  _save() {
    Store.set(Store.KEYS.MENU, this._menu);
  },

  // Get current week menu
  getCurrentWeek() {
    return this._menu[this._currentWeek] || this._createEmptyWeek();
  },

  // Get week key
  getWeekKey() {
    return this._currentWeek;
  },

  // Set week
  setWeek(weekKey) {
    this._currentWeek = weekKey;
    if (!this._menu[this._currentWeek]) {
      this._menu[this._currentWeek] = this._createEmptyWeek();
      this._save();
    }
  },

  // Navigate week
  prevWeek() {
    const date = this._getWeekDate(this._currentWeek);
    date.setDate(date.getDate() - 7);
    this._currentWeek = Store.getWeekKey(date);
    if (!this._menu[this._currentWeek]) {
      this._menu[this._currentWeek] = this._createEmptyWeek();
      this._save();
    }
  },

  nextWeek() {
    const date = this._getWeekDate(this._currentWeek);
    date.setDate(date.getDate() + 7);
    this._currentWeek = Store.getWeekKey(date);
    if (!this._menu[this._currentWeek]) {
      this._menu[this._currentWeek] = this._createEmptyWeek();
      this._save();
    }
  },

  // Get Monday date from week key
  _getWeekDate(weekKey) {
    const [year, week] = weekKey.split('-W').map(Number);
    const jan1 = new Date(year, 0, 1);
    const days = (week - 1) * 7;
    const monday = new Date(jan1.getTime() + days * 86400000);
    // Adjust for Monday start
    const dayOfWeek = monday.getDay();
    const diff = monday.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    monday.setDate(diff);
    return monday;
  },

  // Assign recipe to day/meal
  assign(day, mealType, recipeId) {
    const week = this.getCurrentWeek();
    week[day][mealType] = recipeId;
    this._menu[this._currentWeek] = week;
    this._save();
    return true;
  },

  // Remove recipe from day/meal
  remove(day, mealType) {
    const week = this.getCurrentWeek();
    week[day][mealType] = null;
    this._menu[this._currentWeek] = week;
    this._save();
    return true;
  },

  // Get recipe for day/meal
  getRecipe(day, mealType) {
    const week = this.getCurrentWeek();
    const recipeId = week[day]?.[mealType];
    if (!recipeId) return null;
    return Recipes.getById(recipeId);
  },

  // Get week label
  getWeekLabel() {
    const monday = this._getWeekDate(this._currentWeek);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const options = { day: 'numeric', month: 'short' };
    const mondayStr = monday.toLocaleDateString('es-ES', options);
    const sundayStr = sunday.toLocaleDateString('es-ES', { ...options, year: 'numeric' });
    
    return `${T.menu.weekOf} ${mondayStr} - ${sundayStr}`;
  },

  // Check if it's current week
  isCurrentWeek() {
    return this._currentWeek === Store.getWeekKey();
  },

  // Get all recipes used in current week
  getUsedRecipeIds() {
    const week = this.getCurrentWeek();
    const ids = [];
    Store.getDaysOrder().forEach(day => {
      Store.getMealTypes().forEach(meal => {
        if (week[day][meal]) {
          ids.push(week[day][meal]);
        }
      });
    });
    return [...new Set(ids)];
  }
};
