#!/usr/bin/env node
// ============================================
// calc-nutrition.mjs — calcula la nutrición de las recetas
//
// Uso:
//   node scripts/calc-nutrition.mjs              # solo las de la plantilla
//   node scripts/calc-nutrition.mjs --all        # todas las recetas
//   node scripts/calc-nutrition.mjs --dry        # no escribe, solo muestra
//
// Calcula kcal/HC/proteína/grasa/fibra/azúcares a partir de las cantidades
// de cada ingrediente y los valores de data/nutrition-reference.json.
// Una receta SOLO se completa si TODOS sus ingredientes tienen dato.
// ============================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const ALL = args.includes('--all');

// ---------- .env ----------
const env = {};
for (const line of readFileSync(resolve(root, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const URL_BASE = process.env.SUPABASE_URL || env.SUPABASE_URL;
const KEY = process.env.SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
if (!URL_BASE || !KEY) { console.error('Falta SUPABASE_URL / SUPABASE_ANON_KEY en .env'); process.exit(1); }
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function rest(path, opts = {}) {
  // OJO: merge de headers — si no, opts.headers (p.ej. el Prefer del upsert)
  // se pierde y PostgREST hace INSERT en vez de UPSERT → duplicate key.
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...opts,
    headers: { ...headers, ...(opts.headers || {}) },
  });
  const text = await res.text();
  let data; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(data)}`);
  return data;
}

// ---------- referencia nutricional ----------
const REF = JSON.parse(readFileSync(resolve(root, 'data/nutrition-reference.json'), 'utf8'));
// Archivos extra de referencia (se mergean): alimentos y alias adicionales
for (const extra of ['nutrition-extra.json', 'nutrition-alias.json']) {
  const e = JSON.parse(readFileSync(resolve(root, 'data', extra), 'utf8'));
  if (e.alimentos) Object.assign(REF.alimentos, e.alimentos);
  if (e.alias) Object.assign(REF.alias, e.alias);
  if (e.sin_calcular) Object.assign(REF.sin_calcular, e.sin_calcular);
}

const norm = (s) => (s || '')
  .toLowerCase()
  .replace(/ñ/g, 'n')                     // ñ → n (si no, "piñones" → "pinoes")
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/\([^)]*\)/g, ' ')            // "(opcional)", "(1 sobre)"…
  .replace(/[,;.]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const ALIM = new Map(Object.entries(REF.alimentos).map(([k, v]) => [norm(k), v]));
const ALIAS = new Map(Object.entries(REF.alias).map(([k, v]) => [norm(k), norm(v)]));
const SIN = new Set(Object.keys(REF.sin_calcular).map(norm));

function lookup(name) {
  const n = norm(name);
  if (SIN.has(n)) return { zero: true };
  const key = ALIAS.get(n) || n;
  if (SIN.has(key)) return { zero: true };
  const a = ALIM.get(key);
  return a ? { a } : null;
}

// gramos que aporta un ingrediente
function grams(ing, a) {
  const raw = String(ing.cantidad ?? '').trim();
  const cant = parseFloat(raw.replace(',', '.'));
  const unidad = String(ing.unidad || 'g').toLowerCase().trim();
  const densidad = a?.densidad ?? 1;
  const gUnidad = a?.g_unidad ?? 100;

  // unidad "none" con cantidad en texto: "al gusto" → 0, "un puñado" → 15 g
  if (unidad === 'none') {
    if (/al gusto/i.test(raw)) return 0;
    if (/puñad/i.test(raw)) return 15;
    if (/ramo/i.test(raw)) return 30;
    return 0;
  }
  if (isNaN(cant)) return null;
  switch (unidad) {
    case 'g': return cant;
    case 'kg': return cant * 1000;
    case 'ml': return cant * densidad;
    case 'unidad': return cant * gUnidad;
    case 'cuchara': case 'cucharas': return 15 * densidad;
    case 'cucharita': case 'cucharitas': case 'cucharadita': case 'cucharaditas': return 5 * densidad;
    case 'dientes': return cant * 3;
    case 'diente': return cant * 3;
    case 'latas': return cant * 120;
    case 'lata': return cant * 120;
    case 'l': return cant * 1000;
    case 'ramo': case 'ramas': return cant * 30;
    case 'lonchas': return cant * 30;
    case 'hoja': case 'hojas': return cant * 0.2;
    case 'rebanadas': return cant * 35;
    case 'rodajas': return cant * 30;
    case 'puñado': return cant * 15;
    case 'sobre': return cant * 10;
    default: return null;
  }
}

function calc(receta) {
  const tot = { cal: 0, hc: 0, proteinas: 0, grasas: 0, fibra: 0, azucares: 0 };
  const faltan = [];
  for (const ing of receta.ingredientes || []) {
    const hit = lookup(ing.nombre);
    if (!hit) { faltan.push(ing.nombre); continue; }
    if (hit.zero) continue;
    const g = grams(ing, hit.a);
    if (g === null) { faltan.push(`${ing.nombre} (unidad "${ing.unidad}" no reconocida)`); continue; }
    const f = g / 100;
    tot.cal += (hit.a.cal || 0) * f;
    tot.hc += (hit.a.hc || 0) * f;
    tot.proteinas += (hit.a.proteinas || 0) * f;
    tot.grasas += (hit.a.grasas || 0) * f;
    tot.fibra += (hit.a.fibra || 0) * f;
    tot.azucares += (hit.a.azucares || 0) * f;
  }
  Object.keys(tot).forEach(k => { tot[k] = Math.round(tot[k]); });
  return { tot, faltan };
}

// ---------- recetas objetivo ----------
const weeks = await rest('menu_weeks?select=*');
const tpl = weeks.find(w => String(w.week_key).startsWith('tpl:'));
const all = await rest('recipes?select=*&limit=300');

let objetivo = all;
if (!ALL) {
  if (!tpl) { console.error('No hay plantilla en la nube.'); process.exit(1); }
  const ids = new Set(Object.values(tpl.data.dias || {}).flatMap(v => [v.lunch, v.dinner]).filter(Boolean));
  objetivo = all.filter(r => ids.has(r.id));
}
console.log(`📋 Recetas a calcular: ${objetivo.length}${ALL ? ' (todas)' : ' (las de la plantilla)'}\n`);

const filas = [];
const incompletas = [];
for (const r of objetivo) {
  const { tot, faltan } = calc(r);
  const yaTenia = (r.nutricion?.cal || 0) > 0;
  if (faltan.length) {
    incompletas.push({ nombre: r.nombre, faltan });
    console.log(`⚠️  ${r.nombre.padEnd(38)} → sin dato: ${faltan.join(', ')}`);
    continue;
  }
  const cambia = JSON.stringify(r.nutricion || {}) !== JSON.stringify(tot);
  filas.push({ r, tot, cambia, yaTenia });
  const flag = tot.cal > 1200 ? '  ⚠️ receta para varias personas' : '';
  console.log(`${cambia ? '🔄' : '✓ '} ${r.nombre.padEnd(38)} ${String(tot.cal).padStart(5)} kcal | HC ${String(tot.hc).padStart(4)} | prot ${String(tot.proteinas).padStart(3)} | grasa ${String(tot.grasas).padStart(3)}${flag}`);
}

// ---------- escribir ----------
if (!DRY && filas.length) {
  const rows = filas.map(({ r, tot }) => ({
    id: r.id,
    nombre: r.nombre,
    ingredientes: r.ingredientes,
    pasos: r.pasos,
    nutricion: tot,
    tipo_comida: r.tipo_comida,
    imagen: r.imagen || '',
    tags: r.tags || [],
    link: r.link || '',
    fecha_creacion: r.fecha_creacion,
    updated_at: new Date().toISOString(),
  }));
  await rest('recipes?on_conflict=id', {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(rows),
  });
  console.log(`\n✅ ${rows.length} recetas actualizadas${DRY ? ' (dry-run)' : ''}`);
}

console.log(`\nResumen: ${filas.length} completas, ${incompletas.length} con ingredientes sin dato`);
if (incompletas.length) {
  const todos = [...new Set(incompletas.flatMap(i => i.faltan))];
  console.log('\nIngredientes que faltan en data/nutrition-reference.json:');
  todos.forEach(t => console.log('  - ' + t));
}
