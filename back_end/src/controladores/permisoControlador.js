const { db } = require("../config/database");
const { Op } = require("sequelize");

const sequelize = db.permiso.sequelize;

/* ============================================================
   CRUD normal (lo que ya tenías, sin cambios)
   ============================================================ */

const listarPermiso = async (req, res) => {
  try {
    const lista = await db.permiso.findAll({ order: [["codigo", "ASC"]] });
    res.json(lista);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al listar permisos" });
  }
};

const permisosRol = async (req, res) => {
  try {
    const idrol = req.params.id;
    const [rows] = await sequelize.query(
      `SELECT p.idpermiso, p.codigo
         FROM permiso p
         JOIN rol_permiso rp ON rp.idpermiso = p.idpermiso
        WHERE rp.idrol = :idrol
        ORDER BY p.codigo`,
      { replacements: { idrol } }
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al obtener permisos del rol" });
  }
};

const guardarPermisosRol = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const idrol = req.params.id;
    const { permisos = [] } = req.body;

    await db.rol_permiso.destroy({ where: { idrol }, transaction: t });
    if (permisos.length > 0) {
      await db.rol_permiso.bulkCreate(
        permisos.map((idpermiso) => ({ idrol, idpermiso })),
        { transaction: t }
      );
    }
    await t.commit();
    res.json({ mensaje: "Permisos del rol guardados" });
  } catch (error) {
    await t.rollback();
    console.error(error);
    res.status(500).json({ mensaje: "Error al guardar permisos del rol" });
  }
};

const permisosDeRolDePersona = async (idpersona) => {
  const [rows] = await sequelize.query(
    `SELECT DISTINCT rp.idpermiso
       FROM rol_permiso rp
       JOIN rol_persona rpe ON rpe.idrol = rp.idrol
      WHERE rpe.idpersona = :idpersona`,
    { replacements: { idpersona } }
  );
  return rows.map((r) => r.idpermiso);
};

const permisosPersona = async (req, res) => {
  try {
    const idpersona = req.params.id;

    const delRol = await permisosDeRolDePersona(idpersona);
    const excepciones = await db.persona_permiso.findAll({
      where: { idpersona },
      attributes: ["idpermiso", "tipo"],
    });

    const efectivo = new Set(delRol);
    excepciones.forEach((e) => {
      if (e.tipo === "A") efectivo.add(e.idpermiso);
      if (e.tipo === "D") efectivo.delete(e.idpermiso);
    });

    res.json({ rol: delRol, excepciones, efectivo: [...efectivo] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al obtener permisos de la persona" });
  }
};

const guardarPermisosPersona = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const idpersona = req.params.id;
    const { permisos = [] } = req.body;

    const delRol = await permisosDeRolDePersona(idpersona);
    const marcados = new Set(permisos);
    const rolSet = new Set(delRol);

    const agregados = permisos.filter((id) => !rolSet.has(id)); // 'A'
    const denegados = delRol.filter((id) => !marcados.has(id)); // 'D'

    await db.persona_permiso.destroy({ where: { idpersona }, transaction: t });

    const filas = [
      ...agregados.map((idpermiso) => ({ idpersona, idpermiso, tipo: "A" })),
      ...denegados.map((idpermiso) => ({ idpersona, idpermiso, tipo: "D" })),
    ];
    if (filas.length > 0) {
      await db.persona_permiso.bulkCreate(filas, { transaction: t });
    }

    await t.commit();
    res.json({
      mensaje: "Permisos de la persona guardados",
      agregados: agregados.length,
      denegados: denegados.length,
    });
  } catch (error) {
    await t.rollback();
    console.error(error);
    res.status(500).json({ mensaje: "Error al guardar permisos de la persona" });
  }
};

const misPermisos = async (req, res) => {
  try {
    const idpersona =
      req.usuario?.idpersona ?? req.user?.idpersona ?? req.idpersona;
    if (!idpersona) {
      return res.status(401).json({ mensaje: "Token sin idpersona" });
    }

    const [rows] = await sequelize.query(
      `SELECT codigo FROM (
           SELECT p.codigo, p.idpermiso
             FROM permiso p
             JOIN rol_permiso rp  ON rp.idpermiso = p.idpermiso
             JOIN rol_persona rpe ON rpe.idrol   = rp.idrol
            WHERE rpe.idpersona = :idpersona
           UNION
           SELECT p.codigo, p.idpermiso
             FROM permiso p
             JOIN persona_permiso pp ON pp.idpermiso = p.idpermiso
            WHERE pp.idpersona = :idpersona AND pp.tipo = 'A'
       ) base
       WHERE idpermiso NOT IN (
           SELECT idpermiso FROM persona_permiso
            WHERE idpersona = :idpersona AND tipo = 'D'
       )
       ORDER BY codigo`,
      { replacements: { idpersona } }
    );
    res.json(rows.map((r) => r.codigo));
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al obtener mis permisos" });
  }
};

/* ============================================================
   Helpers IA para PERMISOS
   ============================================================ */

const ROL_PROTEGIDO = 1; // Administrador: no se le tocan los permisos por IA

const norm = (s = "") =>
  s
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/* --- Contexto para el systemPrompt --- */
const obtenerCatalogoPermisosIA = async () => {
  const lista = await db.permiso.findAll({
    order: [["codigo", "ASC"]],
    attributes: ["idpermiso", "codigo"],
  });
  return lista.map((p) => ({ idpermiso: p.idpermiso, codigo: p.codigo }));
};

const obtenerRolesPermisosIA = async () => {
  const roles = await db.rol.findAll({
    order: [["idrol", "ASC"]],
    attributes: ["idrol", "nombre"],
  });

  const salida = [];
  for (const r of roles) {
    const [rows] = await sequelize.query(
      `SELECT p.codigo
         FROM permiso p
         JOIN rol_permiso rp ON rp.idpermiso = p.idpermiso
        WHERE rp.idrol = :idrol
        ORDER BY p.codigo`,
      { replacements: { idrol: r.idrol } }
    );
    salida.push({
      idrol: r.idrol,
      nombre: r.nombre,
      protegido: r.idrol === ROL_PROTEGIDO,
      permisos: rows.map((x) => x.codigo),
    });
  }
  return salida;
};

const obtenerPersonasPermisosIA = async () => {
  const personas = await db.persona.findAll({
    attributes: ["idpersona", "nombre", "ap_paterno", "ap_materno", "cedula"],
  });

  const salida = [];
  for (const p of personas) {
    const excepciones = await db.persona_permiso.findAll({
      where: { idpersona: p.idpersona },
      include: [{ model: db.permiso, attributes: ["codigo"] }],
    });
    salida.push({
      idpersona: p.idpersona,
      nombre_completo: `${p.nombre} ${p.ap_paterno} ${p.ap_materno || ""}`.trim(),
      cedula: p.cedula,
      excepciones: excepciones.map((e) => ({
        codigo: e.permiso?.codigo,
        tipo: e.tipo, // A = agregado, D = denegado
      })),
    });
  }
  return salida;
};

/* --- Resolver rol --- */
const resolverIdRol = async (datos = {}) => {
  const id = datos.idrol ?? datos.id_rol;
  if (id) {
    const r = await db.rol.findByPk(id);
    if (r) return r.idrol;
  }
  const nombre = datos.rol ?? datos.nombre_rol;
  if (!nombre) return null;

  const roles = await db.rol.findAll();
  const buscado = norm(nombre);
  const exacto = roles.filter((r) => norm(r.nombre) === buscado);
  if (exacto.length === 1) return exacto[0].idrol;
  const parcial = roles.filter((r) => norm(r.nombre).includes(buscado));
  return parcial.length === 1 ? parcial[0].idrol : null;
};

/* --- Resolver persona --- */
const resolverIdPersona = async (datos = {}) => {
  const id = datos.idpersona ?? datos.id_persona;
  if (id) {
    const p = await db.persona.findByPk(id);
    if (p) return p.idpersona;
  }

  if (datos.cedula) {
    const p = await db.persona.findOne({ where: { cedula: datos.cedula } });
    if (p) return p.idpersona;
  }

  const texto =
    datos.persona ??
    [datos.nombre, datos.ap_paterno, datos.ap_materno].filter(Boolean).join(" ");
  if (!texto) return null;

  const buscado = norm(texto);
  const tokens = buscado.split(/\s+/).filter(Boolean);
  const personas = await db.persona.findAll();
  const candidatos = personas.filter((p) => {
    const completo = norm(`${p.nombre} ${p.ap_paterno} ${p.ap_materno || ""}`);
    return tokens.every((t) => completo.includes(t));
  });
  return candidatos.length === 1 ? candidatos[0].idpersona : null;
};

/* --- Expandir códigos con comodines: "casos.*", "*.eliminar", "casos.crear" --- */
const expandirCodigos = async (codigos = []) => {
  const catalogo = await db.permiso.findAll({ attributes: ["idpermiso", "codigo"] });
  const encontrados = new Map();
  const noEncontrados = [];

  const lista = Array.isArray(codigos) ? codigos : [codigos];

  for (const raw of lista) {
    const patron = norm(raw);
    if (!patron) continue;

    let matches;
    if (patron === "*" || patron === "todos") {
      matches = catalogo;
    } else if (patron.includes("*")) {
      const regex = new RegExp("^" + patron.replace(/\*/g, ".*") + "$");
      matches = catalogo.filter((p) => regex.test(norm(p.codigo)));
    } else {
      matches = catalogo.filter((p) => norm(p.codigo) === patron);
    }

    if (matches.length === 0) noEncontrados.push(raw);
    matches.forEach((m) => encontrados.set(m.idpermiso, m.codigo));
  }

  return {
    ids: [...encontrados.keys()],
    codigos: [...encontrados.values()],
    noEncontrados,
  };
};

/* --- Al agregar un permiso hay que asegurar el "ver" del módulo --- */
const asegurarVerDelModulo = async (ids = []) => {
  const catalogo = await db.permiso.findAll({ attributes: ["idpermiso", "codigo"] });
  const porId = new Map(catalogo.map((p) => [p.idpermiso, p.codigo]));
  const porCodigo = new Map(catalogo.map((p) => [norm(p.codigo), p.idpermiso]));

  const set = new Set(ids);
  ids.forEach((id) => {
    const codigo = porId.get(id);
    if (!codigo) return;
    const modulo = codigo.split(".")[0];
    const verId = porCodigo.get(norm(`${modulo}.ver`));
    if (verId) set.add(verId);
  });
  return [...set];
};

const codigosDeIds = async (ids = []) => {
  if (ids.length === 0) return [];
  const lista = await db.permiso.findAll({
    where: { idpermiso: { [Op.in]: ids } },
    attributes: ["codigo"],
    order: [["codigo", "ASC"]],
  });
  return lista.map((p) => p.codigo);
};

const permisosIdsDeRol = async (idrol) => {
  const filas = await db.rol_permiso.findAll({
    where: { idrol },
    attributes: ["idpermiso"],
  });
  return filas.map((f) => f.idpermiso);
};

/* ============================================================
   Ejecutor de acciones IA de permisos
   ============================================================ */
const ejecutarAccionIAPermiso = async (accion, datos = {}) => {
  switch (accion) {
    /* ---------- CATÁLOGO ---------- */
    case "listarPermisos":
      return await obtenerCatalogoPermisosIA();

    /* ---------- VER PERMISOS DE UN ROL ---------- */
    case "permisosRol": {
      const idrol = await resolverIdRol(datos);
      if (!idrol)
        return { error: "No identifiqué el rol. Dame el nombre exacto o el idrol." };

      const rol = await db.rol.findByPk(idrol);
      const ids = await permisosIdsDeRol(idrol);
      return {
        idrol,
        rol: rol.nombre,
        total: ids.length,
        permisos: await codigosDeIds(ids),
      };
    }

    /* ---------- VER PERMISOS DE UNA PERSONA ---------- */
    case "permisosPersona": {
      const idpersona = await resolverIdPersona(datos);
      if (!idpersona)
        return { error: "No identifiqué la persona. Dame el nombre completo o la cédula." };

      const persona = await db.persona.findByPk(idpersona);
      const delRol = await permisosDeRolDePersona(idpersona);
      const excepciones = await db.persona_permiso.findAll({
        where: { idpersona },
        include: [{ model: db.permiso, attributes: ["codigo"] }],
      });

      const efectivo = new Set(delRol);
      excepciones.forEach((e) => {
        if (e.tipo === "A") efectivo.add(e.idpermiso);
        if (e.tipo === "D") efectivo.delete(e.idpermiso);
      });

      return {
        idpersona,
        persona: `${persona.nombre} ${persona.ap_paterno}`.trim(),
        heredados_del_rol: await codigosDeIds(delRol),
        agregados: excepciones.filter((e) => e.tipo === "A").map((e) => e.permiso?.codigo),
        denegados: excepciones.filter((e) => e.tipo === "D").map((e) => e.permiso?.codigo),
        efectivo: await codigosDeIds([...efectivo]),
      };
    }

    /* ---------- ROL: AGREGAR PERMISOS ---------- */
    case "agregarPermisosRol": {
      const idrol = await resolverIdRol(datos);
      if (!idrol) return { error: "No identifiqué el rol." };
      if (idrol === ROL_PROTEGIDO)
        return { error: "El rol Administrador está protegido: no se modifican sus permisos." };

      const { ids, codigos, noEncontrados } = await expandirCodigos(datos.codigos);
      if (ids.length === 0)
        return {
          error: `No reconocí ningún permiso válido${
            noEncontrados.length ? ` (no existen: ${noEncontrados.join(", ")})` : ""
          }.`,
        };

      const conVer = await asegurarVerDelModulo(ids);
      const actuales = new Set(await permisosIdsDeRol(idrol));
      const nuevos = conVer.filter((id) => !actuales.has(id));

      if (nuevos.length === 0)
        return { mensaje: "El rol ya tenía todos esos permisos.", idrol, agregados: [] };

      await db.rol_permiso.bulkCreate(
        nuevos.map((idpermiso) => ({ idrol, idpermiso }))
      );

      return {
        mensaje: "Permisos agregados al rol",
        idrol,
        agregados: await codigosDeIds(nuevos),
        solicitados: codigos,
        no_encontrados: noEncontrados,
      };
    }

    /* ---------- ROL: QUITAR PERMISOS ---------- */
    case "quitarPermisosRol": {
      const idrol = await resolverIdRol(datos);
      if (!idrol) return { error: "No identifiqué el rol." };
      if (idrol === ROL_PROTEGIDO)
        return { error: "El rol Administrador está protegido: no se modifican sus permisos." };

      const { ids, noEncontrados } = await expandirCodigos(datos.codigos);
      if (ids.length === 0)
        return {
          error: `No reconocí ningún permiso válido${
            noEncontrados.length ? ` (no existen: ${noEncontrados.join(", ")})` : ""
          }.`,
        };

      const actuales = new Set(await permisosIdsDeRol(idrol));
      const aQuitar = ids.filter((id) => actuales.has(id));
      if (aQuitar.length === 0)
        return { mensaje: "El rol no tenía ninguno de esos permisos.", idrol, quitados: [] };

      const quitados = await codigosDeIds(aQuitar);
      await db.rol_permiso.destroy({
        where: { idrol, idpermiso: { [Op.in]: aQuitar } },
      });

      return { mensaje: "Permisos quitados del rol", idrol, quitados };
    }

    /* ---------- ROL: REEMPLAZAR TODOS LOS PERMISOS ---------- */
    case "reemplazarPermisosRol": {
      const idrol = await resolverIdRol(datos);
      if (!idrol) return { error: "No identifiqué el rol." };
      if (idrol === ROL_PROTEGIDO)
        return { error: "El rol Administrador está protegido: no se modifican sus permisos." };

      const { ids, noEncontrados } = await expandirCodigos(datos.codigos);
      const finales = ids.length > 0 ? await asegurarVerDelModulo(ids) : [];

      const t = await sequelize.transaction();
      try {
        await db.rol_permiso.destroy({ where: { idrol }, transaction: t });
        if (finales.length > 0) {
          await db.rol_permiso.bulkCreate(
            finales.map((idpermiso) => ({ idrol, idpermiso })),
            { transaction: t }
          );
        }
        await t.commit();
      } catch (e) {
        await t.rollback();
        throw e;
      }

      return {
        mensaje: "Permisos del rol reemplazados",
        idrol,
        permisos: await codigosDeIds(finales),
        no_encontrados: noEncontrados,
      };
    }

    /* ---------- ROL: COPIAR PERMISOS DE OTRO ROL ---------- */
    case "copiarPermisosRol": {
      const idOrigen = await resolverIdRol({
        idrol: datos.idrol_origen,
        rol: datos.rol_origen,
      });
      const idDestino = await resolverIdRol({
        idrol: datos.idrol_destino,
        rol: datos.rol_destino,
      });

      if (!idOrigen) return { error: "No identifiqué el rol de origen." };
      if (!idDestino) return { error: "No identifiqué el rol de destino." };
      if (idOrigen === idDestino)
        return { error: "El rol de origen y el de destino son el mismo." };
      if (idDestino === ROL_PROTEGIDO)
        return { error: "El rol Administrador está protegido: no se modifican sus permisos." };

      const ids = await permisosIdsDeRol(idOrigen);

      const t = await sequelize.transaction();
      try {
        await db.rol_permiso.destroy({ where: { idrol: idDestino }, transaction: t });
        if (ids.length > 0) {
          await db.rol_permiso.bulkCreate(
            ids.map((idpermiso) => ({ idrol: idDestino, idpermiso })),
            { transaction: t }
          );
        }
        await t.commit();
      } catch (e) {
        await t.rollback();
        throw e;
      }

      return {
        mensaje: "Permisos copiados",
        idrol_origen: idOrigen,
        idrol_destino: idDestino,
        permisos: await codigosDeIds(ids),
      };
    }

    /* ---------- PERSONA: AGREGAR EXCEPCIÓN (tipo A) ---------- */
    case "agregarPermisosPersona": {
      const idpersona = await resolverIdPersona(datos);
      if (!idpersona)
        return { error: "No identifiqué la persona. Dame el nombre completo o la cédula." };

      const { ids, noEncontrados } = await expandirCodigos(datos.codigos);
      if (ids.length === 0)
        return {
          error: `No reconocí ningún permiso válido${
            noEncontrados.length ? ` (no existen: ${noEncontrados.join(", ")})` : ""
          }.`,
        };

      const conVer = await asegurarVerDelModulo(ids);
      const delRol = new Set(await permisosDeRolDePersona(idpersona));

      // borrar posibles denegaciones previas de esos permisos
      await db.persona_permiso.destroy({
        where: { idpersona, idpermiso: { [Op.in]: conVer } },
      });

      // solo se guarda como excepción 'A' lo que NO viene del rol
      const aAgregar = conVer.filter((id) => !delRol.has(id));
      if (aAgregar.length > 0) {
        await db.persona_permiso.bulkCreate(
          aAgregar.map((idpermiso) => ({ idpersona, idpermiso, tipo: "A" }))
        );
      }

      return {
        mensaje: "Permisos concedidos a la persona",
        idpersona,
        concedidos: await codigosDeIds(conVer),
        no_encontrados: noEncontrados,
      };
    }

    /* ---------- PERSONA: DENEGAR (tipo D) ---------- */
    case "quitarPermisosPersona": {
      const idpersona = await resolverIdPersona(datos);
      if (!idpersona)
        return { error: "No identifiqué la persona. Dame el nombre completo o la cédula." };

      const { ids, noEncontrados } = await expandirCodigos(datos.codigos);
      if (ids.length === 0)
        return {
          error: `No reconocí ningún permiso válido${
            noEncontrados.length ? ` (no existen: ${noEncontrados.join(", ")})` : ""
          }.`,
        };

      const delRol = new Set(await permisosDeRolDePersona(idpersona));

      // limpiar excepciones previas de esos permisos
      await db.persona_permiso.destroy({
        where: { idpersona, idpermiso: { [Op.in]: ids } },
      });

      // solo se deniega ('D') lo que el rol sí le da; lo demás simplemente queda sin 'A'
      const aDenegar = ids.filter((id) => delRol.has(id));
      if (aDenegar.length > 0) {
        await db.persona_permiso.bulkCreate(
          aDenegar.map((idpermiso) => ({ idpersona, idpermiso, tipo: "D" }))
        );
      }

      return {
        mensaje: "Permisos retirados a la persona",
        idpersona,
        retirados: await codigosDeIds(ids),
        no_encontrados: noEncontrados,
      };
    }

    /* ---------- PERSONA: VOLVER A LOS PERMISOS DEL ROL ---------- */
    case "resetPermisosPersona": {
      const idpersona = await resolverIdPersona(datos);
      if (!idpersona)
        return { error: "No identifiqué la persona. Dame el nombre completo o la cédula." };

      const borradas = await db.persona_permiso.destroy({ where: { idpersona } });
      return {
        mensaje: "Excepciones eliminadas. La persona vuelve a los permisos de su rol.",
        idpersona,
        excepciones_eliminadas: borradas,
      };
    }

    default:
      return { error: `Acción IA de permiso no soportada: ${accion}` };
  }
};

module.exports = {
  listarPermiso,
  permisosRol,
  guardarPermisosRol,
  permisosPersona,
  guardarPermisosPersona,
  misPermisos,
  // IA
  obtenerCatalogoPermisosIA,
  obtenerRolesPermisosIA,
  obtenerPersonasPermisosIA,
  ejecutarAccionIAPermiso,
};