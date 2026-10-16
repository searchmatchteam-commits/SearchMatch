const express = require('express');
const auth = require('../controllers/authController');
const { soloInvitados } = require('../middlewares/auth');

const router = express.Router();

router.get('/login', soloInvitados, auth.mostrarLogin);
router.post('/login', soloInvitados, auth.handleLogin);
router.get('/register', soloInvitados, auth.mostrarRegistro);
router.post('/register', soloInvitados, auth.handleRegister);
router.get('/forgot-password', soloInvitados, auth.mostrarOlvido);
router.post('/forgot-password', soloInvitados, auth.handleOlvido);
// Sin soloInvitados: el enlace del correo debe funcionar aunque haya una sesión abierta
router.get('/reset-password', auth.mostrarReset);
router.post('/reset-password', auth.handleReset);
router.post('/logout', auth.logout);

// Páginas legales (enlazadas desde el registro)
router.get('/terminos', (req, res) => res.render('legal', { tipo: 'terminos' }));
router.get('/privacidad', (req, res) => res.render('legal', { tipo: 'privacidad' }));

module.exports = router;
