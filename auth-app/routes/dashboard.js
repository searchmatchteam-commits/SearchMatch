// Rutas del panel principal (etapa 2)
// Se monta en /users, por eso queda en /users/dashboard,
// que es la dirección que ya usan los botones de la portada.
const express = require('express');
const { requiereSesion, requierePerfil } = require('../middlewares/auth');
const dashboard = require('../controllers/dashboardController');
const { mostrarEntrar } = require('../controllers/authController');

const router = express.Router();

// Solo usuarios con sesión (si no, manda al login) y con el onboarding completo
router.get('/dashboard', requiereSesion, requierePerfil, dashboard.mostrarDashboard);

// Después del login: elegir entrar como jugador o como equipo
router.get('/entrar', requiereSesion, requierePerfil, mostrarEntrar);

module.exports = router;
