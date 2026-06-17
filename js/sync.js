// ============================================
// Sync — GitHub Gist Synchronization
// ============================================

const Sync = {
  GIST_ID: 'c297536c9c15f7ad42a37a1feb6afba0',
  GIST_API_URL: 'https://api.github.com/gists/c297536c9c15f7ad42a37a1feb6afba0',
  GIST_RAW_URL: 'https://gist.githubusercontent.com/davidlopezg/c297536c9c15f7ad42a37a1feb6afba0/raw/menu-data.json',
  
  // Get token from localStorage (user sets it once)
  getToken() {
    return localStorage.getItem('gh_sync_token');
  },
  
  setToken(token) {
    localStorage.setItem('gh_sync_token', token);
    return true;
  },
  
  hasToken() {
    return !!this.getToken();
  },

  // Load menu from Gist
  // options.force: if true, overwrite local data with Gist content (used by manual "Descargar")
  // Returns { ok, reason?, mode?, copied? } for consistent error handling
  async load(options = {}) {
    if (!this.hasToken()) {
      console.log('Sync: no token configured');
      return { ok: false, reason: 'no-token' };
    }

    try {
      const response = await fetch(this.GIST_RAW_URL + '?t=' + Date.now());
      if (response.ok) {
        const data = await response.json();
        const mergeResult = this.mergeData(data, { force: !!options.force });
        return { ok: true, ...mergeResult };
      }
      const reason = response.status === 401 ? 'token-invalid'
                   : response.status === 403 ? 'no-gist-scope'
                   : response.status === 404 ? 'gist-not-found'
                   : 'get-failed';
      return { ok: false, reason };
    } catch (e) {
      console.log('Sync: usando datos locales');
      return { ok: false, reason: 'network' };
    }
  },
  
  // Save menu to Gist
  async save() {
    if (!this.hasToken()) {
      Components.toast.show('Configura el token en Ajustes');
      return { ok: false, reason: 'no-token' };
    }

    const token = this.getToken();
    const data = this.getExportData();
    const content = JSON.stringify(data, null, 2);

    try {
      // Get current Gist to get SHA
      const getResponse = await fetch(this.GIST_API_URL, {
        headers: { 'Authorization': `token ${token}` }
      });

      if (!getResponse.ok) {
        const reason = getResponse.status === 401 ? 'token-invalid'
                     : getResponse.status === 403 ? 'no-gist-scope'
                     : getResponse.status === 404 ? 'gist-not-found'
                     : 'get-failed';
        Components.toast.show(this.errorMessage(reason));
        return { ok: false, reason };
      }

      const gist = await getResponse.json();
      const sha = gist.files['menu-data.json']?.sha;

      // Update Gist
      const updateResponse = await fetch(this.GIST_API_URL, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: {
            'menu-data.json': {
              content: content,
              sha: sha
            }
          }
        })
      });

      if (updateResponse.ok) {
        return { ok: true };
      }

      const reason = updateResponse.status === 401 ? 'token-invalid'
                   : updateResponse.status === 403 ? 'no-gist-scope'
                   : updateResponse.status === 404 ? 'gist-not-found'
                   : updateResponse.status === 409 ? 'sha-mismatch'
                   : 'update-failed';
      Components.toast.show(this.errorMessage(reason));
      return { ok: false, reason };
    } catch (e) {
      console.error('Sync save error:', e);
      Components.toast.show('❌ Error de red al sincronizar');
      return { ok: false, reason: 'network' };
    }
  },

  // Human-readable error messages (Spanish)
  errorMessage(reason) {
    const messages = {
      'token-invalid':    '❌ Token inválido o expirado — generá uno nuevo',
      'no-gist-scope':    '❌ Token sin permisos de Gist — regenerá con scope "gist"',
      'gist-not-found':   '❌ Gist no encontrado — revisá el ID',
      'sha-mismatch':     '⚠️ Conflicto: alguien más subió antes. Descargá y volvé a subir',
      'get-failed':       '❌ No pude leer el Gist — reintentá',
      'update-failed':    '❌ No pude actualizar el Gist — reintentá',
      'network':          '❌ Error de red al sincronizar'
    };
    return messages[reason] || '❌ Error al sincronizar';
  },
  
  // Merge Gist data with localStorage
  // options.force: if true, overwrite local data with Gist content
  // Returns { mode, copied? }
  mergeData(githubData, options = {}) {
    const force = !!options.force;

    if (force) {
      // Overwrite: only write fields that exist in Gist
      if (githubData.menu !== undefined) {
        Store.set(Store.KEYS.MENU, githubData.menu);
      }
      if (githubData.recipes !== undefined) {
        Store.set(Store.KEYS.RECIPES, githubData.recipes);
      }
      // Invalidate in-memory caches so Menu and Recipes re-read from Store.
      // Without this, App.renderMenuView() would render stale data because
      // Menu._menu / Recipes._recipes were loaded once at boot.
      if (typeof Menu !== 'undefined' && Menu._menu !== undefined) {
        Menu._menu = Store.get(Store.KEYS.MENU) || {};
        Menu._currentWeek = Store.getWeekKey();
      }
      if (typeof Recipes !== 'undefined' && Recipes._recipes !== undefined) {
        Recipes._recipes = Store.get(Store.KEYS.RECIPES) || [];
      }
      return { mode: 'overwrite' };
    }

    // First-time merge: only fill empty local slots
    const localMenu = Store.get(Store.KEYS.MENU);
    const localRecipes = Store.get(Store.KEYS.RECIPES);
    let copied = 0;

    if (!localMenu && githubData.menu) {
      Store.set(Store.KEYS.MENU, githubData.menu);
      copied++;
    }
    if (!localRecipes && githubData.recipes) {
      Store.set(Store.KEYS.RECIPES, githubData.recipes);
      copied++;
    }
    return { mode: 'fill-empty', copied };
  },
  
  // Get current data as JSON
  getExportData() {
    return {
      version: '1.0',
      updated: new Date().toISOString(),
      menu: Store.get(Store.KEYS.MENU) || {},
      recipes: Store.get(Store.KEYS.RECIPES) || []
    };
  },
  
  // Render sync settings panel
  renderSettings() {
    const hasToken = this.hasToken();
    const tokenPreview = hasToken ? '••••••••' + this.getToken().slice(-4) : 'No configurado';
    
    return `
      <div class="sync-settings">
        <div class="card">
          <h3 style="margin-bottom: 16px;">🔄 Sincronización GitHub</h3>
          
          <p style="color: var(--color-text-muted); margin-bottom: 16px;">
            Compartí el menú con María usando GitHub Gist.
          </p>
          
          <div class="form-group">
            <label class="form-label">Token GitHub</label>
            <input type="password" id="sync-token-input" class="form-input"
                   value="${hasToken ? this.getToken() : ''}"
                   placeholder="ghp_... o github_pat_...">
            <small style="color: var(--color-text-muted);">
              Token con scope <code>gist</code> (clásico o fine-grained)
            </small>
          </div>
          
          <button class="btn btn--primary" onclick="Sync.saveToken()" style="margin-top: 8px;">
            Guardar Token
          </button>
          
          <hr style="margin: 20px 0; border: none; border-top: 1px solid var(--color-border);">
          
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn btn--secondary" onclick="Sync.manualSync()" ${!hasToken ? 'disabled' : ''}>
              ⬆️ Subir al Gist
            </button>
            <button class="btn btn--secondary" onclick="Sync.manualLoad()" ${!hasToken ? 'disabled' : ''}>
              ⬇️ Descargar del Gist
            </button>
          </div>
          
          <p style="color: var(--color-text-muted); margin-top: 16px; font-size: 12px;">
            Estado: ${hasToken ? '✅ Configurado' : '⚠️ Sin configurar'}
          </p>
        </div>
      </div>
    `;
  },
  
  // Accept classic PAT (ghp_), fine-grained PAT (github_pat_) and OAuth (gho_)
  isValidToken(token) {
    if (!token) return false;
    return /^(ghp_|github_pat_|gho_)/.test(token);
  },

  saveToken() {
    const input = document.getElementById('sync-token-input');
    const token = input.value.trim();

    if (this.isValidToken(token)) {
      this.setToken(token);
      Components.toast.show('Token guardado');
    } else {
      Components.toast.show('Token inválido (debe empezar con ghp_, github_pat_ o gho_)');
    }
  },

  async manualSync() {
    Components.toast.show('Subiendo...');
    const result = await this.save();
    if (result.ok) {
      Components.toast.show('✅ Sincronizado');
    }
    // On error, save() already showed a specific toast
  },

  async manualLoad() {
    // Check if there's local data that would be overwritten
    const localMenu = Store.get(Store.KEYS.MENU);
    const localRecipes = Store.get(Store.KEYS.RECIPES);
    const hasLocal = (localMenu && Object.keys(localMenu).length > 0) ||
                     (localRecipes && localRecipes.length > 0);

    if (hasLocal) {
      const confirmed = confirm(
        '⚠️ Esto va a SOBRESCRIBIR tus datos locales con los del Gist.\n\n' +
        'Si tenés cambios sin subir, primero "Subir al Gist" y después recargá.\n\n' +
        '¿Descargar y sobrescribir igual?'
      );
      if (!confirmed) {
        Components.toast.show('Cancelado');
        return;
      }
    }

    Components.toast.show('Descargando...');
    const result = await this.load({ force: true });
    if (result.ok) {
      Components.toast.show('✅ Datos del Gist cargados');
      // Close settings modal so user actually sees the new data
      if (typeof Components !== 'undefined' && Components.modal && Components.modal.close) {
        Components.modal.close();
      }
      // Re-render the current view with fresh data from Store
      if (typeof App !== 'undefined') {
        if (App.currentView === 'menu' && typeof App.renderMenuView === 'function') {
          App.renderMenuView();
        } else if (typeof App._handleRoute === 'function') {
          App._handleRoute();
        }
      }
    } else {
      Components.toast.show(this.errorMessage(result.reason) || '❌ Error al descargar del Gist');
    }
  }
};
