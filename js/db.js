// ============================================
// DB — Supabase (auth + sync + realtime)
// ============================================
// Reemplaza a sync.js (GitHub Gist). Supabase hace:
//  • Auth con magic link por email (sin contraseña)
//  • Sincronización automática en cada cambio
//  • Realtime: cambios del otro móvil aparecen al instante
//
// ⚠️ CONFIGURAR: editá SUPABASE_URL y SUPABASE_ANON_KEY abajo.

const SUPABASE_URL  = 'https://flpxuyrtdmkqzzdcjqbr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZscHh1eXJ0ZG1rcXp6ZGNqcWJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NzE1MDcsImV4cCI6MjEwNDU0NzUwN30.dA9CmjXMkduZjDPUZw29IDPG3lPiSn-BrH3neGEzDxw';

const DB = {
  client: null,
  _channel: null,
  _pulling: false,   // evita loops cuando pullAll dispara Store.set

  // ============================================
  // Init
  // ============================================
  async init() {
    if (!window.supabase) {
      console.error('Supabase SDK not loaded');
      return false;
    }
    this.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    });

    // Procesar magic-link callback si la URL trae ?code= o #access_token=
    const { data: { session } } = await this.client.auth.getSession();
    if (session) await this._afterAuth();

    // Reaccionar a login/logout (incluye cuando el usuario toca el magic link)
    this.client.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await this._afterAuth();
        if (typeof Components !== 'undefined') Components.modal.close();
        if (typeof App !== 'undefined') {
          if (App.currentView === 'signin' || !App.currentView) App._handleRoute();
          else if (App.currentView === 'menu') App.renderMenuView();
          else if (App.currentView === 'recipes') App.renderRecipesView();
        }
      } else if (event === 'SIGNED_OUT') {
        Store.remove(Store.KEYS.RECIPES);
        Store.remove(Store.KEYS.MENU);
        if (typeof Recipes !== 'undefined') Recipes._recipes = null;
        if (typeof Menu !== 'undefined')      Menu._menu = null;
        this._unsubscribe();
        if (typeof App !== 'undefined') App.renderSignInView();
      }
    });

    // Hookear cambios locales → push a Supabase (idempotente)
    Store.registerSyncHook(Store.KEYS.RECIPES, (recipes) => DB.pushRecipes(recipes));
    Store.registerSyncHook(Store.KEYS.MENU,    (menu)    => DB.pushMenu(menu));

    return true;
  },

  async _afterAuth() {
    await this.pullAll();
    this.subscribe();
  },

  // ============================================
  // Auth
  // ============================================
  async signIn(email) {
    if (!this.client) return false;
    const { error } = await this.client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname
      }
    });
    if (error) {
      Components.toast.show('❌ ' + error.message);
      return false;
    }
    Components.toast.show('✅ Revisá tu email y tocá el link para entrar');
    return true;
  },

  async signOut() {
    await this.client.auth.signOut();
    // onAuthStateChange se encarga del resto
  },

  isAuth() {
    return !!(this.client && this.client.auth.getSession);
  },

  async getUserEmail() {
    if (!this.client) return null;
    const { data: { user } } = await this.client.auth.getUser();
    return user ? user.email : null;
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
          <p class="signin-card__hint">Ingresá tu email — te enviamos un link mágico para entrar.</p>
          <input type="email" id="signin-email" class="form-input"
                 placeholder="david@email.com" autocomplete="email">
          <button class="btn btn--primary btn--full" id="signin-btn">
            Enviar link
          </button>
        </div>
      </div>
    `;
    document.getElementById('signin-btn').addEventListener('click', () => DB.submitSignIn());
    document.getElementById('signin-email').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') DB.submitSignIn();
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
    const input = document.getElementById('signin-email');
    const email = (input?.value || '').trim();
    if (!email || !email.includes('@')) {
      Components.toast.show('Email inválido');
      return;
    }
    await this.signIn(email);
  },

  // ============================================
  // UI — Panel de ajustes (reemplaza a Sync.renderSettings)
  // ============================================
  async renderSettings() {
    const email = await this.getUserEmail();
    return `
      <div class="sync-settings">
        <div class="card">
          <h3 style="margin-bottom: 16px;">☁️ Sincronización</h3>

          <p style="margin-bottom: 8px;">
            Sesión activa: <strong>${email || '(cargando...)'}</strong>
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
  }
};
