// ============================================
// AI — Cliente para MiniMax API (compatible OpenAI)
// ============================================
// La API key se guarda en localStorage (no en el código).
// Para configurarla: Ajustes → 🤖 Agente IA → pegar key.

const AI = {
  STORAGE_KEY: 'menuapp_ai_key',
  CFG_KEY: 'menuapp_ai_cfg',

  // Providers conocidos (el usuario puede editar el endpoint y modelo manualmente)
  PROVIDERS: {
    'openai':     { endpoint: 'https://api.openai.com/v1/chat/completions',         model: 'gpt-4o-mini',           name: 'OpenAI' },
    'minimax':    { endpoint: 'https://api.minimax.cn/v1/text/chatcompletion_v2', model: 'M2.7',                  name: 'MiniMax' },
    'mistral':    { endpoint: 'https://api.mistral.ai/v1/chat/completions',         model: 'mistral-small-latest',  name: 'Mistral' },
    'groq':       { endpoint: 'https://api.groq.com/openai/v1/chat/completions',     model: 'llama-3.1-8b-instant',  name: 'Groq (Llama)' },
    'openrouter': { endpoint: 'https://openrouter.ai/api/v1/chat/completions',       model: 'openai/gpt-4o-mini',    name: 'OpenRouter' },
    'custom':     { endpoint: '', model: '',                                         name: 'Personalizado' },
  },

  systemPromptRecipe: `Eres un asistente culinario experto en cocina mediterránea y española.
Cuando recibas el nombre de una receta, devuelve SOLO un objeto JSON válido (sin markdown, sin explicaciones) con esta estructura exacta:

{
  "ingredientes": [
    {"nombre": "Nombre del ingrediente", "cantidad": "200", "unidad": "g"}
  ],
  "pasos": [
    "Paso 1 descrito en una o dos frases claras.",
    "Paso 2 ..."
  ]
}

Reglas:
- "unidad" puede ser: g, kg, ml, l, unidad, cuchara, cucharadita, taza, none.
- "cantidad" es texto libre (ej: "200", "al gusto", "un puñado").
- Si el título ya da pistas (ej: "Tortilla de patatas"), asume la versión clásica.
- Pasos numerados mentalmente pero el array no incluye el número.`,

  systemPromptMenu: `Eres un asistente que ayuda a David y María a planificar su menú semanal.
Conoces las recetas disponibles (las pasamos en cada mensaje).
Tu trabajo es sugerir menús equilibrados, variados y apropiados para la pregunta del usuario.

IMPORTANTE: Cuando el usuario pida una propuesta de menú, devuelve SIEMPRE un objeto JSON válido (sin markdown, sin explicaciones fuera del JSON) con esta estructura:

{
  "respuesta": "Texto amigable dirigido al usuario (2-4 frases)",
  "menu_propuesto": null,
  "menu_propuesto": {
    "lunes":    {"comida": "nombre exacto de receta", "cena": "nombre exacto de receta"},
    "martes":   {"comida": "...", "cena": "..."},
    "miercoles":{"comida": "...", "cena": "..."},
    "jueves":   {"comida": "...", "cena": "..."},
    "viernes":  {"comida": "...", "cena": "..."},
    "sabado":   {"comida": "...", "cena": "..."},
    "domingo":  {"comida": "...", "cena": "..."}
  }
}

Reglas:
- Los nombres de receta deben COINCIDIR EXACTAMENTE con los de la lista de disponibles.
- Si la pregunta no es sobre un menú (ej: pregunta general de cocina), "menu_propuesto" debe ser null.
- Si solo propone 1-3 días, pon null en los días que no propuso.
- Apunta a variedad: no repitas proteína 2 días seguidos.
- Cenas suelen ser más ligeras que los almuerzos.`,

  // Estado
  key: '',
  endpoint: '',
  model: '',
  provider: 'openai',

  init() {
    this.key = localStorage.getItem(this.STORAGE_KEY) || '';
    try {
      const cfg = JSON.parse(localStorage.getItem(this.CFG_KEY) || 'null');
      if (cfg) {
        this.endpoint = cfg.endpoint || this.PROVIDERS.minimax.endpoint;
        this.model = cfg.model || this.PROVIDERS.minimax.model;
        this.provider = cfg.provider || 'minimax';
      } else {
        // Defaults: MiniMax (lo que usa este proyecto)
        this.endpoint = this.PROVIDERS.minimax.endpoint;
        this.model = this.PROVIDERS.minimax.model;
        this.provider = 'minimax';
      }
    } catch {
      this.endpoint = this.PROVIDERS.minimax.endpoint;
      this.model = this.PROVIDERS.minimax.model;
      this.provider = 'minimax';
    }
  },

  setKey(k) {
    this.key = (k || '').trim();
    if (this.key) localStorage.setItem(this.STORAGE_KEY, this.key);
    else localStorage.removeItem(this.STORAGE_KEY);
  },

  setConfig(provider, endpoint, model) {
    this.provider = provider;
    this.endpoint = (endpoint || '').trim();
    this.model = (model || '').trim();
    localStorage.setItem(this.CFG_KEY, JSON.stringify({
      provider: this.provider,
      endpoint: this.endpoint,
      model: this.model,
    }));
  },

  hasKey() {
    return !!this.key && !!this.endpoint && !!this.model;
  },

  // ============================================
  // Helpers
  // ============================================
  async call(messages, opts = {}) {
    if (!this.key) throw new Error('API key no configurada. Andá a Ajustes.');
    if (!this.endpoint) throw new Error('Endpoint no configurado. Andá a Ajustes.');
    if (!this.model) throw new Error('Modelo no configurado. Andá a Ajustes.');

    const body = {
      model: this.model,
      messages,
      temperature: opts.temperature ?? 0.6,
    };
    // Algunos providers no soportan response_format
    if (opts.json && this.provider !== 'custom' && this.provider !== 'minimax') {
      body.response_format = { type: 'json_object' };
    }

    let res;
    try {
      // Log útil para debug en DevTools (consola del navegador)
      console.log('[AI] request →', {
        provider: this.provider,
        endpoint: this.endpoint,
        model: this.model,
        keyLen: this.key?.length || 0,
        keyPrefix: this.key ? this.key.slice(0, 7) + '…' : '(empty)',
      });

      res = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.key}`,
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      throw new Error('Error de red: ' + (e.message || e) + '. ¿Endpoint correcto?');
    }

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      // Log de la respuesta cruda para debug
      console.warn('[AI] response error', res.status, txt);

      // Info de contexto (qué provider/endpoint estaba configurado)
      const ctx = `[provider=${this.provider}, endpoint=${this.endpoint}]`;

      let msg = '';
      if (res.status === 401) {
        // MiniMax devuelve 401 con status_code 1004 en base_resp
        let detail = '';
        try {
          const j = JSON.parse(txt);
          const code = j?.base_resp?.status_code;
          const smsg = j?.base_resp?.status_msg;
          const apiMsg = j?.error?.message || j?.message;
          if (code) detail = ` (code ${code}: ${smsg || 'key inválida'})`;
          else if (apiMsg) detail = ` (${apiMsg})`;
        } catch {}
        msg = `401 Unauthorized${detail}. La key no es válida para este endpoint. ` +
              `Revisá que el proveedor del dropdown coincida con el de tu key. ${ctx}`;
      } else if (res.status === 403) {
        msg = `403 Forbidden. La key es válida pero no tiene permisos (¿suscripción agotada?). ${ctx}`;
      } else if (res.status === 404) {
        msg = `404 Not Found. El endpoint no existe (¿URL mal escrita?). ${ctx}`;
      } else if (res.status === 429) {
        msg = `429 Too Many Requests. Rate limit alcanzado. ${ctx}`;
      } else {
        msg = `${res.status}: ${txt.slice(0, 200)} ${ctx}`;
      }
      throw new Error(msg);
    }

    const data = await res.json();
    // Extraer texto de varios formatos posibles (OpenAI, MiniMax, etc.)
    const text = (
      data.choices?.[0]?.message?.content ??  // OpenAI / MiniMax OpenAI-compatible
      data.choices?.[0]?.text ??               // algunos
      data.reply ??                            // MiniMax directo
      data.text ??                             // generico
      data.content ??                          // generico
      data.message?.content ??                  // otro formato
      ''
    );
    return text;
  },

  // Extrae JSON de una respuesta que puede tener markdown ```json ... ```
  extractJson(text) {
    let cleaned = text.trim();
    // quitar fences ```json ... ```
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      // Intentar encontrar el primer {...} balanceado
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try { return JSON.parse(match[0]); } catch {}
      }
      throw new Error('No se pudo parsear JSON: ' + cleaned.slice(0, 100));
    }
  },

  // ============================================
  // Acciones de alto nivel
  // ============================================

  // Rellena ingredientes y pasos de una receta a partir de su título
  async completeRecipe(title) {
    const text = await this.call([
      { role: 'system', content: this.systemPromptRecipe },
      { role: 'user', content: `Receta: "${title}"` },
    ], { json: true });
    return this.extractJson(text);
  },

  // Chat libre con contexto de menú y recetas disponibles
  async chatMenu(userMessage, ctx) {
    const recipes = ctx.recipes || [];
    const recipesList = recipes.map(r => `- ${r.nombre} (${r.tipo_comida || 'ambos'})`).join('\n');
    const currentMenu = ctx.currentMenu || {};

    const userPrompt = `Recetas disponibles (${recipes.length}):
${recipesList}

Menú actual:
${JSON.stringify(currentMenu, null, 2)}

Usuario dice: "${userMessage}"`;

    const text = await this.call([
      { role: 'system', content: this.systemPromptMenu },
      { role: 'user', content: userPrompt },
    ], { json: true });

    return this.extractJson(text);
  },
};
