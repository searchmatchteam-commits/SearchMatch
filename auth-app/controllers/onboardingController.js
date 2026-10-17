// Onboarding: tipo de cuenta + datos personales + posición antes de entrar al panel.
// La pantalla es una app de React (public/js/onboarding.js) que envía el perfil con fetch.
const { fechaNacimientoValida } = require('./authController');

// Lo que manda el formulario → nombre en la tabla posicion (ver sql/seeds.sql)
const POSICIONES = { delantero: 'Delantero', medio: 'Mediocampista', defensa: 'Defensa', arquero: 'Arquero' };

// Tipo de cuenta elegido en el primer paso. Aún no hay columna para él: se guarda en la sesión
const ROLES = ['jugador', 'equipo'];

const LARGO_MAX_NOMBRE = 100;           // igual que nombre_apodo y apellido en la tabla jugador
const ALTURA = { min: 100, max: 250 };  // cm
const PESO = { min: 30, max: 250 };     // kg

// ¿El usuario ya completó el onboarding (tiene perfil de jugador o creó un equipo)?
// Devuelve true/false, o null si la consulta falló
async function tienePerfil(idUsuario) {
  try {
    const supabase = require('../config/db');
    const [jugador, equipo] = await Promise.all([
      supabase.from('jugador').select('id').eq('id_usuario', idUsuario).maybeSingle(),
      supabase.from('equipo').select('id').eq('id_usuario_creador', idUsuario).limit(1).maybeSingle()
    ]);
    const error = jugador.error || equipo.error;
    if (error) {
      console.error('Error al buscar el perfil:', error.message);
      return null;
    }
    return Boolean(jugador.data || equipo.data);
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

// Busca el id de un catálogo (ej. posicion) por su nombre. null si no está cargado
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
    tipoCuenta: req.session.user.tipoCuenta || '',
    // Para el registro de equipo: correo de contacto sugerido y comunas del autocompletado
    // (require aquí para evitar una dependencia circular entre controladores)
    correo: req.session.user.correo || '',
    comunas: await require('./equipoController').nombresComunas(),
    hoy: new Date().toISOString().slice(0, 10)
  });
}

// Valida los datos del perfil (onboarding y editar perfil).
// Devuelve { errores, valores }; errores vacío si todo está bien
function validarPerfil(body) {
  const valores = {
    nombre: (body.nombre || '').trim(),
    apellido: (body.apellido || '').trim(),
    fechaNacimiento: (body.fecha_nacimiento || '').trim(),
    altura: aNumero(body.altura),
    peso: aNumero(body.peso),
    posicion: POSICIONES[body.posicion]
  };
  const { nombre, apellido, fechaNacimiento, altura, peso, posicion } = valores;

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

  valores.altura = Math.round(altura * 100) / 100;
  valores.peso = Math.round(peso * 100) / 100;
  return { errores, valores };
}

// POST /onboarding: valida y crea el jugador con su posición. Responde JSON
async function guardarOnboarding(req, res) {
  const { errores, valores } = validarPerfil(req.body);
  const rol = ROLES.includes(req.body.rol) ? req.body.rol : null;
  if (!rol) errores.rol = 'Elige si eres jugador o equipo.';
  if (Object.keys(errores).length > 0) {
    return res.status(400).json({ ok: false, mensaje: 'Revisa los campos marcados.', errores });
  }
  const { nombre, apellido, fechaNacimiento, altura, peso, posicion } = valores;

  const supabase = require('../config/db');
  const idPosicion = await idPorNombre(supabase, 'posicion', posicion);

  // 1. El jugador
  const { data: jugador, error } = await supabase.from('jugador').insert({
    nombre_apodo: nombre,
    apellido,
    fecha_nacimiento: fechaNacimiento,
    altura,
    peso,
    id_usuario: req.session.user.id
  }).select('id').single();

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
  req.session.user.tipo = rol;
  req.session.save(() => res.json({ ok: true }));
}

module.exports = { tienePerfil, mostrarOnboarding, guardarOnboarding, validarPerfil, idPorNombre, POSICIONES };
