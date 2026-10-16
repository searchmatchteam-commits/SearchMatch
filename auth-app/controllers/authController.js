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

// Traduce los errores de Supabase Auth del login a mensajes para el usuario
function mensajeErrorLogin(error) {
  if (error.code === 'invalid_credentials') return 'Correo o contraseña incorrectos.';
  if (error.code === 'email_not_confirmed') return 'Debes confirmar tu correo antes de iniciar sesión.';
  if (error.status === 429) return 'Demasiados intentos. Espera un momento y vuelve a intentarlo.';
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

// ===================== LOGIN =====================

// GET /login: muestra el formulario
function mostrarLogin(req, res) {
  res.render('login', { error: req.flash('error')[0] || null, exito: req.flash('success')[0] || null, correo: '' });
}

// POST /login: valida las credenciales con Supabase Auth y crea la sesión
async function handleLogin(req, res) {
  const correo = (req.body.correo || '').trim().toLowerCase();
  const contrasena = req.body.contrasena || '';

  // Vuelve a mostrar el formulario con el error, sin perder el correo escrito
  const fallar = (error) => res.status(400).render('login', { error, exito: null, correo });

  if (!correo || !contrasena) {
    return fallar('Ingresa tu correo y tu contraseña.');
  }

  // 1. Supabase Auth verifica el correo y la contraseña
  const { data, error } = await crearClienteAuth().auth.signInWithPassword({
    email: correo,
    password: contrasena
  });

  if (error) {
    return fallar(mensajeErrorLogin(error));
  }

  // 2. Buscamos el perfil de la app enlazado a esa cuenta
  // (se carga aquí porque db.js falla si falta SUPABASE_SERVICE_ROLE_KEY en .env)
  const supabase = require('../config/db');
  const { data: usuario, error: errorPerfil } = await supabase
    .from('usuario')
    .select('id, correo, id_rol_aplicacion, activo')
    .eq('auth_id', data.user.id)
    .maybeSingle();

  if (errorPerfil) {
    console.error('Error al buscar el perfil:', errorPerfil.message);
    return fallar('No pudimos iniciar sesión. Inténtalo de nuevo.');
  }
  if (!usuario) {
    return fallar('Tu cuenta no tiene un perfil asociado. Completa tu registro.');
  }
  if (!usuario.activo) {
    return fallar('Tu cuenta está desactivada.');
  }

  // 3. Regeneramos la sesión (evita fijación de sesión) y guardamos al usuario
  req.session.regenerate((err) => {
    if (err) return fallar('No pudimos iniciar sesión. Inténtalo de nuevo.');

    req.session.user = {
      id: usuario.id,
      correo: usuario.correo,
      rol: usuario.id_rol_aplicacion,
      // La fecha del registro, para dejarla escrita en el onboarding
      fechaNacimiento: (data.user.user_metadata && data.user.user_metadata.fecha_nacimiento) || null
    };
    req.session.save(() => res.redirect('/'));
  });
}

// ===================== REGISTRO =====================

// GET /register: muestra el formulario
function mostrarRegistro(req, res) {
  res.render('register', {
    error: null,
    datos: { correo: '', correo_secundario: '', telefono: '', fecha_nacimiento: '' }
  });
}

// POST /register: crea la cuenta en Supabase Auth y su fila en la tabla usuario
async function handleRegister(req, res) {
  const datos = {
    correo: (req.body.correo || '').trim().toLowerCase(),
    correo_secundario: (req.body.correo_secundario || '').trim().toLowerCase(),
    telefono: (req.body.telefono || '').trim(),
    fecha_nacimiento: (req.body.fecha_nacimiento || '').trim()
  };
  const contrasena = req.body.contrasena || '';
  const confirmar = req.body.confirmar || '';

  // Vuelve a mostrar el formulario con el error, sin perder lo escrito (salvo contraseñas)
  const fallar = (error) => res.status(400).render('register', { error, datos });

  // 1. Validaciones antes de llamar a Supabase
  if (!datos.correo || !datos.telefono || !datos.fecha_nacimiento || !contrasena) {
    return fallar('Completa todos los campos obligatorios.');
  }
  if (datos.correo_secundario) {
    if (!FORMATO_CORREO.test(datos.correo_secundario)) {
      return fallar('El correo secundario no es válido.');
    }
    if (datos.correo_secundario === datos.correo) {
      return fallar('El correo secundario debe ser distinto al principal.');
    }
  }
  const telefono = normalizarTelefono(datos.telefono);
  if (!telefono) {
    return fallar('Ingresa un celular chileno válido (ej. 9 1234 5678).');
  }
  if (!fechaNacimientoValida(datos.fecha_nacimiento)) {
    return fallar('Ingresa una fecha de nacimiento válida.');
  }
  const errorContrasena = validarContrasenaNueva(contrasena, confirmar);
  if (errorContrasena) {
    return fallar(errorContrasena);
  }
  if (!req.body.terminos) {
    return fallar('Debes aceptar los Términos y Condiciones y la Política de Privacidad.');
  }

  const supabase = require('../config/db');

  // 2. El rol por defecto de toda cuenta nueva
  const { data: rol, error: errorRol } = await supabase
    .from('rol_aplicacion')
    .select('id')
    .eq('nombre', 'usuario')
    .maybeSingle();

  if (errorRol) {
    console.error('Error al buscar el rol "usuario":', errorRol.message);
    return fallar('No pudimos crear tu cuenta. Inténtalo de nuevo.');
  }
  if (!rol) {
    console.error('Falta el rol "usuario" (ver sql/seeds.sql): tabla rol_aplicacion vacía');
    return fallar('Falta configuración inicial (rol "usuario"). Ejecuta sql/seeds.sql en Supabase.');
  }

  // 3. Supabase Auth crea la cuenta y guarda la contraseña.
  // La fecha de nacimiento queda en los metadatos de la cuenta: se usará al crear
  // el perfil de jugador. El enlace del correo de confirmación devuelve a /login
  const { data, error } = await crearClienteAuth().auth.signUp({
    email: datos.correo,
    password: contrasena,
    options: {
      emailRedirectTo: `${urlBase(req)}/login`,
      data: { fecha_nacimiento: datos.fecha_nacimiento }
    }
  });

  if (error) {
    if (error.code === 'user_already_exists') return fallar('Ya existe una cuenta con ese correo.');
    if (error.code === 'email_address_invalid') return fallar('Ese correo no es válido. Revisa que esté bien escrito.');
    if (error.code === 'weak_password') return fallar('La contraseña es muy débil. Prueba con una más larga.');
    if (error.status === 429) return fallar('Demasiados intentos. Espera un momento y vuelve a intentarlo.');
    console.error('Error en signUp:', error.message);
    return fallar('No pudimos crear tu cuenta. Inténtalo de nuevo.');
  }

  // Con la confirmación por correo activa, Supabase no avisa que el correo ya existe:
  // devuelve un usuario sin "identities" para no revelar qué correos están registrados
  if (data.user.identities && data.user.identities.length === 0) {
    return fallar('Ya existe una cuenta con ese correo.');
  }

  // 4. Creamos el perfil de la app enlazado a la cuenta de Auth
  const { error: errorPerfil } = await supabase.from('usuario').insert({
    correo: datos.correo,
    correo_secundario: datos.correo_secundario || null,
    telefono,
    id_rol_aplicacion: rol.id,
    auth_id: data.user.id
  });

  if (errorPerfil) {
    // Si el perfil no se pudo crear, borramos la cuenta de Auth para no dejarla a medias
    console.error('Error al crear el perfil:', errorPerfil.message);
    await supabase.auth.admin.deleteUser(data.user.id);
    return fallar('No pudimos crear tu cuenta. Inténtalo de nuevo.');
  }

  // 5. Si Supabase pide confirmar el correo no hay sesión todavía: lo avisamos en el login
  if (!data.session) {
    req.flash('success', 'Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.');
  } else {
    req.flash('success', 'Cuenta creada. Ya puedes iniciar sesión.');
  }
  res.redirect('/login');
}

// ===================== RECUPERAR CONTRASEÑA =====================

// GET /forgot-password: formulario para pedir el enlace
function mostrarOlvido(req, res) {
  res.render('forgot-password', { error: null, exito: null, correo: '' });
}

// POST /forgot-password: Supabase envía un correo con el enlace para crear una contraseña nueva
async function handleOlvido(req, res) {
  const correo = (req.body.correo || '').trim().toLowerCase();

  if (!FORMATO_CORREO.test(correo)) {
    return res.status(400).render('forgot-password', { error: 'Ingresa un correo válido.', exito: null, correo });
  }

  const { error } = await crearClienteAuth().auth.resetPasswordForEmail(correo, {
    redirectTo: `${urlBase(req)}/reset-password`
  });

  if (error && error.status === 429) {
    return res.status(429).render('forgot-password', {
      error: 'Ya enviamos un enlace hace poco. Espera un momento y vuelve a intentarlo.', exito: null, correo
    });
  }
  if (error) console.error('Error en resetPasswordForEmail:', error.message);

  // El mensaje es el mismo exista o no la cuenta, para no revelar qué correos están registrados
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

// POST /logout: cierra la sesión.
// Con siguiente=login va al login (ej. "¿Ya tienes cuenta?" del onboarding para cambiar de cuenta)
function logout(req, res) {
  const destino = req.body && req.body.siguiente === 'login' ? '/login' : '/';
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect(destino);
  });
}

module.exports = {
  mostrarLogin, handleLogin,
  mostrarRegistro, handleRegister,
  mostrarOlvido, handleOlvido, mostrarReset, handleReset,
  logout,
  fechaNacimientoValida
};
