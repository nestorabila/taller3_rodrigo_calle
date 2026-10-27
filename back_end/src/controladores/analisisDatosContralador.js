const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");
const { resolverHoja } = require("./hojasExcelContralador");
const { db } = require("../config/database");

/* ─────────────────────────────────────────────────────────────
   CARPETAS DONDE PUEDE ESTAR EL ARCHIVO (igual que en análisis de llamadas)
   ───────────────────────────────────────────────────────────── */
const CARPETAS_POSIBLES = [
    path.join(__dirname, "..", "..", "uploads", "casos"),  // ← la de multer
    path.join(__dirname, "..", "uploads", "casos"),
    path.join(process.cwd(), "uploads", "casos"),
    path.join(__dirname, "..", "..", "uploads"),
    path.join(process.cwd(), "uploads"),
];

const resolverRutaArchivo = (nombreGuardado) => {
    const base = path.basename(String(nombreGuardado || "").replace(/\\/g, "/")).trim();
    if (!base) return { ruta: null, intentos: [] };

    const intentos = CARPETAS_POSIBLES.map((c) => path.join(c, base));
    for (const r of intentos) if (fs.existsSync(r)) return { ruta: r, intentos };

    const baseLower = base.toLowerCase();
    for (const carpeta of CARPETAS_POSIBLES) {
        if (!fs.existsSync(carpeta)) continue;
        let archivos = [];
        try { archivos = fs.readdirSync(carpeta); } catch { continue; }
        const hit = archivos.find((a) => {
            const al = a.toLowerCase();
            return al === baseLower || al.endsWith("_" + baseLower) || baseLower.endsWith("_" + al);
        });
        if (hit) return { ruta: path.join(carpeta, hit), intentos };
    }
    return { ruta: null, intentos };
};

/* ═════════════════════════════════════════════════════════════
   PARÁMETROS DE COBERTURA PARA TRÁFICO DE DATOS
   A diferencia de las llamadas (un solo círculo), aquí se grafican
   TRES ANILLOS CONCÉNTRICOS que representan bandas de probabilidad
   de localización del dispositivo dentro de la cobertura de la celda.

   Ajusta libremente estos radios: son los criterios periciales.
   ═════════════════════════════════════════════════════════════ */
const ZONAS = {
    URBANA:     { texto: "zona urbana",      radios: [300, 500, 700] },
    SEMIURBANA: { texto: "zona semiurbana",  radios: [2000, 3500, 5000] },
    SUBURBANA:  { texto: "zona suburbana",   radios: [2000, 3500, 5000] },
    RURAL:      { texto: "zona rural",       radios: [4000, 7000, 10000] },
};
const ZONA_POR_DEFECTO = { texto: "zona rural", radios: [4000, 7000, 10000] };

/* Bandas: del anillo interno (más probable) al externo (alcance máximo) */
const BANDAS = [
    { color: "#059669", etiqueta: "Alta probabilidad",   opacidad: 0.18 },
    { color: "#f59e0b", etiqueta: "Probabilidad media",  opacidad: 0.12 },
    { color: "#dc2626", etiqueta: "Alcance máximo",      opacidad: 0.07 },
];

/* ─────────────────────────────────────────────────────────────
   PLANTILLA DE INTERPRETACIÓN FORENSE PARA DATOS MÓVILES
   Estática: solo cambian las variables entre llaves.
   ───────────────────────────────────────────────────────────── */
const PLANTILLA_DATOS =
    "Interpretación forense: el número {NUMERO} registró tráfico de datos móviles el {FECHA}, " +
    "desde horas {HORA}, asociado a la celda {CELDA} de la radio base {RBS}. Este registro indica " +
    "conexión del dispositivo a la red de datos en el área probable de cobertura de dicha antena, " +
    "clasificada como {ZONA_TEXTO}, con rango referencial de {RANGOS}. La sesión permaneció " +
    "registrada aproximadamente {DURACION_TEXTO}, con un volumen total de {MB_TOTAL} MB " +
    "({MB_DES} MB descargados y {MB_SUB} MB subidos). Esta ubicación es aproximada por celda y no " +
    "equivale a una posición GPS exacta.";

/* Variante para sesiones instantáneas (inicio = fin) */
const PLANTILLA_DATOS_INSTANTANEA =
    "Interpretación forense: el número {NUMERO} registró tráfico de datos móviles el {FECHA}, " +
    "a horas {HORA}, asociado a la celda {CELDA} de la radio base {RBS}. Este registro indica " +
    "conexión del dispositivo a la red de datos en el área probable de cobertura de dicha antena, " +
    "clasificada como {ZONA_TEXTO}, con rango referencial de {RANGOS}. La sesión fue puntual, " +
    "con un volumen total de {MB_TOTAL} MB ({MB_DES} MB descargados y {MB_SUB} MB subidos). " +
    "Esta ubicación es aproximada por celda y no equivale a una posición GPS exacta.";

/* ───────────── Helpers ───────────── */

/** "-21,514058" | "-21.514058" → -21.514058 */
const aNumero = (v) => {
    if (v === null || v === undefined || v === "") return null;
    if (typeof v === "number") return v;
    const n = parseFloat(String(v).trim().replace(",", "."));
    return isNaN(n) ? null : n;
};

/** "28.406.117" | 28406117 → 28406117 (bytes) */
const aBytes = (v) => {
    const n = parseInt(String(v ?? "").replace(/[^\d]/g, ""), 10);
    return isNaN(n) ? null : n;
};

/** bytes → "770,62" (megabytes con coma decimal) */
const aMB = (bytes) =>
    bytes === null ? "0,00" : (bytes / 1048576).toFixed(2).replace(".", ",");

/** "2025-06-02 00:11:43" → { fecha: "02/06/2025", hora: "00:11:43" } */
const partirFechaHora = (valor) => {
    const txt = String(valor || "").trim().replace("T", " ");
    const [f = "", h = ""] = txt.split(" ");
    const p = f.split("-");
    const fecha = p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : f;
    return { fecha, hora: h || "-", iso: txt, corta: p.length === 3 ? `${p[2]}-${p[1]}` : f };
};

/** Fecha completa a objeto Date */
const aFecha = (s) => {
    const m = String(s ?? "").trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : null;
};

/** "23:08:17" → "23 h 8 min" */
const duracionHumana = (hhmmss) => {
    const m = String(hhmmss || "").match(/^(\d+):(\d{2}):(\d{2})$/);
    if (!m) return null;
    const h = +m[1], mi = +m[2], sg = +m[3];
    if (h > 0) return mi > 0 ? `${h} h ${mi} min` : `${h} h`;
    if (mi > 0) return sg > 0 ? `${mi} min ${sg} s` : `${mi} min`;
    return sg > 0 ? `${sg} s` : null;
};

/** Duración "HH:mm:ss" calculada desde dos fechas */
const calcularDuracion = (ini, fin) => {
    const a = aFecha(ini), b = aFecha(fin);
    if (!a || !b) return null;
    let seg = Math.round((b - a) / 1000);
    if (seg < 0) return null;
    const h = Math.floor(seg / 3600), mi = Math.floor((seg % 3600) / 60), sg = seg % 60;
    return [h, mi, sg].map((n) => String(n).padStart(2, "0")).join(":");
};

/** 300 → "300 m" | 5000 → "5 km" */
const formatoRadio = (m) => (m >= 1000 ? `${(m / 1000).toString().replace(".", ",")} km` : `${m} m`);

/** [300,500,700] → "300 m, 500 m y 700 m" */
const listaRadios = (radios) => {
    const t = radios.map(formatoRadio);
    return t.length > 1 ? `${t.slice(0, -1).join(", ")} y ${t[t.length - 1]}` : t[0];
};

/** Resuelve la zona a partir de TIPO_ZONA del Excel */
const resolverZona = (tipoZona) => {
    const clave = String(tipoZona || "").toUpperCase().trim();
    return ZONAS[clave] || ZONA_POR_DEFECTO;
};

const aplicarPlantilla = (plantilla, vars) =>
    plantilla.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ""));

const normEncabezado = (s) =>
    String(s || "").toUpperCase().replace(/\s+/g, " ").replace(/\./g, "").trim();

/* ─────────────────────────────────────────────────────────────
   LECTURA DEL EXCEL DE TRÁFICO DE DATOS
   ───────────────────────────────────────────────────────────── */
const leerFilasExcel = (rutaArchivo, nombreHoja) => {
    const wb = XLSX.readFile(rutaArchivo);
    const hoja = nombreHoja && wb.Sheets[nombreHoja] ? nombreHoja : wb.SheetNames[0];
    const ws = wb.Sheets[hoja];
    const matriz = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });

    const idxEnc = matriz.findIndex((fila) =>
        fila.some((c) => normEncabezado(c) === "LATITUD") &&
        fila.some((c) => normEncabezado(c).startsWith("FECHA"))
    );
    if (idxEnc === -1) return { titulo: "", encabezados: [], filas: [] };

    let titulo = "";
    for (let i = 0; i < idxEnc; i++) {
        const t = (matriz[i] || []).find((c) => String(c).trim() !== "");
        if (t) { titulo = String(t).trim(); break; }
    }

    const encabezados = matriz[idxEnc].map(normEncabezado);
    const filas = [];

    for (let i = idxEnc + 1; i < matriz.length; i++) {
        const fila = matriz[i] || [];
        if (fila.every((c) => String(c).trim() === "")) continue;

        const obj = {};
        encabezados.forEach((h, j) => { if (h) obj[h] = fila[j] ?? ""; });

        if (aNumero(obj.LATITUD) === null || aNumero(obj.LONGITUD) === null) continue;
        filas.push(obj);
    }

    return { titulo, encabezados, filas };
};

/* ─────────────────────────────────────────────────────────────
   CONSTRUCCIÓN DEL ANÁLISIS DE DATOS
   ───────────────────────────────────────────────────────────── */
const construirAnalisis = (titulo, filas) => {
    let acumSub = 0, acumDes = 0, acumTot = 0;

    const puntos = filas.map((f, i) => {
        const nro = parseInt(f["NRO"], 10) || i + 1;
        const lat = aNumero(f.LATITUD);
        const lng = aNumero(f.LONGITUD);

        const ini = partirFechaHora(f.FECHA_INICIO || f.FECHA_INI);
        const fin = partirFechaHora(f.FECHA_FIN);

        // Duración: la del Excel o, si falta, calculada de las dos fechas
        const duracion =
            String(f.DURACION || "").trim() ||
            calcularDuracion(f.FECHA_INICIO || f.FECHA_INI, f.FECHA_FIN) ||
            "00:00:00";
        const durTexto = duracionHumana(duracion);

        // Volúmenes
        const bSub = aBytes(f.BYTES_SUB);
        const bDes = aBytes(f.BYTES_DES);
        let bTot = aBytes(f.BYTES_TOTAL);
        if (bTot === null && bSub !== null && bDes !== null) bTot = bSub + bDes;

        acumSub += bSub || 0;
        acumDes += bDes || 0;
        acumTot += bTot || 0;

        const mbSub = aMB(bSub), mbDes = aMB(bDes), mbTot = aMB(bTot);

        const zona = resolverZona(f.TIPO_ZONA);
        const rangosTexto = listaRadios(zona.radios);
        const zonaCorta = zona.texto.replace("zona ", "").toUpperCase();

        // ── Anillos concéntricos ──
        const anillos = zona.radios.map((r, k) => ({
            radio: r,
            color: BANDAS[k].color,
            opacidad: BANDAS[k].opacidad,
            etiqueta: BANDAS[k].etiqueta,
            texto: formatoRadio(r),
        }));

        const rbs = String(f.RADIO_BASE || "").trim();
        const celda = String(f.CELDA || "").trim();
        const numero = String(f.NUMERO || "").trim();

        // ── Interpretación forense ──
        const instantanea = !durTexto || duracion === "00:00:00";
        const interpretacion = aplicarPlantilla(
            instantanea ? PLANTILLA_DATOS_INSTANTANEA : PLANTILLA_DATOS,
            {
                NUMERO: numero,
                FECHA: ini.fecha,
                HORA: ini.hora,
                CELDA: celda,
                RBS: rbs,
                ZONA_TEXTO: zona.texto,
                RANGOS: rangosTexto,
                DURACION_TEXTO: durTexto || "",
                MB_TOTAL: mbTot,
                MB_DES: mbDes,
                MB_SUB: mbSub,
            }
        );

        // ── Ficha (recuadro superior del gráfico) ──
        const ficha = [
            { etiqueta: "RBS",       valor: rbs || "-" },
            { etiqueta: "Celda",     valor: celda || "-" },
            { etiqueta: "Zona",      valor: `${zonaCorta} · ${rangosTexto}` },
            { etiqueta: "Coord.",    valor: `${lat}, ${lng}` },
            { etiqueta: "Inicio",    valor: `${ini.fecha} ${ini.hora}` },
            { etiqueta: "Fin",       valor: `${fin.fecha} ${fin.hora}` },
            { etiqueta: "Duración",  valor: durTexto ? `${duracion} (${durTexto})` : duracion },
            { etiqueta: "Subidos",   valor: `${mbSub} MB` },
            { etiqueta: "Descarg.",  valor: `${mbDes} MB` },
            { etiqueta: "Total",     valor: `${mbTot} MB` },
            { etiqueta: "IMEI",      valor: String(f.IMEI || "-").trim() },
        ];

        return {
            nro,
            etiqueta: `D${nro}`,
            titulo: `D${nro}. DATOS - ${ini.fecha} ${ini.hora}`,
            lat,
            lng,
            anillos,
            radio: zona.radios[zona.radios.length - 1],   // alcance máximo
            color: BANDAS[2].color,
            zona: zonaCorta,
            rango: rangosTexto,
            numero,
            tipo: "DATOS MÓVILES",
            rbs,
            celda,
            duracion,
            duracion_texto: durTexto || "",
            mb_sub: mbSub,
            mb_des: mbDes,
            mb_total: mbTot,
            fecha_ini: ini.iso,
            fecha_fin: fin.iso,
            ficha,
            interpretacion,
        };
    });

    const centro = puntos.length
        ? [
            puntos.reduce((a, p) => a + p.lat, 0) / puntos.length,
            puntos.reduce((a, p) => a + p.lng, 0) / puntos.length,
          ]
        : [-21.5355, -64.7296];

    return {
        titulo,
        numero: puntos[0]?.numero || "",
        total: puntos.length,
        centro,
        ruta: puntos.map((p) => [p.lat, p.lng]),
        leyenda: BANDAS.map((b) => ({ color: b.color, etiqueta: b.etiqueta })),
        totales: {
            mb_sub: aMB(acumSub),
            mb_des: aMB(acumDes),
            mb_total: aMB(acumTot),
        },
        puntos,
    };
};

/* ─────────────────────────────────────────────────────────────
   GET /analizarCasoDatos/:idcaso
   ───────────────────────────────────────────────────────────── */
const analizarCasoDatos = async (req, res) => {
    try {
        const { idcaso } = req.params;

        const caso = await db.caso.findOne({ where: { idcaso } });
        if (!caso) return res.status(404).json({ mensaje: "Caso no encontrado" });
        if (!caso.archivo) return res.status(400).json({ mensaje: "El caso no tiene archivo adjunto" });
        if (!/\.(xlsx|xls)$/i.test(caso.archivo)) {
            return res.status(400).json({ mensaje: "El archivo del caso no es un Excel" });
        }

        const { ruta, intentos } = resolverRutaArchivo(caso.archivo);
        if (!ruta) {
            console.error("Archivo no encontrado. Nombre en BD:", caso.archivo);
            console.error("Rutas probadas:\n" + intentos.join("\n"));
            return res.status(404).json({
                mensaje: "El archivo del caso no existe en el servidor",
                archivo: caso.archivo,
                rutasProbadas: intentos,
            });
        }
        console.log("Analizando Excel de DATOS:", ruta);

        // ── Elegir la hoja de DATOS ──
        const hojaPedida = req.query.hoja;
        const resol = resolverHoja(ruta, "datos", hojaPedida);

        if (resol.estado === "vacio") {
            return res.status(400).json({
                mensaje: "El Excel no tiene ninguna hoja de DATOS (nombre esperado: DATOS_OPERADOR_N).",
            });
        }
        if (resol.estado === "invalida") {
            return res.status(400).json({
                mensaje: "La hoja indicada no existe en este caso.",
                opciones: resol.opciones,
            });
        }
        if (resol.estado === "elegir") {
            return res.json({
                requiereSeleccion: true,
                tipo: "datos",
                opciones: resol.opciones,
            });
        }

        const nombreHoja = resol.hoja.hoja;
        console.log("Hoja de datos:", nombreHoja);

        const { titulo, encabezados, filas } = leerFilasExcel(ruta, nombreHoja);

        // Debe ser una tabla de tráfico de datos
        const esDeDatos = encabezados.some((h) => h === "BYTES_TOTAL" || h === "MB_TOTAL" || h === "BYTES_DES");
        if (!esDeDatos) {
            return res.status(400).json({
                mensaje: "La hoja seleccionada no corresponde a tráfico de datos (faltan las columnas de volumen).",
            });
        }
        if (filas.length === 0) {
            return res.status(400).json({ mensaje: "La hoja no contiene registros con coordenadas válidas" });
        }

        const analisis = construirAnalisis(titulo, filas);

        return res.json({
            idcaso: caso.idcaso,
            codigo: caso.codigo,
            archivo: caso.archivo,
            hoja: nombreHoja,
            operador: resol.hoja.operador,
            hojasDisponibles: resol.opciones,
            ...analisis,
        });
    } catch (error) {
        console.error("Error al analizar caso de datos:", error);
        return res.status(500).json({ mensaje: "Error al analizar el Excel del caso" });
    }
};

module.exports = { analizarCasoDatos };