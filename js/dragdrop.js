// ============================================
// DragDrop — arrastrar recetas entre celdas (menú y plantilla)
// ============================================
// UX:
//   - Mouse / trackpad: arrastrar directamente.
//   - Toque: mantener apretado ~250 ms (la celda vibra y se marca) y
//     arrastrar. Un toque corto sigue siendo el toque normal (abrir menú).
//   - Soltar sobre otra celda: mueve si la destino está vacía, intercambia
//     si ya tiene receta.
//   - Un toque normal NO se ve afectado: el click sigue funcionando.
//
// Se usa Pointer Events (funciona igual en mouse y en dedo) + un listener
// `touchmove` no-pasivo para bloquear el scroll del dedo durante el arrastre.

const DragDrop = {
  LONG_PRESS_MS: 250,
  THRESHOLD: 8,        // px para empezar a arrastrar con mouse
  SCROLL_TOLERANCE: 12, // px: si el dedo se mueve esto antes del long press → es scroll

  _pointerId: null,
  _startX: 0,
  _startY: 0,
  _cell: null,
  _onDrop: null,
  _armed: false,
  _dragging: false,
  _ghost: null,
  _target: null,
  _timer: null,
  _touchBlocker: null,
  _ignoreClickUntil: 0,

  // Listeners con `this` atado (si se pasan sueltos, `this` sería el
  // elemento que dispara el evento, no DragDrop).
  _onMove: null,
  _onUp: null,
  _onCancel: null,

  // ------------------------------------------------------------
  // API
  // ------------------------------------------------------------

  // attach(root, { onDrop }) — engancha todas las celdas de root
  attach(root, opts = {}) {
    if (!root) return;
    root.querySelectorAll('.meal-cell').forEach(cell => {
      cell.addEventListener('pointerdown', (e) => this._down(e, cell, opts.onDrop));
    });
  },

  // ¿Hay que ignorar el click que viene después de un arrastre?
  shouldIgnoreClick() {
    return Date.now() < this._ignoreClickUntil;
  },

  // ------------------------------------------------------------
  // Gesto
  // ------------------------------------------------------------
  _down(e, cell, onDrop) {
    if (this._pointerId !== null) return;            // ya hay un gesto en curso
    if (e.button != null && e.button !== 0) return;  // solo botón principal
    if (!cell.dataset.recipeId) return;               // solo celdas con receta

    this._onMove = (ev) => this._move(ev);
    this._onUp = (ev) => this._up(ev);
    this._onCancel = () => this._cancel();

    this._pointerId = e.pointerId;
    this._startX = e.clientX;
    this._startY = e.clientY;
    this._cell = cell;
    this._onDrop = onDrop;
    this._armed = false;
    this._dragging = false;

    document.addEventListener('pointermove', this._onMove, { passive: false });
    document.addEventListener('pointerup', this._onUp);
    document.addEventListener('pointercancel', this._onCancel);

    // En dedo: long press para "levantar" la receta (si no, es un scroll)
    if (e.pointerType !== 'mouse') {
      this._timer = setTimeout(() => {
        this._timer = null;
        if (this._dragging || !this._cell) return;
        this._armed = true;
        this._cell.classList.add('meal-cell--armed');
        if (navigator.vibrate) navigator.vibrate(12);
      }, this.LONG_PRESS_MS);
    }
  },

  _move(e) {
    if (e.pointerId !== this._pointerId) return;
    const dist = Math.hypot(e.clientX - this._startX, e.clientY - this._startY);

    if (!this._dragging) {
      if (e.pointerType !== 'mouse') {
        // Con dedo: si se movió antes del long press, es scroll → cancelar
        if (!this._armed) {
          if (dist > this.SCROLL_TOLERANCE) this._clearTimer();
          return;
        }
      } else if (dist < this.THRESHOLD) {
        return;
      }
      this._start();
    }

    e.preventDefault();
    this._moveGhost(e.clientX, e.clientY);
    this._updateTarget(e.clientX, e.clientY);
  },

  _up(e) {
    if (e.pointerId !== this._pointerId) return;

    const wasDragging = this._dragging;
    const from = this._cell ? { day: this._cell.dataset.day, meal: this._cell.dataset.meal } : null;
    const to = this._target ? { day: this._target.dataset.day, meal: this._target.dataset.meal } : null;
    const recipeId = this._cell ? this._cell.dataset.recipeId : null;
    const onDrop = this._onDrop;

    this._cleanup();

    if (wasDragging && from && to && onDrop) {
      // el click que dispara el pointerup no debe abrir el modal
      this._ignoreClickUntil = Date.now() + 400;
      onDrop({ from, to, recipeId });
    }
  },

  _cancel() {
    this._cleanup();
  },

  // ------------------------------------------------------------
  // Arrastre
  // ------------------------------------------------------------
  _start() {
    const cell = this._cell;
    if (!cell) return;
    this._dragging = true;
    cell.classList.remove('meal-cell--armed');
    cell.classList.add('meal-cell--drag-source');

    const rect = cell.getBoundingClientRect();
    const ghost = cell.cloneNode(true);
    ghost.classList.add('meal-cell--ghost');
    ghost.style.width = rect.width + 'px';
    ghost.style.height = rect.height + 'px';
    ghost.style.left = rect.left + 'px';
    ghost.style.top = rect.top + 'px';
    document.body.appendChild(ghost);
    this._ghost = ghost;
    this._offsetX = this._startX - rect.left;
    this._offsetY = this._startY - rect.top;
    this._moveGhost(this._startX, this._startY);

    // Bloquear el scroll del dedo mientras se arrastra
    this._touchBlocker = (ev) => { if (this._dragging) ev.preventDefault(); };
    document.addEventListener('touchmove', this._touchBlocker, { passive: false });
  },

  _moveGhost(x, y) {
    if (!this._ghost) return;
    this._ghost.style.left = (x - this._offsetX) + 'px';
    this._ghost.style.top = (y - this._offsetY) + 'px';
  },

  _updateTarget(x, y) {
    const el = document.elementFromPoint(x, y);
    const cell = el && el.closest ? el.closest('.meal-cell') : null;
    if (cell === this._target) return;

    if (this._target) this._target.classList.remove('meal-cell--drop-target');
    this._target = (cell && cell !== this._cell) ? cell : null;
    if (this._target) this._target.classList.add('meal-cell--drop-target');
  },

  _cleanup() {
    this._clearTimer();
    document.removeEventListener('pointermove', this._onMove);
    document.removeEventListener('pointerup', this._onUp);
    document.removeEventListener('pointercancel', this._onCancel);
    if (this._touchBlocker) {
      document.removeEventListener('touchmove', this._touchBlocker);
      this._touchBlocker = null;
    }
    if (this._ghost) { this._ghost.remove(); this._ghost = null; }
    if (this._cell) {
      this._cell.classList.remove('meal-cell--drag-source', 'meal-cell--armed');
    }
    if (this._target) this._target.classList.remove('meal-cell--drop-target');

    this._pointerId = null;
    this._cell = null;
    this._target = null;
    this._ghost = null;
    this._onDrop = null;
    this._armed = false;
    this._dragging = false;
  },

  _clearTimer() {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
  },
};
