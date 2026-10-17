-- Migración para la foto de la carta de jugador.
-- Ejecutar una vez en el SQL Editor de Supabase (se puede repetir sin problemas).

-- 1. Dirección pública de la foto del jugador
ALTER TABLE jugador ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- 2. Bucket público donde el servidor guarda las fotos (solo el servidor sube, con la service role key)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('fotos-jugadores', 'fotos-jugadores', true, 3145728, ARRAY['image/webp', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;
