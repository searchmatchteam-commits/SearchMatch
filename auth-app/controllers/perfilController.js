// Perfil del jugador: su carta estilo FIFA, editar datos y subir foto.
// La pantalla es una app de React (public/js/perfil.js); la carta está en public/js/carta.js
const { validarPerfil, idPorNombre, POSICIONES } = require('./onboardingController');

const BUCKET_FOTOS = 'fotos-jugadores';  // ver sql/migracion-foto-jugador.sql
const PAIS_POR_DEFECTO = 'CL';           // aún no se guarda el país del jugador

// Tipos de imagen aceptados y su "firma" (primeros bytes del archivo)
const FIRMAS = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8,
  'image/png': (b) => b.slice(0, 4).toString('hex') === '89504e47',
  'image/webp': (b) => b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP'
};

// ¿El archivo es de verdad una imagen del tipo que dice? (también lo usa el escudo del equipo)
const imagenValida = (tipo, archivo) =>
  Buffer.isBuffer(archivo) && archivo.length > 0 && Boolean(FIRMAS[tipo]) && FIRMAS[tipo](archivo);

// Nombre en la tabla posicion → clave que usa la carta
const CLAVE_POSICION = Object.fromEntries(Object.entries(POSICIONES).map(([clave, nombre]) => [nombre, clave]));

const COLUMNAS = 'id, nombre_apodo, apellido, fecha_nacimiento, altura, peso, id_usuario, jugador_posicion(posicion(nombre))';

// Trae un jugador por id_usuario o por id. Devuelve el jugador, null si no existe, o lanza si falla
async function buscarJugador(filtro) {
  const supabase = require('../config/db');
  const [columna, valor] = Object.entries(filtro)[0];

  let { data, error } = await supabase.from('jugador').select(`${COLUMNAS}, foto_url`).eq(columna, valor).maybeSingle();
  // 42703 = la columna foto_url aún no existe (ver sql/migracion-foto-jugador.sql): seguimos sin foto
  if (error && error.code === '42703') {
    ({ data, error } = await supabase.from('jugador').select(COLUMNAS).eq(columna, valor).maybeSingle());
  }
  if (error) throw new Error(error.message);
  return data;
}

// Fila de la base de datos → datos que necesita la carta
function paraLaCarta(fila) {
  const primera = fila.jugador_posicion && fila.jugador_posicion[0];
  const nombrePosicion = primera && primera.posicion ? primera.posicion.nombre : null;
  return {
    id: fila.id,
    nombre: fila.nombre_apodo,
    apellido: fila.apellido,
    fechaNacimiento: fila.fecha_nacimiento,
    altura: fila.altura === null ? null : Number(fila.altura),
    peso: fila.peso === null ? null : Number(fila.peso),
    posicion: CLAVE_POSICION[nombrePosicion] || 'medio',
    foto: fila.foto_url || null,
    pais: PAIS_POR_DEFECTO
  };
}

// GET /users/perfil: la carta del usuario con sesión
async function mostrarPerfil(req, res) {
  try {
    const fila = await buscarJugador({ id_usuario: req.session.user.id });
    if (!fila) return res.redirect('/onboarding');
    res.render('perfil', { jugador: paraLaCarta(fila), propio: true });
  } catch (e) {
    console.error('Error al cargar el perfil:', e.message);
    res.status(500).render('perfil', { jugador: null, propio: true });
  }
}

// GET /users/carta/:id: la carta de otro jugador (el enlace de "Compartir carta")
async function mostrarCarta(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(404).render('perfil', { jugador: null, propio: false });
  try {
    const fila = await buscarJugador({ id });
    if (!fila) return res.status(404).render('perfil', { jugador: null, propio: false });
    // Si es la propia carta, mejor la página completa
    if (fila.id_usuario === req.session.user.id) return res.redirect('/users/perfil');
    res.render('perfil', { jugador: paraLaCarta(fila), propio: false });
  } catch (e) {
    console.error('Error al cargar la carta:', e.message);
    res.status(500).render('perfil', { jugador: null, propio: false });
  }
}

// POST /users/perfil: guarda los cambios de "Editar perfil". Responde JSON con el jugador actualizado
async function editarPerfil(req, res) {
  const { errores, valores } = validarPerfil(req.body);
  if (Object.keys(errores).length > 0) {
    return res.status(400).json({ ok: false, mensaje: 'Revisa los campos marcados.', errores });
  }

  const supabase = require('../config/db');
  const fallar = (mensaje, detalle) => {
    console.error(mensaje, detalle);
    return res.status(500).json({ ok: false, mensaje: 'No pudimos guardar los cambios. Inténtalo de nuevo.' });
  };

  try {
    const fila = await buscarJugador({ id_usuario: req.session.user.id });
    if (!fila) return res.status(404).json({ ok: false, mensaje: 'No encontramos tu perfil.' });

    const { error } = await supabase.from('jugador').update({
      nombre_apodo: valores.nombre,
      apellido: valores.apellido,
      fecha_nacimiento: valores.fechaNacimiento,
      altura: valores.altura,
      peso: valores.peso
    }).eq('id', fila.id);
    if (error) return fallar('Error al editar el perfil:', error.message);

    // La posición: se reemplaza la anterior por la nueva
    const idPosicion = await idPorNombre(supabase, 'posicion', valores.posicion);
    if (idPosicion) {
      const { error: errorBorrar } = await supabase.from('jugador_posicion').delete().eq('id_jugador', fila.id);
      if (errorBorrar) return fallar('Error al cambiar la posición:', errorBorrar.message);
      const { error: errorPosicion } = await supabase
        .from('jugador_posicion')
        .insert({ id_jugador: fila.id, id_posicion: idPosicion });
      if (errorPosicion) return fallar('Error al cambiar la posición:', errorPosicion.message);
    }

    const actualizado = await buscarJugador({ id: fila.id });
    res.json({ ok: true, jugador: paraLaCarta(actualizado) });
  } catch (e) {
    fallar('Error al editar el perfil:', e.message);
  }
}

// POST /users/perfil/foto: recibe la imagen (ya recortada y achicada en el navegador),
// la sube a Supabase Storage y guarda su dirección en jugador.foto_url
async function subirFoto(req, res) {
  const tipo = (req.get('content-type') || '').split(';')[0];
  const archivo = req.body;

  if (!imagenValida(tipo, archivo)) {
    return res.status(400).json({ ok: false, mensaje: 'La foto debe ser una imagen JPG, PNG o WebP.' });
  }

  const supabase = require('../config/db');
  try {
    const fila = await buscarJugador({ id_usuario: req.session.user.id });
    if (!fila) return res.status(404).json({ ok: false, mensaje: 'No encontramos tu perfil.' });

    // Un archivo por jugador: la foto nueva reemplaza a la anterior
    const ruta = `jugador-${fila.id}`;
    const { error: errorSubida } = await supabase.storage
      .from(BUCKET_FOTOS)
      .upload(ruta, archivo, { contentType: tipo, upsert: true });
    if (errorSubida) {
      console.error(`Error al subir la foto (¿existe el bucket "${BUCKET_FOTOS}"? ver sql/migracion-foto-jugador.sql):`, errorSubida.message);
      return res.status(500).json({ ok: false, mensaje: 'No pudimos subir tu foto. Inténtalo de nuevo.' });
    }

    // ?v= cambia en cada subida para que el navegador no muestre la foto vieja guardada en caché.
    // &recorte=1: la foto no tiene fondo (el navegador lo detectó) y la carta la muestra sobresaliendo
    const { data } = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(ruta);
    const recortada = req.get('x-foto-recortada') === '1';
    const url = `${data.publicUrl}?v=${Date.now()}${recortada ? '&recorte=1' : ''}`;

    const { error } = await supabase.from('jugador').update({ foto_url: url }).eq('id', fila.id);
    if (error) {
      console.error('Error al guardar foto_url (ver sql/migracion-foto-jugador.sql):', error.message);
      return res.status(500).json({ ok: false, mensaje: 'No pudimos guardar tu foto. Inténtalo de nuevo.' });
    }
    res.json({ ok: true, foto: url });
  } catch (e) {
    console.error('Error al subir la foto:', e.message);
    res.status(500).json({ ok: false, mensaje: 'No pudimos subir tu foto. Inténtalo de nuevo.' });
  }
}

module.exports = { mostrarPerfil, mostrarCarta, editarPerfil, subirFoto, imagenValida };
