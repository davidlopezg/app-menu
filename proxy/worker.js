// ============================================
// Cloudflare Worker — CORS proxy para MiniMax
// ============================================
// Por qué: el browser no puede llamar directo a https://api.minimax.io/v1
// porque el server no devuelve Access-Control-Allow-Origin.
// Este worker recibe la request, la reenvía a MiniMax, y le agrega
// los headers CORS para que el browser la acepte.
//
// Deploy (una sola vez, ~2 min):
//   1. https://dash.cloudflare.com → Workers & Pages → Create
//   2. Nombre: menuapp-minimax-proxy (o el que quieras)
//   3. Borrá el código default, pegá este
//   4. Save and Deploy
//   5. Te da una URL tipo https://menuapp-minimax-proxy.TU_SUBDOMINIO.workers.dev
//
// En la app:
//   Ajustes → 🤖 Agente IA → Proveedor: Personalizado
//   Endpoint: la URL de tu worker (SIN path, o con /v1 si querés)
//   Modelo: MiniMax M3
//   API Key: tu key de MiniMax
//   Guardar todo → Probar
//
// ⚠️ La key va en el header Authorization como siempre. El worker solo
//    pasa la request de largo, no loggea ni guarda nada.

export default {
  async fetch(request) {
    // Headers CORS que el browser necesita
    const CORS = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };

    // Preflight (el browser manda OPTIONS antes de POST cross-origin)
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        { status: 405, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    // Reescribir el origen: worker → MiniMax, conservando path y query
    const url = new URL(request.url);
    const targetUrl = `https://api.minimax.io${url.pathname}${url.search}`;

    // Reenviar request tal cual (headers + body)
    let upstream;
    try {
      upstream = await fetch(targetUrl, {
        method: 'POST',
        headers: request.headers,
        body: request.body,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Upstream fetch failed', detail: String(err) }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    // Devolver el body + status original, sumando los headers CORS
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: {
        ...CORS,
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
      },
    });
  },
};
