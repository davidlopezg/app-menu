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

## Conexión a Supabase (este proyecto)

Las credenciales viven en `.env` (ignorado por git). La conexión se usa con
`scripts/sb.mjs`, un CLI sin dependencias:

```bash
node scripts/sb.mjs recipes 20        # listar recetas
node scripts/sb.mjs recipe <id>        # receta completa
node scripts/sb.mjs menu               # menús semanales guardados
node scripts/sb.mjs templates          # plantillas
node scripts/sb.mjs login <email> <pass>   # probar login (RPC login_user)
node scripts/sb.mjs rpc <fn> '<json>'  # cualquier RPC
node scripts/sb.mjs sql "<query>"      # SQL directo (requiere DATABASE_URL en .env)
```

`DATABASE_URL` se saca de Supabase → Project Settings → Database → Connection string
y habilita `sb.mjs sql` (p. ej. para resetear la contraseña de un usuario).

## Plantillas de menú
Una plantilla es una semana reutilizable (7 días × almuerzo/cena) que se puede
aplicar a la semana actual o a otra.

- Desde la app: botón **📋 Guardar como plantilla** (dejo del grid) → editás
  la plantilla en **✏️ Editar plantilla** → **🔁 Aplicar**.
- Sin plantilla todavía: **🧪 Usar plantilla de ejemplo** (semana base con las
  recetas del catálogo; si falta algún plato, esa celda queda vacía).
- Hay una plantilla ya sembrada en la nube: **"Semana tipo"**.

### Dónde se guardan

En la tabla `menu_weeks` con la clave `tpl:<id>` (NO en `menu_templates`):
las policies RLS de `menu_templates` solo permitían el rol `authenticated` y
la app usa la `anon` key → todo insert rebotaba con `42501` y la plantilla
nunca llegaba a la nube. Como una plantilla ES una semana (7 días ×
{lunch, dinner}), `menu_weeks` la guarda perfecto (además ya tiene unique en
`week_key` → upsert idempotente).

CLI:

```bash
node scripts/seed-template.mjs   # sube/actualiza la plantilla "Semana tipo"
node scripts/sb.mjs menu         # lista semanas (incluye las tpl:*)
node scripts/sb.mjs templates    # muestra las plantillas
node scripts/sb.mjs backup 2026-W41        # backup de una semana (JSON)
node scripts/sb.mjs apply-template 2026-W41 # aplica la plantilla a esa semana
```

## Mover recetas (drag & drop)

En la vista de menú semanal y en la de plantilla:

- **Mouse/trackpad:** arrastrar la receta a otra celda.
- **Teléfono:** mantener apretado ~0,25 s (la celda vibra) y arrastrar.
- Soltar en una celda **vacía** → mueve. Soltar en una celda **con receta** → intercambia.
- Un toque corto sigue siendo un toque: abre el menú de opciones de esa comida.

Los cambios se guardan y se sincronizan solos.

Tests: `node tests/dragdrop.test.js` y `node tests/move-logic.test.js` (necesitan `npm i jsdom`).

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
