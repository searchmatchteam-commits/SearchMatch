const crearClienteAuth = require('../config/supabaseAuth');

// Formato básico de correo (Supabase hace la validación final)
const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Límites de la contraseña: Supabase no acepta más de 72 caracteres
const CONTRASENA_MIN = 8;
const CONTRASENA_MAX = 72;

// Dirección base de la app (ej. http://localhost:3000) para los enlaces de los correos
function urlBase(req) {
  return `${req.protocol}://${req.get('host')}`;
}

// Error 429 de Supabase Auth: se pasó un límite. Lo deja en la consola con su código
// (ver Authentication > Rate Limits en el panel de Supabase) y devuelve el mensaje para el usuario
function mensajeLimite(error, accion) {
  console.error(`[Supabase Auth] Límite alcanzado en ${accion}: ${error.code || 'sin código'} — ${error.message}`);
  // El servidor de correos que trae Supabase envía muy pocos correos por hora
  if (error.code === 'over_email_send_rate_limit') {
    return 'Se alcanzó el límite de correos por hora. Espera un rato y vuelve a intentarlo.';
  }
  return 'Demasiados intentos. Espera un momento y vuelve a intentarlo.';
}

// Traduce los errores de Supabase Auth del login a mensajes para el usuario
function mensajeErrorLogin(error) {
  if (error.code === 'invalid_credentials') {
    return 'El correo o la contraseña no coinciden. Revisa tus datos e inténtalo de nuevo.';
  }
  if (error.code === 'email_not_confirmed') return 'Debes confirmar tu correo antes de iniciar sesión.';
  if (error.status === 429) return mensajeLimite(error, 'el login');
  console.error('Error en signInWithPassword:', error.code, error.message);
  return 'No pudimos iniciar sesión. Inténtalo de nuevo.';
}

// Revisa largo y confirmación de una contraseña nueva. Devuelve el error o null
function validarContrasenaNueva(contrasena, confirmar) {
  if (contrasena.length < CONTRASENA_MIN || contrasena.length > CONTRASENA_MAX) {
    return `La contraseña debe tener entre ${CONTRASENA_MIN} y ${CONTRASENA_MAX} caracteres.`;
  }
  if (contrasena !== confirmar) return 'Las contraseñas no coinciden.';
  return null;
}

// Normaliza un celular chileno a +569XXXXXXXX (acepta "9 1234 5678", "+56 9 1234 5678", etc.)
// Devuelve null si no es un celular válido
function normalizarTelefono(texto) {
  const digitos = (texto || '').replace(/\D/g, '').replace(/^56/, '');
  return /^9\d{8}$/.test(digitos) ? `+56${digitos}` : null;
}

// Revisa que la fecha de nacimiento (AAAA-MM-DD, la manda el input date) sea real y pasada
function fechaNacimientoValida(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const fecha = new Date(`${texto}T00:00:00`);
  return !isNaN(fecha) && fecha < new Date() && fecha.getFullYear() >= 1900;
}

// Tipo de cuenta que el usuario eligió antes de registrarse ('player' | 'team').
// Viaja por el registro y la sesión para llegar preseleccionado al onboarding
const TIPOS_CUENTA = ['player', 'team'];
const tipoCuentaValido = (texto) => (TIPOS_CUENTA.includes(texto) ? texto : '');

// ¿La petición viene de fetch esperando JSON? (las pantallas de React)
function quiereJson(req) {
  return (req.get('accept') || '').includes('application/json');
}

// Busca el perfil de la app (tabla usuario) de una cuenta de Supabase Auth.
// Devuelve { usuario } o { error } con un mensaje para mostrar
async function buscarUsuarioDeCuenta(authId) {
  // Se carga aquí porque db.js falla si falta SUPABASE_SERVICE_ROLE_KEY en .env
  const supabase = require('../config/db');
  const { data: usuario, error } = await supabase
    .from('usuario')
    .select('id, correo, id_rol_aplicacion, activo')
    .eq('auth_id', authId)
    .maybeSingle();

  if (error) {
    console.error('Error al buscar el perfil:', error.message);
    return { error: 'No pudimos iniciar sesión. Inténtalo de nuevo.' };
  }
  if (usuario && !usuario.activo) return { error: 'Tu cuenta está desactivada.' };
  return { usuario };
}

// Crea la sesión del usuario (regenerándola, para evitar fijación de sesión) y llama a listo(destino).
// destino: si ya completó el onboarding, la pantalla para elegir entrar como jugador o equipo;
// si no, el onboarding (que empieza con esa misma elección)
function iniciarSesion(req, usuario, cuenta, { recordar = true } = {}, listo) {
  const metadatos = cuenta.user_metadata || {};
  req.session.regenerate(async (err) => {
    if (err) return listo(null);

    req.session.user = {
      id: usuario.id,
      correo: usuario.correo,
      rol: usuario.id_rol_aplicacion,
      // Datos del registro, para dejarlos listos en el onboarding
      fechaNacimiento: metadatos.fecha_nacimiento || null,
      tipoCuenta: tipoCuentaValido(metadatos.tipo_cuenta)
    };
    // Sin "Mantener sesión iniciada": la cookie se borra al cerrar el navegador
    if (!recordar) req.session.cookie.expires = false;

    // Se carga aquí para evitar una dependencia circular (onboardingController usa este archivo)
    const { tienePerfil } = require('./onboardingController');
    const perfil = await tienePerfil(usuario.id);
    if (perfil) req.session.user.perfilCompleto = true;
    const destino = perfil === false ? '/onboarding' : '/users/entrar';

    req.session.save(() => listo(destino));
  });
}

// ===================== LOGIN =====================

// GET /login: la pantalla de acceso (React, ver public/js/acceso.js)
function mostrarLogin(req, res) {
  res.render('login', { error: req.flash('error')[0] || null, exito: req.flash('success')[0] || null });
}

// POST /login: valida las credenciales con Supabase Auth y crea la sesión.
// Responde JSON: { ok, destino } o { ok: false, mensaje, errores }
async function handleLogin(req, res) {
  const correo = (req.body.correo || '').trim().toLowerCase();
  const contrasena = req.body.contrasena || '';
  const recordar = req.body.recordar === 'true';

  const fallar = (status, mensaje, errores) => res.status(status).json({ ok: false, mensaje, errores });

  const errores = {};
  if (!FORMATO_CORREO.test(correo)) errores.correo = 'Ingresa un correo válido, por ejemplo tu@email.com.';
  if (!contrasena) errores.contrasena = 'Ingresa tu contraseña.';
  if (Object.keys(errores).length > 0) return fallar(400, null, errores);

  // 1. Supabase Auth verifica el correo y la contraseña
  const { data, error } = await crearClienteAuth().auth.signInWithPassword({
    email: correo,
    password: contrasena
  });
  if (error) return fallar(error.status === 429 ? 429 : 401, mensajeErrorLogin(error));

  // 2. El perfil de la app enlazado a esa cuenta
  const { usuario, error: errorPerfil } = await buscarUsuarioDeCuenta(data.user.id);
  if (errorPerfil) return fallar(403, errorPerfil);
  if (!usuario) return fallar(403, 'Tu cuenta no tiene un perfil asociado. Completa tu registro.');

  // 3. La sesión
  iniciarSesion(req, usuario, data.user, { recordar }, (destino) => {
    if (!destino) return fallar(500, 'No pudimos iniciar sesión. Inténtalo de nuevo.');
    res.json({ ok: true, destino });
  });
}

// ===================== CONTINUAR CON GOOGLE =====================

// Supabase guarda el código PKCE del inicio con Google en este "almacenamiento":
// lo dejamos en la sesión de express para leerlo cuando Google nos devuelva a /auth/callback
function almacenEnSesion(req) {
  if (!req.session.supabaseAuth) req.session.supabaseAuth = {};
  const almacen = req.session.supabaseAuth;
  return {
    getItem: (clave) => (clave in almacen ? almacen[clave] : null),
    setItem: (clave, valor) => { almacen[clave] = valor; },
    removeItem: (clave) => { delete almacen[clave]; }
  };
}

// ¿Está activado Google en Authentication > Sign In / Providers de Supabase?
async function googleActivado() {
  try {
    const url = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
    const clave = (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
    const r = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: clave } });
    const ajustes = await r.json();
    return Boolean(ajustes.external && ajustes.external.google);
  } catch (e) {
    console.error('No se pudo revisar si Google está activado:', e.message);
    return false;
  }
}

// GET /users/entrar: después del login, elegir si entrar como jugador o como equipo
function mostrarEntrar(req, res) {
  res.render('entrar', { tipoCuenta: req.session.user.tipoCuenta || '' });
}

// GET /auth/google: lleva a la pantalla de Google (a través de Supabase)
async function iniciarGoogle(req, res) {
  if (!(await googleActivado())) {
    console.error('[Google] Activa el proveedor Google en Supabase: Authentication > Sign In / Providers');
    req.flash('error', 'El inicio con Google aún no está disponible. Usa tu correo y contraseña.');
    return res.redirect('/login');
  }

  // Si viene desde "Crea tu equipo" / "Regístrate como jugador", recordamos el tipo de cuenta
  req.session.tipoCuentaGoogle = tipoCuentaValido(req.query.tipo);

  const cliente = crearClienteAuth({ flowType: 'pkce', persistSession: true, storage: almacenEnSesion(req) });
  const { data, error } = await cliente.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${urlBase(req)}/auth/callback`, skipBrowserRedirect: true }
  });
  if (error) {
    console.error('Error al iniciar con Google:', error.message);
    req.flash('error', 'No pudimos conectar con Google. Inténtalo de nuevo.');
    return res.redirect('/login');
  }
  // Guardamos la sesión (con el código PKCE) antes de salir hacia Google
  req.session.save(() => res.redirect(data.url));
}

// GET /auth/callback: Google vuelve aquí con ?code=. Abre la sesión y, si es la primera vez, crea el perfil
async function callbackGoogle(req, res) {
  const volverConError = (mensaje) => {
    req.flash('error', mensaje);
    res.redirect('/login');
  };
  if (!req.query.code) return volverConError('No se completó el inicio con Google.');

  const cliente = crearClienteAuth({ flowType: 'pkce', persistSession: true, storage: almacenEnSesion(req) });
  const { data, error } = await cliente.auth.exchangeCodeForSession(String(req.query.code));
  delete req.session.supabaseAuth;
  if (error) {
    console.error('Error en el callback de Google:', error.message);
    return volverConError('No pudimos iniciar sesión con Google. Inténtalo de nuevo.');
  }

  const cuenta = data.user;
  let { usuario, error: errorPerfil } = await buscarUsuarioDeCuenta(cuenta.id);
  if (errorPerfil) return volverConError(errorPerfil);

  // Primera vez con Google: creamos su fila en la tabla usuario con el rol por defecto
  if (!usuario) {
    const supabase = require('../config/db');
    const { data: rol } = await supabase.from('rol_aplicacion').select('id').eq('nombre', 'usuario').maybeSingle();
    if (!rol) return volverConError('Falta configuración inicial (rol "usuario"). Ejecuta sql/seeds.sql en Supabase.');

    const { data: nuevo, error: errorNuevo } = await supabase
      .from('usuario')
      .insert({ correo: (cuenta.email || '').toLowerCase(), id_rol_aplicacion: rol.id, auth_id: cuenta.id })
      .select('id, correo, id_rol_aplicacion, activo')
      .single();
    if (errorNuevo) {
      console.error('Error al crear el perfil (Google):', errorNuevo.message);
      // 23505: ya existe un usuario con ese correo registrado con contraseña
      return volverConError(errorNuevo.code === '23505'
        ? 'Ese correo ya tiene una cuenta. Inicia sesión con tu contraseña.'
        : 'No pudimos crear tu cuenta. Inténtalo de nuevo.');
    }
    usuario = nuevo;
  }

  const tipoCuenta = req.session.tipoCuentaGoogle;
  iniciarSesion(req, usuario, cuenta, { recordar: true }, (destino) => {
    if (!destino) return volverConError('No pudimos iniciar sesión. Inténtalo de nuevo.');
    if (tipoCuenta && !req.session.user.tipoCuenta) req.session.user.tipoCuenta = tipoCuenta;
    req.session.save(() => res.redirect(destino));
  });
}

// ===================== REGISTRO =====================

// GET /register: la pantalla de registro (React, ver public/js/registro.js)
function mostrarRegistro(req, res) {
  res.render('register', {
    error: req.flash('error')[0] || null,
    tipo: tipoCuentaValido(req.query.tipo),
    hoy: new Date().toISOString().slice(0, 10)
  });
}

// POST /register: crea la cuenta en Supabase Auth y su fila en la tabla usuario.
// Responde JSON: { ok, destino } (entra directo), { ok, confirmar: true } (debe confirmar el correo)
// o { ok: false, mensaje, errores } con el error de cada campo
async function handleRegister(req, res) {
  const datos = {
    correo: (req.body.correo || '').trim().toLowerCase(),
    correo_secundario: (req.body.correo_secundario || '').trim().toLowerCase(),
    telefono: (req.body.telefono || '').trim(),
    fecha_nacimiento: (req.body.fecha_nacimiento || '').trim(),
    tipo: tipoCuentaValido(req.body.tipo)
  };
  const contrasena = req.body.contrasena || '';
  const confirmar = req.body.confirmar || '';

  const fallar = (status, mensaje, errores) => res.status(status).json({ ok: false, mensaje, errores });

  // 1. Validaciones antes de llamar a Supabase (un error por campo)
  const errores = {};
  if (!FORMATO_CORREO.test(datos.correo)) errores.correo = 'Ingresa un correo válido, por ejemplo tu@email.com.';
  if (datos.correo_secundario) {
    if (!FORMATO_CORREO.test(datos.correo_secundario)) errores.correo_secundario = 'El correo secundario no es válido.';
    else if (datos.correo_secundario === datos.correo) errores.correo_secundario = 'Debe ser distinto al correo principal.';
  }
  const telefono = normalizarTelefono(datos.telefono);
  if (!telefono) errores.telefono = 'Ingresa un celular chileno válido (ej. 9 1234 5678).';
  if (!fechaNacimientoValida(datos.fecha_nacimiento)) errores.fecha_nacimiento = 'Ingresa una fecha de nacimiento válida.';
  if (contrasena.length < CONTRASENA_MIN || contrasena.length > CONTRASENA_MAX) {
    errores.contrasena = `Entre ${CONTRASENA_MIN} y ${CONTRASENA_MAX} caracteres.`;
  } else if (contrasena !== confirmar) {
    errores.confirmar = 'Las contraseñas no coinciden.';
  }
  if (req.body.terminos !== 'true') errores.terminos = 'Debes aceptar los Términos y la Política de Privacidad.';
  if (Object.keys(errores).length > 0) return fallar(400, null, errores);

  const supabase = require('../config/db');

  // 2. El rol por defecto de toda cuenta nueva
  const { data: rol, error: errorRol } = await supabase
    .from('rol_aplicacion')
    .select('id')
    .eq('nombre', 'usuario')
    .maybeSingle();

  if (errorRol) {
    console.error('Error al buscar el rol "usuario":', errorRol.message);
    return fallar(500, 'No pudimos crear tu cuenta. Inténtalo de nuevo.');
  }
  if (!rol) {
    console.error('Falta el rol "usuario" (ver sql/seeds.sql): tabla rol_aplicacion vacía');
    return fallar(500, 'Falta configuración inicial (rol "usuario"). Ejecuta sql/seeds.sql en Supabase.');
  }

  // 3. Supabase Auth crea la cuenta y guarda la contraseña.
  // La fecha de nacimiento y el tipo de cuenta quedan en los metadatos: se usan en el onboarding.
  // El enlace del correo de confirmación devuelve a /login
  const { data, error } = await crearClienteAuth().auth.signUp({
    email: datos.correo,
    password: contrasena,
    options: {
      emailRedirectTo: `${urlBase(req)}/login`,
      data: { fecha_nacimiento: datos.fecha_nacimiento, tipo_cuenta: datos.tipo }
    }
  });

  const yaExiste = () => fallar(409, null, { correo: 'Ya existe una cuenta con ese correo. Inicia sesión.' });
  if (error) {
    if (error.code === 'user_already_exists') return yaExiste();
    if (error.code === 'email_address_invalid') return fallar(400, null, { correo: 'Ese correo no es válido. Revisa que esté bien escrito.' });
    if (error.code === 'weak_password') return fallar(400, null, { contrasena: 'La contraseña es muy débil. Prueba con una más larga.' });
    if (error.status === 429) return fallar(429, mensajeLimite(error, 'el registro'));
    console.error('Error en signUp:', error.message);
    return fallar(500, 'No pudimos crear tu cuenta. Inténtalo de nuevo.');
  }

  // Con la confirmación por correo activa, Supabase no avisa que el correo ya existe:
  // devuelve un usuario sin "identities" para no revelar qué correos están registrados
  if (data.user.identities && data.user.identities.length === 0) return yaExiste();

  // 4. Creamos el perfil de la app enlazado a la cuenta de Auth
  const { data: usuario, error: errorPerfil } = await supabase.from('usuario').insert({
    correo: datos.correo,
    correo_secundario: datos.correo_secundario || null,
    telefono,
    id_rol_aplicacion: rol.id,
    auth_id: data.user.id
  }).select('id, correo, id_rol_aplicacion, activo').single();

  if (errorPerfil) {
    // Si el perfil no se pudo crear, borramos la cuenta de Auth para no dejarla a medias
    console.error('Error al crear el perfil:', errorPerfil.message);
    await supabase.auth.admin.deleteUser(data.user.id);
    return fallar(500, 'No pudimos crear tu cuenta. Inténtalo de nuevo.');
  }

  // 5. Si Supabase pide confirmar el correo no hay sesión todavía: la pantalla lo avisa.
  // Si no lo pide, entra directo (al onboarding)
  if (!data.session) return res.json({ ok: true, confirmar: true });
  iniciarSesion(req, usuario, data.user, {}, (destino) => {
    if (!destino) return res.json({ ok: true, confirmar: false, destino: '/login' });
    res.json({ ok: true, confirmar: false, destino });
  });
}

// ===================== RECUPERAR CONTRASEÑA =====================

// GET /forgot-password: formulario para pedir el enlace
function mostrarOlvido(req, res) {
  res.render('forgot-password', { error: null, exito: null, correo: '' });
}

// POST /forgot-password: Supabase envía un correo con el enlace para crear una contraseña nueva
async function handleOlvido(req, res) {
  const correo = (req.body.correo || '').trim().toLowerCase();

  const json = quiereJson(req);

  if (!FORMATO_CORREO.test(correo)) {
    const mensaje = 'Ingresa un correo válido, por ejemplo tu@email.com.';
    if (json) return res.status(400).json({ ok: false, errores: { correo: mensaje } });
    return res.status(400).render('forgot-password', { error: 'Ingresa un correo válido.', exito: null, correo });
  }

  const { error } = await crearClienteAuth().auth.resetPasswordForEmail(correo, {
    redirectTo: `${urlBase(req)}/reset-password`
  });

  if (error && error.status === 429) {
    mensajeLimite(error, 'recuperar contraseña');
    if (json) {
      return res.status(429).json({ ok: false, mensaje: 'Ya enviamos un enlace hace poco. Espera un momento y vuelve a intentarlo.' });
    }
    return res.status(429).render('forgot-password', {
      error: 'Ya enviamos un enlace hace poco. Espera un momento y vuelve a intentarlo.', exito: null, correo
    });
  }
  if (error) console.error('Error en resetPasswordForEmail:', error.message);

  // El mensaje es el mismo exista o no la cuenta, para no revelar qué correos están registrados
  if (json) return res.json({ ok: true });
  res.render('forgot-password', {
    error: null,
    exito: 'Si el correo está registrado, te enviamos un enlace para crear una contraseña nueva.',
    correo: ''
  });
}

// GET /reset-password: formulario para la contraseña nueva.
// Supabase llega aquí con los tokens en el "#" de la URL; reset-password.js los copia al formulario
function mostrarReset(req, res) {
  res.render('reset-password', { error: null, tokens: null });
}

// POST /reset-password: valida el enlace y guarda la contraseña nueva
async function handleReset(req, res) {
  const { access_token, refresh_token } = req.body;
  const contrasena = req.body.contrasena || '';
  const confirmar = req.body.confirmar || '';

  // Si el error es de la contraseña, devolvemos los tokens para que pueda intentarlo de nuevo;
  // si el enlace no sirve, no (y la vista oculta el formulario)
  const fallar = (error, tokensValidos = true) => res.status(400).render('reset-password', {
    error,
    tokens: tokensValidos ? { access_token, refresh_token } : null
  });
  const enlaceInvalido = 'El enlace no es válido o ya expiró. Pide uno nuevo desde "¿Olvidaste tu contraseña?".';

  if (!access_token || !refresh_token) {
    return fallar(enlaceInvalido, false);
  }
  const errorContrasena = validarContrasenaNueva(contrasena, confirmar);
  if (errorContrasena) {
    return fallar(errorContrasena);
  }

  // 1. Abrimos la sesión de recuperación que viene en el enlace del correo
  const cliente = crearClienteAuth();
  const { error: errorSesion } = await cliente.auth.setSession({ access_token, refresh_token });
  if (errorSesion) {
    return fallar(enlaceInvalido, false);
  }

  // 2. Guardamos la contraseña nueva
  const { error } = await cliente.auth.updateUser({ password: contrasena });
  if (error) {
    if (error.code === 'same_password') return fallar('La contraseña nueva debe ser distinta a la anterior.');
    if (error.code === 'weak_password') return fallar('La contraseña es muy débil. Prueba con una más larga.');
    console.error('Error en updateUser:', error.message);
    return fallar('No pudimos cambiar tu contraseña. Inténtalo de nuevo.');
  }

  req.flash('success', 'Contraseña actualizada. Ya puedes iniciar sesión.');
  res.redirect('/login');
}

// ===================== LOGOUT =====================

// POST /logout: cierra la sesión
function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
}

module.exports = {
  mostrarLogin, handleLogin, mostrarEntrar, iniciarGoogle, callbackGoogle,
  mostrarRegistro, handleRegister,
  mostrarOlvido, handleOlvido, mostrarReset, handleReset,
  logout,
  fechaNacimientoValida
};
