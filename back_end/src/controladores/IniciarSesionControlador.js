const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const { registrarAuditoria, registrarAcceso } = require("../services/auditoriaService");
const { db } = require('../config/database'); 
dotenv.config();
const SECRET_KEY = process.env.JWT_SECRET || 'secreto123';

const loguear = async (req, res) => {
  const { usuario, contrasena } = req.body;

  if (!usuario || !contrasena) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }

  try {
    const credencial = await db.credencial.findOne({
      where: { usuario },
      include: [
        {
          model: db.persona,
          as: 'persona',
          include: [
            {
              model: db.rol, as: "rol",       // sigue incluyendo el rol
              through: { attributes: [] }, // esto hace el join por la tabla intermedia
            },
          ],
        },
      ],
    });

    if (!credencial) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    // Verificar contraseña
    const contrasenaValida = await bcrypt.compare(contrasena, credencial.contrasena);
    if (!contrasenaValida) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
     
    // Datos de persona
    const p = credencial.persona;
    const nombreCompleto = `${p.nombre} ${p.ap_paterno}`;
    const correo = p.correo;
    const estado = p.estado;
    const idpersona = p.idpersona;
  await registrarAcceso(idpersona);
    // 🔹 Ahora persona puede tener varios roles
   const roles = p.rol || [];
    const nombresRoles = roles.map(r => r.nombre); // array de nombres
    const nombreRol = nombresRoles.join(', '); // ej: "Administrador, Producción"
   // Generar token
    const token = jwt.sign(
      { idpersona: credencial.idpersona, 
        usuario: credencial.usuario,
        nombreCompleto
       },
      SECRET_KEY,
      { expiresIn: '300m' }
    );
    res.json({
      usuario: credencial.usuario,
      token,
      correo,
      nombreCompleto,
      rol: nombreRol, // 🔹 sigue devolviendo "rol", pero puede contener varios
      estado,
      idpersona
    });

  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};


module.exports = { loguear };
