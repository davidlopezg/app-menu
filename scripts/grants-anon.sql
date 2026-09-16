-- ============================================
-- Grants para rol `anon` + columna `link` en recipes
-- ============================================
-- Problema: el cliente usa anon key + persistSession:false → siempre es
-- rol `anon`. Las RLS policies dicen `to authenticated` pero NO hay
-- GRANTs a `anon` sobre las tablas → todos los SELECT/INSERT/UPDATE/
-- DELETE fallan con "new row violates row-level security policy".
--
-- Solución: GRANT explícito a `anon` sobre las 3 tablas. El whitelist
-- real lo hace la RPC `login_user` (security definer, valida bcrypt),
-- así que abrir a anon NO es un agujero de seguridad — solo permite
-- que la app hable con Supabase.
--
-- Idempotente: se puede correr varias veces sin problema.
-- Pegar en: Supabase dashboard → SQL Editor → New query → Run

-- Schema usage (por si quedó revocado)
grant usage on schema public to anon;

-- Recipes
grant select, insert, update, delete on recipes to anon;

-- Menu weeks
grant select, insert, update, delete on menu_weeks to anon;

-- Menu templates
grant select, insert, update, delete on menu_templates to anon;

-- Realtime: el rol también necesita SELECT para recibir eventos del WS.
-- Las policies de arriba ya filtran quién PUEDE leer, pero el GRANT
-- es lo que habilita la entrega de eventos por realtime.

-- ============================================
-- Migración: columna `link` en recipes (por si no se corrió antes)
-- ============================================
-- `pushRecipes` en db.js manda `link text` desde hace varias versiones.
-- Si esta columna no existe en Supabase, CADA upsert falla con
-- "column 'link' of relation 'recipes' does not exist".
-- Idempotente: si ya existe, no hace nada.

alter table recipes
  add column if not exists link text not null default '';

-- ============================================
-- Verificación (no falla si algo está mal, solo muestra el estado)
-- ============================================
select
  table_name,
  string_agg(privilege_type, ', ' order by privilege_type) as grants_to_anon
from information_schema.role_table_grants
where grantee = 'anon'
  and table_schema = 'public'
  and table_name in ('recipes', 'menu_weeks', 'menu_templates')
group by table_name
order by table_name;

-- Debería mostrarte 3 filas, cada una con: DELETE, INSERT, SELECT, UPDATE
