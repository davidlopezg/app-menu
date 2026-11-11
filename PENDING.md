# PENDING — Sesión del 2026-11-10 (v46)

## Plan de preparación (v44 → v45)

### v46: el día usa el mismo formato que las categorías de la lista

- La cabecera del día ahora es una línea de texto **en mayúsculas + contadores
  apagados**, igual que `.shop-cat__header` de la lista de la compra
  ("LUNES 9 NOV · 2 PLATOS · ~1H02 · 0/2 LISTOS").
- Los platos van en la misma tarjeta blanca que los productos de la lista
  (`.shop-items`/`.shop-item`), con el check a la izquierda.
- El aviso de trabajo compartido (🔁) es una fila al final de la tarjeta.

### v45: el check es por elaboración y el día se distingue

- El ✅/○ pasó de la cabecera del día a **cada elaboración** (`togglePrepPlato`).
  Lo guardado son ids de receta (`menuapp_prep_done`), no días.
- La cabecera del día es una **banda de color**: título en mayúsculas, negrita,
  barra verde a la izquierda y contador `listos/total` (la tarjeta se atenúa
  cuando están todos hechos). Así el día no se confunde con un plato.

Botón **🍳 Plan de preparación** debajo de **🛒 Ver lista de la compra**
(también en el menú ☰). Dice **qué día cocinar cada elaboración** de la
semana, tomando en cuenta el día en que hay que comerla y buscando la
máxima productividad.

- `js/prep.js` (nuevo): módulo `Prep`.
  - **Conserva**: días que aguanta cada receta, deducida del nombre, los tags
    y los ingredientes (pescado/ensaladas 0, legumbres 4, guisos 3, arroz/pasta
    3, tortilla/carne 2).
  - **Ventana**: cada plato se puede cocinar entre (día que se come − conserva)
    y (día que se come). Nunca después de comerlo ni antes de que se pudra.
  - **Sesiones**: las elaboraciones que aguantan se cocinan por adelantado y se
    agrupan en el mismo día (menos sesiones = más productividad); las que
    comparten un ingrediente base (pollo, arroz, legumbre…) se cocinan juntas
    y la app avisa "una sola compra y lo aprovechás".
  - Máximo 3 platos por sesión, y nunca más de 2 días de adelanto.
  - Checklist "hecho" por semana (`menuapp_prep_done`, local como el de la
    lista de la compra) + 📋 copiar el plan + día de compra sugerido.
- `tests/prep.test.js`: 31 tests (jsdom), incluyen un smoke del render.

Bug cazado validando contra las recetas reales de Supabase: `consumo.push({
dia, ...})` usaba una variable inexistente (`day`) que en los tests tapaba
una helper del propio test → el plan salía con datos basura.

## Lista de la compra con precios manuales (v42)

- `js/shopping.js`: agrega los ingredientes de la semana, **normaliza unidades**
  ("300 g" + "200 g" → "500 g"; "500 g + 2 ud" no se mezclan), saca los
  condimentos ("al gusto"), categoriza (verduras/carnicería/pescado/lácteos/
  despensa/panadería/congelados), y mantiene el libro de precios
  (tiendas + productos + precios).
- Vista `#shopping`: resumen (productos, tiendas, total estimado, sin precio),
  lista por categoría, "ya lo tengo" por semana, 🏷️ modal de precio,
  🏪 gestión de tiendas, 🗺️ reparto por tienda y 📋 copiar (con precios y
  dónde comprar).
- **Los precios son manuales**: el producto se identifica por el nombre que
  escribís (mismo nombre en dos tiendas → misma comparación).
- Sync: todo el libro en **una fila de `menu_weeks` (clave `shopping:data`)**,
  sin crear tablas en Supabase. `pullAll` filtra las keys que no son
  `YYYY-WXX` para que esa fila no aparezca como una semana.
- `tests/shopping.test.js`: 22 tests (jsdom).

Bug cazado por los tests: los condimentos con cantidad "al gusto" se colaban en
la lista de la compra (y "un puñado" de perejil se perdía).

## Nutri: completeness check de las recetas de la plantilla

**Resultado:** 14/14 recetas de la plantilla completas y **71/71** de todo el
catálogo.

Antes: las 71 tenian `nutricion` en 0 (la app nunca cargo datos → las celdas
mostraban "0 kcal" y el aviso de "cena con carbs" nunca aparecia).

Causa: la app busca en la API de USDA con el texto crudo del ingrediente
("Aceite de oliva 3 cuchara") → la API (en ingles) devuelve "Dulce de Leche";
ademas `DEMO_KEY` corta a las ~10 requests (429).

Solución: tabla de referencia local (`data/nutrition-reference.json` +
`nutrition-extra.json` + `nutrition-alias.json`) con valores estandar por
100 g y conversion de unidades (g/kg/ml/unidad/cuchara/cucharita/dientes/
latas/ramo/puñado...). `scripts/calc-nutrition.mjs` calcula y escribe; solo
completa recetas con cobertura 100%.

Bugs cazados en el camino:
- `rest()` pisaba el header `Prefer: resolution=merge-duplicates` → hacia
  INSERT en vez de UPSERT → duplicate key en recipes_pkey.
- normalizador: "ñ" → "pinones" (no "pinos").
- Se vacio "Ensalada de habitas con jamon" al testear → restaurada con 8
  ingredientes, 5 pasos y sus tags originales (cena, legumbres, verdura).

## Último: drag & drop + plantilla cargada (v41)

**Estado:** ✅ Resuelto y verificado contra Supabase real.

## Último: drag & drop + plantilla cargada (v41)

- `js/dragdrop.js`: arrastre con Pointer Events. Mouse: arrastrar directo.
  Dedo: long press 250 ms (vibra) + arrastrar, con listener `touchmove`
  no-pasivo para que la página no scrollee durante el arrastre.
  Soltar en celda vacía → mueve; en celda ocupada → intercambia.
  Un toque corto sigue siendo un toque (abre el menú de opciones).
- `js/components.js`: `data-day` en cada celda + asa ⠿.
- `js/app.js`: `_moveMealInWeek` / `_moveMealInTemplate` + cartelito de ayuda.
- `css/styles.css`: fantasma, celda origen/destino, estado "armado".
- `scripts/sb.mjs`: `apply-template <week_key>` y `backup <week_key>`.
- 16 tests en `tests/` (jsdom) que cargan el código real de la app.

Bugs que cazaron los tests: el `this` de los listeners de puntero y una clave
equivocada en el swap de la plantilla.

Estado en la nube: `2026-W40` cargada con la plantilla "Semana tipo"
(backup del menú anterior en `data/backup-2026-W40.json`).

---

# PENDING — Sesión del 2026-11-10 (v39)

**Estado:** ✅ Resuelto y verificado contra Supabase real.

## Lo que se pidió

"Crear una plantilla de menú" → la app ya tenía el módulo de plantillas
(`js/templates.js`, vista de edición, aplicar a otra semana) pero **no se
podía guardar en la nube**.

## El problema real

`menu_templates` tiene las policies RLS creadas como `to authenticated`, pero
la app usa la **anon key** (rol `anon`). Todo insert rebotaba con:

```
42501 new row violates row-level security policy for table "menu_templates"
```

Verificado con probes REST:

| Tabla | INSERT/UPDATE/DELETE con rol `anon` |
|---|---|
| `recipes` | ✅ |
| `menu_weeks` | ✅ |
| `menu_templates` | ❌ 42501 |

→ La plantilla se guardaba en el navegador y **nunca llegaba a la nube**
(el otro móvil no la veía). Además, al borrar una plantilla la fila quedaba
viva en Supabase y el siguiente pull la resucitaba.

## La solución (sin tocar el dashboard)

Las plantillas ahora se guardan en **`menu_weeks` con la clave `tpl:<id>`**:

- `menu_weeks` sí acepta escrituras con el rol `anon` y tiene unique en
  `week_key` → upsert idempotente.
- Semánticamente encaja: una plantilla ES una semana (7 días × {lunch, dinner}).
- `db.js` separa las filas `tpl:*` de las semanas en `pullAll`, y
  `pushTemplates` hace upsert + **borra** las filas de las plantillas que el
  usuario eliminó.
- Realtime: `menu_weeks` ya estaba suscrito → las plantillas llegan al
  instante al otro dispositivo.

## Plantilla "Semana tipo" (ya sembrada en la nube)

`node scripts/seed-template.mjs` → `tpl:a1b2c3d4-0000-4000-8000-000000000001`

| Día | Almuerzo | Cena |
|---|---|---|
| Lun | Arroz a la cubana | Ensalada de pollo |
| Mar | Lomo con pimientos | Merluza a la donostiarra |
| Mié | Garbanzos al horno | Tortilla de verduras |
| Jue | Pollo al horno al curri | Salmón Papillote |
| Vie | Pasta con salsa de tomate (Cherry's) | Revuelto de setas |
| Sáb | Codillo | Ensalada de rúcula con cherrys |
| Dom | Arroz negro | Tortilla de atún |

Los ids se resuelven por nombre contra el catálogo real (14/14 ✅, 0 ids
rotos). Editá `PLAN` en el script y re-corré para cambiarla.

## Lo que también quedó

- `js/templates.js`: `EXAMPLE` + `resolvePlan()` + `createFromExample()`
  (resuelve platos por nombre; si falta uno, esa celda queda vacía).
- `js/app.js`: botón **🧪 Usar plantilla de ejemplo** en la vista de plantilla.
- `scripts/sb.mjs templates`: ahora lista las plantillas (`tpl:*`).
- `scripts/templates-schema.sql`: queda como schema legacy opcional (la app
  no usa `menu_templates`). Se le corrigieron las policies a `anon` por si
  algún día se migra.

## Prueba end-to-end (cargando el `db.js` real contra Supabase)

```
1) pullAll        → 1 plantilla en local (id, nombre, 7 días)   ✅
2) edit + push    → fila en la nube actualizada                  ✅
3) delete         → 0 filas (no vuelve sola en el pull)          ✅
```

## Pendiente para el usuario

- Abrir la app (v39) → *Editar plantilla* → **🔁 Aplicar a esta semana**.
- Si ven la v38, forzar actualización: Ajustes → 🔄 Buscar actualizaciones.
