// Rutas del onboarding (elegir rol + perfil de jugador): requieren sesión
const express = require('express');
const { requiereSesion } = require('../middlewares/auth');
const onboarding = require('../controllers/onboardingController');
const equipo = require('../controllers/equipoController');

const router = express.Router();

router.get('/onboarding', requiereSesion, onboarding.mostrarOnboarding);
router.post('/onboarding', requiereSesion, onboarding.guardarOnboarding);

// Registro de equipo: crear (o editar) y subir el escudo (archivo binario, hasta 1 MB)
const leerImagen = express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '1mb' });
router.post('/onboarding/equipo', requiereSesion, equipo.guardarEquipo);
router.post('/onboarding/equipo/:id/escudo', requiereSesion, leerImagen, equipo.subirEscudo);

module.exports = router;
