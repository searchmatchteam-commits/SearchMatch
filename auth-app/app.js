// Cargar variables de entorno desde .env
require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Motor de vistas EJS y archivos estáticos (css, js, img)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Landing page (todavía no hay sesión, por eso user es null)
app.get('/', (req, res) => {
  res.render('home', { user: null });
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
  const { error } = await supabase.from('usuario').select('id_usuario').limit(1);

  if (error) {
    console.error('Error al conectar con Supabase:', error.message);
  } else {
    console.log('Conexión a Supabase OK');
  }
});
