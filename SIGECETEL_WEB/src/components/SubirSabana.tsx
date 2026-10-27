import { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { CasoService } from "../services/CasoService";

/**
 * Se muestra cuando el caso elegido todavía no tiene una sábana que se pueda analizar.
 * Sube el Excel al caso y avisa para que el mapa vuelva a cargar.
 */
export default function SubirSabana({
  caso,
  tipo,
  onListo,
}: {
  caso: { idcaso: number; codigo: string; archivo?: string | null };
  tipo: "llamadas" | "datos";
  onListo: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");

  const hojas = tipo === "llamadas" ? "llamadas y SMS (LLAMADAS_OPERADOR_N)" : "datos móviles (DATOS_OPERADOR_N)";

  const subir = async (archivo: File) => {
    if (!/\.xlsx?$/i.test(archivo.name)) {
      setError("El archivo debe ser un Excel (.xlsx o .xls).");
      return;
    }
    setSubiendo(true);
    setError("");
    try {
      await CasoService.modificarArchivoCaso(caso.idcaso, archivo);
      onListo();
    } catch (e: any) {
      setError(e?.response?.data?.mensaje || "No se pudo subir el archivo. Inténtalo otra vez.");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="pointer-events-auto w-[340px] max-w-[calc(100vw-32px)] rounded-2xl bg-white/90 p-5 text-center shadow-lg ring-1 ring-slate-900/10 backdrop-blur-xl dark:bg-slate-900/90 dark:ring-white/10">
      <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl bg-blue-600/10 text-blue-700 dark:text-blue-300"><FileUp size={18} /></div>
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">El caso {caso.codigo} todavía no tiene sábana</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        Sube el Excel de la operadora con la hoja de {hojas} para poder graficarlo.
      </p>
      {caso.archivo && (
        <p className="mt-2 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
          Este caso ya tiene un archivo ({caso.archivo}) sin esa hoja. Al subir uno nuevo, lo reemplaza.
        </p>
      )}

      <input
        ref={input}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) subir(f);
        }}
      />
      <button
        type="button"
        disabled={subiendo}
        onClick={() => input.current?.click()}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {subiendo ? <Loader2 size={15} className="animate-spin" /> : <FileUp size={15} />}
        {subiendo ? "Subiendo…" : "Subir sábana"}
      </button>
      {error && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
