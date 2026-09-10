# CORS Proxy — MiniMax API

Este Worker de Cloudflare resuelve el error `Failed to fetch` que aparece
cuando el navegador intenta llamar directo a `https://api.minimax.io/v1`.

MiniMax no devuelve los headers `Access-Control-Allow-Origin`, así que el
browser bloquea la respuesta. El proxy reenvía la request y le agrega los
headers CORS para que el browser la acepte.

## Deploy (una sola vez)

### Opción A — Dashboard web (más fácil)

1. Entrá a https://dash.cloudflare.com (cuenta gratis si no tenés).
2. **Workers & Pages** → **Create** → **Create Worker**.
3. Poné un nombre, por ejemplo `menuapp-minimax-proxy`.
4. Borrá todo el código del editor y pegá el contenido de [`worker.js`](./worker.js).
5. Click **Save and Deploy**.
6. Te devuelve una URL tipo:
   ```
   https://menuapp-minimax-proxy.TU_SUBDOMINIO.workers.dev
   ```
   Anotala, la vas a usar en la app.

### Opción B — CLI con Wrangler (para devs)

```bash
npm install -g wrangler
wrangler login
wrangler deploy worker.js --name menuapp-minimax-proxy
```

Te devuelve la misma URL.

## Configurar en la app

1. Abrí la app → **Ajustes** → 🤖 **Agente IA**
2. **Proveedor:** Personalizado
3. **Endpoint URL:** la URL de tu worker, por ejemplo
   ```
   https://menuapp-minimax-proxy.TU_SUBDOMINIO.workers.dev
   ```
   (Opcional: agregale `/v1` al final si querés ser explícito, funciona igual.)
4. **Modelo:** `MiniMax M3`
5. **API Key:** tu key de MiniMax
6. **Guardar todo** → **Probar**

Debería responder `✅ Key funciona`.

## Privacidad y costos

- **Privacidad:** el worker es *stateless* — no loggea headers ni body, solo
  pasa la request de largo. La key va en el header `Authorization` exactamente
  igual que si llamaras directo.
- **Costos:** el plan gratis de Cloudflare da 100.000 requests/día, más que
  suficiente para uso personal.

## Por qué no arreglamos CORS en la app directamente

Un proxy CORS tiene que estar en un servidor, no en el browser. Por eso
necesitamos sí o sí un intermediario. Cloudflare Workers es la opción más
barata y rápida de montar (no requiere tarjeta).

## Si después querés algo más pro

Cuando el uso crezca, podés:
- Agregar rate limiting en el worker (`env.RATE_LIMIT` con KV)
- Restringir por origen (`Access-Control-Allow-Origin: https://davidlopezg.github.io`)
- Sumar auth con un token propio para que solo tu app pueda usarlo
