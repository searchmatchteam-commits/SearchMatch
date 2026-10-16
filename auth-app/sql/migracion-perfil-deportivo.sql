-- Migración para bases ya creadas: agrega el nivel al jugador y carga posiciones y niveles.
-- Ejecutar una vez en el SQL Editor de Supabase (se puede repetir sin problemas).

ALTER TABLE jugador ADD COLUMN IF NOT EXISTS id_nivel INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_jugador_nivel') THEN
        ALTER TABLE jugador
            ADD CONSTRAINT fk_jugador_nivel FOREIGN KEY (id_nivel) REFERENCES nivel(id);
    END IF;
END $$;

INSERT INTO posicion (nombre) VALUES
    ('Delantero'),
    ('Mediocampista'),
    ('Defensa'),
    ('Arquero')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO nivel (nombre, puntaje_min, puntaje_max) VALUES
    ('Principiante', 0, 399),
    ('Intermedio', 400, 699),
    ('Avanzado', 700, 1000)
ON CONFLICT (nombre) DO NOTHING;
