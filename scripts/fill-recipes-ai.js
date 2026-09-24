// ============================================
// fill-recipes-ai.js — Rellenar recetas sin ingredientes usando la IA
// ============================================
// USO:
//   1. Abrí la app en el navegador (con sesión iniciada)
//   2. F12 → Console
//   3. Pegá TODO este archivo y presioná Enter
//   4. Esperá (puede tardar varios minutos — 47 recetas)
//   5. La consola va mostrando progreso
//
// La API key se lee del localStorage, no sale del navegador.

(async function fillRecipesWithAI() {
  // ===== Config =====
  const SUPABASE_URL = 'https://flpxuyrtdmkqzzdcjqbr.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZscHh1eXJ0ZG1rcXp6ZGNqcWJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NzE1MDcsImV4cCI6MjEwNDU0NzUwN30.dA9CmjXMkduZjDPUZw29IDPG3lPiSn-BrH3neGEzDxw';
  const AI_KEY = localStorage.getItem('menuapp_ai_key');
  const AI_CFG = JSON.parse(localStorage.getItem('menuapp_ai_cfg') || '{}');
  const AI_ENDPOINT = AI_CFG.endpoint || 'https://api.minimax.io/v1/chat/completions';
  const AI_MODEL = AI_CFG.model || 'MiniMax-M3';

  if (!AI_KEY) {
    console.error('❌ No hay API key en localStorage (menuapp_ai_key). Configurá la IA primero en Ajustes.');
    return;
  }

  console.log(`🤖 Usando ${AI_MODEL} @ ${AI_ENDPOINT}`);
  console.log('📥 Leyendo recetas de Supabase...');

  // ===== Traer todas las recetas =====
  const res = await fetch(`${SUPABASE_URL}/rest/v1/recipes?select=id,nombre,tipo_comida,tags,ingredientes&order=nombre&limit=200`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) {
    console.error('❌ Error leyendo Supabase:', res.status);
    return;
  }
  const allRecipes = await res.json();
  const pending = allRecipes.filter(r => !r.ingredientes || r.ingredientes.length === 0);
  console.log(`📋 ${pending.length} recetas sin ingredientes de ${allRecipes.length} totales.`);

  if (pending.length === 0) {
    console.log('✅ Nada que rellenar.');
    return;
  }

  // ===== System prompt (mismo que la app usa) =====
  const SYSTEM_PROMPT = `Eres un asistente culinario experto en cocina mediterránea y española.
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
- Pasos numerados mentalmente pero el array no incluye el número.`;

  // ===== Loop: una receta a la vez =====
  let ok = 0;
  let errs = [];
  const startTime = Date.now();

  for (let i = 0; i < pending.length; i++) {
    const r = pending[i];
    const t = ((Date.now() - startTime) / 1000).toFixed(0);
    console.log(`[${i+1}/${pending.length}] (${t}s) → ${r.nombre}`);

    try {
      // Llamada a la IA
      const aiRes = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_KEY}`,
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: r.nombre },
          ],
          temperature: 0.6,
        }),
      });

      if (!aiRes.ok) {
        const errTxt = await aiRes.text();
        throw new Error(`IA HTTP ${aiRes.status}: ${errTxt.slice(0, 100)}`);
      }

      const aiData = await aiRes.json();
      let content = aiData.choices?.[0]?.message?.content || '';

      // Limpiar markdown si la IA lo agregó
      content = content.trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/, '')
        .replace(/```$/, '')
        .trim();

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        throw new Error(`JSON inválido: ${content.slice(0, 80)}`);
      }

      if (!parsed.ingredientes || !Array.isArray(parsed.ingredientes)) {
        throw new Error('Sin array ingredientes');
      }
      if (!parsed.pasos || !Array.isArray(parsed.pasos)) {
        throw new Error('Sin array pasos');
      }

      // PATCH en Supabase
      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/recipes?id=eq.${r.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          ingredientes: parsed.ingredientes,
          pasos: parsed.pasos,
        }),
      });

      if (!patchRes.ok) {
        throw new Error(`Supabase HTTP ${patchRes.status}`);
      }

      ok++;
      console.log(`  ✓ ${parsed.ingredientes.length} ingredientes, ${parsed.pasos.length} pasos`);
    } catch (err) {
      errs.push({ nombre: r.nombre, error: err.message });
      console.error(`  ✗ ${err.message}`);
    }

    // Pequeño delay para no saturar el rate limit
    await new Promise(r => setTimeout(r, 500));
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(0);
  console.log('');
  console.log('========================================');
  console.log(`✅ Listo en ${totalTime}s`);
  console.log(`   ${ok} recetas rellenadas`);
  console.log(`   ${errs.length} errores`);
  if (errs.length > 0) {
    console.log('Errores:');
    errs.forEach(e => console.log(`  - ${e.nombre}: ${e.error}`));
  }
  console.log('========================================');
  console.log('💡 Refrescá la app (Ajustes → Refrescar desde la nube) para ver los cambios.');
})();
