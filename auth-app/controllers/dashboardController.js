// Controlador del panel principal (etapa 2: datos simples + vista por parciales)
// Si la base de datos falla o está vacía, usa datos de ejemplo para no romper la página.

const DATOS_EJEMPLO = {
  cupos: 12,
  canchas: [
    { nombre: 'Monumental', comuna: 'San Borja', modalidad: 'Fútbol 7', rating: '4.9', precio: '24.000' },
    { nombre: 'El Diego', comuna: 'Surco', modalidad: 'Futsal', rating: '4.8', precio: '28.000' }
  ],
  equipos: [
    { nombre: 'Deportivo Recoleta', busca: 'Delantero · Intermedio', estado: 'disponible' },
    { nombre: 'Los Fantasmas F.C', busca: 'Mediocampista', estado: 'disponible' },
    { nombre: 'Furia Nocturna', busca: 'Delantero', estado: 'enviada' }
  ]
};

// Intenta traer las canchas desde Supabase; si algo falla devuelve null
// (el panel usa los datos de ejemplo en ese caso)
async function obtenerCanchas() {
  try {
    const supabase = require('../config/db');
    const { data, error } = await supabase
      .from('cancha')
      .select('nombre, precio_hora, activo')
      .eq('activo', true)
      .limit(2);
    if (error || !data || data.length === 0) return null;
    // Mapea las columnas reales a lo que espera la vista
    return data.map((c) => ({
      nombre: c.nombre,
      comuna: 'Cerca de ti',
      modalidad: 'Fútbol',
      rating: '4.5',
      precio: Number(c.precio_hora).toLocaleString('es-CL')
    }));
  } catch {
    return null; // sin credenciales o sin conexión: no se rompe, usa el ejemplo
  }
}

// Intenta traer los equipos desde Supabase; si algo falla devuelve null
async function obtenerEquipos() {
  try {
    const supabase = require('../config/db');
    const { data, error } = await supabase
      .from('equipo')
      .select('nombre')
      .eq('activo', true)
      .limit(3);
    if (error || !data || data.length === 0) return null;
    return data.map((e) => ({ nombre: e.nombre, busca: 'Ver posiciones', estado: 'disponible' }));
  } catch {
    return null;
  }
}

// GET /users/dashboard: armar los datos y mostrar el panel
async function mostrarDashboard(req, res) {
  // Nombre simple para el saludo (etapa 2: de la sesión; luego vendrá del perfil jugador)
  const nombre = (req.session.user && req.session.user.correo)
    ? req.session.user.correo.split('@')[0]
    : 'Ruperto';

  const canchasDb = await obtenerCanchas();
  const equiposDb = await obtenerEquipos();

  res.render('dashboard', {
    usuario: { nombre, posicion: 'Delantero' },
    cupos: DATOS_EJEMPLO.cupos,
    canchas: canchasDb || DATOS_EJEMPLO.canchas,
    equipos: equiposDb || DATOS_EJEMPLO.equipos
  });
}

module.exports = { mostrarDashboard };
