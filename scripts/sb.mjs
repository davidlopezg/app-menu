#!/usr/bin/env node
// ============================================
// sb.mjs — conexión CLI a Supabase para este proyecto
// Uso:  node scripts/sb.mjs <comando> [args]
//
//   recipes [limit]      lista recetas (id + nombre)
//   recipe <id>          receta completa
//   menu [week_key]      menús semanales guardados
//   templates            plantillas de menú
//   login <email> <pass> prueba el login (RPC login_user) -> sirve para verificar contraseñas
//   rpc <fn> <json>      llama cualquier RPC: node scripts/sb.mjs rpc foo '{"a":1}'
//   sql "<query>"        ejecuta SQL directo (requiere DATABASE_URL en .env)
//   env                  muestra la config cargada
//
// Credenciales: .env en la raíz del repo (SUPABASE_URL / SUPABASE_ANON_KEY).
// ============================================

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ---------- .env ----------
function loadEnv() {
  try {
    for (const line of readFileSync(resolve(root, '.env'), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* sin .env */ }
}
loadEnv();

const URL_BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_ANON_KEY;
if (!URL_BASE || !KEY) {
  console.error('Falta SUPABASE_URL / SUPABASE_ANON_KEY en .env');
  process.exit(1);
}
const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
};

async function rest(path, opts = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, { ...opts, headers });
  const text = await res.text();
  let data; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(data)}`);
  return data;
}
async function rpc(fn, body) {
  const res = await fetch(`${URL_BASE}/rest/v1/rpc/${fn}`, {
    method: 'POST', headers, body: JSON.stringify(body),
  });
  const text = await res.text();
  let data; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(data)}`);
  return data;
}

// ---------- comandos ----------
const [, , cmd, ...args] = process.argv;

try {
  switch (cmd) {
    case 'recipes': {
      const limit = args[0] || 50;
      const rows = await rest(`recipes?select=id,nombre,tags&limit=${limit}`);
      rows.forEach(r => console.log(`${r.id}  ${r.nombre}${r.tags?.length ? '  [' + r.tags.join(', ') + ']' : ''}`));
      console.log(`\n(${rows.length} recetas)`);
      break;
    }
    case 'recipe': {
      console.log(JSON.stringify(await rest(`recipes?id=eq.${args[0]}`), null, 2));
      break;
    }
    case 'menu': {
      const q = args[0] ? `menu_weeks?week_key=eq.${args[0]}&select=*` : 'menu_weeks?select=*';
      const rows = await rest(q);
      rows.forEach(r => console.log(r.week_key, JSON.stringify(r.data)));
      break;
    }
    case 'templates': {
      console.log(JSON.stringify(await rest('menu_templates?select=*'), null, 2));
      break;
    }
    case 'login': {
      const [email, pass] = args;
      if (!email || !pass) { console.error('Uso: sb.mjs login <email> <password>'); process.exit(1); }
      const rows = await rpc('login_user', { user_email: email, user_password: pass });
      console.log(rows.length ? `✅ OK  ${JSON.stringify(rows[0])}` : '❌ email o contraseña incorrectos');
      break;
    }
    case 'rpc': {
      console.log(JSON.stringify(await rpc(args[0], args[1] ? JSON.parse(args[1]) : {}), null, 2));
      break;
    }
    case 'sql': {
      const dsn = process.env.DATABASE_URL;
      if (!dsn) { console.error('Falta DATABASE_URL en .env (Supabase → Settings → Database → Connection string)'); process.exit(1); }
      console.log(execFileSync('psql', [dsn, '-c', args.join(' ')], { encoding: 'utf8' }));
      break;
    }
    case 'env': {
      console.log({ URL_BASE, key: KEY.slice(0, 20) + '…', database: !!process.env.DATABASE_URL });
      break;
    }
    default:
      console.log(await readFileSync(fileURLToPath(import.meta.url), 'utf8').then(s => s.split('\n').slice(0, 18).join('\n')));
  }
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
