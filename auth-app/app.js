// Cargar variables de entorno desde .env
require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');

const app = express();
const PORT = process.env.PORT || 3000;

// Motor de vistas EJS y archivos estáticos (css, js, img)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Leer los datos enviados por formularios (req.body)
app.use(express.urlencoded({ extended: false }));

// Sesiones: guardan quién inició sesión mediante una cookie firmada
if (!process.env.SESSION_SECRET) {
  console.error('[Session] Falta SESSION_SECRET en .env. Genera uno con: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
}
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,                                  // el JavaScript del navegador no puede leerla
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',   // solo HTTPS en producción
    maxAge: 1000 * 60 * 60 * 24 * 7                  // 7 días
  }
}));

// Mensajes de una sola vez entre redirecciones (req.flash)
app.use(flash());

// Rutas de autenticación (/login, /logout)
app.use(require('./routes/auth'));

// Onboarding (/onboarding): rol + perfil de jugador antes del panel
app.use(require('./routes/onboarding'));

// Panel principal (/users/dashboard): requiere sesión
app.use('/users', require('./routes/dashboard'));

// Atajo: /dashboard redirige a /users/dashboard
app.get('/dashboard', (req, res) => res.redirect('/users/dashboard'));

// Landing page (user es null si nadie ha iniciado sesión)
app.get('/', (req, res) => {
  res.render('home', { user: req.session.user || null });
});

// Ruta de prueba: http://localhost:3000/test-supabase
// Devuelve OK si la SERVICE_ROLE_KEY conecta con la tabla 'usuario'
app.get('/test-supabase', async (req, res) => {
  try {
    const supabase = require('./config/db');
    const { data, error } = await supabase.from('usuario').select('id').limit(1);
    if (error) return res.status(500).json({ ok: false, mensaje: error.message });
    return res.json({ ok: true, mensaje: 'Conexión a Supabase OK', filas: data?.length ?? 0 });
  } catch (e) {
    return res.status(500).json({ ok: false, mensaje: e.message });
  }
});

// Iniciar servidor y probar la conexión a Supabase
app.listen(PORT, async () => {
  console.log(`Servidor en http://localhost:${PORT}`);

  // Sin credenciales no se puede probar la conexión, pero la página sí funciona
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env');
    return;
  }

  const supabase = require('./config/db');
  const { error } = await supabase.from('usuario').select('id').limit(1);

  if (error) {
    console.error('Error al conectar con Supabase:', error.message);
  } else {
    console.log('Conexión a Supabase OK');
  }
});
