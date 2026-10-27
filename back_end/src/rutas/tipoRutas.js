const express = require("express");
const router = express.Router();

const { verificarToken } = require("../middleware/token");

const {
  listarTipo,
  registrarTipo,
  modificarTipo,
  buscarTipo,
  reporteTipo,
} = require("../controladores/tipoControlador");

router.get("/listarTipo", verificarToken, listarTipo);
router.get("/buscarTipo", verificarToken, buscarTipo);
router.get("/reporteTipo", verificarToken, reporteTipo);
router.post("/registrarTipo", verificarToken, registrarTipo);
router.put("/modificarTipo/:id", verificarToken, modificarTipo);

module.exports = router;