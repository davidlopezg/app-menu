#!/usr/bin/env node
// ============================================
// seed-template.mjs — crea/actualiza una plantilla de menú en Supabase
//
// Uso:  node scripts/seed-template.mjs
//
// Las plantillas se guardan en la tabla `menu_weeks` con la clave `tpl:<id>`
// (misma convención que usa la app). OJO: la tabla `menu_templates` NO se
// usa porque sus policies RLS solo permiten el rol `authenticated` y la app
// usa el rol `anon` → 42501 al insertar.
//
// La plantilla se define por NOMBRE de receta (legible). El script busca
// los ids reales en la tabla `recipes`, arma la estructura `dias`
// (misma que usa Menu para una semana) y la sube a `menu_templates`.
//
// Para cambiarla: editá PLAN de abajo y volvé a correr el script
// (hace upsert, no duplica).
// ============================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ---------- .env ----------
const env = {};
for (const line of readFileSync(resolve(root, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const URL_BASE = process.env.SUPABASE_URL || env.SUPABASE_URL;
const KEY = process.env.SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
if (!URL_BASE || !KEY) {
  console.error('Falta SUPABASE_URL / SUPABASE_ANON_KEY en .env');
  process.exit(1);
}
const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
};

// ---------- id fijo → re-correr actualiza, no duplica ----------
const TEMPLATE_ID = 'a1b2c3d4-0000-4000-8000-000000000001';
const TEMPLATE_KEY_PREFIX = 'tpl:';

// ---------- la plantilla ----------
const PLAN = {
  monday:    { lunch: 'Arroz a la cubana',                    dinner: 'Ensalada de pollo' },
  tuesday:   { lunch: 'Lomo con pimientos',                   dinner: 'Merluza a la donostiarra' },
  wednesday: { lunch: 'Garbanzos al horno',                   dinner: 'Tortilla de verduras' },
  thursday:  { lunch: 'Pollo al horno al curri',              dinner: 'Salmón Papillote' },
  friday:    { lunch: "Pasta con salsa de tomate (Cherry’s)", dinner: 'Revuelto de setas' },
  saturday:  { lunch: 'Codillo',                              dinner: 'Ensalada de rúcula con cherrys' },
  sunday:    { lunch: 'Arroz negro',                           dinner: 'Tortilla de atún' },
};

const NOMBRE = 'Semana tipo';
const DESCRIPCION = 'Semana base: pescado 2 veces, pollo, carne, legumbres y verduras cada día.';
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// ---------- helpers ----------
async function rest(path, opts = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, { ...opts, headers });
  const text = await res.text();
  let data; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(data)}`);
  return data;
}

// ---------- 1. resolver ids ----------
const recipes = await rest('recipes?select=id,nombre');
const byName = new Map(recipes.map(r => [r.nombre.trim().toLowerCase(), r.id]));

const dias = {};
const faltan = [];
for (const day of DAYS) {
  dias[day] = { lunch: null, dinner: null };
  for (const meal of ['lunch', 'dinner']) {
    const name = PLAN[day]?.[meal];
    if (!name) continue;
    const id = byName.get(name.trim().toLowerCase());
    if (id) dias[day][meal] = id;
    else faltan.push(`${day}.${meal} → "${name}"`);
  }
}

if (faltan.length) {
  console.error('❌ Recetas no encontradas en `recipes`:');
  faltan.forEach(f => console.error('   ' + f));
  console.error('\n   Nombres disponibles (buscá aprox):');
  for (const f of faltan) {
    const name = f.split('→ "')[1]?.replace('"', '');
    const approx = recipes.filter(r => r.nombre.toLowerCase().includes(name.slice(0, 6).toLowerCase()));
    approx.slice(0, 5).forEach(r => console.error(`     - ${r.nombre}`));
  }
  process.exit(1);
}

// ---------- 2. upsert ----------
const row = {
  week_key: TEMPLATE_KEY_PREFIX + TEMPLATE_ID,
  data: { nombre: NOMBRE, descripcion: DESCRIPCION, dias },
  updated_at: new Date().toISOString(),
};

const res = await fetch(`${URL_BASE}/rest/v1/menu_weeks?on_conflict=week_key`, {
  method: 'POST',
  headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
  body: JSON.stringify(row),
});
const text = await res.text();
if (!res.ok) {
  console.error('❌ Error al guardar:', res.status, text);
  process.exit(1);
}

// ---------- 3. resumen ----------
const nameOf = (id) => recipes.find(r => r.id === id)?.nombre || '?';
console.log(`✅ Plantilla "${NOMBRE}" guardada (${TEMPLATE_KEY_PREFIX}${TEMPLATE_ID})\n`);
for (const day of DAYS) {
  console.log(`  ${day.padEnd(10)} lunch: ${nameOf(dias[day].lunch).padEnd(40)} dinner: ${nameOf(dias[day].dinner)}`);
}
console.log('\nAbrí la app → tocá "Aplicar plantilla" (o "✏️ Editar plantilla").');
