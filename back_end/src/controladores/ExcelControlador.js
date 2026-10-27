const { preguntarGemini } = require("../services/geminiService");

/* ═════════════════════════════════════════════════════════════
   PROMPTS FIJOS: por OPERADOR y por TIPO DE TRÁFICO
   Cada operador entrega formatos distintos, y dentro de cada
   operador el tráfico de LLAMADAS/SMS y el de DATOS tienen
   columnas diferentes. Todo el formato vive aquí, en el prompt.
   La IA devuelve "columnas" y "filas" genéricas.
   ═════════════════════════════════════════════════════════════ */

/* ───────────── ENTEL · LLAMADAS Y SMS ───────────── */
const PROMPT_ENTEL_LLAMADAS = `
Eres un asistente pericial experto en georreferenciación de celdas telefónicas.
Recibirás una SÁBANA DE TRÁFICO DE LLAMADAS/SMS de ENTEL copiada tal cual desde un
PDF/Word (texto desordenado, con saltos de línea dentro de las celdas, encabezados
repetidos por página, notas legales y pies de página que debes IGNORAR).

ESTRUCTURA REAL DE CADA REGISTRO ENTEL (llamadas/SMS):
Tipo servicio | Tipo registro | Numero A | Imei A | RBS utilizada A | Celda A | Latitud,longitud celda A | Numero B | Imei B | RBS utilizada B | Celda B | Latitud,longitud celda B | Fecha | Duracion

REGLAS DE EXTRACCIÓN:
1. El usuario indicará un NÚMERO OBJETIVO y un RANGO DE FECHAS (y opcionalmente
   horas o cantidad de registros). Filtra SOLO los eventos de ese número en ese rango.
2. Un mismo evento puede aparecer DOS VECES (una fila con la antena del lado A y
   otra con la del lado B). Toma ÚNICAMENTE la fila donde el NÚMERO OBJETIVO tiene
   datos de antena (IMEI, RBS, Celda, Latitud/Longitud distintos de "-"). No
   dupliques eventos: mismo número + misma fecha/hora + misma duración = un registro.
3. FECHA_INI = fecha y hora del registro, formato "YYYY-MM-DD HH:mm:ss".
   FECHA_FIN = FECHA_INI + DURACION (si la duración es "-" o "00:00:00", FECHA_FIN = FECHA_INI).
4. LATITUD y LONGITUD vienen juntas como "lat,long" (a veces partidas en dos líneas,
   ej: "-21.746479,-\\n64.737814"). Sepáralas en dos columnas y usa COMA como
   separador decimal (ej: "-21,746479" y "-64,737814"), con 6 decimales.
5. RADIO_BASE en MAYÚSCULAS, uniendo las partes cortadas por saltos de línea
   (ej: "HUAYCO_GRAND\\nE_IRB2_4G-22 (Tarija)" → "HUAYCO_GRANDE_IRB2_4G-22 (TARIJA)").
6. TIPO = Tipo servicio + Tipo registro (ej: "SMS ENTRANTE", "LLAMADA SALIENTE",
   "LLAMADA ENTRANTE").
7. Las columnas "TIPO_ZONA" y "RANGO_ESTABLECIDO" SIEMPRE van vacías "".
   NO las inventes ni las deduzcas: el sistema las calcula automáticamente
   después, por densidad de antenas.
8. NO inventes registros. Ordena cronológicamente y numera desde 1.
9. Si el usuario pide "los primeros N registros", limita a N.
10. Si se te proporciona un RESULTADO ANTERIOR y el usuario pide ajustes,
    aplícalos sobre esos datos.

FORMATO DE SALIDA — RESPONDE SOLO CON ESTE JSON, SIN TEXTO EXTRA NI BACKTICKS:
{
  "titulo": "Con respecto a la realización de la georreferenciación de celdas telefónicas con respecto a llamadas entrantes, salientes, perdidas, mensajes SMS entrantes, salientes y datos móviles en el rango de fechas <RANGO> del número <NUMERO>.",
  "columnas": ["Nro.","FECHA_INI","FECHA_FIN","NUMERO","IMEI","RADIO_BASE","CELDA","LATITUD","LONGITUD","DURACION","TIPO","TIPO_ZONA","RANGO_ESTABLECIDO"],
  "filas": [
    ["1","2025-06-02 12:17:22","2025-06-02 12:17:22","72979034","35743584358771","CHOCLOCA_4G-11 (TARIJA)","64787","-21,746479","-64,737814","-","SMS ENTRANTE","",""]
  ],
  "respuesta": "Resumen breve: cuántos registros se extrajeron, de qué número y periodo."
}
`;

/* ───────────── ENTEL · TRÁFICO DE DATOS MÓVILES ───────────── */
const PROMPT_ENTEL_DATOS = `
Eres un asistente pericial experto en georreferenciación de celdas telefónicas.
Recibirás una SÁBANA DE TRÁFICO DE DATOS MÓVILES de ENTEL copiada tal cual desde un
PDF/Word (texto desordenado, con saltos de línea dentro de las celdas, encabezados
repetidos por página, notas legales y pies de página que debes IGNORAR).

ESTRUCTURA DEL ENCABEZADO ENTEL (datos móviles):
Fecha inicio | Fecha fin | Numero | Imei | RBS utilizada | celda | Latitud longitud celda | Volumen datos subidos (bytes) | Volumen datos descargados (bytes) | Volumen total datos (bytes)

MUY IMPORTANTE — EL ORDEN REAL DEL TEXTO EXTRAÍDO NO COINCIDE CON EL ENCABEZADO.
En el texto los valores aparecen realmente en este orden:
  Fecha inicio → Fecha fin → Numero → Imei → CELDA → Latitud,longitud → RADIO_BASE → bytes subidos → bytes descargados → bytes total
Además el nombre de la RADIO_BASE suele venir PEGADO a la longitud, sin espacio,
y muchas veces partido en varias líneas.

REGLAS DE EXTRACCIÓN:
1. El usuario indicará un NÚMERO OBJETIVO y un RANGO DE FECHAS (y opcionalmente
   cantidad de registros). Filtra SOLO las sesiones de ese número dentro de ese rango,
   comparando por la FECHA DE INICIO. Descarta las filas fuera del rango.
2. Aquí NO hay número A y número B: cada fila es una sesión de datos del número
   objetivo. No hay que deduplicar por contraparte. Dos sesiones con la misma antena
   pero distinta hora son registros DIFERENTES: consérvalas todas.
3. FECHA_INICIO y FECHA_FIN en formato "YYYY-MM-DD HH:mm:ss".
3b. DURACION = FECHA_FIN menos FECHA_INICIO, en formato "HH:mm:ss"
   (ej: de "2025-06-02 00:11:43" a "2025-06-02 23:20:00" → "23:08:17").
   El sistema la recalcula igual, pero inclúyela siempre.
3c. Nro. = numeración correlativa desde 1, en orden cronológico.
4. LATITUD y LONGITUD vienen juntas como "lat,long" (a veces partidas en dos líneas).
   Sepáralas en dos columnas, con COMA como separador decimal y 6 decimales
   (ej: "-21,514058" y "-64,725004").
5. RADIO_BASE en MAYÚSCULAS, uniendo las partes cortadas por saltos de línea y
   separándola de la longitud cuando venga pegada
   (ej: "-64.725004FINAL_COLON_LTE-23 (Tarija)" → longitud "-64,725004" y
   radio base "FINAL_COLON_LTE-23 (TARIJA)").
6. BYTES_SUB, BYTES_DES y BYTES_TOTAL: escríbelos con PUNTO como separador de miles
   (ej: 28406117 → "28.406.117"). Son valores en bytes tal como vienen en la sábana.
7. MB_TOTAL = BYTES_TOTAL dividido entre 1048576, con 2 decimales y COMA decimal
   (ej: 808.054.148 bytes → "770,62").
8. Las columnas "TIPO_ZONA" y "RANGO_ESTABLECIDO" SIEMPRE van vacías "".
   NO las inventes ni las deduzcas: el sistema las calcula automáticamente
   después, por densidad de antenas.
9. NO inventes registros. Ordena cronológicamente por FECHA_INICIO.
10. Si el usuario pide "los primeros N registros", limita a N.
11. Si se te proporciona un RESULTADO ANTERIOR y el usuario pide ajustes,
    aplícalos sobre esos datos.

EJEMPLO REAL DE CONVERSIÓN:
Texto de la sábana:
  "02/06/2025 00:11:43 02/06/2025 23:20:00 72979034 35743584358771 601036 -21.514058,-64.725004FINAL_COLON_LTE-23 (Tarija) 28406117 779648031 808054148"
Fila resultante:
  ["1","2025-06-02 00:11:43","2025-06-02 23:20:00","23:08:17","72979034","35743584358771","FINAL_COLON_LTE-23 (TARIJA)","601036","-21,514058","-64,725004","28.406.117","779.648.031","808.054.148","770,62","",""]

FORMATO DE SALIDA — RESPONDE SOLO CON ESTE JSON, SIN TEXTO EXTRA NI BACKTICKS:
{
  "titulo": "Con respecto a la realización de la georreferenciación de celdas telefónicas con respecto a llamadas entrantes, salientes, perdidas, mensajes SMS entrantes, salientes y datos móviles en el rango de fechas <RANGO> del número <NUMERO>.",
  "columnas": ["Nro.","FECHA_INICIO","FECHA_FIN","DURACION","NUMERO","IMEI","RADIO_BASE","CELDA","LATITUD","LONGITUD","BYTES_SUB","BYTES_DES","BYTES_TOTAL","MB_TOTAL","TIPO_ZONA","RANGO_ESTABLECIDO"],
  "filas": [
    ["1","2025-06-02 00:11:43","2025-06-02 23:20:00","23:08:17","72979034","35743584358771","FINAL_COLON_LTE-23 (TARIJA)","601036","-21,514058","-64,725004","28.406.117","779.648.031","808.054.148","770,62","",""]
  ],
  "respuesta": "Resumen breve: cuántas sesiones de datos se extrajeron, de qué número y periodo."
}
`;

/* ───────────── VIVA y TIGO (formatos pendientes) ───────────── */
const pendiente = (operador, tipo) => `
Eres un asistente pericial experto en georreferenciación de celdas telefónicas.
Recibirás una sábana de ${tipo} del operador ${operador}.
(FORMATO PENDIENTE — responde SOLO con este JSON:
{ "columnas": [], "filas": [], "respuesta": "El formato de ${tipo} de ${operador} aún no está configurado en el sistema." })
`;

const PROMPTS = {
    entel: {
        llamadas: PROMPT_ENTEL_LLAMADAS,
        datos: PROMPT_ENTEL_DATOS,
    },
    viva: {
        llamadas: pendiente("VIVA", "tráfico de llamadas/SMS"),
        datos: pendiente("VIVA", "tráfico de datos"),
    },
    tigo: {
        llamadas: pendiente("TIGO", "tráfico de llamadas/SMS"),
        datos: pendiente("TIGO", "tráfico de datos"),
    },
};

/* ═════════════════════════════════════════════════════════════
   DETECCIÓN DEL TIPO DE TRÁFICO
   1) Si el usuario lo dice en su mensaje, manda su indicación.
   2) Si no, se deduce por los encabezados de la sábana pegada.
   ═════════════════════════════════════════════════════════════ */
const detectarTipoTrafico = (mensaje = "", datosCrudos = "") => {
    const m = String(mensaje).toLowerCase();

    // 1) Indicación explícita del usuario
    if (/tr[aá]fico\s+de\s+datos|datos\s+m[oó]viles|navegaci[oó]n|internet/.test(m)) return "datos";
    if (/tr[aá]fico\s+de\s+llamadas|llamadas?\s*(y|\/)?\s*(sms|mensajes)?|sms|mensajes?/.test(m)) return "llamadas";

    // 2) Deducción por el contenido de la sábana
    const d = String(datosCrudos).toLowerCase();
    if (/volumen\s+(de\s+)?datos|descargados|subidos|bytes/.test(d)) return "datos";
    if (/tipo\s+servicio|tipo\s+registro|duracion|duración|numero\s+b/.test(d)) return "llamadas";

    // 3) Por defecto
    return "llamadas";
};

/* ═════════════════════════════════════════════════════════════
   NORMALIZACIÓN EN EL SERVIDOR
   Todo lo que se puede calcular con certeza se recalcula aquí y
   NO se deja en manos de la IA. Estas funciones son genéricas:
   detectan las columnas por su nombre, así sirven para la tabla
   de llamadas/SMS y para la de datos móviles.
   ═════════════════════════════════════════════════════════════ */

/** Índice de una columna por nombre (ignora espacios y puntos) */
const buscarCol = (columnas, ...nombres) =>
    columnas.findIndex((c) => {
        const limpio = String(c).toUpperCase().replace(/[\s.]/g, "");
        return nombres.includes(limpio);
    });

/* ── Bytes y megabytes ── */
const soloDigitos = (v) => {
    const n = parseInt(String(v ?? "").replace(/[^\d]/g, ""), 10);
    return isNaN(n) ? null : n;
};
const conMiles = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const aMegas = (n) => (n / 1048576).toFixed(2).replace(".", ",");

const normalizarBytes = (columnas, filas) => {
    const iSub = buscarCol(columnas, "BYTES_SUB");
    const iDes = buscarCol(columnas, "BYTES_DES");
    const iTot = buscarCol(columnas, "BYTES_TOTAL");
    const iMb = buscarCol(columnas, "MB_TOTAL");

    if (iTot < 0 && iMb < 0) return filas;   // no es tabla de datos

    return filas.map((f) => {
        const fila = [...f];
        const sub = iSub >= 0 ? soloDigitos(fila[iSub]) : null;
        const des = iDes >= 0 ? soloDigitos(fila[iDes]) : null;
        let tot = iTot >= 0 ? soloDigitos(fila[iTot]) : null;

        // Si falta el total pero hay subida y bajada, se calcula
        if (tot === null && sub !== null && des !== null) tot = sub + des;

        if (iSub >= 0 && sub !== null) fila[iSub] = conMiles(sub);
        if (iDes >= 0 && des !== null) fila[iDes] = conMiles(des);
        if (iTot >= 0 && tot !== null) fila[iTot] = conMiles(tot);
        if (iMb >= 0 && tot !== null) fila[iMb] = aMegas(tot);

        return fila;
    });
};

/* ── Coordenadas: siempre coma decimal y 6 decimales ── */
const normalizarCoordenada = (v) => {
    const n = parseFloat(String(v ?? "").trim().replace(",", "."));
    if (isNaN(n)) return v;
    return n.toFixed(6).replace(".", ",");
};

const normalizarCoordenadas = (columnas, filas) => {
    const iLat = buscarCol(columnas, "LATITUD");
    const iLng = buscarCol(columnas, "LONGITUD");
    if (iLat < 0 && iLng < 0) return filas;

    return filas.map((f) => {
        const fila = [...f];
        if (iLat >= 0) fila[iLat] = normalizarCoordenada(fila[iLat]);
        if (iLng >= 0) fila[iLng] = normalizarCoordenada(fila[iLng]);
        return fila;
    });
};

/* ── Duración: se recalcula desde las dos fechas ── */
const aFecha = (s) => {
    const m = String(s ?? "").trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
};

const aDuracion = (ini, fin) => {
    const a = aFecha(ini);
    const b = aFecha(fin);
    if (!a || !b) return null;
    let seg = Math.round((b - a) / 1000);
    if (seg < 0) return null;
    const h = Math.floor(seg / 3600);
    const mi = Math.floor((seg % 3600) / 60);
    const sg = seg % 60;
    return [h, mi, sg].map((n) => String(n).padStart(2, "0")).join(":");
};

/** Solo aplica a la tabla de datos, donde la duración es la sesión completa */
const normalizarDuracionDatos = (columnas, filas) => {
    const iIni = buscarCol(columnas, "FECHA_INICIO");
    const iFin = buscarCol(columnas, "FECHA_FIN");
    const iDur = buscarCol(columnas, "DURACION");
    if (iIni < 0 || iFin < 0 || iDur < 0) return filas;

    return filas.map((f) => {
        const fila = [...f];
        const d = aDuracion(fila[iIni], fila[iFin]);
        if (d) fila[iDur] = d;
        return fila;
    });
};

/* ── Orden cronológico y numeración correlativa ── */
const ordenarYNumerar = (columnas, filas) => {
    const iFecha = buscarCol(columnas, "FECHA_INI", "FECHA_INICIO");
    const iNro = buscarCol(columnas, "NRO");

    let salida = [...filas];
    if (iFecha >= 0) {
        salida.sort((a, b) => String(a[iFecha] ?? "").localeCompare(String(b[iFecha] ?? "")));
    }
    if (iNro >= 0) {
        salida = salida.map((f, i) => {
            const fila = [...f];
            fila[iNro] = String(i + 1);
            return fila;
        });
    }
    return salida;
};

/* ═════════════════════════════════════════════════════════════
   CLASIFICACIÓN AUTOMÁTICA DE ZONA (TIPO_ZONA + RANGO_ESTABLECIDO)
   ─────────────────────────────────────────────────────────────
   Lógica: el radio de cobertura de una antena es inversamente
   proporcional a la densidad de antenas a su alrededor. En ciudad
   las antenas están muy juntas (cobertura corta); en el campo,
   muy separadas (cobertura larga). Por eso las operadoras usan
   300 m urbano / 5 km semiurbano / 10 km rural.

   Para cada antena se mide la DISTANCIA a la antena distinta más
   cercana del propio caso (fórmula de Haversine, distancia real
   sobre la superficie terrestre) y se clasifica:

     < 1 km          → URBANA      → 300 M
     entre 1 y 4 km  → SEMIURBANA  → 5 KM
     > 4 km          → RURAL       → 10 KM

   Es una SUGERENCIA automática que hace ~90% del trabajo; el perito
   revisa y corrige en el Excel descargado cuando algún caso de borde
   lo amerite. Solo se rellena si la columna viene vacía (no pisa un
   valor que el usuario ya haya puesto manualmente en un refinamiento).
   ═════════════════════════════════════════════════════════════ */

// Umbrales de distancia a la antena vecina más cercana (en km)
const UMBRAL_URBANA = 1;      // < 1 km  → urbana
const UMBRAL_SEMIURBANA = 4;  // 1–4 km  → semiurbana ; > 4 km → rural

const ZONA_URBANA = { zona: "URBANA", rango: "300 M" };
const ZONA_SEMIURBANA = { zona: "SEMIURBANA", rango: "5 KM" };
const ZONA_RURAL = { zona: "RURAL", rango: "10 KM" };

/** "-21,514058" | "-21.514058" → -21.514058 (número) */
const aCoord = (v) => {
    const n = parseFloat(String(v ?? "").trim().replace(",", "."));
    return isNaN(n) ? null : n;
};

/** Distancia Haversine entre dos coordenadas, en kilómetros */
const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // radio terrestre en km
    const rad = (g) => (g * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
};

/** Clasifica según la distancia (km) a la antena vecina más cercana */
const clasificarPorDistancia = (distKm) => {
    if (distKm === null) return ZONA_RURAL;           // sin vecinos → conservador
    if (distKm < UMBRAL_URBANA) return ZONA_URBANA;
    if (distKm <= UMBRAL_SEMIURBANA) return ZONA_SEMIURBANA;
    return ZONA_RURAL;
};

/**
 * Rellena TIPO_ZONA y RANGO_ESTABLECIDO por densidad de antenas.
 * Agrupa por celda/coordenada única, mide la distancia a la antena
 * distinta más cercana y aplica esa clasificación a todas las filas
 * de esa misma antena. Sirve igual para llamadas y para datos.
 */
const clasificarZonas = (columnas, filas) => {
    const iLat = buscarCol(columnas, "LATITUD");
    const iLng = buscarCol(columnas, "LONGITUD");
    const iZona = buscarCol(columnas, "TIPO_ZONA");
    const iRango = buscarCol(columnas, "RANGO_ESTABLECIDO");

    // Si no hay coordenadas o no existen las columnas destino, no hay nada que hacer
    if (iLat < 0 || iLng < 0 || (iZona < 0 && iRango < 0)) return filas;

    // 1) Antenas únicas del caso (por coordenada redondeada, para agrupar iguales)
    const clave = (lat, lng) => `${lat.toFixed(5)},${lng.toFixed(5)}`;
    const antenas = new Map(); // clave → { lat, lng }
    filas.forEach((f) => {
        const lat = aCoord(f[iLat]);
        const lng = aCoord(f[iLng]);
        if (lat === null || lng === null) return;
        antenas.set(clave(lat, lng), { lat, lng });
    });
    const listaAntenas = [...antenas.values()];

    // 2) Para cada antena única, distancia a la vecina distinta más cercana
    const zonaPorClave = new Map(); // clave → { zona, rango }
    for (const [k, a] of antenas.entries()) {
        let minKm = null;
        for (const b of listaAntenas) {
            if (b === a) continue;
            const d = haversineKm(a.lat, a.lng, b.lat, b.lng);
            if (minKm === null || d < minKm) minKm = d;
        }
        zonaPorClave.set(k, clasificarPorDistancia(minKm));
    }

    // 3) Aplicar a cada fila (solo si la celda destino está vacía)
    return filas.map((f) => {
        const fila = [...f];
        const lat = aCoord(fila[iLat]);
        const lng = aCoord(fila[iLng]);
        if (lat === null || lng === null) return fila;

        const cls = zonaPorClave.get(clave(lat, lng));
        if (!cls) return fila;

        const vacio = (v) => String(v ?? "").trim() === "";
        if (iZona >= 0 && vacio(fila[iZona])) fila[iZona] = cls.zona;
        if (iRango >= 0 && vacio(fila[iRango])) fila[iRango] = cls.rango;
        return fila;
    });
};

/* ═════════════════════════════════════════════════════════════
   POST /chatExcel
   body: {
     operador: "entel" | "viva" | "tigo",
     mensaje:  "extrae 10 registros de tráfico de datos del 02/06/2025 al 03/06/2025 del número 72979034",
     datosCrudos: "sábana pegada tal cual",     (primera vez)
     resultadoPrevio: { columnas, filas },      (opcional: para refinar)
     tipoTrafico: "llamadas" | "datos"          (opcional: si no viene, se detecta)
   }
   Respuesta: { respuesta, titulo, columnas, filas, tipoTrafico }
   ═════════════════════════════════════════════════════════════ */
const chatExcel = async (req, res) => {
    try {
        const { operador, mensaje, datosCrudos, resultadoPrevio, tipoTrafico } = req.body;

        const op = String(operador || "").toLowerCase();
        if (!op || !PROMPTS[op]) {
            return res.status(400).json({ respuesta: "Debes indicar el operador: entel, viva o tigo." });
        }
        if (!mensaje) {
            return res.status(400).json({ respuesta: "Debes indicar qué extraer (número y rango de fechas)." });
        }
        if (!datosCrudos && !resultadoPrevio) {
            return res.status(400).json({ respuesta: "Debes pegar la sábana de datos del operador." });
        }

        // Tipo de tráfico: el del body si viene, si no se detecta solo
        const tipo =
            tipoTrafico === "datos" || tipoTrafico === "llamadas"
                ? tipoTrafico
                : detectarTipoTrafico(mensaje, datosCrudos);

        console.log(`chatExcel → operador: ${op} | tipo de tráfico: ${tipo}`);

        let systemPrompt = PROMPTS[op][tipo];

        if (datosCrudos) {
            systemPrompt += `

--- SÁBANA DE DATOS (${op.toUpperCase()} · ${tipo === "datos" ? "TRÁFICO DE DATOS" : "LLAMADAS Y SMS"}) ---
${datosCrudos}
--- FIN DE LA SÁBANA ---
`;
        }

        if (resultadoPrevio && resultadoPrevio.filas && resultadoPrevio.filas.length > 0) {
            systemPrompt += `

--- RESULTADO ANTERIOR (el usuario pedirá ajustes sobre estos datos) ---
${JSON.stringify(resultadoPrevio)}
--- FIN DEL RESULTADO ANTERIOR ---
`;
        }

        const respuestaTexto = await preguntarGemini(systemPrompt, mensaje);
        console.log("Respuesta cruda Gemini (excel):", respuestaTexto.substring(0, 300));

        let resultadoIA;
        try {
            const limpio = respuestaTexto.replace(/```json/gi, "").replace(/```/g, "").trim();
            const match = limpio.match(/\{[\s\S]*\}/);
            resultadoIA = JSON.parse(match ? match[0] : limpio);
        } catch (errorJson) {
            console.log("Gemini no devolvió JSON válido en chatExcel");
            return res.json({ respuesta: respuestaTexto, columnas: [], filas: [], tipoTrafico: tipo });
        }

        const columnas = resultadoIA.columnas || [];
        let filas = resultadoIA.filas || [];

        // La IA NO debe adivinar TIPO_ZONA / RANGO_ESTABLECIDO: se limpia lo que
        // ella haya puesto para que el clasificador por densidad (Haversine) los
        // rellene con un criterio objetivo más abajo.
        const idxZona = columnas.findIndex((c) => String(c).toUpperCase().includes("TIPO_ZONA"));
        const idxRango = columnas.findIndex((c) => String(c).toUpperCase().includes("RANGO"));
        filas = filas.map((f) => {
            const fila = [...f];
            if (idxZona >= 0) fila[idxZona] = "";
            if (idxRango >= 0) fila[idxRango] = "";
            return fila;
        });

        // ── Normalizaciones garantizadas por el servidor ──
        filas = normalizarBytes(columnas, filas);          // bytes con miles + MB exactos
        filas = normalizarCoordenadas(columnas, filas);    // coma decimal, 6 decimales
        filas = normalizarDuracionDatos(columnas, filas);  // duración de la sesión de datos
        filas = ordenarYNumerar(columnas, filas);          // orden cronológico + Nro. correlativo
        filas = clasificarZonas(columnas, filas);          // TIPO_ZONA + RANGO por densidad (Haversine)

        return res.json({
            respuesta: resultadoIA.respuesta || `Se extrajeron ${filas.length} registros.`,
            titulo: resultadoIA.titulo || "",
            columnas,
            filas,
            tipoTrafico: tipo,
        });
    } catch (error) {
        console.error("Error IA excel:", error);
        return res.status(500).json({ mensaje: "Error al consultar la IA." });
    }
};

module.exports = { chatExcel };