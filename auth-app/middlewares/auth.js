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

module.exports = { soloInvitados, requiereSesion };
