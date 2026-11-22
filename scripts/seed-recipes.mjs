#!/usr/bin/env node
// ============================================
// seed-recipes.mjs — agrega/actualiza recetas en Supabase
//
// Uso:  node scripts/seed-recipes.mjs
//
// Las recetas que no existían en el catálogo y hacen falta para la
// plantilla "Semana tipo". Id fijo → re-correr actualiza, no duplica.
// ============================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

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

const ing = (nombre, cantidad, unidad) => ({ nombre, cantidad, unidad });

const RECETAS = [
  {
    id: 'b1a2c3d4-1111-4111-8111-000000000001',
    nombre: 'Aliño de tomate y pimiento',
    tipo_comida: 'cena',
    tags: ['cena', 'ensalada', 'verdura', 'rápida', 'vegetariano'],
    ingredientes: [
      ing('Tomates maduros', '3', 'unidad'),
      ing('Pimiento rojo', '1', 'unidad'),
      ing('Pimiento verde (opcional)', '1', 'unidad'),
      ing('Cebolla morada', '1/2', 'unidad'),
      ing('Aceite de oliva virgen extra', '3', 'cuchara'),
      ing('Vinagre de Jerez', '1', 'cuchara'),
      ing('Sal y pimienta', 'al gusto', 'none'),
      ing('Perejil fresco', 'un puñado', 'none'),
    ],
    pasos: [
      'Lavá los tomates y los pimientos. Cortá el tomate en rodajas y el pimiento en tiras finas.',
      'Picá la cebolla morada en juliana muy fina.',
      'En un bol fondo mezclá el tomate, el pimiento y la cebolla.',
      'Aliñá con el aceite de oliva, el vinagre de Jerez, sal, pimienta y el perejil picado.',
      'Dejá reposar 10 minutos para que el tomate suelte jugo y serví.',
    ],
  },
  {
    id: 'b1a2c3d4-2222-4222-8222-000000000002',
    nombre: 'Patatas con huevo',
    tipo_comida: 'almuerzo',
    tags: ['almuerzo', 'patatas', 'huevos', 'rápida', 'barata'],
    ingredientes: [
      ing('Patatas', '500', 'g'),
      ing('Huevos', '4', 'unidad'),
      ing('Cebolla', '1', 'unidad'),
      ing('Aceite de oliva virgen extra', '3', 'cuchara'),
      ing('Pimentón dulce (opcional)', '1', 'cucharita'),
      ing('Sal y pimienta', 'al gusto', 'none'),
      ing('Perejil fresco (opcional)', 'un puñado', 'none'),
    ],
    pasos: [
      'Pelá las patatas y cortalas en dados pequeños. Picá la cebolla.',
      'En una sartén con el aceite, pochá la cebolla a fuego medio-bajo unos 5 minutos.',
      'Sumá las patatas y cubrí con agua. Cociná a fuego medio 15-20 minutos, hasta que estén tiernas.',
      'Cascá los huevos encima (o batilos y revuelvos con las patatas), sal, pimienta y pimentón.',
      'Cociná 3-4 minutos más hasta que el huevo cuaje y serví con perejil picado.',
    ],
  },
];

const rows = RECETAS.map(r => ({
  id: r.id,
  nombre: r.nombre,
  ingredientes: r.ingredientes,
  pasos: r.pasos,
  nutricion: { hc: 0, cal: 0, fibra: 0, grasas: 0, azucares: 0, proteinas: 0 },
  tipo_comida: r.tipo_comida,
  imagen: '',
  tags: r.tags,
  link: '',
  fecha_creacion: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}));

const res = await fetch(`${URL_BASE}/rest/v1/recipes?on_conflict=id`, {
  method: 'POST',
  headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
  body: JSON.stringify(rows),
});
const text = await res.text();
if (!res.ok) {
  console.error('❌ Error al guardar:', res.status, text);
  process.exit(1);
}

console.log(`✅ ${rows.length} recetas guardadas:`);
rows.forEach(r => console.log(`   ${r.id}  ${r.nombre} (${r.tipo_comida}, ${r.ingredientes.length} ingredientes)`));
