const express = require("express");

const router = express.Router();

const { verificarToken } = require("../middleware/token");

const {
  listarCasosAnalisis,
  analizarCaso,
  diagnosticoArchivos,
} = require("../controladores/analisisControlador");

const { analizarCasoDatos } = require("../controladores/analisisDatosContralador");

// Casos que tienen un Excel adjunto (sirve para ambos mapas)
router.get("/listarCasosAnalisis", verificarToken, listarCasosAnalisis);

// ── Tráfico de llamadas y SMS ──
router.get("/analizarCaso/:idcaso", verificarToken, analizarCaso);

// ── Tráfico de datos móviles ──
router.get("/analizarCasoDatos/:idcaso", verificarToken, analizarCasoDatos);

// Utilidad temporal para verificar dónde quedó guardado el archivo
router.get("/diagnosticoArchivos", verificarToken, diagnosticoArchivos);

module.exports = router;