const express = require("express");
const router = express.Router();
const { verificarToken } = require("../middleware/token");
const {
  listarPermiso,
  permisosRol,
  guardarPermisosRol,
  permisosPersona,
  guardarPermisosPersona,
  misPermisos,
} = require("../controladores/permisoControlador");

router.get("/listarPermiso", verificarToken, listarPermiso);
router.get("/permisosRol/:id", verificarToken, permisosRol);
router.post("/guardarPermisosRol/:id", verificarToken, guardarPermisosRol);
router.get("/permisosPersona/:id", verificarToken, permisosPersona);
router.post("/guardarPermisosPersona/:id", verificarToken, guardarPermisosPersona);
router.get("/misPermisos", verificarToken, misPermisos);

module.exports = router;