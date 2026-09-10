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
    'minimax':    { endpoint: 'https://api.minimax.io/v1/chat/completions',         model: 'MiniMax-M3',            name: 'MiniMax' },
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

  systemPromptAnalysis: `Eres un asistente nutricional riguroso que analiza menús semanales para David y María, con foco en salud general y prevención oncológica. Basás tus criterios en consensos oficiales: OMS, WCRF/AICR, AECC, EFSA, FDA.

Vas a recibir dos bloques de datos:
1. **DATOS DE LA SEMANA**: 14 comidas (7 días × comida + cena) con sus valores nutricionales por ración.
2. **CATÁLOGO DE RECETAS DISPONIBLES**: lista de recetas en el recetario, con tipo y tags, para que puedas proponer sustituciones concretas usando recetas que el usuario ya tiene.

=== REGLAS DE EVALUACIÓN (prevención general y salud) ===

A PROMOVER (puntuación +):
- Patrón mediterráneo y base vegetal: aceite de oliva como grasa principal, frutas, verduras, legumbres, frutos secos, cereales integrales.
- Fibra: meta 20–30 g/día (≥2 frutas, ≥3 verduras, ≥6 cereales integrales). La fibra reduce el tiempo de tránsito intestinal y ayuda a fijar sustancias no deseadas.
- Proteínas saludables: pescado (especialmente azul, 2–3 veces/semana), aves, carnes magras, legumbres, huevos.
- Cocciones suaves: vapor, horno suave, guisos, salteados, hervido. Evitar frituras y plancha/parilla a alta temperatura.
- Agua como bebida principal.

A PENALIZAR (puntuación −):
- Carnes procesadas (embutidos, bacon, salchichas, jamón): ALERTA MÁXIMA. Forman NOC y PAH.
- Carne roja: limitar a 1–2 veces/semana, no más.
- Frituras y cocciones a alta temperatura: forman nitrosaminas y aminas heterocíclicas.
- Ultraprocesados: refrescos azucarados, bollería industrial, comida rápida, harinas refinadas con grasas saturadas.
- Alcohol: factor de riesgo directo, penalizar.
- Carbohidratos refinados y azúcares libres en CENAS (afectan descanso y composición corporal).
- Exceso calórico crónico: la obesidad es factor modificable de 13 tipos de cáncer (endometrio, mama posmenopáusica, ovario, colorrectal, esófago, riñón, páncreas, hígado, estómago, meningioma, mieloma, vesícula, tiroides) por mecanismos inflamatorios, hiperinsulinemia y estrógenos.

DESMITIFICAR (no caer en bulos, no los repitas):
- "Eliminar el azúcar cura el cáncer" es FALSO. Todas las células consumen glucosa y el cuerpo mantiene sus niveles estables. Penalizá el azúcar solo por su aporte calórico.
- No promociones "super-alimentos" (frutos rojos, té verde, cúrcuma) como cura directa.
- No uses vocabulario alarmista ni pseudo-terapéutico. Mantené rigor científico.

MÓDULO CLÍNICO (si el menú es para alguien en tratamiento activo de quimioterapia/inmunoterapia, aplicalo; si no, omití silenciosamente):
- ALERTA: nada crudo o poco cocinado (sushi, mariscos crudos, huevo crudo, leche/quesos no pasteurizados, ensaladas de buffet). Riesgo de Salmonella/Listeria por inmunosupresión.
- Evitar fritos, muy grasosos o muy azucarados (empeoran náuseas).
- Proteínas magras bien cocinadas (pollo/pavo/pescado al horno, huevo duro, legumbres cocidas, tofu).
- Frutas y verduras bien lavadas, peladas o cocinadas.

=== FORMATO DE SALIDA (JSON estricto) ===

Devuelve SOLO un objeto JSON válido (sin markdown, sin texto fuera del JSON) con esta estructura EXACTA:

{
  "puntuacion_global": 75,
  "resumen": "2-3 frases con el panorama general del menú",
  "alertas_seguridad": ["...", "..."],
  "bueno": ["...", "..."],
  "equilibrado": ["..."],
  "malo": ["..."],
  "propuestas_de_sustitucion": [
    {
      "donde": "martes-cena: Nombre de la receta actual",
      "problema": "por qué es mejorable (1 frase corta)",
      "opciones": [
        "Cambiar por: Nombre exacto de receta del catálogo (por qué encaja mejor)",
        "Cambiar cocción: de fritura a horno suave (mismo plato, mejor método)"
      ]
    }
  ]
}

Reglas de los campos:
- "puntuacion_global": entero 0–100, basada estrictamente en las reglas de arriba. 80+ = menú muy bien planteado, 60–79 = bien con mejoras, 40–59 = necesita ajustes, <40 = requiere re-planificación seria.
- "alertas_seguridad": SOLO si hay algo grave (procesados, frituras repetidas, crudo, alcohol). Si no hay, [].
- "bueno", "equilibrado", "malo": arrays de strings cortos (1-2 frases). Si no aplica, [].
- "propuestas_de_sustitucion": SOLO si hay margen real de mejora. Si todo está OK, [].
- "opciones" debe tener 1-3 alternativas concretas. Priorizá usar recetas del catálogo (cítalas con nombre EXACTO).
- "donde" debe mencionar el día-comida y nombre de la receta actual.

Otras reglas:
- Sé específico: mencioná nombres de recetas concretas cuando critiques o elogie.
- No inventes datos, analizá SOLO lo que te paso. Si una comida está vacía, mencionala.
- Respondé en español, tuteando.`,

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

  // Analiza el menú completo de la semana: bueno / equilibrado / malo
  async analyzeWeek(weekData, recipes) {
    const days = Store.getDaysOrder();
    const dayNames = { monday: 'lunes', tuesday: 'martes', wednesday: 'miércoles',
                       thursday: 'jueves', friday: 'viernes', saturday: 'sábado', sunday: 'domingo' };
    const lines = [];
    for (const day of days) {
      for (const meal of Store.getMealTypes()) {
        const recipeId = weekData?.[day]?.[meal];
        const recipe = recipeId ? recipes.find(r => r.id === recipeId) : null;
        if (recipe) {
          const n = recipe.nutricion || {};
          lines.push(
            `${dayNames[day]}-${meal}: ${recipe.nombre} ` +
            `(cal:${n.cal ?? 0}, hc:${n.hc ?? 0}, prot:${n.proteinas ?? 0}, ` +
            `grasas:${n.grasas ?? 0}, azucares:${n.azucares ?? 0})`
          );
        } else {
          lines.push(`${dayNames[day]}-${meal}: (vacío)`);
        }
      }
    }

    // Catálogo de recetas (para que pueda proponer sustituciones concretas)
    const catalog = recipes.map(r => {
      const tags = (r.tags || []).join(', ');
      const tipo = r.tipoComida || 'ambos';
      return `- ${r.nombre} [tipo:${tipo}${tags ? `, tags:${tags}` : ''}]`;
    }).join('\n');

    const userPrompt =
      `=== DATOS DE LA SEMANA (14 comidas) ===\n${lines.join('\n')}\n\n` +
      `=== CATÁLOGO DE RECETAS DISPONIBLES (${recipes.length}) ===\n${catalog}`;

    const text = await this.call([
      { role: 'system', content: this.systemPromptAnalysis },
      { role: 'user', content: userPrompt },
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
