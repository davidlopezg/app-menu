# CORS Proxy — MiniMax API

MiniMax no devuelve `Access-Control-Allow-Origin`, por eso el browser
tira "Failed to fetch" al llamar a `https://api.minimax.io/v1`.

Este Worker de Cloudflare es el puente: recibe la request del browser,
agrega los headers CORS, y la reenvía a MiniMax.

## Setup en GitHub (3 secrets, una sola vez)

Andá a `https://github.com/davidlopezg/app-menu/settings/secrets/actions`
y agregá:

| Secret | Valor |
|--------|-------|
| `CF_API_TOKEN` | API Token de Cloudflare con permiso **"Edit Cloudflare Workers"** (sacalo de `https://dash.cloudflare.com/profile/api-tokens`) |
| `CF_ACCOUNT_ID` | Tu Account ID de Cloudflare (visible en el dashboard) |
| `MINIMAX_API_KEY` | Tu API key de MiniMax (NO va al browser, queda en Cloudflare) |

## Deploy

1. Andá a `https://github.com/davidlopezg/app-menu/actions`
2. Click **"Deploy CORS Proxy"** → **Run workflow**
3. Esperá ~30 segundos. Si los 3 secrets están OK, vas a ver:
   ```
   ✅ Los 3 secrets están
   ✅ Script deployado
   ✅ Secret configurado
   🎉 Worker + secret deployados.
   ```

## Configurar la app

1. **Ajustes → 🤖 Agente IA**
2. **Proveedor:** Personalizado
3. **Endpoint URL:** `https://menuapp-minimax-proxy.workers.dev`
4. **Modelo:** `MiniMax M3`
5. **API Key:** _(dejala vacía — el Worker tiene la key)_
6. **Guardar todo** → **Probar**

## Actualizar el proxy en el futuro

Cada vez que cambies `proxy/worker.js` y hagas `git push`, el workflow
se dispara solo y redeploya. Para cambiar la API key, actualizá el
secret `MINIMAX_API_KEY` en GitHub y re-dispará el workflow (o esperá
al próximo push).

## Por qué la key va en Cloudflare y no en el browser

- La key no se puede poner en el código (queda en el repo, la ve cualquiera)
- Si la pone el usuario en localStorage, **no se puede deployar en GitHub Pages**
  con un build porque la app es estática
- Con Cloudflare Worker secret, la key queda cifrada en Cloudflare y el
  browser nunca la toca — más seguro, menos fricción para el usuario

## Si preferís otro provider que soporte CORS nativo

Si esto se complica, podés cambiar el default de la app a:
- OpenRouter (`https://openrouter.ai/api/v1/chat/completions`)
- Groq (`https://api.groq.com/openai/v1/chat/completions`)
- Mistral (`https://api.mistral.ai/v1/chat/completions`)

Todos funcionan desde browser sin proxy.
