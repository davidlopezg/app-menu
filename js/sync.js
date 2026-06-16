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
  async load() {
    if (!this.hasToken()) {
      console.log('Sync: no token configured');
      return false;
    }
    
    try {
      const response = await fetch(this.GIST_RAW_URL + '?t=' + Date.now());
      if (response.ok) {
        const data = await response.json();
        this.mergeData(data);
        return true;
      }
    } catch (e) {
      console.log('Sync: usando datos locales');
    }
    return false;
  },
  
  // Save menu to Gist
  async save() {
    if (!this.hasToken()) {
      Components.toast.show('Configura el token en Ajustes');
      return false;
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
        throw new Error('Error getting Gist');
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
        return true;
      } else {
        throw new Error('Error updating Gist');
      }
    } catch (e) {
      console.error('Sync save error:', e);
      return false;
    }
  },
  
  // Merge Gist data with localStorage
  mergeData(githubData) {
    const localMenu = Store.get(Store.KEYS.MENU);
    const localRecipes = Store.get(Store.KEYS.RECIPES);
    
    // Si local está vacío, usar GitHub
    if (!localMenu && githubData.menu) {
      Store.set(Store.KEYS.MENU, githubData.menu);
    }
    if (!localRecipes && githubData.recipes) {
      Store.set(Store.KEYS.RECIPES, githubData.recipes);
    }
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
                   placeholder="ghp_...">
            <small style="color: var(--color-text-muted);">
              Token con acceso a Gist
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
  
  saveToken() {
    const input = document.getElementById('sync-token-input');
    const token = input.value.trim();
    
    if (token && token.startsWith('ghp_')) {
      this.setToken(token);
      Components.toast.show('Token guardado');
    } else {
      Components.toast.show('Token inválido (debe empezar con ghp_)');
    }
  },
  
  async manualSync() {
    Components.toast.show('Subiendo...');
    const success = await this.save();
    if (success) {
      Components.toast.show('✅ Sincronizado');
    } else {
      Components.toast.show('❌ Error al sincronizar');
    }
  },
  
  async manualLoad() {
    Components.toast.show('Descargando...');
    const success = await this.load();
    if (success) {
      Components.toast.show('✅ Datos cargados');
      App.renderMenuView();
    } else {
      Components.toast.show('❌ Error al cargar');
    }
  }
};
