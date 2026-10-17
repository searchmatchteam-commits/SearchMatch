-- Migración para el registro de equipos.
-- Ejecutar una vez en el SQL Editor de Supabase (se puede repetir sin problemas).

-- 1. Datos nuevos del equipo
ALTER TABLE equipo ADD COLUMN IF NOT EXISTS correo_contacto VARCHAR(150);  -- correo de contacto del club
ALTER TABLE equipo ADD COLUMN IF NOT EXISTS escudo_url TEXT;               -- bucket escudos-equipos de Storage
ALTER TABLE equipo ADD COLUMN IF NOT EXISTS id_modalidad INTEGER;          -- tipo de fútbol habitual (5, 7 u 11)

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_equipo_modalidad') THEN
        ALTER TABLE equipo
            ADD CONSTRAINT fk_equipo_modalidad FOREIGN KEY (id_modalidad) REFERENCES modalidad(id);
    END IF;
END $$;

-- 2. Tipos de fútbol
INSERT INTO modalidad (cantidad_de_jugadores, nombre) VALUES
    (5, 'Fútbol 5'),
    (7, 'Fútbol 7'),
    (11, 'Fútbol 11')
ON CONFLICT (nombre) DO NOTHING;

-- 3. Zona de juego: las 52 comunas de la Región Metropolitana
INSERT INTO region (nombre) VALUES ('Región Metropolitana de Santiago')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO comunas (nombre, id_region)
SELECT c.nombre, r.id
FROM region r
CROSS JOIN unnest(ARRAY[
    'Alhué', 'Buin', 'Calera de Tango', 'Cerrillos', 'Cerro Navia', 'Colina', 'Conchalí', 'Curacaví',
    'El Bosque', 'El Monte', 'Estación Central', 'Huechuraba', 'Independencia', 'Isla de Maipo',
    'La Cisterna', 'La Florida', 'La Granja', 'La Pintana', 'La Reina', 'Lampa', 'Las Condes',
    'Lo Barnechea', 'Lo Espejo', 'Lo Prado', 'Macul', 'Maipú', 'María Pinto', 'Melipilla', 'Ñuñoa',
    'Padre Hurtado', 'Paine', 'Pedro Aguirre Cerda', 'Peñaflor', 'Peñalolén', 'Pirque', 'Providencia',
    'Pudahuel', 'Puente Alto', 'Quilicura', 'Quinta Normal', 'Recoleta', 'Renca', 'San Bernardo',
    'San Joaquín', 'San José de Maipo', 'San Miguel', 'San Pedro', 'San Ramón', 'Santiago', 'Talagante',
    'Tiltil', 'Vitacura'
]) AS c(nombre)
WHERE r.nombre = 'Región Metropolitana de Santiago'
ON CONFLICT (nombre, id_region) DO NOTHING;

-- 4. Bucket público para los escudos (solo el servidor sube, con la service role key)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('escudos-equipos', 'escudos-equipos', true, 1048576, ARRAY['image/webp', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;
