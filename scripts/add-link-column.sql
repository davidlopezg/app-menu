-- ============================================
-- Migration: add `link` column to recipes
-- ============================================
-- El campo `link` (URL a receta original / blog / video)
-- se guarda en localStorage y JS state desde v13, pero el
-- schema de Supabase no lo tenía. Esto lo agrega para que
-- `DB.pushRecipes` lo sincronice a la nube.
--
-- Pegar en: Supabase dashboard → SQL Editor → New query → Run
-- Es idempotente: si la columna ya existe, no hace nada.

alter table recipes
  add column if not exists link text not null default '';