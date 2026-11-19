# Tests

Tests del drag & drop y de la lógica de mover/intercambiar recetas.

```bash
npm i jsdom          # única dependencia
node tests/dragdrop.test.js
node tests/move-logic.test.js
node tests/prep.test.js
node tests/shopping.test.js
node tests/ai-ticket.test.js
```

| Test | Qué cubre |
|---|---|
| `dragdrop.test.js` | Gesto con mouse y con dedo: mover a celda vacía, intercambiar con celda ocupada, que un toque corto NO dispare arrastre (el click normal sigue funcionando), y que mover el dedo antes del long press sea scroll y no arrastre. |
| `move-logic.test.js` | `App._moveMealInWeek` y `App._moveMealInTemplate`: mover, intercambiar, no-op cuando origen y destino son la misma celda, y persistencia en localStorage. |
| `prep.test.js` | Plan de preparación: ventanas, batches, checks y el render de la vista. |
| `shopping.test.js` | Lista de la compra: normalización de unidades, sin repetidos, categorías, precios, productos a mano, **tickets** (registro, precios al libro, marcar comprado, sync) y el render. |
| `ai-ticket.test.js` | Contrato con la API de IA al leer un ticket: que se manden las 1-2 fotos en formato multimodal y que la respuesta se parsee como JSON. |

Los tests cargan el código real de la app (`js/app.js`, `js/dragdrop.js`,
`js/templates.js`, ...) con jsdom, así que atrapan bugs de verdad.
