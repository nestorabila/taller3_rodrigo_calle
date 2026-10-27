const { db } = require("../config/database");
const bcrypt = require('bcrypt');


const { registrarAuditoria } = require("../services/auditoriaService");
const listarCredencial = async (req, res) =>{
    try {
        const lista = await db.credencial.findAll({
            include: {model: db.persona}
        })
        return res.json(lista)
    } catch (error) {
        console.log(error);
        
    }
}
// editar usuario
const modificarCredencial = async (req, res) => {
    const id = req.params.id;
    try {
        req.body.idpersona = req.body.persona?.idpersona;

        // Verificar si se envió una nueva contraseña
        if (req.body.contrasena) {
            // Hashear la contraseña antes de guardar
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(req.body.contrasena, saltRounds);
            req.body.contrasena = hashedPassword;
        }

        // Verificar si ya existe una credencial con ese usuario
        const existente = await db.credencial.findOne({ where: { usuario: id } });

        if (existente) {
            // Modificar credencial
            const pedidoOriginal = await db.credencial.findByPk(id);
        await registrarAuditoria(
            "credencial",
            "UPDATE",
            req.user.nombreCompleto,
            pedidoOriginal,
            req.body
        );
            await db.credencial.update(req.body, { where: { usuario: id } });
            res.status(200).json({ mensaje: 'Credencial modificada' });
        } else {
            // Registrar nueva credencial
            req.body.usuario = id;
            await db.credencial.create(req.body);
            res.status(201).json({ mensaje: 'Credencial registrada' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al modificar o registrar credencial' });
    }
};
const registrarCredencial = async (req, res) => {
  try {
    req.body.idpersona = req.body.persona?.idpersona;

    // Verificar si se envió una contraseña y hashearla
    if (req.body.contrasena) {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(req.body.contrasena, saltRounds);
      req.body.contrasena = hashedPassword;
    }
    const credencial =  await db.credencial.create(req.body);
    res.status(201).json(credencial);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al registrar persona' });
  }
};

// ── Helpers IA para credenciales ─────────────────────────

const norm = (s = "") =>
    s.toString().trim().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Validar contraseña segura: min 8, mayúscula, minúscula, número
const esContrasenaSegura = (pass) => {
    if (!pass || pass.length < 8) return false;
    if (!/[A-Z]/.test(pass)) return false;
    if (!/[a-z]/.test(pass)) return false;
    if (!/[0-9]/.test(pass)) return false;
    return true;
};

// Función usada por IA para tener contexto de credenciales existentes
const obtenerCredencialesIA = async () => {
    return await db.credencial.findAll({
        include: [{ model: db.persona }],
        attributes: ['usuario', 'idpersona'], // no exponer contraseña hasheada
    });
};

// Resolver idpersona a partir de datos (nombre / cedula / idpersona)
const resolverIdPersonaDesdeDatos = async (datos) => {
    // 1) Si mandó idpersona directo
    const idIA = datos.idpersona ?? datos.id;
    if (idIA) {
        const existe = await db.persona.findByPk(idIA);
        if (existe) return idIA;
    }

    // 2) Buscar por cédula (más único)
    if (datos.cedula) {
        const p = await db.persona.findOne({ where: { cedula: datos.cedula } });
        if (p) return p.idpersona;
    }

    // 3) Buscar por nombre completo con tokens
    const buscado = norm(
        [datos.nombre, datos.ap_paterno, datos.ap_materno]
            .filter(Boolean).join(" ")
    );
    if (!buscado) return null;

    const personas = await db.persona.findAll();
    const tokens = buscado.split(/\s+/);
    const candidatos = personas.filter(p => {
        const completo = norm(`${p.nombre} ${p.ap_paterno} ${p.ap_materno || ""}`);
        return tokens.every(t => completo.includes(t));
    });
    return candidatos.length === 1 ? candidatos[0].idpersona : null;
};

const ejecutarAccionIACredencial = async (accion, datos = {}) => {
    switch (accion) {

        case "listarCredencial":
            return await obtenerCredencialesIA();

        case "registrarCredencial": {
            // 1) Validar que exista la persona
            const idpersona = await resolverIdPersonaDesdeDatos(datos);
            if (!idpersona)
                return { error: "No identifiqué la persona para asignar la credencial. Dame el nombre completo o la cédula." };

            // 2) Validar usuario y contraseña
            const usuario = datos.usuario;
            const contrasena = datos.contrasena;

            if (!usuario)
                return { error: "Falta el nombre de usuario para la credencial." };
            if (!contrasena)
                return { error: "Falta la contraseña para la credencial." };

            // 3) Validar unicidad del usuario
            const existeUsuario = await db.credencial.findOne({ where: { usuario } });
            if (existeUsuario)
                return { error: `El usuario "${usuario}" ya existe. Elige otro.` };

            // 4) Validar que esa persona no tenga ya credencial
            const yaTiene = await db.credencial.findOne({ where: { idpersona } });
            if (yaTiene)
                return { error: `Esta persona ya tiene una credencial asignada (usuario: ${yaTiene.usuario}).` };

            // 5) Validar contraseña segura
            if (!esContrasenaSegura(contrasena))
                return { error: "La contraseña no es segura. Debe tener mínimo 8 caracteres, incluir mayúscula, minúscula y número." };

            // 6) Hashear y crear
            const hashedPassword = await bcrypt.hash(contrasena, 10);
            const credencial = await db.credencial.create({
                usuario,
                contrasena: hashedPassword,
                idpersona,
            });

            return { mensaje: "Credencial registrada", usuario, idpersona };
        }

        case "modificarCredencial": {
            // Buscar por usuario actual o por idpersona
            let credencial = null;
            if (datos.usuario_actual) {
                credencial = await db.credencial.findOne({ where: { usuario: datos.usuario_actual } });
            }
            if (!credencial) {
                const idpersona = await resolverIdPersonaDesdeDatos(datos);
                if (idpersona) credencial = await db.credencial.findOne({ where: { idpersona } });
            }
            if (!credencial)
                return { error: "No encontré la credencial a modificar." };

            const cambios = {};

            // Cambiar usuario
            if (datos.usuario && datos.usuario !== credencial.usuario) {
                const existe = await db.credencial.findOne({ where: { usuario: datos.usuario } });
                if (existe)
                    return { error: `El usuario "${datos.usuario}" ya existe. Elige otro.` };
                cambios.usuario = datos.usuario;
            }

            // Cambiar contraseña
            if (datos.contrasena) {
                if (!esContrasenaSegura(datos.contrasena))
                    return { error: "La contraseña no es segura. Debe tener mínimo 8 caracteres, incluir mayúscula, minúscula y número." };
                cambios.contrasena = await bcrypt.hash(datos.contrasena, 10);
            }

            if (Object.keys(cambios).length === 0)
                return { error: "No indicaste ningún dato a modificar." };

            await db.credencial.update(cambios, { where: { usuario: credencial.usuario } });
            return { mensaje: "Credencial modificada", usuario: cambios.usuario || credencial.usuario };
        }

        default:
            return { error: `Acción IA de credencial no soportada: ${accion}` };
    }
};

module.exports = {
    listarCredencial,
    modificarCredencial,
    registrarCredencial,
    obtenerCredencialesIA,
    ejecutarAccionIACredencial,
};