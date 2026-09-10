# Pendiente — Deploy del proxy CORS para MiniMax

**Sesión cortada el 2025-09-10.** Usuario frustrado, cansado.

## Plan elegido por el usuario

**La key de MiniMax va como GitHub Secret, no en el browser.**
El Worker la lee de `env.MINIMAX_API_KEY` y la mete en el header
Authorization al reenviar a MiniMax. El browser nunca toca la key.

## Lo que ya está implementado (todo commiteado)

### 1. Worker con soporte para secret
`proxy/worker.js`:
- Si `env.MINIMAX_API_KEY` existe → la usa SIEMPRE (override del header del browser)
- Si no existe → fallback al header Authorization que viene en la request

### 2. Workflow que deploya script + secret
`.github/workflows/deploy-proxy.yml` hace 3 steps:
- Sanity check de los 3 secrets
- Deploy del script via Cloudflare REST API
- Push del secret `MINIMAX_API_KEY` via `PUT /secrets/MINIMAX_API_KEY`

### 3. Documentación
`proxy/README.md` explica los 3 secrets y el flujo completo.

## Lo único que falta hacer (5 minutos del usuario)

### En GitHub Secrets
Andá a `https://github.com/davidlopezg/app-menu/settings/secrets/actions`
y agregá/actualizá estos 3:

| Secret | Valor |
|--------|-------|
| `CF_API_TOKEN` | Token de Cloudflare con permiso "Edit Cloudflare Workers" |
| `CF_ACCOUNT_ID` | Tu Account ID |
| `MINIMAX_API_KEY` | Tu API key de MiniMax |

### Disparar el workflow
`https://github.com/davidlopezg/app-menu/actions` → "Deploy CORS Proxy" → Run workflow.

### En la app
Ajustes → 🤖 Agente IA:
- Proveedor: **Personalizado**
- Endpoint URL: `https://menuapp-minimax-proxy.workers.dev`
- Modelo: `MiniMax M3`
- API Key: **VACÍA** (la tiene el Worker)

### ⚠️ Nota sobre el token de Cloudflare
En la sesión anterior, `CF_API_TOKEN` devolvía error 9109 ("Unauthorized").
Esto suele pasar porque:
- Se usó la Global API Key en vez de un API Token scoped
- El token se creó con permisos insuficientes
- Espacios al copiar/pegar

**Solución:** asegurar que el token se creó con el template "Edit Cloudflare Workers".

## Plan B (si el proxy no funciona)

Cambiar el default de `js/ai.js` a un provider que soporte CORS nativo:
- OpenRouter
- Groq (tier gratis)
- Mistral

Actualizar `PROVIDERS.minimax` con el endpoint y modelo del provider elegido.
Bumpear versión SW.

## Archivos clave

- `proxy/worker.js` — el proxy
- `proxy/README.md` — instrucciones
- `.github/workflows/deploy-proxy.yml` — workflow
- `scripts/test-deploy.sh` — diagnóstico local (ya no crítico, el workflow es más fácil)

## Tono con el usuario

Frustrado, cansado. Ir directo al grano. No proponer opciones complejas.
Si el proxy falla, ofrecer Plan B sin vueltas.

## Commits de esta saga

```
269c6ad  docs: save handoff notes (PENDING.md)  ← ahora desactualizado, ver nueva versión
f28ffaa  ci: add sanity check + verbose diagnostics
965a3ee  ci: deploy proxy via Cloudflare REST API
e3bf047  ci: auto-deploy CORS proxy via GitHub Actions
d238df2  feat(proxy): add Cloudflare Worker
58b8241  fix(ai): correct MiniMax default endpoint
9e16068  fix(db): expose SUPABASE_URL/KEY on DB object
```

(El PENDING inicial queda como histórico, este doc lo reemplaza.)
