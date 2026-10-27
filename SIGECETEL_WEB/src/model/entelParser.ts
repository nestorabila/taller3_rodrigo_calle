import * as pdfjs from "pdfjs-dist";
import { parseRbsName } from "./trafficGeo";

// Worker desde CDN
pdfjs.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface TrafficRecord {
  id: number;
  start: Date;
  end: Date;
  numero: string;
  imei: string;
  rbs: string;
  site: string;
  tech: "LTE" | "4G" | "?";
  sector: number;
  banda: number;
  celda: string;
  lat: number;
  lng: number;
  bytesUp: number;
  bytesDown: number;
  bytesTotal: number;
}

interface PdfItem {
  str: string;
  transform: number[];
}

/**
 * Fragmento de texto reproyectado a coordenadas VISUALES:
 *   row  -> crece hacia ABAJO en la página
 *   col  -> crece hacia la DERECHA
 * Esto es independiente de la rotación de la página.
 */
interface Frag {
  str: string;
  row: number;
  col: number;
}

export async function parseEntelPdf(file: File): Promise<TrafficRecord[]> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;

  const out: TrafficRecord[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);

    const raw = (await page.getTextContent()).items;

    const items = raw.filter(
      (it): it is PdfItem => "str" in it && "transform" in it
    );

    // Reproyectar cada fragmento segun la rotacion de la pagina.
    // El detalle de trafico de ENTEL viene con page.rotate === 90,
    // por lo que transform[4] es la FILA y transform[5] es la COLUMNA.
    const frags = items
      .filter(it => it.str.trim() !== "")
      .map(it => toFrag(it, page.rotate));

    extractRecordsFromPage(frags, out);
  }

  console.log("TOTAL REGISTROS:", out.length);

  return out;
}

/**
 * pdf.js entrega los transforms en el sistema del PDF (sin rotar).
 * Aqui los llevamos a coordenadas visuales (row hacia abajo, col hacia
 * la derecha) para que la logica de filas/columnas funcione tanto con
 * paginas rotadas (90/270) como con paginas normales (0/180).
 */
function toFrag(it: PdfItem, rotate: number): Frag {
  const e = it.transform[4];
  const f = it.transform[5];

  switch (((rotate % 360) + 360) % 360) {
    case 90:
      return { str: it.str, row: e, col: f };
    case 180:
      return { str: it.str, row: f, col: -e };
    case 270:
      return { str: it.str, row: -e, col: -f };
    default: // 0
      return { str: it.str, row: -f, col: e };
  }
}

// Tolerancia (en "row") para agrupar fragmentos de una misma fila.
// Los nombres RBS largos se parten en 2 lineas (nombre + "(Tarija)")
// desplazadas ~±3.5; el alto de fila es ~20, asi que 6 separa bien.
const ROW_TOL = 6;

function extractRecordsFromPage(frags: Frag[], out: TrafficRecord[]): void {
  // Agrupar por "row" con tolerancia -> cada grupo es una fila de la tabla.
  const rows: { row: number; frags: Frag[] }[] = [];

  for (const fr of [...frags].sort((a, b) => a.row - b.row)) {
    let r = rows.find(r => Math.abs(r.row - fr.row) <= ROW_TOL);

    if (!r) {
      r = { row: fr.row, frags: [] };
      rows.push(r);
    }

    r.frags.push(fr);
    r.row = r.frags.reduce((s, x) => s + x.row, 0) / r.frags.length;
  }

  for (const r of rows) {
    const line = joinRow(r.frags);
    const rec = parseLine(line, out.length + 1);

    if (rec) out.push(rec);
  }
}

function joinRow(frags: Frag[]): string {
  return [...frags]
    .sort((a, b) =>
      // Ordenar por columna (izquierda -> derecha). Si dos fragmentos
      // comparten columna (nombre RBS + "(Tarija)"), desempatar por row
      // para que la primera linea del nombre quede antes.
      Math.abs(a.col - b.col) < 5 ? a.row - b.row : a.col - b.col
    )
    .map(fr => fr.str)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

const ROW_RE =
  /^(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}) (\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}) (\d{7,12}) (\d{8,17}) (.+?\(Tarija\)) (\d{4,8}) (-?\d+\.\d+),(-?\d+\.\d+) (\d+) (\d+) (\d+)$/;

function parseLine(line: string, id: number): TrafficRecord | null {
  const m = line.match(ROW_RE);

  if (!m) return null;

  const rbs = m[5].trim();

  return {
    id,
    start: parseDate(m[1]),
    end: parseDate(m[2]),
    numero: m[3],
    imei: m[4],
    rbs,
    ...parseRbsName(rbs),
    celda: m[6],
    lat: +m[7],
    lng: +m[8],
    bytesUp: +m[9],
    bytesDown: +m[10],
    bytesTotal: +m[11],
  };
}

function parseDate(s: string): Date {
  const [d, t] = s.split(" ");
  const [day, mon, year] = d.split("/").map(Number);
  const [h, mi, se] = t.split(":").map(Number);

  return new Date(year, mon - 1, day, h, mi, se);
}