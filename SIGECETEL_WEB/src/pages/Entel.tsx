// src/pages/AsistenteExcelIA.tsx
// Flujo: elegir operador → pegar la sábana cruda → prompt corto (número + fechas)
// → la IA imprime la tablita en el chat → botón para descargar Excel (en el front).
// Sin interfaces: la tabla se dibuja con las columnas/filas que devuelva la IA.
import { useState } from "react";
import {
  Sparkles,
  User,
  ArrowUp,
  FileDown,
  ClipboardPaste,
} from "lucide-react";
import { ExcelService } from "../services/ExcelService";

export default function AsistenteExcelIA() {
  // Por ahora solo Entel; el back-end distingue el formato por el prompt.
  const operador = "entel";
  const [sabana, setSabana] = useState("");
  const [sabanaEnviada, setSabanaEnviada] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [ultimo, setUltimo] = useState<any>(null); // { titulo, columnas, filas }

  const enviar = async () => {
    if (!prompt.trim() || cargando) return;
    if (!sabanaEnviada && !sabana.trim()) {
      setMensajes((m) => [
        ...m,
        { autor: "ia", texto: "Primero pega la sábana de datos del operador en el recuadro superior." },
      ]);
      return;
    }

    const textoUsuario = prompt.trim();
    setMensajes((m) => [...m, { autor: "usuario", texto: textoUsuario }]);
    setPrompt("");
    setCargando(true);

    try {
      const { data } = await ExcelService.chatExcel(
        operador,
        textoUsuario,
        sabanaEnviada ? undefined : sabana,
        sabanaEnviada && ultimo
          ? { columnas: ultimo.columnas, filas: ultimo.filas }
          : undefined
      );

      if (!sabanaEnviada) setSabanaEnviada(true);

      if (data.filas && data.filas.length > 0) {
        setUltimo({ titulo: data.titulo, columnas: data.columnas, filas: data.filas });
      }

      setMensajes((m) => [
        ...m,
        { autor: "ia", texto: data.respuesta, columnas: data.columnas, filas: data.filas },
      ]);
    } catch {
      setMensajes((m) => [
        ...m,
        { autor: "ia", texto: "Ocurrió un error al consultar la IA. Intenta nuevamente." },
      ]);
    } finally {
      setCargando(false);
    }
  };

  const descargar = () => {
    if (ultimo) {
      ExcelService.descargarExcel(
        ultimo.columnas,
        ultimo.filas,
        ultimo.titulo,
        `georreferenciacion_${operador}.xlsx`
      );
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      {/* Scroll horizontal invisible: se puede desplazar la tabla sin ver la barra */}
      <style>{`
        .scroll-invisible { scrollbar-width: none; -ms-overflow-style: none; }
        .scroll-invisible::-webkit-scrollbar { height: 0; width: 0; display: none; }
      `}</style>

      {/* Toolbar */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
        {/* Instructivo de pestañas: visible y seleccionable para copiar */}
        <div className="flex items-center gap-2 rounded-lg bg-cyan-50 px-3 py-1.5 ring-1 ring-cyan-200 dark:bg-cyan-950/40 dark:ring-cyan-900">
          <ClipboardPaste size={14} className="shrink-0 text-cyan-600 dark:text-cyan-400" />
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Nombra las pestañas:</span>
          <code className="select-all rounded bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold text-cyan-700 ring-1 ring-cyan-200 dark:bg-slate-900 dark:text-cyan-300 dark:ring-cyan-900">
            LLAMADAS_ENTEL_1
          </code>
          <code className="select-all rounded bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold text-cyan-700 ring-1 ring-cyan-200 dark:bg-slate-900 dark:text-cyan-300 dark:ring-cyan-900">
            DATOS_ENTEL_1
          </code>
        </div>

        {ultimo && (
          <button
            onClick={descargar}
            className="flex h-9 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-medium text-emerald-950 hover:bg-emerald-400"
          >
            <FileDown size={15} />
            Descargar Excel ({ultimo.filas.length} registros)
          </button>
        )}
      </header>

      {/* Área para pegar la sábana (se oculta al enviarla) */}
      {!sabanaEnviada && (
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            <ClipboardPaste size={15} className="text-cyan-500" />
            Pega aquí la sábana (tal cual del PDF)
          </div>
          <textarea
            value={sabana}
            onChange={(e) => setSabana(e.target.value)}
            rows={6}
            placeholder="Tipo servicio  Tipo registro  Numero A  Imei A  RBS utilizada A ..."
            className="w-full resize-y rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
      )}

      {/* Chat */}
      <main className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
        {mensajes.length === 0 && (
          <div className="flex max-w-[82%] gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-100 dark:bg-cyan-950">
              <Sparkles size={16} className="text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="pt-1">
              <p className="text-sm leading-relaxed">
                Pega la sábana del operador y luego indícame el número y el rango de fechas.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Ejemplo: extrae 10 registros del 02/06/2025 al 03/06/2025 del número 72979034
              </p>
            </div>
          </div>
        )}

        {mensajes.map((msg, i) =>
          msg.autor === "usuario" ? (
            <div key={i} className="ml-auto flex max-w-[78%] flex-row-reverse gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-800">
                <User size={16} className="text-slate-600 dark:text-slate-300" />
              </div>
              <div className="rounded-2xl rounded-tr-md bg-cyan-600 px-4 py-3 text-cyan-50">
                <p className="text-sm leading-relaxed">{msg.texto}</p>
              </div>
            </div>
          ) : (
            <div key={i} className="flex max-w-[95%] gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-100 dark:bg-cyan-950">
                <Sparkles size={16} className="text-cyan-600 dark:text-cyan-400" />
              </div>
              <div className="flex flex-1 flex-col gap-3 pt-1">
                <p className="text-sm leading-relaxed">{msg.texto}</p>

                {/* La tablita: se dibuja con las columnas/filas que devuelva la IA.
                    Si tiene muchas columnas, se desplaza a la derecha con scroll
                    horizontal INVISIBLE (clase scroll-invisible). */}
                {msg.columnas && msg.columnas.length > 0 && msg.filas && msg.filas.length > 0 && (
                  <div className="scroll-invisible overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-max min-w-full text-left text-[11px]">
                      <thead className="bg-slate-100 text-[10px] uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                        <tr>
                          {msg.columnas.map((c: string, j: number) => (
                            <th key={j} className="whitespace-nowrap px-2 py-2 font-semibold">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950">
                        {msg.filas.map((f: string[], k: number) => (
                          <tr key={k}>
                            {f.map((v: string, j: number) => (
                              <td key={j} className="whitespace-nowrap px-2 py-1.5">
                                {v || "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {cargando && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Sparkles size={14} className="animate-pulse text-cyan-500" />
            Procesando sábana…
          </div>
        )}
      </main>

      {/* Composer */}
      <footer className="px-6 pb-6 pt-3">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && enviar()}
            placeholder="Ej: extrae 10 registros del 02/06/2025 al 03/06/2025 del número 72979034"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          <button
            aria-label="Enviar"
            onClick={enviar}
            disabled={cargando}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500 text-cyan-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </footer>
    </div>
  );
}