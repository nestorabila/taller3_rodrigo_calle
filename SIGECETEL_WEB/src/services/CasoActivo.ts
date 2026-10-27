// Caso abierto: el caso en el que está trabajando este usuario en este navegador.
// Se abre desde el módulo Casos (o al registrar uno) y lo comparten todos los módulos:
// la barra superior lo muestra y los mapas y el reporte arrancan con él.
import { useEffect, useState } from "react";

export type CasoActivo = {
  idcaso: number;
  codigo: string;
  denunciante: string;
  denunciado: string;
  tipo?: string;
  responsable?: string;
  fecha?: string;
  hora?: string;
  archivo?: string | null;
  estado?: number;
};

const CLAVE = "casoActivo";
const EVENTO = "sigecetel:caso-activo";

export const leerCasoActivo = (): CasoActivo | null => {
  try {
    const c = JSON.parse(localStorage.getItem(CLAVE) || "null");
    return c && c.idcaso ? c : null;
  } catch {
    return null;
  }
};

/** Convierte un caso (de la lista de Casos o de los selectores) en el caso abierto */
export const aCasoActivo = (c: any): CasoActivo => ({
  idcaso: Number(c.idcaso),
  codigo: String(c.codigo ?? ""),
  denunciante: String(c.denunciante ?? ""),
  denunciado: String(c.denunciado ?? ""),
  tipo: c.tipo?.nombre ?? (typeof c.tipo === "string" ? c.tipo : undefined),
  responsable:
    c.responsable ??
    ([c.persona?.nombre, c.persona?.ap_paterno].filter(Boolean).join(" ") || undefined),
  fecha: c.fecha,
  hora: c.hora,
  archivo: c.archivo || null,
  estado: c.estado === undefined ? undefined : Number(c.estado),
});

export const abrirCaso = (c: any) => {
  const anterior = leerCasoActivo();
  const nuevo = aCasoActivo(c);
  // Si es el mismo caso y el origen trae menos datos, se conservan los que ya se conocían
  const caso = anterior && anterior.idcaso === nuevo.idcaso
    ? { ...anterior, ...Object.fromEntries(Object.entries(nuevo).filter(([, v]) => v !== undefined)) }
    : nuevo;
  localStorage.setItem(CLAVE, JSON.stringify(caso));
  window.dispatchEvent(new Event(EVENTO));
};

export const cerrarCaso = () => {
  localStorage.removeItem(CLAVE);
  window.dispatchEvent(new Event(EVENTO));
};

/** Devuelve el caso abierto y se actualiza cuando cambia en cualquier módulo */
export const useCasoActivo = () => {
  const [caso, setCaso] = useState<CasoActivo | null>(leerCasoActivo);
  useEffect(() => {
    const actualizar = () => setCaso(leerCasoActivo());
    window.addEventListener(EVENTO, actualizar);
    window.addEventListener("storage", actualizar);
    return () => {
      window.removeEventListener(EVENTO, actualizar);
      window.removeEventListener("storage", actualizar);
    };
  }, []);
  return caso;
};
