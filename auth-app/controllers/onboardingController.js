// Onboarding: datos personales + perfil deportivo antes de entrar al panel.
// La pantalla es una app de React (public/js/onboarding.js) que envía el perfil con fetch.
const { fechaNacimientoValida } = require('./authController');

// Lo que manda el formulario → nombre en las tablas posicion y nivel (ver sql/seeds.sql)
const POSICIONES = { delantero: 'Delantero', medio: 'Mediocampista', defensa: 'Defensa', arquero: 'Arquero' };
const NIVELES = { principiante: 'Principiante', intermedio: 'Intermedio', avanzado: 'Avanzado' };

const LARGO_MAX_NOMBRE = 100;           // igual que nombre_apodo y apellido en la tabla jugador
const ALTURA = { min: 100, max: 250 };  // cm
const PESO = { min: 30, max: 250 };     // kg

// ¿El usuario ya tiene perfil de jugador? Devuelve true/false, o null si la consulta falló
async function tienePerfil(idUsuario) {
  try {
    const supabase = require('../config/db');
    const { data, error } = await supabase
      .from('jugador')
      .select('id')
      .eq('id_usuario', idUsuario)
      .maybeSingle();
    if (error) {
      console.error('Error al buscar el perfil de jugador:', error.message);
      return null;
    }
    return Boolean(data);
  } catch (e) {
    console.error('Error al buscar el perfil de jugador:', e.message);
    return null;
  }
}

// Convierte "175" o "72,5" a número; devuelve NaN si no es un número
function aNumero(texto) {
  const limpio = String(texto || '').trim().replace(',', '.');
  return limpio === '' ? NaN : Number(limpio);
}

// Busca el id de un catálogo (posicion o nivel) por su nombre. null si no está cargado
async function idPorNombre(supabase, tabla, nombre) {
  const { data, error } = await supabase.from(tabla).select('id').eq('nombre', nombre).maybeSingle();
  if (error) console.error(`Error al buscar "${nombre}" en ${tabla}:`, error.message);
  if (!data) console.error(`Falta "${nombre}" en la tabla ${tabla} (ver sql/seeds.sql)`);
  return data ? data.id : null;
}

// GET /onboarding: si ya tiene perfil va directo al panel
async function mostrarOnboarding(req, res) {
  if (await tienePerfil(req.session.user.id)) {
    req.session.user.perfilCompleto = true;
    return res.redirect('/users/dashboard');
  }
  res.render('onboarding', {
    // La fecha que puso al registrarse (se guarda en la sesión al iniciar sesión)
    fechaNacimiento: req.session.user.fechaNacimiento || '',
    hoy: new Date().toISOString().slice(0, 10)
  });
}

// POST /onboarding: valida y crea el jugador con su posición y nivel. Responde JSON
async function guardarOnboarding(req, res) {
  const nombre = (req.body.nombre || '').trim();
  const apellido = (req.body.apellido || '').trim();
  const fechaNacimiento = (req.body.fecha_nacimiento || '').trim();
  const altura = aNumero(req.body.altura);
  const peso = aNumero(req.body.peso);
  const posicion = POSICIONES[req.body.posicion];
  const nivel = NIVELES[req.body.nivel];

  // Errores por campo para marcarlos en el formulario
  const errores = {};
  if (!nombre) errores.nombre = 'Ingresa tu nombre.';
  else if (nombre.length > LARGO_MAX_NOMBRE) errores.nombre = 'El nombre es demasiado largo.';
  if (!apellido) errores.apellido = 'Ingresa tu apellido.';
  else if (apellido.length > LARGO_MAX_NOMBRE) errores.apellido = 'El apellido es demasiado largo.';
  if (!fechaNacimientoValida(fechaNacimiento)) errores.fecha_nacimiento = 'Ingresa una fecha válida.';
  if (!(altura >= ALTURA.min && altura <= ALTURA.max)) {
    errores.altura = `Entre ${ALTURA.min} y ${ALTURA.max} cm.`;
  }
  if (!(peso >= PESO.min && peso <= PESO.max)) {
    errores.peso = `Entre ${PESO.min} y ${PESO.max} kg.`;
  }
  if (!posicion) errores.posicion = 'Elige tu posición.';
  if (!nivel) errores.nivel = 'Elige tu nivel.';

  if (Object.keys(errores).length > 0) {
    return res.status(400).json({ ok: false, mensaje: 'Revisa los campos marcados.', errores });
  }

  const supabase = require('../config/db');
  const idPosicion = await idPorNombre(supabase, 'posicion', posicion);
  const idNivel = await idPorNombre(supabase, 'nivel', nivel);

  // 1. El jugador (si falta la columna id_nivel, ver sql/migracion-perfil-deportivo.sql)
  const fila = {
    nombre_apodo: nombre,
    apellido,
    fecha_nacimiento: fechaNacimiento,
    altura: Math.round(altura * 100) / 100,
    peso: Math.round(peso * 100) / 100,
    id_usuario: req.session.user.id
  };
  if (idNivel) fila.id_nivel = idNivel;

  let { data: jugador, error } = await supabase.from('jugador').insert(fila).select('id').single();

  // PGRST204 = la columna id_nivel aún no existe: guardamos el perfil sin el nivel
  if (error && error.code === 'PGRST204' && fila.id_nivel) {
    console.error('Falta la columna jugador.id_nivel: ejecuta sql/migracion-perfil-deportivo.sql');
    delete fila.id_nivel;
    ({ data: jugador, error } = await supabase.from('jugador').insert(fila).select('id').single());
  }

  // 23505 = ya existe un jugador para este usuario (ej. doble clic): el perfil ya está listo
  if (error && error.code !== '23505') {
    console.error('Error al crear el perfil de jugador:', error.message);
    return res.status(500).json({ ok: false, mensaje: 'No pudimos guardar tu perfil. Inténtalo de nuevo.' });
  }

  // 2. Su posición. Si falla no deshacemos el perfil: se puede elegir de nuevo al editarlo
  if (jugador && idPosicion) {
    const { error: errorPosicion } = await supabase
      .from('jugador_posicion')
      .insert({ id_jugador: jugador.id, id_posicion: idPosicion });
    if (errorPosicion) console.error('Error al guardar la posición:', errorPosicion.message);
  }

  req.session.user.perfilCompleto = true;
  req.session.save(() => res.json({ ok: true }));
}

module.exports = { tienePerfil, mostrarOnboarding, guardarOnboarding };
