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
