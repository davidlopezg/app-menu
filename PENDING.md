# PENDING — Sesión del 2026-11-25 (v53)

## Precios por kilo y por unidad, comparables entre supermercados (issue #7)

El pimiento es el ejemplo: Mercadona lo vende **por kilo** (4,50 €/kg) y
Carrefour en **bolsa de 500 g** (1,79 €). Comparados en crudo ("1,79 €" vs
"4,50 €") no dicen nada: la bolsa son 3,58 €/kg, así que Mercadona es más
barato aunque el número sea mayor.

### Qué hay ahora

- **Cómo lo vende cada súper**: el modal 🏷️ tiene **"Cómo lo venden en esa
  tienda"** (por unidad o por formato · por kilo · por litro) y **"Peso del
  formato"** (ej: la bolsa son 500 g). Al cambiar de tienda se rellena solo
  con lo que ya se sabe de ese súper.
- **Cada fila compara con la misma base**:
  - 🏪 Mercadona · Pimiento verde — 4,50 €/kg → 1,35 € (300 g)
  - 🏪 Carrefour · Pimiento verde bolsa 500 g — 1,79 € / 500 g · 3,58 €/kg → 1,07 € (300 g)
  - 💰 mejor €/kg: el que gana en la base comparable.
- **Lo que se paga de verdad**: el total estimado (y el 🗺️ reparto por tienda)
  suman el importe **prorrateado** a lo que pide la lista (300 g), no el kilo
  entero. Antes un producto a 4,50 €/kg sumaba 4,50 € aunque la receta pidiera
  300 g.
- El **➕ Producto** tiene los mismos campos (unidad y peso del formato).
- El texto que se copia (📋) lleva la unidad y el precio comparable.

### Lo que no cambia

- Los productos **ya guardados** (sin unidad) se siguen mostrando en crudo y
  **no se comparan entre sí por kilo** (no hay base común). El comparador solo
  se activa cuando los datos lo permiten.
- Un producto que el súper vende por kilo y cuya receta pide unidades ("2
  pimientos") usa el peso del formato si lo hay; si no, el importe sale sin
  prorratear.

`tests/shopping.test.js`: **106 tests** (10 nuevos para el caso pimiento).
`tests/shopping-flow.test.js`: **30 tests** (8 nuevos cargando un precio por
kilo y otro por unidad desde el modal real).

# PENDING — Sesión del 2026-11-25 (v52)

## El precio con coma decimal no se guardaba (issue #2, segunda vuelta)

La v51 enseñaba las ofertas por tienda, pero al **probar el flujo real** (no
solo los tests de datos) salieron dos cosas:

- **El input de precio era `type="number"`** → en Chrome/Safari "1,99" (coma
  decimal, como escribe la gente en España) es un número inválido → el campo
  queda vacío y **el precio no se guardaba nunca** (salía el aviso
  "⚠️ Completá tienda, producto y precio"). Ahora los precios se escriben en
  un campo de texto con `inputmode="decimal"` y el código acepta coma y punto.
  Afectaba al modal 🏷️, al botón ➕ Producto y al total del ticket.
- **Si en el ticket escribías el nombre del súper** ("Plátano canario") en
  vez del ingrediente ("Plátano"), el precio se guardaba en una fila que no
  era de la lista → no se conciliaba. Ahora el nombre del producto se
  resuelve a su ingrediente del catálogo.
- El **➕ Producto** ahora tiene **"Nombre en esa tienda"**: un producto que
  no sale de las recetas también puede llamarse distinto en cada súper.

### Test nuevo de punta a punta

`tests/shopping-flow.test.js`: carga el `index.html` real en jsdom (mismos
ids que la app) y **maneja la interfaz como el usuario**: abrir el modal,
cambiar de tienda, escribir el nombre, guardar el precio, ver la lista, el
reparto por tienda, el texto copiado y el ticket. 22 tests.

`tests/`: 179 tests OK en total (7 dragdrop + 9 move-logic + 34 prep +
11 ai-ticket + 96 shopping + 22 shopping-flow).

# PENDING — Sesión del 2026-11-25 (v51)

## El producto con el nombre de cada tienda (issue #2)

El issue #2 pedía conciliar la lista de productos con las compras del
supermercado: el plátano tenía que poder tener dentro el precio del plátano
en el Mercadona **con su nombre** y el precio del plátano en el Carrefour
**con su nombre**, porque en cada supermercado las cosas se llaman distinto.

### Qué hay ahora

- **Cada fila de la lista muestra sus ofertas por tienda**:
  - 🏪 Mercadona · **Plátano de Canarias extra** — 1,99 €
  - 🏪 Carrefour · **Plátano canario ECO** — 1,79 € · 💰 más barato
- El **modal 🏷️** lista todas las ofertas (tienda + nombre + precio, con su
  ✕ para borrar) y deja cambiar de tienda: el campo **"Nombre en esa
  tienda"** se pone solo con el nombre que ya usás en ese súper (o escribís
  el nuevo, con autocompletado de los nombres que ya tenés).
- **🗺️ Dónde comprar** y el **texto que copiás (📋)** llevan también el
  nombre del producto en esa tienda.
- Los **tickets** se concilian por tienda: el precio de una línea actualiza
  el producto de **esa** tienda (busca primero el que se llama como en el
  ticket y, si no, el que ya tiene precio ahí) y **no toca** el precio de las
  otras tiendas. Si la tienda no tenía esa entrada, se crea con el nombre
  del ticket ("PLATANO CANARIO 1KG" → "Plátano canario 1kg").

### Bugs que se corrigieron de paso

- El ticket usaba siempre el **primer** producto del ingrediente → el precio
  de Mercadona acababa guardado sobre el producto de Carrefour (y al revés).
- El modal de precios solo enseñaba los precios del primer producto: los de
  las otras entradas quedaban escondidos (y no se podían borrar).
- El generador del HTML legacy (`scripts/generate-legacy-html.ts`) metía los
  14 scripts **14 veces** dentro de `src/components/legacy-web-html.ts`
  (la app se ejecutaba 14 veces) → ahora se meten una sola.

`tests/shopping.test.js`: **93 tests** (16 nuevos para las ofertas por tienda).
Los 5 suites del repo corren: `node tests/*.test.js` (154 tests OK).

# PENDING — Sesión del 2026-11-19 (v49)

## Tickets: foto del tiquet → registro de compra + precios por supermercado

- **📸 Escanear ticket**: 1 o 2 fotos del ticket (si es largo, dos partes).
  La foto se redimensiona en el móvil (máx. 1400 px, JPEG 0.72) antes de
  mandarse → pesa poco y la IA tarda mucho menos. **Las fotos no se guardan.**
- **La IA lee el ticket** (`js/ai.js`: `readTicket()`): se le mandan las fotos en
  formato multimodal (`image_url`) con el catálogo de ingredientes y las
  tiendas/produtos del libro, y devuelve JSON con tienda, fecha, total y
  líneas. El prompt está en `systemPromptTicket`.
- **Antes de guardar nada** se muestra la **revisión**: fecha, tienda, y una
  tabla editable con artículo / cantidad / precio / **producto** (con
  autocompletado del catálogo) y un check 💰 por línea (si el precio se
  guarda en el libro). Editable todo: si la IA leyó mal algo, se corrige.
- **Al guardar**:
  - se crea el **registro de ticket** (`Shopping.addTicket`): fecha, tienda,
    líneas, total. Va en la fila `shopping:data` → **sincroniza** con el otro
    móvil (sin tablas nuevas).
  - cada línea marcada actualiza el **libro de precios** con el precio de esa
    tienda → la lista de la compra ya estima el coste real y el "🗺️ Dónde
    comprar" reparte por tienda.
  - opcionalmente **marca como comprado** lo de la lista de esta semana que
    coincide con el ticket.
- **🧾 Vista de tickets**: historial (fecha, tienda, nº de artículos, total),
  gasto del mes y el detalle de cada ticket. Entrada desde la lista de la
  compra ("📸 Ticket" / "🧾 Tickets") y desde el menú ☰.
- **✍️ Ticket a mano**: si no hay foto (o no hay IA), se escriben las líneas
  como `artículo | cantidad | precio`.
- Si el modelo de IA no acepta imágenes, avisa y te manda a Ajustes → 🤖.

`tests/shopping.test.js`: 77 tests · `tests/ai-ticket.test.js`: 11 tests
(contrato con la API: que las 2 fotos vayan en multimodal y que la respuesta
se parsee).

# PENDING — Sesión del 2026-11-19 (v48)

## La lista de la compra, cazada contra el catálogo real (issue #1)

Se revisó la lista contra las **75 recetas** de Supabase y contra el menú real
de la semana (2026-W47) y aparecieron bugs de verdad:

### Bugs corregidos

- **El aceite desaparecía de la lista**: si un ingrediente sale "al gusto" en
  una receta y con cantidad real en otra, la fila entera se borraba (pasaba
  con el aceite de oliva, el vinagre y la mantequilla). Ahora solo cuenta la
  cantidad real.
- **Agua en la lista** (600 ml) → fuera (`NO_COMPRAR`).
- **"un puñado", "unas hojas", "suficiente"** ya no son productos: solo
  cuentan las cantidades con número.
- **"1/2 unidad" se leía como 1** → ahora 0,5 (también "1 1/2" → 1,5).
- **Alias muertos**: los que tenían paréntesis ("pollo (muslos o entero en
  piezas)") nunca casaban, porque el nombre se normaliza sin paréntesis. Ahora
  los alias se normalizan igual → funcionan.
- **Duplicados**: "Ajo rallado" y "Ajo" eran 2 filas; igual "Nueces peladas",
  "Lechuga romana", "Butifarras", "Calamares limpios", "Pulpo y/o calamar",
  "Agua o caldo", "Miel o sirope de agave"… → ahora 1 sola fila.
- **Unidades mezcladas**: "2 ud" + "1 diente" del mismo producto → "3 dientes".
  Y el plural correcto ("2 ramos", "3 dientes", "2 latas").
- **Categorías equivocadas**: "salmón" caía en despensa (por "sal"), "panceta"
  en panadería (por "pan"), "salsa de tomate" en verduras (por "tomate"),
  "caldo de pollo" en carnicería (por "pollo"), "atún fresco" en carnicería
  (por "filete"). Ahora el match es por palabra completa, con plural.
- **31 ingredientes sin categoría** (vino, cerveza, nueces, piñones,
  aceitunas, tofu, pesto…) → todos tienen sección. Nueva sección **Bebidas**.
- **Nombres con paréntesis** ("Sake (opcional)") → "Sake".

### Datos corregidos en Supabase

- "Pasta a la carbonara": 4 huevos con unidad `g` → `unidad`.
- "Arroz a la cubana" y "Vaso de Gazpacho": "dientes de ajo" con unidad
  `unidad` → `dientes`.

### En la semana real (2026-W47)

De 43 productos con 5 en "Otros" y errores de cantidad → **42 productos, 0 en
"Otros"**, "Cebolla morada 0,5 ud" (era 1), sin agua y con las secciones bien.

`tests/shopping.test.js`: **56 tests** (11 nuevos para estos bugs).

# PENDING — Sesión del 2026-11-19 (v47)

## Productos a mano en la lista de la compra (issue #1)

El issue #1 pedía la lista de productos "de todas las recetas sin repetirse,
más fácil, **añadir productos** y precios". Faltaba una cosa: poder añadir
productos que **no** salen de ninguna receta (papel de cocina, cerveza,
limpieza...).

- Botón **➕ Producto** en la lista de la compra → modal con nombre,
  cantidad, categoría (o automática), precio y tienda (los tres últimos
  opcionales).
- Si el producto ya sale de una receta, **se suma a esa fila** (no sale
  duplicado): "Pollo 1 kg" + "1 ud" → **"1 kg + 1 ud"**.
- Los productos a mano se borran con el ✕ de la fila.
- Si ya hay precio en el libro para ese producto, lo hereda (y si no, el
  precio que pongas al añadirlo se guarda en el libro → total y reparto por
  tienda funcionan solos).
- Viven en el libro (`shopping:data` → `extras`) → **sincronizan con el
  otro móvil** sin tocar Supabase.
- `tests/shopping.test.js`: 45 tests (incluye un smoke del render).

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
