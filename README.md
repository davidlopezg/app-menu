# 🍽️ App Menú Semanal — David & María

Planificador de menú semanal con información nutricional para tu comida diaria.

## Características

- 📅 **Menú semanal** — Asigna recetas a cada día y comida
- 📚 **Catálogo de recetas** — Crea y gestiona tus recetas
- 📊 **Información nutricional** — Conexión a USDA FoodData Central API
- 📱 **Mobile-first** — Optimizado para móvil, funciona offline (datos locales)
- 🚀 **GitHub Pages** — Despliegue automático gratis

## Uso

### Datos guardados

Todos los datos se guardan en **localStorage** del navegador:
- Tus recetas
- Tu menú semanal
- Cache de nutritional API

> ⚠️ Los datos se borran si limpias el navegador. Para backup, exporta tus recetas manualmente.

## Desarrollo local

```bash
# Clonar repo
git clone https://github.com/davidlopezg/fooday-intelligence-core.git
cd fooday-intelligence-core/app-menu-semanal

# Abrir en navegador (no necesita servidor)
open index.html

# O usar servidor local
python -m http.server 8080
# Ir a http://localhost:8080
```

## Despliegue en GitHub Pages

### Opción 1: Usar la carpeta `/docs`

1. En GitHub, ve a Settings → Pages
2. Source: Deploy from a branch → `main` → `/docs`
3. Mueve los archivos de `app-menu-semanal/` a `docs/` del repositorio

```bash
# Crear docs si no existe
mkdir -p docs
cp -r app-menu-semanal/* docs/
git add docs/
git commit -m "deploy: add menu app"
git push
```

### Opción 2: GitHub Actions (avanzado)

Crea `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
    paths: ['app-menu-semanal/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Copy files
        run: cp -r app-menu-semanal/. docs/.
      
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs
```

## API Nutricional

Usa **USDA FoodData Central** (gratis, sin API key para uso básico):

- Endpoint: `https://api.nal.usda.gov/fdc/v1/foods/search`
- Rate limit: 1000 requests/día
- Documentación: https://fdc.nal.usda.gov/api-guide.html

Los resultados se cachean 24h para minimizar llamadas.

## Estructura

```
app-menu-semanal/
├── index.html          # Entry point
├── css/
│   └── styles.css      # Estilos mobile-first
├── js/
│   ├── app.js          # Router + controller
│   ├── store.js        # Estado + localStorage
│   ├── recipes.js      # CRUD recetas
│   ├── nutrition.js    # API nutricional
│   ├── components.js   # UI components
│   ├── menu.js         # Menú semanal
│   └── translations.js # Textos UI
├── data/               # (futuro) recetas en JSON
└── assets/             # (futuro) imágenes
```

## Tech Stack

- **HTML5** — SPA sin framework
- **CSS3** — Variables, Grid, Flexbox, responsive
- **JavaScript** — Vanilla ES6+, sin dependencias
- **localStorage** — Persistencia
- **USDA API** — Datos nutricionales

## Customización

### Colores

Edita las variables CSS en `css/styles.css`:

```css
:root {
  --color-primary: #2D6A4F;      /* Verde principal */
  --color-secondary: #40916C;
  --color-accent: #95D5B2;
  /* ... */
}
```

### Textos

Edita `js/translations.js` para cambiar idioma o textos.

## License

MIT — Para uso personal de David & María.
