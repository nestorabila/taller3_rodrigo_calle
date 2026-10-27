const { db } = require("../config/database");
const { Op } = require("sequelize");

const listarCaso = async (req, res) => {
  try {
    const lista = await db.caso.findAll({
      include: [
        { model: db.tipo },
        { model: db.persona },
        
      ],
       order: [['idcaso', 'DESC']],  // 👈 los más nuevos primero
      limit: 4, 
    });
    res.json(lista);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al listar casos" });
  }
};

const registrarCaso = async (req, res) => {
  try {
    req.body.idpersona = req.body.persona?.idpersona;
    req.body.idtipo = req.body.tipo?.idtipo;
    const caso = await db.caso.create(req.body);
    res.status(201).json(caso);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al registrar caso" });
  }
};

const modificarCaso = async (req, res) => {
  try {
    req.body.idpersona = req.body.persona?.idpersona;
    req.body.idtipo = req.body.tipo?.idtipo;
    await db.caso.update(req.body, {
      where: { idcaso: req.params.id },
    });
    res.json({ mensaje: "Caso modificado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al modificar caso" });
  }
};

const buscarCaso = async (req, res) => {
  try {
    const { filtro = "" } = req.query;
    const lista = await db.caso.findAll({
      where: {
        [Op.or]: [
          { codigo:      { [Op.iLike]: `%${filtro}%` } },
          { denunciante: { [Op.iLike]: `%${filtro}%` } },
          { denunciado:  { [Op.iLike]: `%${filtro}%` } },
        ],
      },
      include: [
        { model: db.tipo },
        { model: db.persona },
      ],
    });
    res.json(lista);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al buscar casos" });
  }
};

const reporteCaso = async (req, res) => {
  try {
    const lista = await db.caso.findAll({
      include: [
        { model: db.tipo },
        { model: db.persona },
      ],
    });
    res.json(lista);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al generar reporte de casos" });
  }
};

// PUT: Cambiar estado de caso (necesario para IA y también útil como endpoint)
const cambiarEstadoCaso = async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  try {
    const nuevoEstado = estado === 0 ? 1 : 0;
    await db.caso.update({ estado: nuevoEstado }, { where: { idcaso: id } });
    res.status(200).json({ mensaje: "Estado actualizado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al cambiar estado" });
  }
};

// ── Función usada por IA ─────────────────────────────────
const obtenerCasosIA = async () => {
  return await db.caso.findAll({
    include: [
      { model: db.tipo },
      { model: db.persona },
    ],
  });
};

// ── Helpers IA ───────────────────────────────────────────

// Normaliza para comparar sin acentos / mayúsculas / espacios
const norm = (s = "") =>
  s.toString().trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Columnas editables = TODAS menos idcaso (la PK)
const CAMPOS_EDITABLES = [
  "codigo",
  "denunciante",
  "denunciado",
  "idpersona",
  "idtipo",
  "archivo",
  "fecha",
  "hora",
  "estado"
];

// Deja solo columnas reales y descarta vacíos / *_actual
const limpiarDatos = (datos) => {
  const limpio = {};
  for (const campo of CAMPOS_EDITABLES) {
    const v = datos[campo];
    if (v !== undefined && v !== null && v !== "") limpio[campo] = v;
  }
  return limpio;
};

// Traduce codigo / denunciante / denunciado → idcaso usando la lista real de la BD
const resolverIdCaso = (datos, casos) => {
  // 1) Si la IA ya mandó un idcaso válido, úsalo
  const idIA = datos.idcaso ?? datos.id;
  if (idIA && casos.some(c => c.idcaso == idIA)) return idIA;

  // 2) Buscar por código exacto (identificador natural del caso)
  const codigoBuscado = norm(datos.codigo_actual || datos.codigo);
  if (codigoBuscado) {
    const porCodigo = casos.filter(c => norm(c.codigo) === codigoBuscado);
    if (porCodigo.length === 1) return porCodigo[0].idcaso;
    if (porCodigo.length > 1) return null; // ambigüedad
  }

  // 3) Si no, buscar por denunciante/denunciado (tokens)
  const buscado = norm(
    [datos.denunciante_actual || datos.denunciante,
     datos.denunciado_actual  || datos.denunciado]
    .filter(Boolean).join(" ")
  );
  if (!buscado) return null;

  const tokens = buscado.split(/\s+/);
  const candidatos = casos.filter(c => {
    const completo = norm(`${c.codigo} ${c.denunciante} ${c.denunciado}`);
    return tokens.every(t => completo.includes(t));
  });

  // Solo si hay UNA coincidencia (evita modificar al equivocado)
  return candidatos.length === 1 ? candidatos[0].idcaso : null;
};

const ejecutarAccionIA = async (accion, datos = {}) => {
  switch (accion) {

    case "consultar":
    case "listar":
      return await obtenerCasosIA();

    case "buscar": {
      const q = datos.codigo || datos.denunciante || datos.denunciado || datos.texto || "";
      return await db.caso.findAll({
        where: {
          [Op.or]: [
            { codigo:      { [Op.iLike]: `%${q}%` } },
            { denunciante: { [Op.iLike]: `%${q}%` } },
            { denunciado:  { [Op.iLike]: `%${q}%` } },
          ]
        },
        include: [
          { model: db.tipo },
          { model: db.persona },
        ]
      });
    }

    case "detalle": {
      const casos = await obtenerCasosIA();
      const idcaso = resolverIdCaso(datos, casos);
      if (!idcaso)
        return { error: "No identifiqué el caso. Dame el código o el nombre completo del denunciante/denunciado." };

      return await db.caso.findOne({
        where: { idcaso },
        include: [
          { model: db.tipo },
          { model: db.persona },
        ]
      });
    }

    case "registrar": {
      // Validar campos obligatorios según el modelo
      const cambios = limpiarDatos(datos);
      const obligatorios = ["codigo", "denunciante", "denunciado", "idpersona", "idtipo", "fecha", "hora"];
      const faltantes = obligatorios.filter(c => !cambios[c]);
      if (faltantes.length > 0)
        return { error: `Faltan datos obligatorios: ${faltantes.join(", ")}.` };

      return await db.caso.create(cambios);
    }

    case "modificar": {
      const casos = await obtenerCasosIA();
      const idcaso = resolverIdCaso(datos, casos);
      if (!idcaso)
        return { error: "No encontré el caso a modificar (código ambiguo o inexistente)." };

      const cambios = limpiarDatos(datos);   // solo columnas reales, sin idcaso
      if (Object.keys(cambios).length === 0)
        return { error: "No indicaste ningún dato a modificar." };

      await db.caso.update(cambios, { where: { idcaso } });
      return { mensaje: "Caso modificado", idcaso, cambios };
    }

    case "cambiarEstado": {
      const casos = await obtenerCasosIA();
      const idcaso = resolverIdCaso(datos, casos);
      if (!idcaso)
        return { error: "No encontré el caso para cambiar su estado." };

      await db.caso.update(
        { estado: datos.estado },
        { where: { idcaso } }
      );
      return { mensaje: "Estado actualizado", idcaso, estado: datos.estado };
    }

    default:
      return { error: `Acción IA no soportada: ${accion}` };
  }
};

module.exports = {
  listarCaso,
  registrarCaso,
  modificarCaso,
  buscarCaso,
  reporteCaso,
  cambiarEstadoCaso,
  obtenerCasosIA,
  ejecutarAccionIA,
};