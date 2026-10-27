const express = require("express");
const router = express.Router();
const { verificarToken } = require("../middleware/token");
const upload = require("../middleware/uploadArchivo");
const {
  subirArchivo,
  descargarArchivo,
  listarArchivos,
  modificarArchivoCaso,
} = require("../controladores/archivoControlador");

// POST: subir archivo (para nuevo caso)
router.post("/subirArchivo", verificarToken, upload.single("archivo"), subirArchivo);

// GET: listar archivos
router.get("/listarArchivos", verificarToken, listarArchivos);

// GET: descargar archivo por nombre
router.get("/descargarArchivo/:nombre", verificarToken, descargarArchivo);

// PUT: reemplazar archivo de un caso específico
router.put("/modificarArchivoCaso/:id", verificarToken, upload.single("archivo"), modificarArchivoCaso);

module.exports = router;