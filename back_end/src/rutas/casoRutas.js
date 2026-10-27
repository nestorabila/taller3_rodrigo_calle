const express = require("express");
const router = express.Router();

const { verificarToken } = require("../middleware/token");

const {
  listarCaso,
  registrarCaso,
  modificarCaso,
  buscarCaso,
  reporteCaso,
} = require("../controladores/casoControlador");

router.get("/listarCaso", verificarToken, listarCaso);
router.get("/buscarCaso", verificarToken, buscarCaso);
router.get("/reporteCaso", verificarToken, reporteCaso);
router.post("/registrarCaso", verificarToken, registrarCaso);
router.put("/modificarCaso/:id", verificarToken, modificarCaso);

module.exports = router;