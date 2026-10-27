import React, { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Search, GripVertical, Sparkles, Wand2, ArrowUp,
  ShieldPlus, X, Save, Pencil, Trash2,
  Loader2,
} from "lucide-react";
import { RolService } from "../services/RolService";

/* Paleta para la numeración (clases completas) */
const PALETTE = [
  "bg-violet-500/15 text-violet-600 dark:text-violet-300",
  "bg-blue-500/15 text-blue-600 dark:text-blue-300",
  "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  "bg-rose-500/15 text-rose-600 dark:text-rose-300",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300",
];

const EJEMPLOS = [
  "Lista todos los roles",
  "¿Cuántos roles existen?",
  "Crea un rol llamado Auditoría",
  "Ordena los roles alfabéticamente",
];

const MIN_PANEL = 300, MAX_PANEL = 560, MIN_LISTA = 360, DEFAULT_PANEL = 360;

const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-white/5";
const labelCls = "mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400";

export default function Roles() {
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL);
  const [isDesktop, setIsDesktop] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const containerRef = useRef(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const onPointerDown = (e:any) => { draggingRef.current = true; e.currentTarget.setPointerCapture(e.pointerId); document.body.style.userSelect = "none"; document.body.style.cursor = "col-resize"; };
  const onPointerMove = (e:any) => {
    if (!draggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let w = rect.right - e.clientX;
    const maxAllowed = Math.min(MAX_PANEL, rect.width - MIN_LISTA);
    w = Math.max(MIN_PANEL, Math.min(w, maxAllowed));
    setPanelWidth(w);
  };
  const onPointerUp = (e) => { draggingRef.current = false; try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {} document.body.style.userSelect = ""; document.body.style.cursor = ""; };
  const resetWidth = () => setPanelWidth(DEFAULT_PANEL);


  // listar roles y filtro
 const [roles, setRoles] = useState<any[]>([]);
const [filtro, setFiltro] = useState("");

const listar = async () => {
  const data = await (await RolService.listarRol()).data;
  console.log("listar", data);
  setRoles(data);
};

const buscar = async (filtro: string) => {
  const data = await (await RolService.buscarRol(filtro)).data;
  setRoles(data);
};

const registrar = async (data: { nombre: string }) => {
  await RolService.registrarRol(data);
  listar();          // refresca la lista
  setShowForm(false);
  form.reset();
};

// cargar pagina
useEffect(() => {
  listar();
}, []);
// registrar la funcion
const form = useForm({
  defaultValues: {
    nombre: "",
  },
});

const {
  register,
  handleSubmit,
  formState: { errors },
} = form;




/* ============================================================
   PEGAR DENTRO DE export default function Roles() { ... }
   (junto a tus estados de listar/buscar/registrar)
   ============================================================ */

// ---- Estado del chat IA ----
const [mensajeIA, setMensajeIA] = useState("");
const [cargandoIA, setCargandoIA] = useState(false);
const [chat, setChat] = useState<{ rol: "user" | "ia"; texto: string }[]>([]);
const chatRef = useRef<HTMLDivElement>(null);

// autoscroll del chat
useEffect(() => {
  chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
}, [chat, cargandoIA]);

// ---- Formatea el "resultado" que devuelve el backend para mostrarlo bonito ----
const formatearResultadoRol = (resultado: any): string => {
  if (!resultado) return "";

  // Lista de roles (consultar / buscar)
  if (Array.isArray(resultado)) {
    if (resultado.length === 0) return "No hay roles para mostrar.";
    return resultado
      .map(
        (r: any) =>
          `${String(r.idrol).padStart(2, "0")} · ${r.nombre}` +
          (r.personas_asignadas !== undefined
            ? `  (${r.personas_asignadas} persona/s)`
            : "")
      )
      .join("\n");
  }

  // Detalle
  if (resultado.personas_asignadas !== undefined && resultado.nombre) {
    return [
      `Rol: ${resultado.nombre} (id ${resultado.idrol})`,
      `Personas asignadas: ${resultado.personas_asignadas}`,
      `Permisos asignados: ${resultado.permisos_asignados ?? 0}`,
    ].join("\n");
  }

  // Registrar / modificar / eliminar
  if (resultado.mensaje) {
    return resultado.nombre
      ? `${resultado.mensaje}: ${resultado.nombre}`
      : resultado.mensaje;
  }

  return "";
};

// ---- Enviar mensaje a la IA ----
const enviarIA = async (textoDirecto?: string) => {
  const texto = (textoDirecto ?? mensajeIA).trim();
  if (!texto || cargandoIA) return;

  setChat((prev) => [...prev, { rol: "user", texto }]);
  setMensajeIA("");
  setCargandoIA(true);

  try {
    const { data } = await RolService.chatRol(texto);

    const extra = formatearResultadoRol(data.resultado);
    const respuesta = [data.respuesta, extra].filter(Boolean).join("\n\n");

    setChat((prev) => [
      ...prev,
      { rol: "ia", texto: respuesta || "Listo." },
    ]);

    // Si la IA ejecutó algo que cambia la BD, refrescamos la lista
    if (data.resultado) {
      filtro.trim() ? buscar(filtro) : listar();
    }
  } catch (error) {
    console.error(error);
    setChat((prev) => [
      ...prev,
      { rol: "ia", texto: "Ocurrió un error al consultar la IA." },
    ]);
  } finally {
    setCargandoIA(false);
  }
};





  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-6">
      <style>{`
        @keyframes despliegue { from { opacity: 0; transform: translateY(-8px) scale(0.99); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .despliegue { animation: despliegue .18s ease-out; }
      `}</style>

      <div ref={containerRef} className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row lg:gap-0">

        {/* ================= IZQUIERDA: LISTA ================= */}
        <div className="min-w-0 flex-1 lg:pr-2">
          <div className="mb-5">
            <h1 className="text-xl font-semibold tracking-tight">Roles</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{roles.length} roles</p>
          </div>

          {/* SEARCH + BOTÓN REGISTRAR */}
          <div className="relative z-30 mb-6">
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/10 dark:border-white/10 dark:bg-white/5">
                <Search size={16} className="opacity-50" />
                <input value={filtro}
  onChange={(e) => {
    const valor = e.target.value;
    setFiltro(valor);
    valor.trim() ? buscar(valor) : listar();
  }}
  placeholder="Buscar rol…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
              </div>
              <button
                onClick={() => setShowForm((v) => !v)}
                title="Registrar nuevo rol"
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm transition ${showForm ? "bg-slate-400 dark:bg-slate-600" : "bg-gradient-to-br from-indigo-500 to-violet-500 hover:opacity-90"}`}
              >
                {showForm ? <X size={18} /> : <ShieldPlus size={18} />}
              </button>
            </div>

            {/* ===== FORMULARIO DESPLEGABLE (sobre el listado) ===== */}
            {showForm && (
              <form onSubmit={handleSubmit(registrar)}>
              <div className="despliegue absolute left-0 right-0 top-full mt-2 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-xl ring-1 ring-black/5 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/90">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"><ShieldPlus size={17} /></div>
                    <div>
                      <div className="text-sm font-semibold">Registrar nuevo rol</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Ingresa el nombre del rol</div>
                    </div>
                  </div>
                  <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-white/10"><X size={18} /></button>
                </div>

                {/* Único campo */}
                <div>
                  <label className={labelCls}>Nombre del rol</label>
                  <input {...register("nombre", { required: "El nombre del rol es obligatorio.",
                         minLength: {
      value: 3, message: "Debe tener al menos 3 caracteres.",},
                        maxLength: {value: 30, message: "No puede superar los 30 caracteres.",  },
                      })}
                   className={inputCls} placeholder="Ej. Auditoría"/>
                </div>

                {/* Botones */}
                <div className="mt-5 flex items-center justify-between gap-2">
                  <button onClick={() => setShowForm(false)} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10">
                    <X size={15} /> Salir
                  </button>
                  <button type="submit" className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90">
                    <Save size={15} /> Guardar
                  </button>
                </div>
              </div>
              </form>
            )}
            {/* mensajes -------------- */}
{errors.nombre && (
  <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
    {errors.nombre.message}
  </p>
)}
          </div>


          {/* LISTA DE ROLES (numeración + nombre) */}
          <div className="space-y-3">
            {roles.map((r, i) => (
              <div key={r.id} className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex min-w-0 items-center gap-3.5">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold ${PALETTE[i % PALETTE.length]}`}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <span className="truncate font-semibold">{r.nombre}</span>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button title="Editar Desde Agente de IA" className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-white/10"><Pencil size={15} /></button>
                  <button title="Eliminar Desde Agente de IA" className="rounded-xl p-2 text-rose-500 transition hover:bg-rose-500/10"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ================= BARRITA ================= */}
        <div
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onDoubleClick={resetWidth}
          title="Arrastra para ajustar · doble clic para restablecer"
          className="group hidden shrink-0 cursor-col-resize touch-none items-center justify-center self-stretch px-1 lg:flex"
        >
          <div className="flex h-16 w-1.5 items-center justify-center rounded-full bg-slate-200 transition-colors group-hover:bg-indigo-400 dark:bg-white/10 dark:group-hover:bg-indigo-500">
            <GripVertical size={14} className="text-transparent group-hover:text-white" />
          </div>
        </div>
{/* ================= DERECHA: PANEL IA (ROLES) =================
   ============================================================ */}
<aside style={isDesktop ? { width: panelWidth } : undefined} className="w-full shrink-0 lg:pl-2">
  <div className="sticky top-6 flex h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">

    {/* Header */}
    <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 p-4 dark:border-white/10">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm">
        <Sparkles size={17} />
      </div>
      <div>
        <div className="text-sm font-semibold">Asistente IA</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">Pídeme acciones sobre los roles</div>
      </div>
    </div>

    {/* Chat */}
    <div ref={chatRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">


      {chat.map((m, i) =>
        m.rol === "user" ? (
          <div key={i} className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-indigo-500 to-violet-500 px-3 py-2 text-xs text-white shadow-sm">
              {m.texto}
            </div>
          </div>
        ) : (
          <div key={i} className="flex items-start gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
              <Sparkles size={13} />
            </div>
            <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              {m.texto}
            </div>
          </div>
        )
      )}

      {cargandoIA && (
        <div className="flex items-start gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
            <Sparkles size={13} />
          </div>
          <div className="flex gap-1 rounded-2xl rounded-bl-md border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/10 dark:bg-white/5">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
          </div>
        </div>
      )}
    </div>

    {/* Input */}
    <div className="shrink-0 border-t border-slate-200 p-3 dark:border-white/10">
      <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10 dark:border-white/10 dark:bg-white/5">
        <textarea
          rows={1}
          value={mensajeIA}
          onChange={(e) => setMensajeIA(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarIA(); }
          }}
          disabled={cargandoIA}
          placeholder="Escribe lo que necesitas…"
          className="max-h-28 w-full resize-none bg-transparent px-1 py-1.5 text-sm outline-none placeholder:text-slate-400 disabled:opacity-60"
        />
        <button
          onClick={() => enviarIA()}
          disabled={cargandoIA || !mensajeIA.trim()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cargandoIA ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} />}
        </button>
      </div>
    </div>

  </div>
</aside>
      </div>
    </div>
  );
}

