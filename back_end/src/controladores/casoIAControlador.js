const { preguntarGemini } = require("../services/geminiService");
const {
    obtenerCasosIA,
    ejecutarAccionIA
} = require("./casoControlador");
const { leerArchivoDeCasoIA } = require("./archivoControlador"); // 👈 nuevo

const chatCaso = async (req, res) => {
    try {
        const { mensaje } = req.body;
        const casos = await obtenerCasosIA();

        const systemPrompt = `
Eres el asistente IA del módulo Casos.
Reglas:
- Solo puedes responder sobre casos.
- No respondas sobre usuarios.
- No respondas sobre roles.
- Puedes LEER el contenido de los archivos adjuntos a los casos, pero NUNCA puedes registrar, subir, modificar ni eliminar archivos.

Acciones: consultar, buscar, detalle, registrar, modificar, cambiarEstado, leerArchivo, respuesta.

Formato de salida (SOLO JSON, sin texto ni backticks):
{ "accion": "", "datos": {}, "respuesta": "" }

IMPORTANTE:
- Para "modificar", "cambiarEstado", "detalle" y "leerArchivo" SIEMPRE incluye "idcaso" en "datos",
  tomándolo de la lista de casos de abajo.
- Para "modificar" pon en "datos" SOLO los campos que cambian. NO uses campos con sufijo *_actual.
- No incluyas nunca "idcaso" como algo a modificar (es la llave primaria).
- Campos obligatorios para registrar: codigo, denunciante, denunciado, idpersona, idtipo, fecha, hora.
- El campo "archivo" es opcional.
- "fecha" en formato YYYY-MM-DD, "hora" en formato HH:mm:ss.
- "idpersona" corresponde al responsable del caso; "idtipo" corresponde al tipo del caso.

- Usa "leerArchivo" cuando el usuario pregunte por el contenido, resumen, información dentro del archivo,
  denuncia, hechos, testigos, fechas mencionadas dentro del documento adjunto de un caso.
  El sistema devolverá el texto del archivo y tú lo interpretas y respondes al usuario.

Ejemplo leerArchivo:
{
 "accion": "leerArchivo",
 "datos": { "idcaso": 12 },
 "respuesta": "Voy a revisar el archivo del caso 12."
}

Ejemplo registrar:
{
 "accion": "registrar",
 "datos": {
   "codigo": "CASO-001",
   "denunciante": "Juan Pérez",
   "denunciado": "Pedro López",
   "idpersona": 3,
   "idtipo": 1,
   "fecha": "2026-07-08",
   "hora": "10:30:00"
 },
 "respuesta": "Voy a registrar el caso CASO-001."
}

Ejemplo modificar:
{
 "accion": "modificar",
 "datos": { "idcaso": 12, "denunciante": "Rodrigo Calle", "denunciado": "María Gómez" },
 "respuesta": "Voy a modificar el caso 12."
}

Ejemplo bloquear:
{
 "accion": "cambiarEstado",
 "datos": { "idcaso": 7, "estado": 0 },
 "respuesta": "Voy a bloquear el caso."
}

Ejemplo detalle:
{
 "accion": "detalle",
 "datos": { "idcaso": 5 },
 "respuesta": "Aquí tienes el detalle del caso 5."
}

Información actual de casos:
${JSON.stringify(casos, null, 2)}
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

        // ── Acción especial: leer archivo ──
        if (resultadoIA.accion === "leerArchivo") {
            const { idcaso } = resultadoIA.datos || {};
            if (!idcaso) {
                return res.json({ respuesta: "No identifiqué el caso. Dame el código o el idcaso." });
            }

            const lectura = await leerArchivoDeCasoIA(idcaso);

            if (lectura.error) {
                return res.json({ respuesta: lectura.error });
            }

            // Segunda vuelta: mandamos el contenido a Gemini para que lo interprete
            const promptLectura = `
Eres el asistente IA del módulo Casos. El usuario preguntó sobre el contenido del archivo del caso ${idcaso}.
A continuación tienes el texto extraído del archivo (${lectura.tipo}). Léelo y responde de forma clara y concisa a la pregunta del usuario.
NO inventes información que no esté en el archivo. Si el archivo no contiene lo que el usuario pregunta, dilo.

--- CONTENIDO DEL ARCHIVO ---
${lectura.contenido}
--- FIN DEL CONTENIDO ---
`;
            const respuestaLectura = await preguntarGemini(promptLectura, mensaje);
            return res.json({ respuesta: respuestaLectura });
        }

        // ── Resto de acciones ──
        if (resultadoIA.accion && resultadoIA.accion !== "respuesta") {
            const resultado = await ejecutarAccionIA(
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
        console.error("Error IA:", error);
        return res.status(500).json({ mensaje: "Error al consultar la IA." });
    }
};

module.exports = { chatCaso };