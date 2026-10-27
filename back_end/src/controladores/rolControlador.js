const { db } = require("../config/database");
const { Op } = require("sequelize");

/* ============================================================
   CRUD normal (lo que ya tenías, sin cambios)
   ============================================================ */

const listarRol = async (req, res) => {
  try {
    const lista = await db.rol.findAll({
      order: [["idrol", "DESC"]],
      limit: 4,
    });
    res.json(lista);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al listar roles" });
  }
};

const registrarRol = async (req, res) => {
  try {
    const rol = await db.rol.create(req.body);
    res.status(201).json(rol);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al registrar rol" });
  }
};

const modificarRol = async (req, res) => {
  try {
    await db.rol.update(req.body, { where: { idrol: req.params.id } });
    res.json({ mensaje: "Rol modificado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al modificar rol" });
  }
};

const buscarRol = async (req, res) => {
  try {
    const { filtro = "" } = req.query;
    const lista = await db.rol.findAll({
      where: {
        idrol: { [Op.notIn]: [1] },
        nombre: { [Op.iLike]: `%${filtro}%` },
      },
    });
    res.json(lista);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al buscar roles" });
  }
};

const eliminarRol = async (req, res) => {
  try {
    const { id } = req.params;

    const existeRelacion = await db.rol_persona.findOne({ where: { idrol: id } });
    if (existeRelacion) {
      return res.status(400).json({
        mensaje:
          "No se puede eliminar el rol porque está asignado a una o más personas.",
      });
    }

    const eliminado = await db.rol.destroy({ where: { idrol: id } });
    if (!eliminado) {
      return res.status(404).json({ mensaje: "Rol no encontrado." });
    }

    res.json({ mensaje: "Rol eliminado correctamente." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al eliminar el rol." });
  }
};

/* ============================================================
   Helpers IA para ROL
   ============================================================ */

const ROL_PROTEGIDO = 1; // Administrador: no se modifica ni se elimina por IA

const norm = (s = "") =>
  s
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/* Contexto que se le manda a Gemini en el systemPrompt */
const obtenerRolesIA = async () => {
  const roles = await db.rol.findAll({
    order: [["idrol", "ASC"]],
    attributes: ["idrol", "nombre"],
  });

  // Cuántas personas tiene cada rol (para que la IA sepa si se puede eliminar)
  const salida = [];
  for (const r of roles) {
    const personas = await db.rol_persona.count({ where: { idrol: r.idrol } });
    salida.push({
      idrol: r.idrol,
      nombre: r.nombre,
      personas_asignadas: personas,
      protegido: r.idrol === ROL_PROTEGIDO,
    });
  }
  return salida;
};

/* Resuelve el idrol a partir de idrol o nombre */
const resolverIdRolDesdeDatos = async (datos = {}, campo = "idrol") => {
  const idIA = datos[campo] ?? datos.id;
  if (idIA) {
    const existe = await db.rol.findByPk(idIA);
    if (existe) return existe.idrol;
  }

  const nombreBuscado = datos[campo === "idrol" ? "nombre" : campo];
  if (!nombreBuscado) return null;

  const buscado = norm(nombreBuscado);
  const roles = await db.rol.findAll();

  // 1) coincidencia exacta
  const exacto = roles.filter((r) => norm(r.nombre) === buscado);
  if (exacto.length === 1) return exacto[0].idrol;

  // 2) coincidencia parcial única
  const parcial = roles.filter((r) => norm(r.nombre).includes(buscado));
  return parcial.length === 1 ? parcial[0].idrol : null;
};

const ejecutarAccionIARol = async (accion, datos = {}) => {
  switch (accion) {
    /* ---------- CONSULTAR / LISTAR ---------- */
    case "consultar":
    case "listar":
      return await obtenerRolesIA();

    /* ---------- BUSCAR ---------- */
    case "buscar": {
      const filtro = datos.filtro ?? datos.nombre ?? "";
      const lista = await db.rol.findAll({
        where: {
          idrol: { [Op.notIn]: [ROL_PROTEGIDO] },
          nombre: { [Op.iLike]: `%${filtro}%` },
        },
        attributes: ["idrol", "nombre"],
      });
      if (lista.length === 0)
        return { error: `No encontré ningún rol que coincida con "${filtro}".` };
      return lista;
    }

    /* ---------- DETALLE ---------- */
    case "detalle": {
      const idrol = await resolverIdRolDesdeDatos(datos);
      if (!idrol)
        return { error: "No identifiqué el rol. Dame el nombre exacto o el idrol." };

      const rol = await db.rol.findByPk(idrol, { attributes: ["idrol", "nombre"] });
      const personas = await db.rol_persona.count({ where: { idrol } });
      const permisos = await db.rol_permiso.count({ where: { idrol } });

      return {
        idrol: rol.idrol,
        nombre: rol.nombre,
        personas_asignadas: personas,
        permisos_asignados: permisos,
        protegido: idrol === ROL_PROTEGIDO,
      };
    }

    /* ---------- REGISTRAR ---------- */
    case "registrar": {
      const nombre = (datos.nombre || "").trim();
      if (!nombre) return { error: "Falta el nombre del rol." };
      if (nombre.length < 3)
        return { error: "El nombre del rol debe tener al menos 3 caracteres." };

      const roles = await db.rol.findAll();
      const repetido = roles.some((r) => norm(r.nombre) === norm(nombre));
      if (repetido)
        return { error: `El rol "${nombre}" ya existe. Elige otro nombre.` };

      const rol = await db.rol.create({ nombre });
      return { mensaje: "Rol registrado", idrol: rol.idrol, nombre: rol.nombre };
    }

    /* ---------- MODIFICAR ---------- */
    case "modificar": {
      const idrol = await resolverIdRolDesdeDatos(datos);
      if (!idrol)
        return { error: "No identifiqué el rol a modificar. Dame el nombre exacto o el idrol." };
      if (idrol === ROL_PROTEGIDO)
        return { error: "El rol Administrador está protegido y no se puede modificar." };

      const nuevoNombre = (datos.nombre_nuevo || datos.nuevo_nombre || datos.nombre || "").trim();
      if (!nuevoNombre) return { error: "No indicaste el nuevo nombre del rol." };

      const roles = await db.rol.findAll();
      const repetido = roles.some(
        (r) => norm(r.nombre) === norm(nuevoNombre) && r.idrol !== idrol
      );
      if (repetido)
        return { error: `Ya existe otro rol llamado "${nuevoNombre}".` };

      await db.rol.update({ nombre: nuevoNombre }, { where: { idrol } });
      return { mensaje: "Rol modificado", idrol, nombre: nuevoNombre };
    }

    /* ---------- ELIMINAR ---------- */
    case "eliminar": {
      const idrol = await resolverIdRolDesdeDatos(datos);
      if (!idrol)
        return { error: "No identifiqué el rol a eliminar. Dame el nombre exacto o el idrol." };
      if (idrol === ROL_PROTEGIDO)
        return { error: "El rol Administrador está protegido y no se puede eliminar." };

      const enUso = await db.rol_persona.count({ where: { idrol } });
      if (enUso > 0)
        return {
          error: `No se puede eliminar: el rol está asignado a ${enUso} persona(s). Primero reasigna esas personas.`,
        };

      // limpiar permisos del rol antes de borrarlo
      await db.rol_permiso.destroy({ where: { idrol } });
      const eliminado = await db.rol.destroy({ where: { idrol } });
      if (!eliminado) return { error: "Rol no encontrado." };

      return { mensaje: "Rol eliminado correctamente", idrol };
    }

    default:
      return { error: `Acción IA de rol no soportada: ${accion}` };
  }
};

module.exports = {
  listarRol,
  registrarRol,
  modificarRol,
  buscarRol,
  eliminarRol,
  // IA
  obtenerRolesIA,
  ejecutarAccionIARol,
};