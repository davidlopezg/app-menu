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
create policy "auth read templates"   on menu_templates for select to authenticated using (true);
create policy "auth insert templates" on menu_templates for insert to authenticated with check (true);
create policy "auth update templates" on menu_templates for update to authenticated using (true) with check (true);
create policy "auth delete templates" on menu_templates for delete to authenticated using (true);

-- Realtime: cambios de la otra persona se ven al toque
alter publication supabase_realtime add table menu_templates;
