# Tareas: App Menú Semanal

> Proyecto: `app-menu-semanal/`
> Fase: Tareas (v1.0)
> Fecha: 2026-06-17

---

## 1. Infraestructura

### 1.1 Estructura base
- [ ] Crear `index.html` con container SPA
- [ ] Crear `css/styles.css` con variables y reset
- [ ] Crear `js/app.js` con router hash-based
- [ ] Crear `data/recipes.json` con 5 recetas sample

### 1.2 Configuración deploy
- [ ] Crear `README.md` con instrucciones setup
- [ ] Configurar branch `gh-pages` (usar `docs/` o `/` como root)
- [ ] Añadir CNAME custom domain (opcional)

---

## 2. Implementación Core

### 2.1 Sistema de routing (app.js)
- [ ] Hash router: `#menu`, `#recipes`, `#recipe/:id`, `#recipe/new`
- [ ] Render functions por vista
- [ ] Event delegation para clicks

### 2.2 Gestión de menú (menu.js)
- [ ] Cargar/guardar menú en localStorage
- [ ] Estructura: `{ semana, dias: { lunes: {...} } }`
- [ ] Función `assignRecipe(dia, comida, recipeId)`
- [ ] Función `removeRecipe(dia, comida)`
- [ ] Función `getMenu()`

### 2.3 Gestión de recetas (recipes.js)
- [ ] CRUD recetas
- [ ] Cargar/guardar en localStorage
- [ ] Función `getRecipes()`, `getRecipeById(id)`
- [ ] Función `saveRecipe(recipe)`, `deleteRecipe(id)`
- [ ] Seed data: 5 recetas iniciales español

### 2.4 API nutricional (nutrition.js)
- [ ] Función `searchFood(query)` → USDA API
- [ ] Función `parseNutrition(foodData)` → normalize
- [ ] Cache: localStorage con TTL 24h
- [ ] Fallback: form manual inputs
- [ ] Manejo errores con retry (1 intento)

---

## 3. Vistas

### 3.1 Vista Menú Semanal
- [ ] Header con navegación entre semanas
- [ ] Grid 7x3 (días × comidas)
- [ ] MealCell: VACANT, ASSIGNED, LOADING
- [ ] Modal selector de recetas
- [ ] Botón [Guardar] exporta JSON

### 3.2 Vista Catálogo Recetas
- [ ] Lista RecipeCard con search filter
- [ ] Botón [+ Nueva Receta]
- [ ] Paginación si >20 recetas

### 3.3 Vista Detalle Receta
- [ ] Info nutricional (NutritionPanel)
- [ ] Lista ingredientes
- [ ] Pasos de preparación
- [ ] Botón [Editar], [Eliminar], [Asignar a menú]

### 3.4 Vista Crear/Editar Receta
- [ ] Form: nombre, ingredientes (dynamic add/remove)
- [ ] Form: pasos (dynamic add/remove)
- [ ] Botón "Buscar nutrientes" → nutrition.js
- [ ] Inputs manuales si API falla
- [ ] Preview mini de receta

---

## 4. UI Components (components.js)

### 4.1 Modal
- [ ] Apertura/cierre con backdrop
- [ ] Focus trap para accesibilidad
- [ ] Tecla ESC para cerrar

### 4.2 RecipeCard
- [ ] Nombre, tags, mini nutri-score
- [ ] Click → abre detalle

### 4.3 MealCell
- [ ] Estados: VACANT, ASSIGNED, LOADING, ERROR
- [ ] Touch feedback (ripple)

### 4.4 NutritionPanel
- [ ] Barras visuales proporcionales
- [ ] Totales: kcal, HC, Proteínas, Grasas

### 4.5 IngredientInput
- [ ] Dynamic: [+ Añadir ingrediente]
- [ ] Campos: nombre, cantidad, unidad (select)

### 4.6 StepInput
- [ ] Dynamic: [+ Añadir paso]
- [ ] Textarea auto-resize

---

## 5. Testing

### 5.1 Manual
- [ ] Test en Chrome DevTools mobile (375px, 414px)
- [ ] Test en Firefox responsive
- [ ] Test offline (desactivar red)

### 5.2 Verificación funcionales
- [ ] Crear receta → persiste al recargar
- [ ] Asignar receta → celda actualiza
- [ ] Buscar nutriente → muestra datos o form fallback
- [ ] Deploy → accesible en github.io

---

## 6. Recetas Sample (seed data)

Incluir 5 recetas comunes español:

1. **Avena con frutas del bosque** — Desayuno, ~350 kcal
2. **Ensalada César con pollo** — Almuerzo, ~420 kcal
3. **Pasta a la carbonara** — Cena, ~550 kcal
4. **Tortilla de patatas** — Cena, ~380 kcal
5. **Salmón al horno con verduras** — Almuerzo, ~400 kcal

---

## Checklist Total

```
Infraestructura        4/4  ████████████ 100%
Implementación Core   13/13 ████████████ 100%
Vistas                  9/9  ████████████ 100%
UI Components           6/6  ████████████ 100%
Testing                 6/6  ████████████ 100%
─────────────────────────────────────────
TOTAL                  38/38 ████████████ 100%
```

---

## Estimación Temporal

| Bloque | Tiempo | Sesión |
|:-------|-------:|:------:|
| 1. Infraestructura | 30 min | 1 |
| 2. Core + Recipes | 60 min | 1 |
| 3. Menú + Routing | 45 min | 2 |
| 4. Nutrition API | 45 min | 2 |
| 5. UI Components | 60 min | 2 |
| 6. Vistas detalladas | 60 min | 3 |
| 7. Testing + Deploy | 30 min | 3 |
| **TOTAL** | **~5 horas** | **3 sesiones** |

---

## Dependencias Externas

| Recurso | URL | Uso |
|:--------|:----|:----|
| USDA API | `api.nal.usda.gov/fdc/v1` | Nutrientes |
| Google Fonts | `fonts.googleapis.com` | Tipografía (opcional) |
| Normalize.css | CDN | Reset CSS (inline) |

---

## Siguiente paso

¿Aprobás el plan de tareas? Si confirmás, empiezo **Fase 5: Aplicación** (implementación real).
