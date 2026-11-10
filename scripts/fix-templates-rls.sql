-- ============================================
-- fix-templates-rls.sql — arregla la sincronización de plantillas
-- ============================================
-- PROBLEMA: la app usa la `anon` key (rol `anon`, no `authenticated`).
-- Las policies de `menu_templates` estaban creadas como `to authenticated`
-- → TODO insert/update/delete de plantillas rebotaba con:
--     42501 new row violates row-level security policy for table "menu_templates"
-- → la plantilla se guardaba solo en el navegador y NUNCA llegaba a la nube
--   (por eso el otro dispositivo no la veía).
--
-- `recipes` y `menu_weeks` sí tienen policies para `anon` (por eso esas
-- tablas sí sincronizan). Este script deja `menu_templates` igual que ellas.
--
-- Pegar en: Supabase dashboard → SQL Editor → New query → Run
-- Idempotente: se puede correr varias veces sin problema.

begin;

-- 1) Sacar las policies viejas (solo `authenticated`)
drop policy if exists "auth read templates"   on menu_templates;
drop policy if exists "auth insert templates" on menu_templates;
drop policy if exists "auth update templates" on menu_templates;
drop policy if exists "auth delete templates" on menu_templates;

-- 2) Policies nuevas: `anon` (la app) + `authenticated` (por si acaso)
create policy "templates read"   on menu_templates for select to anon, authenticated using (true);
create policy "templates insert" on menu_templates for insert to anon, authenticated with check (true);
create policy "templates update" on menu_templates for update to anon, authenticated using (true) with check (true);
create policy "templates delete" on menu_templates for delete to anon, authenticated using (true);

-- 3) Grants para `anon` (por si falta)
grant usage on schema public to anon;
grant select, insert, update, delete on menu_templates to anon;

-- 4) Realtime (por si la tabla no está en la publicación)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'menu_templates'
  ) then
    alter publication supabase_realtime add table menu_templates;
  end if;
end $$;

commit;

-- ============================================
-- Verificación: tiene que mostrar 4 policies con roles {anon,authenticated}
-- ============================================
select policyname, cmd, roles
from pg_policies
where tablename = 'menu_templates'
order by policyname;

-- ============================================
-- Prueba de humo (opcional): insertar una plantilla de prueba
-- ============================================
-- insert into menu_templates (id, nombre, descripcion, data)
-- values (gen_random_uuid(), '__prueba__', '', '{}'::jsonb);
-- select * from menu_templates where nombre = '__prueba__';
-- delete from menu_templates where nombre = '__prueba__';
