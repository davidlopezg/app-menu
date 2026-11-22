-- Menú Semanal schema

create table recipes (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  ingredientes    jsonb not null default '[]'::jsonb,
  pasos           jsonb not null default '[]'::jsonb,
  nutricion       jsonb not null default '{}'::jsonb,
  tipo_comida     text default 'ambos',
  imagen          text default '',
  tags            jsonb default '[]'::jsonb,
  fecha_creacion  timestamptz default now(),
  updated_at      timestamptz default now()
);

create table menu_weeks (
  week_key    text primary key,
  data        jsonb not null,
  updated_at  timestamptz default now()
);

alter table recipes    enable row level security;
alter table menu_weeks enable row level security;

create policy "auth read recipes"    on recipes    for select to authenticated using (true);
create policy "auth insert recipes"  on recipes    for insert to authenticated with check (true);
create policy "auth update recipes"  on recipes    for update to authenticated using (true) with check (true);
create policy "auth delete recipes"  on recipes    for delete to authenticated using (true);

create policy "auth read weeks"      on menu_weeks for select to authenticated using (true);
create policy "auth insert weeks"    on menu_weeks for insert to authenticated with check (true);
create policy "auth update weeks"    on menu_weeks for update to authenticated using (true) with check (true);
create policy "auth delete weeks"    on menu_weeks for delete to authenticated using (true);

alter publication supabase_realtime add table recipes;
alter publication supabase_realtime add table menu_weeks;