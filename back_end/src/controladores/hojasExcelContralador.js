const XLSX = require("xlsx");

/* ═════════════════════════════════════════════════════════════
   CONVENCIÓN DE PESTAÑAS DEL EXCEL DEL CASO
   Un mismo archivo puede tener varias hojas. Solo se grafican las
   que sigan este patrón OBLIGATORIO en su nombre:

       LLAMADAS_<OPERADOR>_<N>      → tráfico de llamadas y SMS
       DATOS_<OPERADOR>_<N>         → tráfico de datos móviles

   Ejemplos válidos:
       LLAMADAS_ENTEL_1   DATOS_ENTEL_1
       LLAMADAS_ENTEL_2   DATOS_ENTEL_2   (segundo número de la persona)
       LLAMADAS_VIVA_1    DATOS_TIGO_1

   El índice (1, 2, 3…) distingue varios números del mismo operador.
   Si una hoja no cumple el patrón, se ignora (no se puede graficar).
   ═════════════════════════════════════════════════════════════ */

// LLAMADAS_ENTEL_1  |  DATOS_TIGO_2 …
const PATRON_HOJA = /^(LLAMADAS|DATOS)_([A-ZÑ0-9]+)_(\d+)$/i;

const normalizarNombre = (s) =>
    String(s || "").trim().toUpperCase().replace(/\s+/g, "_");

/**
 * Lista las hojas graficables de un archivo, clasificadas por tipo.
 * Devuelve, para cada hoja válida:
 *   { hoja, tipo: "llamadas"|"datos", operador, indice, etiqueta }
 */
const listarHojas = (rutaArchivo) => {
    const wb = XLSX.readFile(rutaArchivo, { bookSheets: true });
    const nombres = wb.SheetNames || [];

    const llamadas = [];
    const datos = [];

    for (const nombre of nombres) {
        const m = normalizarNombre(nombre).match(PATRON_HOJA);
        if (!m) continue;

        const info = {
            hoja: nombre,                         // nombre real de la pestaña
            tipo: m[1].toUpperCase() === "DATOS" ? "datos" : "llamadas",
            operador: m[2].toUpperCase(),
            indice: parseInt(m[3], 10),
            etiqueta: `${m[2].toUpperCase()} ${m[3]}`,   // "ENTEL 1"
        };
        (info.tipo === "datos" ? datos : llamadas).push(info);
    }

    const ordenar = (a, b) =>
        a.operador.localeCompare(b.operador) || a.indice - b.indice;
    llamadas.sort(ordenar);
    datos.sort(ordenar);

    return { llamadas, datos };
};

/**
 * Resuelve qué hoja usar para un tipo dado ("llamadas" | "datos").
 * - Si el cliente manda "hoja", se usa esa (validada contra el patrón).
 * - Si no y hay UNA sola hoja de ese tipo, se usa automáticamente.
 * - Si hay VARIAS y no se especifica, se devuelve la lista para que
 *   el frontend pregunte cuál (opciones).
 */
const resolverHoja = (rutaArchivo, tipo, hojaPedida) => {
    const { llamadas, datos } = listarHojas(rutaArchivo);
    const lista = tipo === "datos" ? datos : llamadas;

    if (lista.length === 0) {
        return { estado: "vacio", opciones: [] };
    }

    // El cliente ya eligió una hoja concreta
    if (hojaPedida) {
        const objetivo = normalizarNombre(hojaPedida);
        const elegida = lista.find((h) => normalizarNombre(h.hoja) === objetivo);
        if (elegida) return { estado: "ok", hoja: elegida, opciones: lista };
        // Pidió una hoja que no existe para este tipo
        return { estado: "invalida", opciones: lista };
    }

    // Una sola → automática
    if (lista.length === 1) {
        return { estado: "ok", hoja: lista[0], opciones: lista };
    }

    // Varias → el frontend debe preguntar
    return { estado: "elegir", opciones: lista };
};

module.exports = { listarHojas, resolverHoja, PATRON_HOJA };