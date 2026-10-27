const express = require('express');
const router = express.Router();
module.exports = router
const {verificarToken} = require('../middleware/token');
const {listarCiudad, listarDepartamento} = require('../controladores/ciudadControlador')
router.get('/listarDep', verificarToken, listarDepartamento)
router.get('/listarCiudad',listarCiudad);