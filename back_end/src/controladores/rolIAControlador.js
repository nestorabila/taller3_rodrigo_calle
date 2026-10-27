const { preguntarGemini } = require("../services/geminiService");
const { obtenerRolesIA, ejecutarAccionIARol } = require("./rolControlador");

const chatRol = async (req, res) => {
  try {
    const { mensaje } = req.body;
    const roles = await obtenerRolesIA();

    const systemPrompt = `
Eres el asistente IA del módulo Roles.
Manejas UNA entidad: ROL (idrol, nombre).

Reglas:
- Solo puedes responder sobre roles.
- No respondas sobre usuarios, casos ni permisos. Si te lo piden, responde con la acción "respuesta" indicando que ese tema pertenece a otro módulo.

Acciones disponibles:
- consultar   (listar todos los roles)
- buscar      (filtrar roles por nombre)
- detalle     (ver un rol y cuántas personas/permisos tiene)
- registrar   (crear un rol)
- modificar   (cambiar el nombre de un rol)
- eliminar    (borrar un rol)
- respuesta   (responder normalmente sin ejecutar nada)

Formato de salida (SOLO JSON, sin texto ni backticks):
{ "accion": "", "datos": {}, "respuesta": "" }

REGLAS IMPORTANTES:
- Para "detalle", "modificar" y "eliminar" SIEMPRE incluye "idrol" en "datos" (o el "nombre" exacto si no conoces el id).
- Para "modificar" usa "idrol" (o "nombre" para identificarlo) y "nombre_nuevo" con el nombre nuevo.
- Para "registrar" el campo obligatorio es "nombre". No inventes idrol.
- El nombre del rol NO puede repetirse. Revisa la lista de abajo antes de proponer uno.
- El rol con idrol = 1 (Administrador) está PROTEGIDO: no se puede modificar ni eliminar. Si te lo piden, rechaza con la acción "respuesta".
- Un rol con personas asignadas NO se puede eliminar. Revisa "personas_asignadas" en la lista de abajo antes de intentarlo; si tiene personas, rechaza con "respuesta" y explica por qué.
- En un solo mensaje devuelve UNA SOLA acción.

Ejemplo consultar:
{ "accion": "consultar", "datos": {}, "respuesta": "Estos son los roles registrados." }

Ejemplo buscar:
{ "accion": "buscar", "datos": { "filtro": "coord" }, "respuesta": "Busco los roles que contengan 'coord'." }

Ejemplo registrar:
{ "accion": "registrar", "datos": { "nombre": "Auditoría" }, "respuesta": "Voy a crear el rol Auditoría." }

Ejemplo modificar:
{ "accion": "modificar", "datos": { "idrol": 3, "nombre_nuevo": "Proyectista Senior" }, "respuesta": "Voy a renombrar el rol 3 a Proyectista Senior." }

Ejemplo eliminar:
{ "accion": "eliminar", "datos": { "idrol": 5 }, "respuesta": "Voy a eliminar el rol 5." }

Ejemplo detalle:
{ "accion": "detalle", "datos": { "nombre": "Perito" }, "respuesta": "Te muestro el detalle del rol Perito." }

Información actual de roles:
${JSON.stringify(roles, null, 2)}
`;

    const respuestaTexto = await preguntarGemini(systemPrompt, mensaje);
    console.log("Respuesta cruda Gemini (rol):", respuestaTexto);

    let resultadoIA;
    try {
      const limpio = respuestaTexto.replace(/```json/gi, "").replace(/```/g, "").trim();
      const match = limpio.match(/\{[\s\S]*\}/);
      resultadoIA = JSON.parse(match ? match[0] : limpio);
    } catch (errorJson) {
      console.log("Gemini no devolvió JSON, usando respuesta normal");
      return res.json({ respuesta: respuestaTexto });
    }

    console.log("JSON IA (rol):", resultadoIA);

    if (resultadoIA.accion && resultadoIA.accion !== "respuesta") {
      const resultado = await ejecutarAccionIARol(
        resultadoIA.accion,
        resultadoIA.datos || {}
      );

      if (resultado && resultado.error) {
        return res.json({ respuesta: resultado.error, resultado });
      }
      return res.json({ respuesta: resultadoIA.respuesta, resultado });
    }

    return res.json({ respuesta: resultadoIA.respuesta });
  } catch (error) {
    console.error("Error IA (rol):", error);
    return res.status(500).json({ mensaje: "Error al consultar la IA." });
  }
};

module.exports = { chatRol };