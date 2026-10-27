const express = require('express');
const router = express.Router();
// const upload = require('../uploads/uploadConfigPersona');
const {verificarToken} = require('../middleware/token');
const {listarPersonas, 
    listarPersonasFiltradas,
    registrarPersona,
    listarGenero,
    modificarPersona,
    buscarPersonas, GenerarReportePersona,
    cambiarEstadoPersona,
    GuardarFotografia, verDetallesPersona
} = require('../controladores/personaControlador')
router.get('/listarGenero', listarGenero)
router.get('/listarPersonas',verificarToken, listarPersonas)
router.get('/listarReportePersona',verificarToken,GenerarReportePersona)
router.get('/listarPersonasFiltradas',verificarToken, listarPersonasFiltradas)
router.post('/registrarPersona', registrarPersona);
router.put('/modificarPersona/:id', verificarToken, modificarPersona);
router.get('/buscarPersonas', verificarToken, buscarPersonas);
// router.post('/fotoPersona', upload.single('imagen'), GuardarFotografia);
router.put('/cambiarEstadoPersona/:id', verificarToken, cambiarEstadoPersona);
router.get('/verDetallesPersona/:id', verificarToken, verDetallesPersona);
module.exports = router