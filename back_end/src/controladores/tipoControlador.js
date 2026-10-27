const { db } = require("../config/database");
const { Op } = require("sequelize");

const listarTipo = async (req, res) => {
  try {
    const lista = await db.tipo.findAll();
    res.json(lista);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al listar tipos" });
  }
};

const registrarTipo = async (req, res) => {
  try {
    const tipo = await db.tipo.create(req.body);
    res.status(201).json(tipo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al registrar tipo" });
  }
};

const modificarTipo = async (req, res) => {
  try {
    await db.tipo.update(req.body, {
      where: { idtipo: req.params.id },
    });

    res.json({ mensaje: "Tipo modificado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al modificar tipo" });
  }
};

const buscarTipo = async (req, res) => {
  try {
    const { filtro = "" } = req.query;

    const lista = await db.tipo.findAll({
      where: {
        nombre: {
          [Op.iLike]: `%${filtro}%`,
        },
      },
    });

    res.json(lista);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al buscar tipos" });
  }
};

const reporteTipo = async (req, res) => {
  try {
    const lista = await db.tipo.findAll();
    res.json(lista);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al generar reporte de tipos" });
  }
};

module.exports = {
  listarTipo,
  registrarTipo,
  modificarTipo,
  buscarTipo,
  reporteTipo,
};