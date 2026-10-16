const { tienePerfil } = require('../controllers/onboardingController');

// Solo deja pasar a usuarios sin sesión (ej. /login): si ya entró, va al inicio
function soloInvitados(req, res, next) {
  if (req.session.user) return res.redirect('/');
  next();
}

// Protege rutas privadas: sin sesión, manda al login
function requiereSesion(req, res, next) {
  if (!req.session.user) {
    req.flash('error', 'Inicia sesión para continuar.');
    return res.redirect('/login');
  }
  next();
}

// El panel exige haber completado el onboarding (perfil de jugador).
// Se recuerda en la sesión para no consultar la base de datos en cada visita
async function requierePerfil(req, res, next) {
  if (req.session.user.perfilCompleto) return next();

  const tiene = await tienePerfil(req.session.user.id);

  // null = la consulta falló: no bloqueamos el panel por un problema de conexión
  if (tiene === false) return res.redirect('/onboarding');
  if (tiene) req.session.user.perfilCompleto = true;
  next();
}

module.exports = { soloInvitados, requiereSesion, requierePerfil };
