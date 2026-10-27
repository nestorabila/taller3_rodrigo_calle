const db = require('../config/database');
const express = require('express');
const { loguear } = require('../controladores/IniciarSesionControlador');
const router = express.Router();

router.post('/login', loguear); 


module.exports = router;