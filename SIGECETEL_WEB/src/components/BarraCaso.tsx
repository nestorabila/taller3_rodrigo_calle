import { Link, useLocation } from "react-router-dom";
import { FileSpreadsheet, FolderOpen, X } from "lucide-react";
import { cerrarCaso, useCasoActivo } from "../services/CasoActivo";

/**
 * Barra fija bajo el menú: dice en qué caso se está trabajando y quiénes intervienen.
 * Se ve en todos los módulos.
 */
export default function BarraCaso() {
  const caso = useCasoActivo();
  const { pathname } = useLocation();
  const enCasos = pathname === "/app/casos";

  if (!caso) {
    return (
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-5 py-1.5 text-xs text-slate-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-400 print:hidden">
        <FolderOpen size={14} className="shrink-0" />
        <span>Ningún caso abierto.</span>
        {enCasos
          ? <span>Haz doble clic en un caso, o usa su botón Abrir, para trabajar en él.</span>
          : <Link to="/app/casos" className="font-medium text-blue-700 underline-offset-2 hover:underline dark:text-blue-300">Abrir uno desde Casos</Link>}
      </div>
    );
  }

  const dato = (titulo: string, valor?: string | null) => (
    <div className="min-w-0">
      <div className="text-[11px] leading-tight text-slate-500 dark:text-slate-400">{titulo}</div>
      <div className="truncate text-[13px] font-medium leading-tight" title={valor || ""}>{valor || "—"}</div>
    </div>
  );

  return (
    <div className="flex items-center gap-x-6 gap-y-1 border-b border-blue-200 bg-blue-50 py-1.5 pl-5 pr-24 text-slate-800 dark:border-blue-400/20 dark:bg-blue-950 dark:text-slate-100 print:hidden">
      <div className="flex shrink-0 items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white"><FolderOpen size={16} /></span>
        <div>
          <div className="text-[11px] leading-tight text-blue-800 dark:text-blue-300">Caso abierto</div>
          <div className="text-sm font-semibold leading-tight tabular-nums">{caso.codigo}</div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-x-6 overflow-x-auto">
        {dato("Tipo", caso.tipo)}
        {dato("Denunciante", caso.denunciante)}
        {dato("Denunciado", caso.denunciado)}
        {dato("Responsable", caso.responsable)}
        {dato("Registrado", [caso.fecha, caso.hora].filter(Boolean).join(" "))}
        <div className="min-w-0">
          <div className="text-[11px] leading-tight text-slate-500 dark:text-slate-400">Archivo</div>
          <div className={`flex items-center gap-1 truncate text-[13px] font-medium leading-tight ${caso.archivo ? "" : "text-amber-700 dark:text-amber-300"}`} title={caso.archivo || ""}>
            <FileSpreadsheet size={13} className="shrink-0" />
            <span className="truncate">{caso.archivo || "Sin archivo adjunto"}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={cerrarCaso}
        title="Cerrar el caso (no lo borra)"
        className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-blue-600/10 dark:text-slate-300"
      >
        <X size={14} /> Cerrar caso
      </button>
    </div>
  );
}
