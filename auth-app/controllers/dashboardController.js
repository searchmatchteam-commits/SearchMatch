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

// Trae el perfil del jugador (apodo y primera posición) a partir del id de usuario.
// Si no tiene perfil de jugador o algo falla, devuelve null.
async function obtenerPerfil(idUsuario) {
  try {
    const supabase = require('../config/db');
    const { data, error } = await supabase
      .from('jugador')
      .select('nombre_apodo, jugador_posicion(posicion(nombre))')
      .eq('id_usuario', idUsuario)
      .maybeSingle();
    if (error || !data) return null;
    const primera = data.jugador_posicion[0];
    return {
      nombre: data.nombre_apodo,
      posicion: primera && primera.posicion ? primera.posicion.nombre : null
    };
  } catch {
    return null;
  }
}

// GET /users/dashboard: armar los datos y mostrar el panel
async function mostrarDashboard(req, res) {
  const perfil = await obtenerPerfil(req.session.user.id);
  const canchasDb = await obtenerCanchas();
  const equiposDb = await obtenerEquipos();

  // Valores por defecto si el usuario aún no completa su perfil de jugador
  const nombre = (perfil && perfil.nombre) || 'Jugador';
  const posicion = (perfil && perfil.posicion) || 'Delantero';

  res.render('dashboard', {
    usuario: { nombre, posicion },
    cupos: DATOS_EJEMPLO.cupos,
    canchas: canchasDb || DATOS_EJEMPLO.canchas,
    equipos: equiposDb || DATOS_EJEMPLO.equipos
  });
}

module.exports = { mostrarDashboard };
