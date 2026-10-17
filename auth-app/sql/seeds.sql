-- =====================================================
-- DATOS INICIALES (ejecutar después de schemas.sql)
-- =====================================================

-- Roles de la aplicación: todo registro nuevo parte como 'usuario'
INSERT INTO rol_aplicacion (nombre) VALUES
    ('usuario'),
    ('administrador')
ON CONFLICT (nombre) DO NOTHING;

-- Posiciones en cancha (paso "Perfil deportivo" del registro)
INSERT INTO posicion (nombre) VALUES
    ('Delantero'),
    ('Mediocampista'),
    ('Defensa'),
    ('Arquero')
ON CONFLICT (nombre) DO NOTHING;

-- Niveles de juego (para el perfil de equipo)
INSERT INTO nivel (nombre, puntaje_min, puntaje_max) VALUES
    ('Principiante', 0, 399),
    ('Intermedio', 400, 699),
    ('Avanzado', 700, 1000)
ON CONFLICT (nombre) DO NOTHING;

-- Tipos de fútbol, región y comunas (registro de equipos): ver sql/migracion-equipos.sql,
-- que también sirve para una base nueva (se puede ejecutar después de este archivo)
