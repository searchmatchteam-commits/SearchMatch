// Cliente de Supabase (solo se usa en el servidor)
// dotenv aquí también: garantiza que process.env exista aunque este
// archivo se requiera desde un test o antes que app.js lo cargue.
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[Supabase] Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

module.exports = supabase;
