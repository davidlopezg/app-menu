# PENDING — Histórico de la sesión del 2025-09-10

**Estado:** ✅ Resuelto.

## El problema real

El error "Failed to fetch" era por **path incorrecto**, no por CORS bloqueado.

- ❌ Endpoint viejo en `js/ai.js`: `https://api.minimax.io/v1`
- ✅ Endpoint correcto: `https://api.minimax.io/v1/chat/completions`

MiniMax **sí devuelve CORS completo** en `/v1/chat/completions`
(`Access-Control-Allow-Origin: *`, métodos POST/GET permitidos,
`Authorization` en allow-headers). Confirmado con curl en Termux.

## Lo que el usuario tenía razón y yo no

El usuario dijo "esto que dices es mentira, ya lo tengo configurado en
otra app". Tenía razón: su otra app (HabitQuest) usa el path completo
`/v1/chat/completions`, por eso le funciona. Yo asumí que el path base
`/v1` también funcionaría y era un problema de CORS en general.

## Fix aplicado (commit v16)

```
js/ai.js   → endpoint MiniMax: https://api.minimax.io/v1/chat/completions
sw.js      → CACHE_NAME = 'menuapp-v16'
js/app.js  → VERSION = 'v16 (2025-09-10)'
```

Pusheado a `origin/main`. El usuario no necesita hacer nada más en su
app: la próxima vez que abra, el SW v16 reemplaza al viejo y el default
del dropdown "MiniMax" ya apunta al endpoint correcto.

## Cosas que quedaron armadas pero ya no son necesarias

- `proxy/worker.js` + workflow de deploy + script de diagnóstico
  → siguen en el repo por si en el futuro quieren Modo B (proxy)
  o necesitan deployar otra cosa. No molestan.
- `scripts/test-deploy.sh` → mismo caso, queda como utilidad de debug.

## Lo que NO se cambió

- El mecanismo de guardar la AI key sigue siendo **localStorage**
  (igual que antes). Para uso personal (David & María) está bien.
- El Modo A de HabitQuest (key embebida en el bundle vía GitHub
  Action + VITE_MINIMAX_API_KEY) **no se aplicó** porque app-menu
  no usa Vite y agregar build step sería restructurar todo. Si
  en algún momento quieren eso, lo armamos.

## Lección

Antes de montar un proxy y un workflow de deploy, **chequear con curl
si el endpoint devuelve CORS**. Un solo comando `curl -X OPTIONS` con
los headers de preflight hubiera resuelto esto en 30 segundos en vez
de dar toda la vuelta del proxy.
