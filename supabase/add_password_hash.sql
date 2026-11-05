-- ============================================================
-- Migración: Soporte para autenticación propia y contraseñas cifradas
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Agregar columna password_hash para guardar contraseñas cifradas con bcrypt
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 2. Permitir que auth_id sea opcional (nullable), ya que no dependeremos de Supabase Auth
ALTER TABLE usuarios ALTER COLUMN auth_id DROP NOT NULL;

-- 3. Asegurar que email sea único en usuarios si no lo es ya
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_email_unique'
    ) THEN
        ALTER TABLE usuarios ADD CONSTRAINT usuarios_email_unique UNIQUE (email);
    END IF;
EXCEPTION
    WHEN others THEN NULL;
END $$;
