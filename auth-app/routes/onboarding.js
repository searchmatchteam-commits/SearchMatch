// Rutas del onboarding (elegir rol + perfil de jugador): requieren sesión
const express = require('express');
const { requiereSesion } = require('../middlewares/auth');
const onboarding = require('../controllers/onboardingController');

const router = express.Router();

router.get('/onboarding', requiereSesion, onboarding.mostrarOnboarding);
router.post('/onboarding', requiereSesion, onboarding.guardarOnboarding);

module.exports = router;
