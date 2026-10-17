// Registro de equipos (flujo "Soy equipo" del onboarding).
// El equipo queda ligado a la cuenta con sesión: ese usuario es su capitán (equipo.id_usuario_creador).
// Necesita sql/migracion-equipos.sql (columnas nuevas, tipos de fútbol, comunas y bucket de escudos)
const { imagenValida } = require('./perfilController');

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BUCKET_ESCUDOS = 'escudos-equipos';
const LARGO_NOMBRE = { min: 3, max: 100 };  // equipo.nombre es VARCHAR(100)

// Nivel de juego → puntaje inicial del equipo (el mínimo de cada nivel en la tabla nivel, ver sql/seeds.sql)
const PUNTAJE_POR_NIVEL = { Principiante: 0, Intermedio: 400, Avanzado: 700 };
const TIPOS_FUTBOL = [5, 7, 11];

// Nombres de las comunas para el autocompletado de "Zona habitual de juego"
async function nombresComunas() {
  try {
    const supabase = require('../config/db');
    const { data, error } = await supabase.from('comunas').select('nombre').order('nombre');
    if (error) throw new Error(error.message);
    if (!data.length) console.error('La tabla comunas está vacía: ejecuta sql/migracion-equipos.sql');
    return data.map((c) => c.nombre);
  } catch (e) {
    console.error('Error al cargar las comunas:', e.message);
    return [];
  }
}

// Valida los datos del formulario. Devuelve { errores, valores }
function validarEquipo(body) {
  const valores = {
    nombre: (body.clubName || '').trim().replace(/\s+/g, ' '),
    correo: (body.email || '').trim().toLowerCase(),
    nivel: body.level,
    tipoFutbol: Number(body.footballType),
    zona: (body.zone || '').trim()
  };
  const errores = {};
  if (valores.nombre.length < LARGO_NOMBRE.min) errores.clubName = `Al menos ${LARGO_NOMBRE.min} caracteres.`;
  else if (valores.nombre.length > LARGO_NOMBRE.max) errores.clubName = 'El nombre es demasiado largo.';
  if (!FORMATO_CORREO.test(valores.correo)) errores.email = 'Ingresa un correo válido, por ejemplo equipo@email.com.';
  if (!(valores.nivel in PUNTAJE_POR_NIVEL)) errores.level = 'Elige el nivel de juego.';
  if (!TIPOS_FUTBOL.includes(valores.tipoFutbol)) errores.footballType = 'Elige el tipo de fútbol.';
  if (!valores.zona) errores.zone = 'Ingresa la zona donde juegan.';
  return { errores, valores };
}

// POST /onboarding/equipo: crea el equipo (o lo actualiza si viene "id", ej. desde "Editar datos").
// Responde JSON: { ok, id } o { ok: false, mensaje, errores }
async function guardarEquipo(req, res) {
  const { errores, valores } = validarEquipo(req.body);
  if (Object.keys(errores).length > 0) {
    return res.status(400).json({ ok: false, mensaje: 'Revisa los campos marcados.', errores });
  }

  const supabase = require('../config/db');
  const fallar = (mensaje, detalle) => {
    if (detalle) console.error(mensaje, detalle);
    return res.status(500).json({ ok: false, mensaje: 'No pudimos guardar tu equipo. Inténtalo de nuevo.' });
  };

  // La comuna tiene que ser una de la lista (sin importar mayúsculas). Se escapan % y _ para que no sean comodines
  const zonaExacta = valores.zona.replace(/[\\%_]/g, '\\$&');
  const { data: comuna, error: errorComuna } = await supabase
    .from('comunas').select('id').ilike('nombre', zonaExacta).limit(1).maybeSingle();
  if (errorComuna) return fallar('Error al buscar la comuna:', errorComuna.message);
  if (!comuna) {
    return res.status(400).json({ ok: false, mensaje: 'Revisa los campos marcados.', errores: { zone: 'Elige una comuna de la lista.' } });
  }

  const { data: modalidad, error: errorModalidad } = await supabase
    .from('modalidad').select('id').eq('cantidad_de_jugadores', valores.tipoFutbol).limit(1).maybeSingle();
  if (errorModalidad) return fallar('Error al buscar el tipo de fútbol:', errorModalidad.message);
  if (!modalidad) return fallar(`Falta "Fútbol ${valores.tipoFutbol}" en la tabla modalidad:`, 'ejecuta sql/migracion-equipos.sql');

  const fila = {
    nombre: valores.nombre,
    correo_contacto: valores.correo,
    puntaje_nivel: PUNTAJE_POR_NIVEL[valores.nivel],
    id_modalidad: modalidad.id,
    id_comuna: comuna.id
  };

  let resultado;
  const id = Number(req.body.id);
  if (Number.isInteger(id) && id > 0) {
    // Editar: solo el capitán que lo creó
    resultado = await supabase.from('equipo').update(fila)
      .eq('id', id).eq('id_usuario_creador', req.session.user.id).select('id').maybeSingle();
    if (!resultado.error && !resultado.data) return res.status(404).json({ ok: false, mensaje: 'No encontramos tu equipo.' });
  } else {
    resultado = await supabase.from('equipo')
      .insert({ ...fila, id_usuario_creador: req.session.user.id, activo: true }).select('id').single();
  }
  if (resultado.error) {
    return fallar('Error al guardar el equipo (¿ejecutaste sql/migracion-equipos.sql?):', resultado.error.message);
  }

  req.session.user.perfilCompleto = true;
  req.session.user.tipoCuenta = 'team';
  req.session.user.equipoId = resultado.data.id;
  req.session.save(() => res.json({ ok: true, id: resultado.data.id }));
}

// POST /onboarding/equipo/:id/escudo: recibe la imagen (ya achicada en el navegador),
// la sube a Supabase Storage y guarda su dirección en equipo.escudo_url
async function subirEscudo(req, res) {
  const tipo = (req.get('content-type') || '').split(';')[0];
  if (!imagenValida(tipo, req.body)) {
    return res.status(400).json({ ok: false, mensaje: 'El escudo debe ser una imagen JPG, PNG o WebP.' });
  }

  const supabase = require('../config/db');
  const id = Number(req.params.id);
  const { data: equipo } = await supabase.from('equipo').select('id')
    .eq('id', id).eq('id_usuario_creador', req.session.user.id).maybeSingle();
  if (!equipo) return res.status(404).json({ ok: false, mensaje: 'No encontramos tu equipo.' });

  const ruta = `equipo-${equipo.id}`;
  const { error: errorSubida } = await supabase.storage.from(BUCKET_ESCUDOS).upload(ruta, req.body, { contentType: tipo, upsert: true });
  if (errorSubida) {
    console.error(`Error al subir el escudo (¿existe el bucket "${BUCKET_ESCUDOS}"? ver sql/migracion-equipos.sql):`, errorSubida.message);
    return res.status(500).json({ ok: false, mensaje: 'No pudimos subir el escudo.' });
  }

  // ?v= cambia en cada subida para que el navegador no muestre el escudo viejo guardado en caché
  const { data } = supabase.storage.from(BUCKET_ESCUDOS).getPublicUrl(ruta);
  const url = `${data.publicUrl}?v=${Date.now()}`;
  const { error } = await supabase.from('equipo').update({ escudo_url: url }).eq('id', equipo.id);
  if (error) {
    console.error('Error al guardar escudo_url:', error.message);
    return res.status(500).json({ ok: false, mensaje: 'No pudimos guardar el escudo.' });
  }
  res.json({ ok: true, escudo: url });
}

module.exports = { nombresComunas, guardarEquipo, subirEscudo };
