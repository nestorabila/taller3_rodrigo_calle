const express = require('express');
const router = express.Router();

const {verificarToken} = require('../middleware/token')
const {listarCredencial, modificarCredencial, registrarCredencial} = require('../controladores/credencialControlador')
router.get('/listarCredencial',verificarToken, listarCredencial )
router.post('/registrarCredencial',registrarCredencial);
router.put('/modificarCredencial/:id', verificarToken, modificarCredencial);
module.exports = router