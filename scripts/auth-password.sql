-- ============================================
-- Auth con password (hash server-side con pgcrypto)
-- ============================================
-- Pegar en: Supabase dashboard → SQL Editor → New query → Run
-- ⚠️ CAMBIAR LAS CONTRASEÑAS ANTES DE CORRER ⚠️

-- 1) Habilitar pgcrypto
create extension if not exists pgcrypto;

-- 2) Agregar columna para el hash del password
alter table usuarios add column if not exists password_hash text;

-- 3) Setear passwords para los usuarios existentes
--    (bcrypt factor 10, suficientemente fuerte)
update usuarios
   set password_hash = crypt('CONTRASEÑA_DE_DAVID', gen_salt('bf', 10))
 where email = 'david@tu-dominio.com';

update usuarios
   set password_hash = crypt('CONTRASEÑA_DE_MARIA', gen_salt('bf', 10))
 where email = 'maria@tu-dominio.com';

-- 4) Función RPC: valida email + password y devuelve el usuario si OK.
--    Esta función es la única vía de acceso — la tabla no se expone.
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

-- 5) Permitir que cualquiera pueda INTENTAR loguearse
--    (la validación real la hace la función, no exponemos la tabla)
grant execute on function login_user to anon;

-- 6) Sacar la policy anterior que dejaba ver la lista entera de emails
drop policy if exists "Anyone can check their own email" on usuarios;

-- 7) Verificar (NO muestra los hashes, solo si están seteados)
select email, nombre, (password_hash is not null) as has_password from usuarios;
