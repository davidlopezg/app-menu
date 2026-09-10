// ============================================
// Templates — Plantillas de menú reutilizables
// ============================================
// Una sola plantilla (la idea es simple: una que armás y aplicás cuando
// quieras). Si en el futuro querés múltiples, se extiende cambiando
// _currentId por una lista. La estructura `dias` es la misma que usa
// Menu para una semana, así "aplicar" es solo copiar.

const Templates = {
  _list: null,        // array de templates en localStorage
  _currentId: null,   // id de la plantilla activa (la única por ahora)

  init() {
    this._list = Store.get(Store.KEYS.TEMPLATES) || [];
    if (this._list.length === 0) {
      // No crear automáticamente — la plantilla se crea a propósito
      // con "Guardar como plantilla" desde una semana.
    } else {
      this._currentId = this._list[0].id;
    }
  },

  _save() {
    Store.set(Store.KEYS.TEMPLATES, this._list);
  },

  // ============================================
  // CRUD
  // ============================================

  // ¿Hay una plantilla guardada?
  hasAny() {
    return this._list.length > 0;
  },

  // Devuelve la plantilla activa (o null si no hay)
  getCurrent() {
    if (!this._currentId) return null;
    return this._list.find(t => t.id === this._currentId) || null;
  },

  // Crea una plantilla a partir de la estructura de una semana.
  // weekData tiene la forma { monday: {lunch, dinner}, ... }.
  createFromWeek(weekData, nombre = 'Mi plantilla', descripcion = '') {
    const tpl = {
      id: Store.uuid(),
      nombre,
      descripcion,
      dias: this._cloneWeek(weekData),
      updatedAt: new Date().toISOString(),
    };
    this._list = [tpl];   // solo una por ahora
    this._currentId = tpl.id;
    this._save();
    return tpl;
  },

  // Sobrescribe la plantilla activa con una semana (sin cambiar id)
  overwriteFromWeek(weekData) {
    const cur = this.getCurrent();
    if (!cur) return this.createFromWeek(weekData);
    cur.dias = this._cloneWeek(weekData);
    cur.updatedAt = new Date().toISOString();
    this._save();
    return cur;
  },

  // Actualiza el nombre y descripción
  updateMeta(nombre, descripcion) {
    const cur = this.getCurrent();
    if (!cur) return;
    if (nombre !== undefined) cur.nombre = nombre;
    if (descripcion !== undefined) cur.descripcion = descripcion;
    cur.updatedAt = new Date().toISOString();
    this._save();
  },

  // Asigna una receta a un día/comida de la plantilla
  assign(day, mealType, recipeId) {
    const cur = this.getCurrent();
    if (!cur) return false;
    if (!cur.dias[day]) cur.dias[day] = { lunch: null, dinner: null };
    cur.dias[day][mealType] = recipeId;
    cur.updatedAt = new Date().toISOString();
    this._save();
    return true;
  },

  // Saca una receta de un día/comida
  remove(day, mealType) {
    const cur = this.getCurrent();
    if (!cur || !cur.dias[day]) return false;
    cur.dias[day][mealType] = null;
    cur.updatedAt = new Date().toISOString();
    this._save();
    return true;
  },

  // Borra la plantilla entera
  deleteCurrent() {
    if (!this._currentId) return;
    this._list = this._list.filter(t => t.id !== this._currentId);
    this._currentId = this._list[0]?.id || null;
    this._save();
  },

  // ============================================
  // Aplicar / Duplicar
  // ============================================

  // Aplica la plantilla a la semana actual (sobrescribe)
  applyToCurrentWeek() {
    const cur = this.getCurrent();
    if (!cur) return false;
    const wk = Store.getWeekKey();
    Menu._menu[wk] = this._cloneWeek(cur.dias);
    Menu._save();
    return true;
  },

  // Duplica la semana actual a otra semana específica (sobrescribe)
  duplicateCurrentWeekTo(targetWeekKey) {
    const source = Menu.getCurrentWeek();
    Menu._menu[targetWeekKey] = this._cloneWeek(source);
    Menu._save();
    return true;
  },

  // Deep clone de la estructura de una semana (evita aliasing)
  _cloneWeek(week) {
    const out = {};
    Store.getDaysOrder().forEach(day => {
      out[day] = {
        lunch: week?.[day]?.lunch ?? null,
        dinner: week?.[day]?.dinner ?? null,
      };
    });
    return out;
  },

  // Helper: arma la lista de semanas pasadas/futuras cercanas para
  // el dropdown de "Duplicar a otra semana". Devuelve [{key, label}].
  getNearbyWeeks(weeksAround = 4) {
    const out = [];
    const now = new Date();
    for (let i = -weeksAround; i <= weeksAround; i++) {
      if (i === 0) continue;   // saltar la actual
      const d = new Date(now);
      d.setDate(d.getDate() + i * 7);
      const key = Store.getWeekKey(d);
      const monday = new Date(d);
      const dayOfWeek = monday.getDay();
      const diff = monday.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      monday.setDate(diff);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const fmt = { day: 'numeric', month: 'short' };
      const label = `${monday.toLocaleDateString('es-ES', fmt)} - ${sunday.toLocaleDateString('es-ES', { ...fmt, year: 'numeric' })}`;
      out.push({ key, label });
    }
    return out;
  },
};
