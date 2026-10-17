// Cliente de Supabase para autenticación (usa la clave pública)
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Se crea un cliente nuevo en cada petición para que la sesión de un usuario
// nunca se mezcle con la de otro (el servidor atiende a todos a la vez).
// opcionesAuth: ajustes extra de auth (ej. el flujo PKCE de "Continuar con Google")
function crearClienteAuth(opcionesAuth = {}) {
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  // Acepta el nombre nuevo (PUBLISHABLE) o el clásico (ANON_KEY)
  const publicKey = (
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (!supabaseUrl || !publicKey) {
    throw new Error('[Supabase Auth] Falta SUPABASE_URL o SUPABASE_PUBLISHABLE_KEY (o SUPABASE_ANON_KEY) en .env');
  }

  return createClient(supabaseUrl, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false, ...opcionesAuth }
  });
}

module.exports = crearClienteAuth;
