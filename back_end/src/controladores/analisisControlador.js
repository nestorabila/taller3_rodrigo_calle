const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");
const { resolverHoja } = require("./hojasExcelContralador");
const { db } = require("../config/database");

/* ─────────────────────────────────────────────────────────────
   CARPETAS DONDE PUEDE ESTAR EL ARCHIVO
   La primera es la que usa multer en uploadArchivo.js:
       path.join(__dirname, "..", "..", "uploads", "casos")
   Desde /controladores esa misma carpeta se alcanza igual,
   porque /middleware y /controladores están al mismo nivel.
   Las demás son respaldos por si cambias la configuración.
   ───────────────────────────────────────────────────────────── */
const CARPETAS_POSIBLES = [
    path.join(__dirname, "..", "..", "uploads", "casos"),  // ← la de multer
    path.join(__dirname, "..", "uploads", "casos"),
    path.join(process.cwd(), "uploads", "casos"),
    path.join(__dirname, "..", "..", "uploads"),
    path.join(process.cwd(), "uploads"),
];

/**
 * Busca el archivo en disco.
 * Tolera que la BD guarde el nombre original ("reporte.xlsx") aunque en disco
 * esté con el prefijo de multer ("1784838419793_reporte.xlsx"), y viceversa.
 */
const resolverRutaArchivo = (nombreGuardado) => {
    const base = path.basename(String(nombreGuardado || "").replace(/\\/g, "/")).trim();
    if (!base) return { ruta: null, intentos: [] };

    const intentos = CARPETAS_POSIBLES.map((c) => path.join(c, base));

    // 1) Coincidencia exacta
    for (const r of intentos) {
        if (fs.existsSync(r)) return { ruta: r, intentos };
    }

    // 2) Búsqueda tolerante dentro de cada carpeta
    const baseLower = base.toLowerCase();
    for (const carpeta of CARPETAS_POSIBLES) {
        if (!fs.existsSync(carpeta)) continue;
        let archivos = [];
        try { archivos = fs.readdirSync(carpeta); } catch { continue; }

        const hit = archivos.find((a) => {
            const al = a.toLowerCase();
            return (
                al === baseLower ||                    // igual sin importar mayúsculas
                al.endsWith("_" + baseLower) ||        // disco tiene prefijo timestamp
                baseLower.endsWith("_" + al)           // BD tiene prefijo timestamp
            );
        });
        if (hit) return { ruta: path.join(carpeta, hit), intentos };
    }

    return { ruta: null, intentos };
};

/* ─────────────────────────────────────────────────────────────
   PARÁMETROS DE ZONA (rangos referenciales de cobertura)
   Estos valores son los mismos del informe pericial.
   ───────────────────────────────────────────────────────────── */
const ZONAS = {
    URBANA:     { metros: 300,   etiqueta: "300 m", texto: "zona urbana",              color: "#dc2626" },
    SEMIURBANA: { metros: 5000,  etiqueta: "5 km",  texto: "zona semiurbana",          color: "#f97316" },
    SUBURBANA:  { metros: 5000,  etiqueta: "5 km",  texto: "zona suburbana",           color: "#f97316" },
    RURAL:      { metros: 10000, etiqueta: "10 km", texto: "zona rural",               color: "#e07b39" },
};
const ZONA_POR_DEFECTO = ZONAS.RURAL;

/* ─────────────────────────────────────────────────────────────
   PLANTILLAS DE INTERPRETACIÓN FORENSE (ESTÁTICAS)
   Solo cambian las variables entre llaves. Si más adelante quieres
   administrarlas desde la BD, basta con leer estas cadenas de una
   tabla "plantilla_interpretacion" y dejar igual el reemplazo.
   ───────────────────────────────────────────────────────────── */
const PLANTILLAS = {
    // Eventos sin duración (SMS)
    sinDuracion:
        "Interpretación forense: el número {NUMERO} {ACCION} el {FECHA}, a horas {HORA}, " +
        "utilizando la celda {CELDA} de la radio base {RBS}. Este posicionamiento ubica " +
        "teóricamente al dispositivo dentro del área probable de cobertura de esa antena, en " +
        "{ZONA_TEXTO}, con un rango referencial de {RANGO}. El evento permite ubicarlo por celda " +
        "telefónica, no como coordenada GPS exacta.",

    // Eventos con duración (llamadas y datos)
    conDuracion:
        "Interpretación forense: el número {NUMERO} {ACCION} el {FECHA}, a horas {HORA}, con " +
        "conexión a la celda {CELDA} de la radio base {RBS}. La comunicación tuvo una duración " +
        "registrada de {DURACION}. Por este registro, el dispositivo se encontraba en el área " +
        "probable de cobertura de dicha antena, clasificado como {ZONA_TEXTO}, con rango " +
        "referencial de {RANGO}. Esta conclusión corresponde a georreferenciación por celda y no " +
        "a ubicación GPS exacta.",
};

/* Cómo se describe cada tipo de evento dentro de la interpretación */
const ACCIONES = {
    "SMS ENTRANTE":     { accion: "recibió un mensaje de texto", duracion: false, corto: "SMS" },
    "SMS SALIENTE":     { accion: "envió un mensaje de texto",   duracion: false, corto: "SMS" },
    "LLAMADA ENTRANTE": { accion: "recibió una llamada",         duracion: true,  corto: "LLAMADA" },
    "LLAMADA SALIENTE": { accion: "realizó una llamada",         duracion: true,  corto: "LLAMADA" },
    "LLAMADA PERDIDA":  { accion: "registró una llamada perdida", duracion: false, corto: "PERDIDA" },
    "DATOS":            { accion: "registró tráfico de datos móviles", duracion: true, corto: "DATOS" },
};

/* ───────────── Helpers ───────────── */

/** "-21,746479" | "-21.746479" | -21.746479  →  -21.746479 */
const aNumero = (v) => {
    if (v === null || v === undefined || v === "") return null;
    if (typeof v === "number") return v;
    const n = parseFloat(String(v).trim().replace(",", "."));
    return isNaN(n) ? null : n;
};

/** "2025-06-02 12:17:22" → { fecha: "02/06/2025", hora: "12:17:22" } */
const partirFechaHora = (valor) => {
    const txt = String(valor || "").trim().replace("T", " ");
    const [f = "", h = ""] = txt.split(" ");
    const p = f.split("-");
    const fecha = p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : f;
    return { fecha, hora: h || "-", iso: txt };
};

/** "10 KM" → 10000 | "5 KM" → 5000 | "300 M" → 300 | otro → null */
const rangoAMetros = (txt) => {
    const s = String(txt || "").toUpperCase().trim();
    const m = s.match(/([\d.,]+)\s*(KM|M)\b/);
    if (!m) return null;
    const valor = parseFloat(m[1].replace(",", "."));
    if (isNaN(valor)) return null;
    return m[2] === "KM" ? valor * 1000 : valor;
};

/** Resuelve zona + radio a partir de TIPO_ZONA y RANGO_ESTABLECIDO */
const resolverZona = (tipoZona, rangoTxt) => {
    const clave = String(tipoZona || "").toUpperCase().trim();
    const base = ZONAS[clave] || ZONA_POR_DEFECTO;

    // El rango escrito en el Excel manda; si no es válido, se usa el de la zona
    const metros = rangoAMetros(rangoTxt) ?? base.metros;
    const etiqueta = rangoAMetros(rangoTxt) ? String(rangoTxt).trim() : base.etiqueta;

    return { ...base, metros, etiqueta };
};

/** Reemplaza {VARIABLES} dentro de una plantilla */
const aplicarPlantilla = (plantilla, vars) =>
    plantilla.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ""));

/** Normaliza encabezados: "FECHA_INI " → "FECHA_INI" */
const normEncabezado = (s) =>
    String(s || "").toUpperCase().replace(/\s+/g, " ").replace(/\./g, "").trim();

/* ─────────────────────────────────────────────────────────────
   LECTURA DEL EXCEL
   Busca la fila de encabezados (la que contiene FECHA_INI/LATITUD)
   y mapea cada fila a un objeto por nombre de columna.
   ───────────────────────────────────────────────────────────── */
const leerFilasExcel = (rutaArchivo, nombreHoja) => {
    const wb = XLSX.readFile(rutaArchivo);
    // Hoja indicada por nombre; si no se pasa, la primera (compatibilidad)
    const hoja = nombreHoja && wb.Sheets[nombreHoja] ? nombreHoja : wb.SheetNames[0];
    const ws = wb.Sheets[hoja];
    const matriz = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });

    // Fila de encabezados
    const idxEnc = matriz.findIndex((fila) =>
        fila.some((c) => normEncabezado(c) === "LATITUD") &&
        fila.some((c) => normEncabezado(c).startsWith("FECHA"))
    );
    if (idxEnc === -1) return { titulo: "", filas: [] };

    // Título: primera celda no vacía antes de los encabezados
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

        // Debe tener coordenadas para poder graficarse
        if (aNumero(obj.LATITUD) === null || aNumero(obj.LONGITUD) === null) continue;
        filas.push(obj);
    }

    return { titulo, filas };
};

/* ─────────────────────────────────────────────────────────────
   CONSTRUCCIÓN DEL ANÁLISIS (puntos + fichas + interpretaciones)
   ───────────────────────────────────────────────────────────── */
const construirAnalisis = (titulo, filas) => {
    const puntos = filas.map((f, i) => {
        const nro = parseInt(f["NRO"], 10) || i + 1;
        const lat = aNumero(f.LATITUD);
        const lng = aNumero(f.LONGITUD);

        const ini = partirFechaHora(f.FECHA_INI);
        const fin = partirFechaHora(f.FECHA_FIN);

        const tipo = String(f.TIPO || "").toUpperCase().trim();
        const meta = ACCIONES[tipo] || { accion: "registró un evento", duracion: false, corto: tipo };

        const zona = resolverZona(f.TIPO_ZONA, f.RANGO_ESTABLECIDO);

        const rbs = String(f.RADIO_BASE || "").trim();
        const celda = String(f.CELDA || "").trim();
        const duracion = String(f.DURACION || "-").trim();
        const numero = String(f.NUMERO || "").trim();

        // ── Interpretación forense ──
        const usaDuracion = meta.duracion && duracion && duracion !== "-";
        const interpretacion = aplicarPlantilla(
            usaDuracion ? PLANTILLAS.conDuracion : PLANTILLAS.sinDuracion,
            {
                NUMERO: numero,
                ACCION: meta.accion,
                FECHA: ini.fecha,
                HORA: ini.hora,
                CELDA: celda,
                RBS: rbs,
                DURACION: duracion,
                ZONA_TEXTO: zona.texto,
                RANGO: zona.etiqueta,
            }
        );

        // ── Ficha (el recuadro superior del gráfico) ──
        const ficha = [
            { etiqueta: "RBS",      valor: rbs || "-" },
            { etiqueta: "Celda",    valor: celda || "-" },
            { etiqueta: "Zona",     valor: `${zona.texto.replace("zona ", "").toUpperCase()} - ${zona.etiqueta}` },
            { etiqueta: "Coord.",   valor: `${lat}, ${lng}` },
            { etiqueta: "Registro", valor: tipo || "-" },
            { etiqueta: "Duración", valor: duracion || "-" },
            { etiqueta: "IMEI",     valor: String(f.IMEI || "-").trim() },
        ];

        return {
            nro,
            etiqueta: `D${nro}`,
            titulo: `D${nro}. ${meta.corto} - ${ini.fecha} ${ini.hora}`,
            lat,
            lng,
            radio: zona.metros,          // metros para el círculo
            color: zona.color,
            zona: zona.texto.replace("zona ", "").toUpperCase(),
            rango: zona.etiqueta,
            numero,
            tipo,
            rbs,
            celda,
            duracion,
            fecha_ini: ini.iso,
            fecha_fin: fin.iso,
            ficha,
            interpretacion,
        };
    });

    // Centro del mapa = promedio de las coordenadas
    const centro = puntos.length
        ? [
            puntos.reduce((a, p) => a + p.lat, 0) / puntos.length,
            puntos.reduce((a, p) => a + p.lng, 0) / puntos.length,
          ]
        : [-21.5355, -64.7296];

    // Recorrido estimado (sectores, puntos estimados y tramos) — no altera nada de lo anterior
    const recorrido = construirRecorrido(puntos);

    return {
        titulo,
        numero: puntos[0]?.numero || "",
        total: puntos.length,
        centro,
        ruta: puntos.map((p) => [p.lat, p.lng]),   // línea cronológica
        puntos,
        recorrido,   // { puntos: [...], tramos: [...] }
    };
};

/* ═════════════════════════════════════════════════════════════
   RECORRIDO FORENSE (trazado de camino)
   ─────────────────────────────────────────────────────────────
   Todo geometría, sin IA. Para cada evento (en orden cronológico):

   1) SECTOR: del sufijo del nombre de la antena. En Entel el patrón
      es "..._4G-13", "..._LTE-33": el SEGUNDO dígito es el sector
      (1, 2, 3). Con la convención trisectorial estándar:
         sector 1 → azimut 0°   (Norte)
         sector 2 → azimut 120° (Sur-Este)
         sector 3 → azimut 240° (Sur-Oeste)
      (El azimut real solo lo tiene la operadora; esto es la
       convención estándar y así se declara en el informe.)

   2) PUNTO ESTIMADO dentro de la cobertura: en vez del centro de la
      antena, se estima un punto "tensado" hacia la trayectoria. Se
      toma la dirección hacia el vecino anterior y el siguiente y se
      empuja el punto una fracción del radio en esa dirección media.
      Así el punto cae del lado por donde la persona venía/iba.

   3) TRAMOS: entre puntos consecutivos se calcula rumbo (azimut),
      distancia (Haversine) y velocidad implícita (distancia/tiempo).
      Un tramo con velocidad físicamente imposible se marca como
      "salto no físico" (la línea recta no representa un camino real).
   ═════════════════════════════════════════════════════════════ */

// Convención trisectorial estándar
const AZIMUT_SECTOR = { 1: 0, 2: 120, 3: 240 };

// Velocidad por encima de la cual el tramo es físicamente imposible (km/h)
const VELOCIDAD_MAX_KMH = 130;

// Fracción del radio a la que se empuja el punto estimado hacia la trayectoria
const FRACCION_EMPUJE = 0.5;

/** Extrae el número de sector del nombre de la radio base (2º dígito del sufijo) */
const sectorDeRBS = (rbs) => {
    // "..._4G-13 (TARIJA)" | "..._LTE-33" → captura los dígitos tras el guion
    const m = String(rbs || "").match(/-(\d)(\d)\b/);
    if (!m) return null;
    const sec = parseInt(m[2], 10);
    return sec >= 1 && sec <= 3 ? sec : null;
};

/** Distancia Haversine en km (reutilizable) */
const havKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371, rad = (g) => (g * Math.PI) / 180;
    const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
};

/** Rumbo (azimut) inicial de A hacia B, en grados 0–360 */
const rumbo = (lat1, lon1, lat2, lon2) => {
    const rad = (g) => (g * Math.PI) / 180, deg = (r) => (r * 180) / Math.PI;
    const dLon = rad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(rad(lat2));
    const x = Math.cos(rad(lat1)) * Math.sin(rad(lat2)) -
              Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(dLon);
    return (deg(Math.atan2(y, x)) + 360) % 360;
};

/** Grados de rumbo → punto cardinal en texto */
const cardinal = (az) => {
    const dirs = ["Norte", "Noreste", "Este", "Sureste", "Sur", "Suroeste", "Oeste", "Noroeste"];
    return dirs[Math.round(az / 45) % 8];
};

/** Desplaza una coordenada 'distKm' km en dirección 'azGrados' */
const desplazar = (lat, lng, distKm, azGrados) => {
    const R = 6371, rad = (g) => (g * Math.PI) / 180, deg = (r) => (r * 180) / Math.PI;
    const d = distKm / R, az = rad(azGrados);
    const lat1 = rad(lat), lng1 = rad(lng);
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(az));
    const lng2 = lng1 + Math.atan2(
        Math.sin(az) * Math.sin(d) * Math.cos(lat1),
        Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );
    return [deg(lat2), deg(lng2)];
};

/** "HH:mm:ss" o "MM:ss" → segundos */
const duracionASeg = (txt) => {
    const p = String(txt || "").trim().split(":").map(Number);
    if (p.some(isNaN) || p.length < 2) return 0;
    return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
};

/** Diferencia en segundos entre dos "YYYY-MM-DD HH:mm:ss" */
const segundosEntre = (isoA, isoB) => {
    const f = (s) => {
        const m = String(s).match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
        return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime() : null;
    };
    const a = f(isoA), b = f(isoB);
    return a !== null && b !== null ? Math.round((b - a) / 1000) : null;
};

/** "8100 s" → "2 h 15 min" | "310 s" → "5 min 10 s" */
const tiempoHumano = (seg) => {
    if (seg === null || seg < 0) return "—";
    const h = Math.floor(seg / 3600), mi = Math.floor((seg % 3600) / 60), sg = seg % 60;
    if (h > 0) return mi > 0 ? `${h} h ${mi} min` : `${h} h`;
    if (mi > 0) return sg > 0 ? `${mi} min ${sg} s` : `${mi} min`;
    return `${sg} s`;
};

const construirRecorrido = (puntos) => {
    if (!puntos.length) return { puntos: [], tramos: [] };

    // radio en km de cada punto (viene en metros)
    const radioKm = (p) => (p.radio || 1000) / 1000;

    // ── 1) Punto estimado de cada evento (tensado hacia la trayectoria) ──
    const rp = puntos.map((p, i) => {
        const prev = puntos[i - 1];
        const next = puntos[i + 1];
        const sector = sectorDeRBS(p.rbs);
        const azSector = sector ? AZIMUT_SECTOR[sector] : null;

        // Dirección media hacia los vecinos (si existen)
        const azs = [];
        if (prev) azs.push(rumbo(p.lat, p.lng, prev.lat, prev.lng));
        if (next) azs.push(rumbo(p.lat, p.lng, next.lat, next.lng));

        let estLat = p.lat, estLng = p.lng;
        if (azs.length) {
            // promedio circular de los rumbos hacia los vecinos
            const x = azs.reduce((a, d) => a + Math.cos((d * Math.PI) / 180), 0);
            const y = azs.reduce((a, d) => a + Math.sin((d * Math.PI) / 180), 0);
            const azMedia = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
            // empuje: la mitad del radio hacia la franja de paso
            [estLat, estLng] = desplazar(p.lat, p.lng, radioKm(p) * FRACCION_EMPUJE, azMedia);
        }

        return {
            nro: p.nro,
            etiqueta: p.etiqueta,
            lat: p.lat,
            lng: p.lng,
            estLat,
            estLng,
            sector,
            azimutSector: azSector,
            duracion: p.duracion,
            zona: p.zona || "RURAL",   // URBANA | SEMIURBANA | RURAL (nivel de certeza)
            // ¿es parada o tránsito? (umbral 5 min de conexión)
            parada: duracionASeg(p.duracion) >= 300,
        };
    });

    // ── 2) Tramos entre puntos consecutivos ──
    const tramos = [];
    for (let i = 0; i < rp.length - 1; i++) {
        const a = rp[i], b = rp[i + 1];
        const distKm = havKm(a.estLat, a.estLng, b.estLat, b.estLng);
        const az = rumbo(a.estLat, a.estLng, b.estLat, b.estLng);

        const seg = segundosEntre(puntos[i].fecha_ini, puntos[i + 1].fecha_ini);
        const horas = seg && seg > 0 ? seg / 3600 : null;
        const velKmh = horas ? distKm / horas : null;
        const imposible = velKmh !== null && velKmh > VELOCIDAD_MAX_KMH;

        // Nivel de certeza del tramo según la zona más incierta que atraviesa.
        // El radio grande de las antenas rurales hace la trayectoria mucho menos
        // determinable; se declara explícitamente para no afirmar de más.
        const orden = { URBANA: 0, SEMIURBANA: 1, RURAL: 2 };
        const zonaTramo = orden[a.zona] >= orden[b.zona] ? a.zona : b.zona;

        // Coletilla de certeza que se añade a la interpretación normal
        const coletillaCerteza =
            zonaTramo === "URBANA"
                ? "El área es acotada (radio urbano de 300 m), por lo que la ubicación es relativamente precisa."
                : zonaTramo === "SEMIURBANA"
                ? "La trayectoria es aproximada; el radio de cobertura (5 km) implica un área de incertidumbre considerable."
                : "Trayectoria únicamente indicativa: no representa un camino real. El radio rural (10 km) implica un área de incertidumbre amplia y la ruta física no puede determinarse.";

        let interpretacion;
        if (imposible) {
            interpretacion =
                `Tramo ${a.etiqueta}→${b.etiqueta}: ${distKm.toFixed(1)} km en ${tiempoHumano(seg)} implica ` +
                `~${velKmh.toFixed(0)} km/h, físicamente inviable. Probable salto de red o desplazamiento no ` +
                `directo; la línea recta no representa un trayecto real.`;
        } else {
            interpretacion =
                `Tramo ${a.etiqueta}→${b.etiqueta}: desplazamiento hacia el ${cardinal(az)} (${az.toFixed(0)}°), ` +
                `${distKm.toFixed(2)} km en ${tiempoHumano(seg)}` +
                `${velKmh !== null ? `, velocidad implícita ~${velKmh.toFixed(0)} km/h` : ""}. ` +
                `${b.parada ? "El punto de llegada muestra permanencia (parada probable). " : "Punto de paso en movimiento. "}` +
                coletillaCerteza;
        }

        tramos.push({
            desde: a.etiqueta,
            hasta: b.etiqueta,
            distancia_km: Number(distKm.toFixed(2)),
            azimut: Number(az.toFixed(0)),
            direccion: cardinal(az),
            tiempo_seg: seg,
            tiempo_texto: tiempoHumano(seg),
            velocidad_kmh: velKmh !== null ? Number(velKmh.toFixed(1)) : null,
            imposible,
            zona: zonaTramo,                    // nivel de certeza del tramo
            certeza: zonaTramo === "URBANA" ? "alta" : zonaTramo === "SEMIURBANA" ? "media" : "baja",
            interpretacion,
        });
    }

    return { puntos: rp, tramos };
};

/* ─────────────────────────────────────────────────────────────
   GET /listarCasosAnalisis
   Devuelve solo los casos que tienen un archivo Excel adjunto.
   ───────────────────────────────────────────────────────────── */
const listarCasosAnalisis = async (req, res) => {
    try {
        const casos = await db.caso.findAll({ order: [["idcaso", "DESC"]] });
        const lista = casos
            .filter((c) => c.archivo && /\.(xlsx|xls)$/i.test(c.archivo))
            .map((c) => ({
                idcaso: c.idcaso,
                codigo: c.codigo,
                denunciante: c.denunciante,
                denunciado: c.denunciado,
                archivo: c.archivo,
            }));
        res.json(lista);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al listar casos con Excel" });
    }
};

/* ─────────────────────────────────────────────────────────────
   GET /analizarCaso/:idcaso
   Lee el Excel del caso y devuelve TODO listo para graficar.
   ───────────────────────────────────────────────────────────── */
const analizarCaso = async (req, res) => {
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
                rutasProbadas: intentos,   // aparece en la respuesta para depurar
            });
        }
        console.log("Analizando Excel:", ruta);

        // ── Elegir la hoja de LLAMADAS ──
        // El frontend puede mandar ?hoja=LLAMADAS_ENTEL_1 para forzar una.
        const hojaPedida = req.query.hoja;
        const resol = resolverHoja(ruta, "llamadas", hojaPedida);

        if (resol.estado === "vacio") {
            return res.status(400).json({
                mensaje: "El Excel no tiene ninguna hoja de LLAMADAS (nombre esperado: LLAMADAS_OPERADOR_N).",
            });
        }
        if (resol.estado === "invalida") {
            return res.status(400).json({
                mensaje: "La hoja indicada no existe en este caso.",
                opciones: resol.opciones,
            });
        }
        // Hay varias hojas de llamadas y no se especificó cuál → el front pregunta
        if (resol.estado === "elegir") {
            return res.json({
                requiereSeleccion: true,
                tipo: "llamadas",
                opciones: resol.opciones,   // [{ hoja, operador, indice, etiqueta }]
            });
        }

        const nombreHoja = resol.hoja.hoja;
        console.log("Hoja de llamadas:", nombreHoja);

        const { titulo, filas } = leerFilasExcel(ruta, nombreHoja);
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
        console.error("Error al analizar caso:", error);
        return res.status(500).json({ mensaje: "Error al analizar el Excel del caso" });
    }
};

/* ─────────────────────────────────────────────────────────────
   GET /diagnosticoArchivos
   Utilidad temporal: muestra qué carpetas existen y qué archivos
   hay dentro. Sirve para verificar dónde quedó guardado el Excel.
   ───────────────────────────────────────────────────────────── */
const diagnosticoArchivos = async (req, res) => {
    const carpetas = CARPETAS_POSIBLES.map((c) => {
        const existe = fs.existsSync(c);
        let archivos = [];
        if (existe) {
            try { archivos = fs.readdirSync(c); } catch { archivos = ["<sin permiso de lectura>"]; }
        }
        return { carpeta: c, existe, archivos };
    });

    let casos = [];
    try {
        const lista = await db.caso.findAll({ order: [["idcaso", "DESC"]] });
        casos = lista.map((c) => ({ idcaso: c.idcaso, codigo: c.codigo, archivo: c.archivo }));
    } catch { /* ignorar */ }

    res.json({ directorioActual: process.cwd(), carpetas, casos });
};

module.exports = { listarCasosAnalisis, analizarCaso, diagnosticoArchivos };