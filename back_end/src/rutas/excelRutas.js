const express = require("express");

const router = express.Router();

const { verificarToken } = require("../middleware/token");

const { chatExcel } = require("../controladores/excelControlador");

// IA de georreferenciación: pega la sábana + prompt corto → tabla estructurada
router.post("/chatExcel", verificarToken, chatExcel);

module.exports = router;