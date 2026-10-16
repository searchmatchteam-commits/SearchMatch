// Cliente de Supabase para autenticación (usa la clave pública)
const { createClient } = require('@supabase/supabase-js');

// Se crea un cliente nuevo en cada petición para que la sesión de un usuario
// nunca se mezcle con la de otro (el servidor atiende a todos a la vez)
function crearClienteAuth() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

module.exports = crearClienteAuth;
