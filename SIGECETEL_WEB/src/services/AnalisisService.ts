// src/services/AnalisisService.ts
// Todo el cálculo (radios, coordenadas, interpretaciones) viene del backend.
// El front solo consume y dibuja.
import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export const AnalisisService = {
  // Casos que tienen un Excel adjunto (para el selector de ambos mapas)
  listarCasosAnalisis: (tipo?: "llamadas" | "datos") =>
    axios.get(`${API}/listarCasosAnalisis`, {
      params: tipo ? { tipo } : undefined,
    }),

  // Tráfico de llamadas y SMS. Si el caso tiene varias hojas LLAMADAS_*,
  // se pasa "hoja" para elegir cuál (ej: "LLAMADAS_ENTEL_2").
  analizarCaso: (idcaso: number, hoja?: string) =>
    axios.get(`${API}/analizarCaso/${idcaso}`, {
      params: hoja ? { hoja } : undefined,
    }),

  // Tráfico de datos móviles. Igual: "hoja" para elegir entre DATOS_*.
  analizarCasoDatos: (idcaso: number, hoja?: string) =>
    axios.get(`${API}/analizarCasoDatos/${idcaso}`, {
      params: hoja ? { hoja } : undefined,
    }),
};
