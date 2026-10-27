const Sequelize = require("sequelize");
const initModels = require('../modelos/init-models');
const { sequelize } = require('../config/database'); // <--- aquí la corrección
const { auditoria } = initModels(sequelize);

function obtenerFechaHora() {
  const ahora = new Date();

  // Fecha en formato YYYY-MM-DD usando timezone America/La_Paz
  const fecha = ahora.toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' }); // 'en-CA' -> yyyy-mm-dd

  // Hora en formato HH:MM:SS usando timezone America/La_Paz (24h)
  const hora = ahora.toLocaleTimeString('en-GB', { timeZone: 'America/La_Paz', hour12: false });

  return { fecha, hora };
}


/**
 * Registra cualquier acción en la auditoría
 */
async function registrarAuditoria(
    accion,
    idpersona,
    datos_original = null,
    datos_nuevo = null
) {
    try {
        const { fecha, hora } = obtenerFechaHora();

        await auditoria.create({
            accion,
            fecha,
            hora,
            datos_original,
            datos_nuevo,
            idpersona
        });
    } catch (err) {
        console.error("Error registrando auditoría:", err);
    }
}

/**
 * Registra último acceso de un usuario
 */
async function registrarAcceso(idpersona) {
    try {
        const registro = await auditoria.findOne({
            where: {
                accion: "Ultimo Acceso",
                idpersona // ahora usamos FK directamente
            }
        });

        const { fecha, hora } = obtenerFechaHora();

        if (registro) {
            // Solo actualizar fecha y hora
            await auditoria.update(
                { fecha, hora },
                { where: { id_aud: registro.id_aud } }
            );
        } else {
            // Primera vez: inserta nuevo registro
            await auditoria.create({
                accion: "Ultimo Acceso",
                fecha,
                hora,
                idpersona
            });
        }

    } catch (err) {
        console.error("Error registrando acceso:", err);
    }
}


module.exports = { registrarAuditoria, registrarAcceso };
