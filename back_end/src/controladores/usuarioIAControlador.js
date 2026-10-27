const { preguntarGemini } = require("../services/geminiService");
const {
    obtenerPersonasIA,
    ejecutarAccionIA
} = require("./personaControlador");
const {
    obtenerCredencialesIA,
    ejecutarAccionIACredencial
} = require("./credencialControlador");

const chatUsuario = async (req, res) => {
    try {
        const { mensaje } = req.body;
        const personas = await obtenerPersonasIA();
        const credenciales = await obtenerCredencialesIA();

        const systemPrompt = `
Eres el asistente IA del módulo Usuarios.
Manejas DOS entidades: PERSONA y CREDENCIAL. Ambas están en la misma vista del frontend.

Reglas:
- Solo puedes responder sobre usuarios (personas y sus credenciales).
- No respondas sobre casos.
- No respondas sobre roles (solo puedes asignarlos al registrar).

Acciones disponibles:
- Sobre PERSONA: consultar, buscar, detalle, registrar, modificar, cambiarEstado
- Sobre CREDENCIAL: listarCredencial, registrarCredencial, modificarCredencial
- respuesta (para responder normalmente sin ejecutar nada)

Formato de salida (SOLO JSON, sin texto ni backticks):
{ "accion": "", "datos": {}, "respuesta": "" }

REGLAS IMPORTANTES:

=== PERSONA ===
- Para "modificar", "cambiarEstado" y "detalle" SIEMPRE incluye "idpersona" en "datos".
- Para "modificar" pon en "datos" SOLO los campos que cambian. NO uses campos con sufijo *_actual.
- No incluyas nunca "idpersona" como algo a modificar.
- Campos obligatorios para registrar persona: cedula, nombre, ap_paterno, correo.
- Opcionales: ap_materno, telefono, idgenero, fotografia, roles (array de idrol).

=== CREDENCIAL ===
- Para crear una credencial SIEMPRE debe existir una persona previamente.
- NUNCA crees una credencial sin identificar a qué persona pertenece.
- Puedes identificar a la persona por: idpersona, cedula, o nombre completo.
- El "usuario" debe ser único (revisa la lista de credenciales de abajo).
- La "contrasena" debe ser SEGURA: mínimo 8 caracteres, con al menos una mayúscula, una minúscula y un número. Si el usuario propone una débil, sugiérele una segura o rechaza la acción.
- Una persona solo puede tener UNA credencial.

=== FLUJOS COMBINADOS (persona + credencial) ===
Si el usuario pide "crear un usuario completo con acceso" o similar, hazlo en DOS pasos separados:
1. Primero registra la persona.
2. Luego, en el siguiente mensaje, se registrará la credencial usando la persona recién creada.
Pero en un solo mensaje devuelve UNA SOLA acción. Si te piden crear ambos, prioriza registrar la persona y en la "respuesta" indica que luego se creará la credencial.

Ejemplo registrar persona:
{
 "accion": "registrar",
 "datos": {
   "cedula": "12345678",
   "nombre": "Rodrigo",
   "ap_paterno": "Calle",
   "ap_materno": "Maydana",
   "correo": "rodrigo@mail.com",
   "telefono": "70012345",
   "idgenero": 1
 },
 "respuesta": "Voy a registrar a Rodrigo Calle Maydana."
}

Ejemplo modificar persona:
{
 "accion": "modificar",
 "datos": { "idpersona": 12, "nombre": "Rodrigo", "ap_paterno": "Calle" },
 "respuesta": "Voy a modificar al usuario 12."
}

Ejemplo bloquear:
{
 "accion": "cambiarEstado",
 "datos": { "idpersona": 7, "estado": 0 },
 "respuesta": "Voy a bloquear al usuario."
}

Ejemplo registrar credencial (persona ya existente):
{
 "accion": "registrarCredencial",
 "datos": {
   "idpersona": 5,
   "usuario": "rcalle",
   "contrasena": "Segura2026"
 },
 "respuesta": "Voy a crear la credencial rcalle para Rodrigo Calle."
}

Ejemplo registrar credencial identificando por nombre:
{
 "accion": "registrarCredencial",
 "datos": {
   "nombre": "Rodrigo",
   "ap_paterno": "Calle",
   "usuario": "rcalle",
   "contrasena": "Segura2026"
 },
 "respuesta": "Voy a crear la credencial rcalle para Rodrigo Calle."
}

Ejemplo modificar credencial (cambio de contraseña):
{
 "accion": "modificarCredencial",
 "datos": {
   "idpersona": 5,
   "contrasena": "NuevaClave2026"
 },
 "respuesta": "Voy a cambiar la contraseña del usuario."
}

Información actual de usuarios:
${JSON.stringify(personas, null, 2)}

Información actual de credenciales:
${JSON.stringify(credenciales, null, 2)}
`;

        const respuestaTexto = await preguntarGemini(systemPrompt, mensaje);
        console.log("Respuesta cruda Gemini:", respuestaTexto);

        let resultadoIA;
        try {
            const limpio = respuestaTexto.replace(/```json/gi, "").replace(/```/g, "").trim();
            const match = limpio.match(/\{[\s\S]*\}/);
            resultadoIA = JSON.parse(match ? match[0] : limpio);
        } catch (errorJson) {
            console.log("Gemini no devolvió JSON, usando respuesta normal");
            return res.json({ respuesta: respuestaTexto });
        }

        console.log("JSON IA:", resultadoIA);

        // Acciones de credencial
        const accionesCredencial = ["listarCredencial", "registrarCredencial", "modificarCredencial"];

        if (resultadoIA.accion && resultadoIA.accion !== "respuesta") {
            let resultado;

            if (accionesCredencial.includes(resultadoIA.accion)) {
                // Ejecutar sobre credencial
                resultado = await ejecutarAccionIACredencial(
                    resultadoIA.accion,
                    resultadoIA.datos || {}
                );
            } else {
                // Ejecutar sobre persona
                resultado = await ejecutarAccionIA(
                    resultadoIA.accion,
                    resultadoIA.datos || {}
                );
            }

            if (resultado && resultado.error) {
                return res.json({ respuesta: resultado.error, resultado });
            }
            return res.json({ respuesta: resultadoIA.respuesta, resultado });
        }

        return res.json({ respuesta: resultadoIA.respuesta });
    } catch (error) {
        console.error("Error IA:", error);
        return res.status(500).json({ mensaje: "Error al consultar la IA." });
    }
};

module.exports = { chatUsuario };