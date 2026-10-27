// Lista de casos para los módulos de análisis (Llamadas/SMS y Datos).
// Incluye TODOS los casos: los que todavía no tienen una sábana utilizable
// se marcan con sinSabana para pedir la subida del archivo en vez de ocultarlos.
import { AnalisisService } from "./AnalisisService";
import { CasoService } from "./CasoService";

export type CasoParaAnalisis = {
  idcaso: number;
  codigo: string;
  denunciante: string;
  denunciado: string;
  archivo: string | null;
  sinSabana: boolean;
  tipo?: string;
  responsable?: string;
  fecha?: string;
  hora?: string;
  estado?: number;
};

export const listarCasosParaAnalisis = async (tipo: "llamadas" | "datos"): Promise<CasoParaAnalisis[]> => {
  const [conSabana, todos] = await Promise.all([
    AnalisisService.listarCasosAnalisis(tipo).then((r) => r.data || []),
    CasoService.reporteCaso().then((r) => r.data || []).catch(() => []),
  ]);

  // Datos completos de cada caso (tipo, responsable, fecha) para mostrarlos en la barra del caso abierto
  const detalle = new Map<number, any>((todos as any[]).map((c) => [c.idcaso, c]));
  const completar = (c: any, sinSabana: boolean): CasoParaAnalisis => {
    const d = detalle.get(c.idcaso) || {};
    return {
      idcaso: c.idcaso,
      codigo: c.codigo,
      denunciante: c.denunciante,
      denunciado: c.denunciado,
      archivo: c.archivo || d.archivo || null,
      sinSabana,
      tipo: d.tipo?.nombre,
      responsable: [d.persona?.nombre, d.persona?.ap_paterno].filter(Boolean).join(" ") || undefined,
      fecha: d.fecha,
      hora: d.hora,
      estado: d.estado,
    };
  };

  const listos = new Set<number>(conSabana.map((c: any) => c.idcaso));
  const pendientes = (todos as any[])
    .filter((c) => !listos.has(c.idcaso))
    .sort((a, b) => b.idcaso - a.idcaso);

  return [...conSabana.map((c: any) => completar(c, false)), ...pendientes.map((c) => completar(c, true))];
};
