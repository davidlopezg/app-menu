# Tests

Tests del drag & drop y de la lógica de mover/intercambiar recetas.

```bash
npm i jsdom          # única dependencia
node tests/dragdrop.test.js
node tests/move-logic.test.js
```

| Test | Qué cubre |
|---|---|
| `dragdrop.test.js` | Gesto con mouse y con dedo: mover a celda vacía, intercambiar con celda ocupada, que un toque corto NO dispare arrastre (el click normal sigue funcionando), y que mover el dedo antes del long press sea scroll y no arrastre. |
| `move-logic.test.js` | `App._moveMealInWeek` y `App._moveMealInTemplate`: mover, intercambiar, no-op cuando origen y destino son la misma celda, y persistencia en localStorage. |

Los tests cargan el código real de la app (`js/app.js`, `js/dragdrop.js`,
`js/templates.js`, ...) con jsdom, así que atrapan bugs de verdad.
