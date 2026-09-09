// ============================================
// DB — Supabase (sync + realtime + whitelist auth)
// ============================================
// Auth: tabla `usuarios` con los emails permitidos (whitelist simple).
// Sync: pull/push automático de recipes y menu_weeks.
// Realtime: cambios del otro móvil aparecen al instante.
//
// ⚠️ CONFIGURAR: editá SUPABASE_URL y SUPABASE_ANON_KEY abajo.

const SUPABASE_URL  = 'https://flpxuyrtdmkqzzdcjqbr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZscHh1eXJ0ZG1rcXp6ZGNqcWJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NzE1MDcsImV4cCI6MjEwNDU0NzUwN30.dA9CmjXMkduZjDPUZw29IDPG3lPiSn-BrH3neGEzDxw';

const DB = {
  client: null,
  _channel: null,
  _pulling: false,   // evita loops cuando pullAll dispara Store.set

  USER_KEY: 'menuapp_user',   // localStorage key de la "sesión" (email del usuario)

  // ============================================
  // Init
  // ============================================
  async init() {
    if (!window.supabase) {
      console.error('Supabase SDK not loaded — ¿falló la CDN?');
      return false;
    }
    try {
      this.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
    } catch (err) {
      console.error('Error creando cliente Supabase:', err);
      return false;
    }

    // Si ya hay un usuario "logueado", sincronizar datos y suscribirse a realtime
    if (this.isAuth()) {
      await this.pullAll();
      this.subscribe();
    }

    // Hookear cambios locales → push a Supabase (idempotente)
    Store.registerSyncHook(Store.KEYS.RECIPES, (recipes) => DB.pushRecipes(recipes));
    Store.registerSyncHook(Store.KEYS.MENU,    (menu)    => DB.pushMenu(menu));

    return true;
  },

  // ============================================
  // Auth — whitelist simple
  // ============================================
  async signIn(email, password) {
    if (!this.client) return false;
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      Components.toast.show('Email inválido');
      return false;
    }
    if (!password) {
      Components.toast.show('Contraseña requerida');
      return false;
    }

    // Llama a la función RPC del server, que valida email + password
    // con bcrypt. La tabla `usuarios` no se expone al cliente.
    const { data, error } = await this.client.rpc('login_user', {
      user_email: cleanEmail,
      user_password: password
    });

    if (error) {
      Components.toast.show('❌ ' + error.message);
      return false;
    }

    if (!data || data.length === 0) {
      Components.toast.show('❌ Email o contraseña incorrectos');
      return false;
    }

    const user = data[0];

    // Login OK — guardar "sesión" en localStorage y arrancar sync
    localStorage.setItem(this.USER_KEY, JSON.stringify({
      email: user.email,
      nombre: user.nombre,
      loginAt: new Date().toISOString()
    }));

    await this.pullAll();
    this.subscribe();

    Components.toast.show(`✅ Bienvenido, ${user.nombre || user.email}`);
    return true;
  },

  async signOut() {
    localStorage.removeItem(this.USER_KEY);
    Store.remove(Store.KEYS.RECIPES);
    Store.remove(Store.KEYS.MENU);
    if (typeof Recipes !== 'undefined') Recipes._recipes = null;
    if (typeof Menu !== 'undefined')    Menu._menu = null;
    this._unsubscribe();
  },

  // ¿Hay un usuario "logueado" en localStorage?
  isAuth() {
    try {
      const data = JSON.parse(localStorage.getItem(this.USER_KEY) || 'null');
      return !!(data && data.email);
    } catch {
      return false;
    }
  },

  // Alias async para mantener compatibilidad con código viejo
  async _isAuthed() {
    return this.isAuth();
  },

  async getUserEmail() {
    try {
      const data = JSON.parse(localStorage.getItem(this.USER_KEY) || 'null');
      return data?.email || null;
    } catch {
      return null;
    }
  },

  async getUserName() {
    try {
      const data = JSON.parse(localStorage.getItem(this.USER_KEY) || 'null');
      return data?.nombre || null;
    } catch {
      return null;
    }
  },

  // ============================================
  // Pull (Supabase → localStorage + cache en memoria)
  // ============================================
  async pullAll() {
    if (!this.client) return;
    this._pulling = true;
    try {
      const [{ data: recipes, error: e1 }, { data: weeks, error: e2 }] = await Promise.all([
        this.client.from('recipes').select('*'),
        this.client.from('menu_weeks').select('*')
      ]);
      if (e1) console.error('pull recipes:', e1);
      if (e2) console.error('pull weeks:', e2);

      if (recipes) {
        const mapped = recipes.map(r => ({
          id: r.id,
          nombre: r.nombre,
          ingredientes: r.ingredientes || [],
          pasos: r.pasos || [],
          nutricion: r.nutricion || {},
          tipoComida: r.tipo_comida,
          imagen: r.imagen || '',
          tags: r.tags || [],
          link: r.link || '',
          fechaCreacion: r.fecha_creacion
        }));
        Store.set(Store.KEYS.RECIPES, mapped);   // _pulling=true → no dispara push
        if (typeof Recipes !== 'undefined') Recipes._recipes = mapped;
      }

      if (weeks) {
        const menu = {};
        weeks.forEach(w => { menu[w.week_key] = w.data; });
        Store.set(Store.KEYS.MENU, menu);
        if (typeof Menu !== 'undefined') {
          Menu._menu = menu;
          if (!Menu._currentWeek) Menu._currentWeek = Store.getWeekKey();
        }
      }
    } finally {
      this._pulling = false;
    }
  },

  // ============================================
  // Push (local → Supabase). Se llama automático desde Store hook.
  // ============================================
  async pushRecipes(recipes) {
    if (!this.client || this._pulling) return;
    if (!this.isAuth()) return;
    if (!recipes || recipes.length === 0) return;
    const rows = recipes.map(r => ({
      id: r.id,
      nombre: r.nombre,
      ingredientes: r.ingredientes,
      pasos: r.pasos,
      nutricion: r.nutricion,
      tipo_comida: r.tipoComida,
      imagen: r.imagen,
      tags: r.tags,
      fecha_creacion: r.fechaCreacion,
      updated_at: new Date().toISOString()
    }));
    const { error } = await this.client.from('recipes').upsert(rows);
    if (error) console.error('pushRecipes:', error);
  },

  async pushMenu(menu) {
    if (!this.client || this._pulling) return;
    if (!this.isAuth()) return;
    const rows = Object.entries(menu).map(([week_key, data]) => ({
      week_key,
      data,
      updated_at: new Date().toISOString()
    }));
    if (rows.length === 0) return;
    const { error } = await this.client.from('menu_weeks').upsert(rows);
    if (error) console.error('pushMenu:', error);
  },

  // ============================================
  // Realtime (Supabase → local). Cuando el otro dispositivo cambia,
  // pullAll y refresca la vista activa.
  // ============================================
  subscribe() {
    if (!this.client || this._channel) return;
    this._channel = this.client
      .channel('menuapp-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes' },
        () => this._onRemoteChange())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_weeks' },
        () => this._onRemoteChange())
      .subscribe();
  },

  _unsubscribe() {
    if (this._channel && this.client) {
      this.client.removeChannel(this._channel);
      this._channel = null;
    }
  },

  async _onRemoteChange() {
    await this.pullAll();
    if (typeof App !== 'undefined') {
      if (App.currentView === 'menu')    App.renderMenuView();
      else if (App.currentView === 'recipes') App.renderRecipesView();
    }
  },

  // ============================================
  // UI — Vista de login (si no hay sesión al iniciar)
  // ============================================
  renderSignInView() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <div class="signin-view">
        <div class="signin-card">
          <div class="signin-card__icon">🍽️</div>
          <h2 class="signin-card__title">Menú Semanal</h2>
          <p class="signin-card__hint">Ingresá tu email y contraseña. Solo David y María tienen acceso.</p>
          <input type="email" id="signin-email" class="form-input"
                 placeholder="david@email.com" autocomplete="email"
                 style="margin-bottom: 12px;">
          <input type="password" id="signin-password" class="form-input"
                 placeholder="••••••" autocomplete="current-password"
                 style="margin-bottom: 16px;">
          <button class="btn btn--primary btn--full" id="signin-btn">
            Entrar
          </button>
        </div>
      </div>
    `;
    document.getElementById('signin-btn').addEventListener('click', () => DB.submitSignIn());
    document.getElementById('signin-password').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') DB.submitSignIn();
    });
    document.getElementById('signin-email').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('signin-password').focus();
    });
    // Ocultar chrome: tabs + menú hamburguesa
    const nav = document.getElementById('nav-tabs');
    if (nav) nav.classList.add('hidden');
    const btnMenu = document.getElementById('btn-menu');
    if (btnMenu) btnMenu.classList.add('hidden');
    const btnBack = document.getElementById('btn-back');
    if (btnBack) btnBack.classList.add('hidden');
  },

  async submitSignIn() {
    const email = (document.getElementById('signin-email')?.value || '').trim();
    const password = document.getElementById('signin-password')?.value || '';
    const ok = await this.signIn(email, password);
    if (ok && typeof App !== 'undefined') {
      // cerrar modal si estaba abierto y refrescar vista
      if (typeof Components !== 'undefined') Components.modal.close();
      if (App.currentView === 'signin' || !App.currentView) App._handleRoute();
      else if (App.currentView === 'menu') App.renderMenuView();
      else if (App.currentView === 'recipes') App.renderRecipesView();
    }
  },

  // ============================================
  // UI — Panel de ajustes
  // ============================================
  async renderSettings() {
    const email = await this.getUserEmail();
    const nombre = await this.getUserName();
    return `
      <div class="sync-settings">
        <div class="card">
          <h3 style="margin-bottom: 16px;">☁️ Sincronización</h3>

          <p style="margin-bottom: 8px;">
            Sesión activa: <strong>${nombre ? nombre + ' (' + email + ')' : (email || '(cargando...)')}</strong>
          </p>
          <p style="color: var(--color-text-muted); margin-bottom: 16px; font-size: 13px;">
            Los cambios se guardan automáticamente en la nube y aparecen al instante
            en el otro dispositivo. No hace falta subir ni bajar nada.
          </p>

          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn btn--secondary" onclick="DB.manualPull()">
              ⬇️ Refrescar desde la nube
            </button>
            <button class="btn btn--danger" onclick="DB.signOutAndConfirm()">
              Cerrar sesión
            </button>
          </div>
        </div>

        <div class="card" style="margin-top: 16px;">
          <h3 style="margin-bottom: 8px;">📱 App</h3>
          <p style="color: var(--color-text-muted); font-size: 13px;">
            Versión: <strong style="color: var(--color-text);">${App.VERSION}</strong>
          </p>
          <p style="color: var(--color-text-muted); font-size: 12px; margin-top: 4px;">
            Si ves funciones que no andan, tocá el botón para forzar la actualización.
          </p>
          <button class="btn btn--outline btn--sm" style="margin-top: 12px;"
                  onclick="DB.forceAppUpdate()">
            🔄 Buscar actualizaciones
          </button>
        </div>

        <div class="card" style="margin-top: 16px;">
          <h3 style="margin-bottom: 8px;">🤖 Agente IA</h3>
          <p style="color: var(--color-text-muted); font-size: 13px; margin-bottom: 12px;">
            Pegá tu API key de MiniMax para usar el agente. Se guarda solo en tu navegador.
          </p>
          <input type="password" id="ai-key-input" class="form-input"
                 placeholder="eyJ..." autocomplete="off"
                 value="${AI.hasKey() ? '••••••••' + AI.key.slice(-8) : ''}">
          <div style="display: flex; gap: 8px; margin-top: 12px;">
            <button class="btn btn--primary btn--sm" onclick="DB.saveAiKey()">
              Guardar
            </button>
            <button class="btn btn--ghost btn--sm" onclick="DB.clearAiKey()">
              Borrar
            </button>
            <button class="btn btn--outline btn--sm" onclick="DB.testAiKey()">
              Probar
            </button>
          </div>
          <p id="ai-status" style="font-size: 12px; margin-top: 12px;"></p>
        </div>
      </div>
    `;
  },

  async manualPull() {
    Components.toast.show('Refrescando...');
    await this.pullAll();
    if (typeof App !== 'undefined') {
      if (App.currentView === 'menu') App.renderMenuView();
      else App._handleRoute();
    }
    Components.modal.close();
    Components.toast.show('✅ Datos actualizados');
  },

  async signOutAndConfirm() {
    if (!confirm('¿Cerrar sesión? Tus datos locales se borrarán hasta volver a entrar.')) return;
    await this.signOut();
    if (typeof App !== 'undefined') {
      App.currentView = 'signin';
      DB.renderSignInView();
    }
  },

  // Fuerza la descarga de la ultima version del SW y recarga.
  async forceAppUpdate() {
    if (!('serviceWorker' in navigator)) {
      Components.toast.show('Tu navegador no soporta actualizaciones automaticas');
      return;
    }
    Components.toast.show('Buscando actualizaciones...');
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        Components.toast.show('No hay service worker registrado');
        return;
      }
      // update() chequea el servidor por un sw.js nuevo
      await reg.update();
      // Si hay un SW esperando, activarlo ya
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      // Si hay uno instalando, el listener updatefound del index.html
      // se va a encargar de recargar cuando termine
      setTimeout(() => {
        Components.toast.show('Si hay una version nueva, la pagina se recargara');
        setTimeout(() => window.location.reload(), 1500);
      }, 1000);
    } catch (err) {
      console.error(err);
      Components.toast.show('Error: ' + err.message);
    }
  },

  // ============================================
  // AI key management
  // ============================================
  saveAiKey() {
    const input = document.getElementById('ai-key-input');
    if (!input) return;
    const val = input.value.trim();
    if (!val) {
      this._aiStatus('⚠️ Pegá una key primero', 'warn');
      return;
    }
    // Si el usuario solo dejo los dots sin cambiarlos, mantener la key actual
    if (val.startsWith('••')) {
      this._aiStatus('✅ Key sin cambios', 'ok');
      return;
    }
    AI.setKey(val);
    // Mostrar la key enmascarada
    input.value = '••••••••' + AI.key.slice(-8);
    this._aiStatus('✅ Key guardada en este navegador', 'ok');
  },

  clearAiKey() {
    AI.setKey('');
    const input = document.getElementById('ai-key-input');
    if (input) input.value = '';
    this._aiStatus('🗑️ Key borrada', 'ok');
  },

  async testAiKey() {
    if (!AI.hasKey()) {
      this._aiStatus('⚠️ No hay key guardada', 'warn');
      return;
    }
    this._aiStatus('⏳ Probando...', 'pending');
    try {
      const text = await AI.call([
        { role: 'system', content: 'Responde SOLO con JSON: {"ok": true}' },
        { role: 'user', content: 'ok?' },
      ], { json: true });
      this._aiStatus('✅ Key funciona. Respuesta: ' + text.slice(0, 80), 'ok');
    } catch (err) {
      this._aiStatus('❌ ' + err.message, 'error');
    }
  },

  _aiStatus(msg, kind) {
    const el = document.getElementById('ai-status');
    if (!el) return;
    el.textContent = msg;
    const colors = { ok: '#28a745', warn: '#ffc107', error: '#dc3545', pending: '#666' };
    el.style.color = colors[kind] || colors.pending;
  }
};
