# Pendiente — Deploy del proxy CORS para MiniMax

**Sesión cortada el 2025-09-10.** Usuario frustrado, no quiere hacer más nada manualmente.

## Contexto

El agente IA de la app (`js/ai.js`) usa el provider **MiniMax** con:
- Endpoint: `https://api.minimax.io/v1`
- Modelo: `MiniMax M3`

El browser tira **`Failed to fetch`** (CORS) porque MiniMax no devuelve
`Access-Control-Allow-Origin` en sus responses.

## Solución implementada (a medias)

1. ✅ **Worker code** listo en `proxy/worker.js` — proxy CORS de ~50 líneas
   que reenvía POST a `api.minimax.io` y agrega headers CORS.
2. ✅ **GitHub Actions workflow** listo en `.github/workflows/deploy-proxy.yml`
   — usa `curl` + Cloudflare REST API (NO wrangler, porque wrangler no
   funciona en Termux ARM64).
3. ✅ Documentación en `proxy/README.md`.

## Bloqueo actual

El workflow falla con exit code 1. Corriendo `scripts/test-deploy.sh` desde
Termux se diagnosticó:

```
Test 1 (verify token):
  {"success":false,"errors":[{"code":9109,
   "message":"Unauthorized to access requested resource"}]}

Test 2 (list workers):
  {"success":false,"errors":[{"code":10000,"message":"Authentication error"}]}

Test 3 (deploy):
  {"success":false,"errors":[{"code":10000,"message":"Authentication error"}]}
```

**Causa más probable:** el `CF_API_TOKEN` en GitHub Secrets está mal armado.
Posibles razones:
- Usó la Global API Key en vez de un API Token scoped
- Token creado con template que no es "Edit Cloudflare Workers"
- Espacios/saltos al copiar/pegar

## Lo que falta hacer

### En próxima sesión, guiar al usuario a:

1. Ir a `https://dash.cloudflare.com/profile/api-tokens`
2. Borrar el token viejo si existe
3. **Create Token → template "Edit Cloudflare Workers"** (NO custom, NO global key)
4. Continue to summary → Create Token
5. Copiar el token largo (un solo string, sin espacios)
6. Ir a `https://github.com/davidlopezg/app-menu/settings/secrets/actions`
7. Update `CF_API_TOKEN` con el valor nuevo
8. Re-disparar workflow (`Actions` tab → "Deploy CORS Proxy" → Run workflow)

### Una vez deployado:

El worker queda en `https://menuapp-minimax-proxy.workers.dev`.

En la app:
- Ajustes → 🤖 Agente IA → Proveedor: **Personalizado**
- Endpoint URL: `https://menuapp-minimax-proxy.workers.dev`
- Modelo: `MiniMax M3`
- API Key: la key de MiniMax del usuario

### Si Test 1 sigue tirando 9109 después de re-crear el token:

Problema más raro (cuenta suspendida, región, etc.). Pedir al usuario
captura de:
- `https://dash.cloudflare.com/profile/api-tokens` (qué tokens tiene listados)
- Output de Test 1 después de regenerar

### Plan B si el proxy no se puede deployar:

Ofrecerle **cambiar de provider** a uno que sí soporte CORS nativo:
- OpenRouter (`https://openrouter.ai/api/v1/chat/completions`)
- Groq (`https://api.groq.com/openai/v1/chat/completions`)
- Mistral (`https://api.mistral.ai/v1/chat/completions`)

Todos funcionan desde browser sin proxy. Si acepta, actualizar default en
`js/ai.js` y bumpear versión.

## Cambios ya commiteados en esta sesión

```
f28ffaa  ci: add sanity check + verbose diagnostics to deploy workflow
965a3ee  ci: deploy proxy via Cloudflare REST API instead of wrangler
e3bf047  ci: auto-deploy CORS proxy to Cloudflare Workers via GitHub Actions
d238df2  feat(proxy): add Cloudflare Worker to bypass MiniMax CORS restriction
58b8241  fix(ai): correct MiniMax default endpoint and model
9e16068  fix(db): expose SUPABASE_URL/KEY on DB object (single source of truth)
```

Todos pusheados a `origin/main`.

## Archivos nuevos/importantes

- `proxy/worker.js` — el proxy
- `proxy/README.md` — instrucciones de deploy
- `.github/workflows/deploy-proxy.yml` — workflow de GitHub Actions
- `scripts/test-deploy.sh` — script de diagnóstico local

## Tono con el usuario

Frustrado, cansado, sin ganas de debuggear más. Ser **breve y concreto**.
No proponer opciones complicadas. Si la solución natural (proxy) no se puede
deployar, ofrecer **plan B (cambiar de provider)** como salida rápida.
