// ============================================
// AI — Cliente para MiniMax API (compatible OpenAI)
// ============================================
// La API key se guarda en localStorage (no en el código).
// Para configurarla: Ajustes → 🤖 Agente IA → pegar key.

const AI = {
  STORAGE_KEY: 'menuapp_ai_key',
  ENDPOINT: 'https://api.minimaxi.com/v1/chat/completions',
  MODEL: 'MiniMax-Text-01',

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
  init() {
    this.key = localStorage.getItem(this.STORAGE_KEY) || '';
  },

  setKey(k) {
    this.key = (k || '').trim();
    if (this.key) localStorage.setItem(this.STORAGE_KEY, this.key);
    else localStorage.removeItem(this.STORAGE_KEY);
  },

  hasKey() {
    return !!this.key;
  },

  // ============================================
  // Helpers
  // ============================================
  async call(messages, opts = {}) {
    if (!this.key) throw new Error('API key no configurada. Andá a Ajustes.');

    const body = {
      model: this.MODEL,
      messages,
      temperature: opts.temperature ?? 0.6,
    };
    if (opts.json) body.response_format = { type: 'json_object' };

    const res = await fetch(this.ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.key}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`API ${res.status}: ${txt.slice(0, 200)}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
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
