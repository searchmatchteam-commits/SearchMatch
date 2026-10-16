// Rutas del panel principal (etapa 2)
// Se monta en /users, por eso queda en /users/dashboard,
// que es la dirección que ya usan los botones de la portada.
const express = require('express');
const { requiereSesion } = require('../middlewares/auth');
const dashboard = require('../controllers/dashboardController');

const router = express.Router();

// Solo usuarios con sesión (si no, manda al login)
router.get('/dashboard', requiereSesion, dashboard.mostrarDashboard);

module.exports = router;
