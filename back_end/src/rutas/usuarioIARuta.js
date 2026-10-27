const express = require("express");

const router = express.Router();

const { verificarToken } = require("../middleware/token");

const {chatUsuario} = require("../controladores/usuarioIAControlador");
const { chatCaso } = require("../controladores/casoIAControlador");
const { chatRol } = require("../controladores/rolIAControlador");
const { chatPermiso } = require("../controladores/permisoIAControlador");
 
router.post("/chatUsuario",verificarToken,chatUsuario);
router.post("/chatCaso", verificarToken, chatCaso);
router.post("/chatRol", verificarToken, chatRol);
router.post("/chatPermiso", verificarToken, chatPermiso);


module.exports = router;