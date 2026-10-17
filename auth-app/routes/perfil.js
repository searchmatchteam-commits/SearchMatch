// Rutas del perfil del jugador (se montan en /users): requieren sesión y onboarding completo
const express = require('express');
const { requiereSesion, requierePerfil } = require('../middlewares/auth');
const perfil = require('../controllers/perfilController');

const router = express.Router();

// La foto llega como archivo binario (no como formulario), hasta 3 MB
const leerImagen = express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '3mb' });

router.get('/perfil', requiereSesion, requierePerfil, perfil.mostrarPerfil);
router.post('/perfil', requiereSesion, requierePerfil, perfil.editarPerfil);
router.post('/perfil/foto', requiereSesion, requierePerfil, leerImagen, perfil.subirFoto);
// Carta de otro jugador (enlace de "Compartir carta"): visible para cualquier usuario con sesión
router.get('/carta/:id', requiereSesion, perfil.mostrarCarta);

module.exports = router;
