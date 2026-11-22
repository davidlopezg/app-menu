-- Setup completo: tabla usuarios con passwords hasheados (bcrypt)
-- Editar EMAILS y CONTRASEÑAS antes de correr.

create extension if not exists pgcrypto;

create table if not exists usuarios (
  email          text primary key,
  nombre         text,
  password_hash  text,
  created_at     timestamptz default now()
);

-- EDITAR: cambiar emails y contraseñas por los reales
insert into usuarios (email, nombre, password_hash) values
  ('david@tu-dominio.com', 'David',
    crypt('contraseña_de_david', gen_salt('bf', 10))),
  ('maria@tu-dominio.com', 'María',
    crypt('contraseña_de_maria', gen_salt('bf', 10)))
on conflict (email) do update set
  nombre        = excluded.nombre,
  password_hash = excluded.password_hash;

create or replace function login_user(user_email text, user_password text)
returns table(email text, nombre text)
language sql
security definer
as $$
  select u.email, u.nombre
    from usuarios u
   where u.email = lower(user_email)
     and u.password_hash = crypt(user_password, u.password_hash);
$$;

grant execute on function login_user to anon;

alter table usuarios enable row level security;

-- Verificacion: tiene que devolver 2 filas con has_password = true
select email, nombre, (password_hash is not null) as has_password
  from usuarios
 order by email;
