-- =====================================================
-- DATOS INICIALES (ejecutar después de schemas.sql)
-- =====================================================

-- Roles de la aplicación: todo registro nuevo parte como 'usuario'
INSERT INTO rol_aplicacion (nombre) VALUES
    ('usuario'),
    ('administrador')
ON CONFLICT (nombre) DO NOTHING;
