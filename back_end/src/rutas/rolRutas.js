const express = require("express");
const router = express.Router();

const { verificarToken } = require("../middleware/token");

const {
  listarRol,
  registrarRol,
  modificarRol,
  buscarRol,
} = require("../controladores/rolControlador");

router.get("/listarRol", verificarToken, listarRol);
router.get("/buscarRol", verificarToken, buscarRol);
router.post("/registrarRol", verificarToken, registrarRol);
router.put("/modificarRol/:id", verificarToken, modificarRol);

module.exports = router;