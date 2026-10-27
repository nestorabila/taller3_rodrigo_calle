const { db } = require("../config/database");
const { Op } = require('sequelize');

const listarGenero = async (req, res) =>{
    try {
        const lista = await db.genero.findAll({
        })
        return res.json(lista)
    } catch (error) {
        console.log(error);
        
    }
}
const listarPersonas = async (req, res) => {
  try {
    const lista = await db.persona.findAll({
      include: [
          {model: db.genero},
        { model: db.rol, as: 'rol', through: { attributes: [] } }],
         order: [['idpersona', 'DESC']],  
      limit: 3,    
    });

    const listaFormateada = lista.map(p => ({
      ...p.toJSON(),
      rol: p.rol // mantener el array completo de objetos { idrol, nombre }
    }));

    res.json(listaFormateada);
  } catch (error) {
    console.error('Error al listar personas:', error);
    res.status(500).json({ error: 'Error al listar personas' });
  }
};


const GenerarReportePersona = async (req, res) => {
  try {
    const { rol, nombre, estado, fechaDesde, fechaHasta } = req.query;

    const filtros = {
      where: {},
      include: [
         {model: db.genero},
        {
          model: db.rol,
          as: 'rol',            // 👈 importante: alias correcto
          through: { attributes: [] },
          attributes: ['idrol', 'nombre']
        },
        {
          model: db.credencial,
          attributes: ['usuario']
        }
      ]
    };

    // Filtro por rol (idrol)
    if (rol) {
      // buscar el include que corresponde al modelo 'rol' (por seguridad no depender del índice)
      const rolInclude = filtros.include.find(inc => inc.model === db.rol || inc.as === 'rol');
      if (rolInclude) {
        rolInclude.where = { idrol: rol };
      }
    }

    // Filtro por nombre o apellidos
    if (nombre) {
      filtros.where[Op.or] = [
        { nombre: { [Op.iLike]: `%${nombre}%` } },
        { ap_paterno: { [Op.iLike]: `%${nombre}%` } },
        { ap_materno: { [Op.iLike]: `%${nombre}%` } }
      ];
    }

    // Filtro por estado
    if (estado) {
      filtros.where.estado = estado;
    }

    // Filtro por fecha
    if (fechaDesde && fechaHasta) {
      filtros.where.fecha = { [Op.between]: [fechaDesde, fechaHasta] };
    } else if (fechaDesde) {
      filtros.where.fecha = { [Op.gte]: fechaDesde };
    } else if (fechaHasta) {
      filtros.where.fecha = { [Op.lte]: fechaHasta };
    }

    const resultado = await db.persona.findAll(filtros);

    // Formatear para mantener array de roles completo
    const resultadoFormateado = resultado.map(p => ({
      ...p.toJSON(),
      rol: p.rol
    }));

    return res.json(resultadoFormateado);
  } catch (error) {
    console.error("Error al generar reporte de personas:", error);
    res.status(500).json({ mensaje: "Error al generar reporte de personas" });
  }
};

const listarPersonasFiltradas = async (req, res) => {
  const filtro = req.query.filtro?.toLowerCase();

  try {
    let personas;

    switch (filtro) {
      case 'clientes':
        personas = await db.persona.findAll({
          include: [
             {model: db.genero},
             {
            model: db.rol,
            as: 'rol',
            where: { idrol: 2 },
            through: { attributes: [] }
          }]
        });
        break;

      case 'proveedor':
        personas = await db.persona.findAll({
          include: [{
            model: db.rol,
            as: 'rol',
            where: { idrol: 5 },
            through: { attributes: [] }
          }]
        });
        break;

      case 'personal':
        personas = await db.persona.findAll({
          include: [{
            model: db.rol,
            as: 'rol',
            where: { idrol: { [Op.in]: [3, 4] } },
            through: { attributes: [] }
          }]
        });
        break;

      case 'activos':
        personas = await db.persona.findAll({
          where: { estado: 1 },
          include: [{
            model: db.rol,
            as: 'rol',
            where: { idrol: { [Op.in]: [2, 3, 4, 5] } },
            through: { attributes: [] }
          }]
        });
        break;

      case 'bloqueados':
        personas = await db.persona.findAll({
          where: { estado: 0 },
          include: [{
            model: db.rol,
            as: 'rol',
            where: { idrol: { [Op.in]: [2, 3, 4, 5] } },
            through: { attributes: [] }
          }]
        });
        break;

      case 'todos':
      default:
        personas = await db.persona.findAll({
          include: [{
            model: db.rol,
            as: 'rol',
            where: { idrol: { [Op.in]: [2, 3, 4, 5] } }, // excluye idrol 1 (Admin)
            through: { attributes: [] }
          }]
        });
        break;
    }

    res.json(personas);
  } catch (error) {
    console.error('Error al listar personas filtradas:', error);
    res.status(500).json({ mensaje: 'Error al listar personas filtradas' });
  }
};

// POST: Registrar persona
const registrarPersona = async (req, res) => {
  try {
    // Extraemos los roles enviados desde el frontend
    const { rol: rolesSeleccionados, ...datosPersona } = req.body;

    // Creamos la persona
     datosPersona.idgenero = req.body.genero?.idgenero;
    const persona = await db.persona.create(datosPersona);

    // Si hay roles seleccionados, los asociamos en rol_persona
    if (rolesSeleccionados && rolesSeleccionados.length > 0) {
      const rolesParaInsertar = rolesSeleccionados.map((r) => ({
        idpersona: persona.idpersona,
        idrol: r.idrol,
      }));

      await db.rol_persona.bulkCreate(rolesParaInsertar);
    }

    res.status(201).json(persona);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al registrar persona' });
  }
};



const GuardarFotografia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ mensaje: 'No se subió ninguna imagen' });
    }
    res.status(200).json({ nombre: req.file.filename });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al subir imagen' });
  }
};
const modificarPersona = async (req, res) => {
  const id = req.params.id;
  try {
    // Extraer roles
    const { rol: rolesSeleccionados, ...datosPersona } = req.body;

    // Actualizar persona
    datosPersona.idgenero = req.body.genero?.idgenero;
    await db.persona.update(datosPersona, { where: { idpersona: id } });

    // Eliminar roles antiguos
    await db.rol_persona.destroy({ where: { idpersona: id } });

    // Insertar nuevos roles si hay
    if (rolesSeleccionados && rolesSeleccionados.length > 0) {
      const rolesParaInsertar = rolesSeleccionados.map(r => ({
        idpersona: id,
        idrol: r.idrol,
      }));
      await db.rol_persona.bulkCreate(rolesParaInsertar);
    }

    res.status(200).json({ mensaje: 'Persona modificada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al modificar persona' });
  }
};


// GET: Buscar personas por filtro
const buscarPersonas = async (req, res) => {
    const filtro = req.query.filtro || '';
    try {
        const personas = await db.persona.findAll({
  include: [{ model: db.rol, as: 'rol', through: { attributes: [] } }],
            where: {
                [Op.or]: [
                    { nombre: { [Op.iLike]: `%${filtro}%` } },      // PostgreSQL: insensible a mayúsculas
                    { ap_paterno: { [Op.iLike]: `%${filtro}%` } }  // también buscar en ap_paterno
                ]
            }
            
        });
        
        res.json(personas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al buscar personas' });
    }
};

// PUT: Cambiar estado de persona
const cambiarEstadoPersona = async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    try {
        const nuevoEstado = estado === 0 ? 1 : 0;
        await db.persona.update({ estado: nuevoEstado }, { where: { idpersona: id } });
        res.status(200).json({ mensaje: 'Estado actualizado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al cambiar estado' });
    }
};

const verDetallesPersona = async (req, res) => {
  const { id } = req.params;

  try {
    const persona = await db.persona.findOne({
      where: { idpersona: id },
      include: [
        {model: db.genero},
        {
          model: db.rol,
          as: 'rol', // usa el alias definido en la asociación
          through: { attributes: [] } // oculta la tabla intermedia rol_persona
        },
        {
          model: db.credencial,
          required: false
        }
      ]
    });

    if (!persona) {
      return res.status(404).json({ mensaje: 'Persona no encontrada' });
    }

    return res.json(persona);
  } catch (error) {
    console.error('Error al obtener detalles de la persona:', error);
    return res.status(500).json({ mensaje: 'Error al obtener detalles de la persona' });
  }
};

const obtenerPersonasIA = async () => {
    return await db.persona.findAll({
        include: [
            { model: db.genero },
            { model: db.credencial },
            { model: db.rol, as: "rol", through: { attributes: [] } }
        ]
    });
};








// ── Helpers IA ─────────────────────────────────────────────

// Normaliza para comparar sin acentos / mayúsculas / espacios
const norm = (s = "") =>
    s.toString().trim().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Columnas editables = TODAS menos idpersona (la PK)
const CAMPOS_EDITABLES = [
    "cedula",
    "nombre",
    "ap_paterno",
    "ap_materno",
    "telefono",
    "fotografia",
    "correo",
    "idgenero"      // FK a genero: sí es editable
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

// Traduce nombre → idpersona usando la lista real de la BD
const resolverIdPersona = (datos, personas) => {
    // 1) Si la IA ya mandó un idpersona válido, úsalo
    const idIA = datos.idpersona ?? datos.id;
    if (idIA && personas.some(p => p.idpersona == idIA)) return idIA;

    // 2) Si no, arma el texto buscado (soporta *_actual) y busca por tokens
    const buscado = norm(
        [datos.nombre_actual   || datos.nombre,
         datos.ap_paterno_actual || datos.ap_paterno,
         datos.ap_materno_actual || datos.ap_materno]
        .filter(Boolean).join(" ")
    );
    if (!buscado) return null;

    const tokens = buscado.split(/\s+/);

    const candidatos = personas.filter(p => {
        const completo = norm(`${p.nombre} ${p.ap_paterno} ${p.ap_materno || ""}`);
        return tokens.every(t => completo.includes(t));  // todas las palabras deben aparecer
    });

    // Solo si hay UNA coincidencia (evita modificar al equivocado)
    return candidatos.length === 1 ? candidatos[0].idpersona : null;
};


const ejecutarAccionIA = async (accion, datos = {}) => {

    switch (accion) {

        case "consultar":
        case "listar":
            return await obtenerPersonasIA();

        case "buscar": {
            const q = datos.nombre || datos.texto || "";
            return await db.persona.findAll({
                where: {
                    [Op.or]: [
                        { nombre:     { [Op.iLike]: `%${q}%` } },
                        { ap_paterno: { [Op.iLike]: `%${q}%` } },
                        { ap_materno: { [Op.iLike]: `%${q}%` } }
                    ]
                },
                include: [
                    { model: db.genero },
                    { model: db.credencial },
                    { model: db.rol, as: "rol", through: { attributes: [] } }
                ]
            });
        }

        case "detalle": {
            const personas = await obtenerPersonasIA();
            const idpersona = resolverIdPersona(datos, personas);
            if (!idpersona)
                return { error: "No identifiqué al usuario. Dame el nombre completo." };

            return await db.persona.findOne({
                where: { idpersona },
                include: [
                    { model: db.genero },
                    { model: db.credencial },
                    { model: db.rol, as: "rol", through: { attributes: [] } }
                ]
            });
        }
case "registrar": {
    const cambios = limpiarDatos(datos);
    const obligatorios = ["cedula", "nombre", "ap_paterno", "correo"];
    const faltantes = obligatorios.filter(c => !cambios[c]);
    if (faltantes.length > 0)
        return { error: `Faltan datos obligatorios: ${faltantes.join(", ")}.` };

    // Agregar fecha y hora automáticas
    const ahora = new Date();
    cambios.fecha = ahora.toLocaleDateString("en-CA");
    cambios.hora = ahora.toTimeString().slice(0, 8);
    cambios.estado = 1;

    const persona = await db.persona.create(cambios);

    // Si vino idrol o roles, asignarlos
    const roles = datos.roles || datos.rol_ids || (datos.idrol ? [datos.idrol] : []);
    if (roles.length > 0) {
        const rolesParaInsertar = roles.map(idrol => ({
            idpersona: persona.idpersona,
            idrol: Number(idrol),
        }));
        await db.rol_persona.bulkCreate(rolesParaInsertar);
    }

    return { mensaje: "Persona registrada", idpersona: persona.idpersona, persona };
}

        case "modificar": {
            const personas = await obtenerPersonasIA();
            const idpersona = resolverIdPersona(datos, personas);
            if (!idpersona)
                return { error: "No encontré al usuario a modificar (nombre ambiguo o inexistente)." };

            const cambios = limpiarDatos(datos);   // solo columnas reales, sin idpersona
            if (Object.keys(cambios).length === 0)
                return { error: "No indicaste ningún dato a modificar." };

            await db.persona.update(cambios, { where: { idpersona } });
            return { mensaje: "Persona modificada", idpersona, cambios };
        }

        case "cambiarEstado": {
            const personas = await obtenerPersonasIA();
            const idpersona = resolverIdPersona(datos, personas);
            if (!idpersona)
                return { error: "No encontré al usuario para cambiar su estado." };

            await db.persona.update(
                { estado: datos.estado },
                { where: { idpersona } }
            );
            return { mensaje: "Estado actualizado", idpersona, estado: datos.estado };
        }

        default:
            return { error: `Acción IA no soportada: ${accion}` };
    }
};







module.exports = {
  verDetallesPersona, 
  obtenerPersonasIA,
   listarPersonas,
   ejecutarAccionIA,
   listarPersonasFiltradas,
   listarGenero, 
   buscarPersonas, 
   registrarPersona,
    modificarPersona, 
    cambiarEstadoPersona,
     GuardarFotografia, 
     GenerarReportePersona}