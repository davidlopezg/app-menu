-- ============================================
-- Menu templates — schema
-- ============================================
-- Tabla para guardar plantillas de menú reutilizables.
-- Misma estructura de `data` que una fila de `menu_weeks` (7 días ×
-- {lunch, dinner} con id de receta o null).

create table menu_templates (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null default 'Mi plantilla',
  descripcion text not null default '',
  data        jsonb not null,
  updated_at  timestamptz default now()
);

alter table menu_templates enable row level security;

-- Las mismas policies que recipes/menu_weeks: todo abierto para usuarios
-- autenticados (la whitelist real se hace en la RPC login_user).
--
-- OJO: el cliente usa la `anon` key → el rol real es `anon`, NO
-- `authenticated`. Con policies `to authenticated` el INSERT rebotaba con
-- 42501 y la plantilla nunca llegaba a la nube. Por eso van `anon` también.
create policy "templates read"   on menu_templates for select to anon, authenticated using (true);
create policy "templates insert" on menu_templates for insert to anon, authenticated with check (true);
create policy "templates update" on menu_templates for update to anon, authenticated using (true) with check (true);
create policy "templates delete" on menu_templates for delete to anon, authenticated using (true);

-- Grants para `anon` (idempotente)
grant usage on schema public to anon;
grant select, insert, update, delete on menu_templates to anon;

-- Realtime: cambios de la otra persona se ven al toque
alter publication supabase_realtime add table menu_templates;
