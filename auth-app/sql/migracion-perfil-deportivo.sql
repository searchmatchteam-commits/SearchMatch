-- Migración para bases ya creadas: carga las posiciones y los niveles.
-- Los niveles son para el perfil de equipo (el jugador solo elige su posición).
-- Ejecutar una vez en el SQL Editor de Supabase (se puede repetir sin problemas).

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
