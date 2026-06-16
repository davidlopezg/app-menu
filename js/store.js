// ============================================
// Store — Estado + localStorage
// ============================================

const Store = {
  KEYS: {
    RECIPES: 'menuapp_recipes',
    MENU: 'menuapp_menu',
    SETTINGS: 'menuapp_settings'
  },

  // Get item from localStorage
  get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`Store.get error: ${key}`, e);
      return null;
    }
  },

  // Set item in localStorage
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`Store.set error: ${key}`, e);
      return false;
    }
  },

  // Remove item
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      return false;
    }
  },

  // Generate UUID
  uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  // Get current week key (YYYY-WXX)
  getWeekKey(date = new Date()) {
    const year = date.getFullYear();
    const firstDay = new Date(date.getFullYear(), 0, 1);
    const pastDays = (date - firstDay) / 86400000;
    const weekNum = Math.ceil((pastDays + firstDay.getDay() + 1) / 7);
    return `${year}-W${String(weekNum).padStart(2, '0')}`;
  },

  // Get Monday of current week
  getMonday(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  },

  // Format date
  formatDate(date, format = 'short') {
    const d = new Date(date);
    if (format === 'short') {
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  },

  // Parse date from YYYY-MM-DD
  parseDate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  },

  // Day names array
  getDaysOrder() {
    return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  },

  // Meal types
  getMealTypes() {
    return ['lunch', 'dinner'];
  },

  // Clear all data (for debugging)
  clearAll() {
    Object.values(this.KEYS).forEach(key => this.remove(key));
  }
};
