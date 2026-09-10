// ============================================
// Cloudflare Worker — CORS proxy para MiniMax
// ============================================
// Por qué: el browser no puede llamar directo a https://api.minimax.io
// porque no devuelve Access-Control-Allow-Origin. Este worker recibe
// la request, le agrega headers CORS, y la reenvía a MiniMax.
//
// Diseño: la API key de MiniMax vive en el secret del Worker
// (env.MINIMAX_API_KEY), nunca llega al browser. Si no está configurada,
// usa el header Authorization que viene en la request (modo fallback).
//
// Setup (3 secrets en GitHub, una sola vez):
//   CF_API_TOKEN     → token de Cloudflare con permiso "Edit Cloudflare Workers"
//   CF_ACCOUNT_ID    → tu account ID de Cloudflare
//   MINIMAX_API_KEY  → tu API key de MiniMax
//
// El workflow deploya el script Y sube el secret, todo automático.

export default {
  async fetch(request, env) {
    const CORS = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };

    // Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        { status: 405, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    // Reescribir origen: worker → MiniMax, conservando path y query
    const url = new URL(request.url);
    const targetUrl = `https://api.minimax.io${url.pathname}${url.search}`;

    // Construir headers. Si el worker tiene el secret, lo usa SIEMPRE
    // (ignora el del browser). Si no, usa lo que mandó el browser.
    const headers = new Headers(request.headers);
    if (env && env.MINIMAX_API_KEY) {
      headers.set('Authorization', `Bearer ${env.MINIMAX_API_KEY}`);
    }

    // Reenviar request
    let upstream;
    try {
      upstream = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: request.body,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Upstream fetch failed', detail: String(err) }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    // Devolver respuesta con CORS headers
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
