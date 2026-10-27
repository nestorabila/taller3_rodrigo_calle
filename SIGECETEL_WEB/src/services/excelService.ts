
import axios from "axios";
import * as XLSX from "xlsx";

const API = import.meta.env.VITE_API_URL;

export const ExcelService = {
  // IA de georreferenciación.
  // - datosCrudos: la sábana pegada tal cual (solo la primera vez)
  // - resultadoPrevio: { columnas, filas } cuando el usuario pide refinar
  chatExcel: (
    operador: string,
    mensaje: string,
    datosCrudos?: string,
    resultadoPrevio?: { columnas: string[]; filas: string[][] }
  ) =>
    axios.post(`${API}/chatExcel`, {
      operador,
      mensaje,
      datosCrudos,
      resultadoPrevio,
    }),

  // Genera y descarga el .xlsx DIRECTO EN EL FRONT (SheetJS), sin backend.
  descargarExcel: (
    columnas: string[],
    filas: string[][],
    titulo?: string,
    nombreArchivo: string = "georreferenciacion.xlsx"
  ) => {
    const hoja: (string | number)[][] = [];

    if (titulo) {
      hoja.push([titulo]);
      hoja.push([]);
    }
    hoja.push(columnas);
    filas.forEach((f) => hoja.push(f));

    const ws = XLSX.utils.aoa_to_sheet(hoja);

    // Anchos de columna aproximados según el contenido
    ws["!cols"] = columnas.map((c, j) => {
      const maxLen = Math.max(
        String(c).length,
        ...filas.map((f) => String(f[j] ?? "").length)
      );
      return { wch: Math.min(Math.max(maxLen + 2, 8), 40) };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GEORREFERENCIACION");
    XLSX.writeFile(wb, nombreArchivo);
  },
};