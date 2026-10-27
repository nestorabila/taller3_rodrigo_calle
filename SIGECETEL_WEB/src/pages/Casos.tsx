import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Search, Sparkles, Wand2, ArrowUp, ArrowRight, X, Save, ChevronDown,
  FilePlus, FileText, FolderOpen, Check, FileSpreadsheet, Download, Calendar, Clock,
  UserCog, UploadCloud, Maximize2, Minimize2,
  AlertCircle, Loader2,  // 👈 agregar Loader2
} from "lucide-react";
import { CasoService } from "../services/CasoService";
import { abrirCaso, useCasoActivo } from "../services/CasoActivo";
import { TipoService } from "../services/TipoService";
import { TIPOS_PENALES_BOLIVIA } from "../data/tiposPenalesBolivia";
import { useForm } from "react-hook-form";


const TIPO_STYLES: Record<string, string> = {
  "Acoso": "bg-amber-500/10 text-amber-600 dark:text-amber-300 ring-1 ring-inset ring-amber-500/20",
  "Plagio": "bg-violet-500/10 text-violet-600 dark:text-violet-300 ring-1 ring-inset ring-violet-500/20",
  "Violación de reglamento": "bg-rose-500/10 text-rose-600 dark:text-rose-300 ring-1 ring-inset ring-rose-500/20",
  "Fraude": "bg-blue-500/10 text-blue-600 dark:text-blue-300 ring-1 ring-inset ring-blue-500/20",
  "Maltrato": "bg-rose-500/10 text-rose-600 dark:text-rose-300 ring-1 ring-inset ring-rose-500/20",
  "Otro": "bg-slate-500/10 text-slate-600 dark:text-slate-300 ring-1 ring-inset ring-slate-500/20",
};
const ESTADO_STYLES: Record<string, { bar: string; cls: string; dot: string }> = {
  Activo: {
    bar: "bg-emerald-500",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  Aplazado: {
    bar: "bg-rose-500",
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    dot: "bg-rose-500",
  },
};

const EJEMPLOS = ["Casos activos", "¿Cuántos concluidos hay?", "Filtra tipo Acoso", "Registrados este mes"];

const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-white/5";
const labelCls = "mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-400";
const iniciales = (n = "") => n.split(" ").filter(Boolean).slice(0, 2).map((p: string) => p[0]).join("").toUpperCase();
const normalizarTexto = (texto = "") => texto.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const AI_DEFAULT_H = 340;

export default function Casos() {
  const [showForm, setShowForm] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiHeight, setAiHeight] = useState(AI_DEFAULT_H);
  const [expanded, setExpanded] = useState(false);

  const barRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const draggingAiRef = useRef(false);

  const onGripDown = (e:any) => {
    if (expanded && popoverRef.current) {
      const h = popoverRef.current.getBoundingClientRect().height;
      setExpanded(false);
      setAiHeight(h);
    }
    draggingAiRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    document.body.style.userSelect = "none";
  };
  const onGripMove = (e:any) => {
    if (!draggingAiRef.current || !barRef.current) return;
    const anchor = barRef.current.getBoundingClientRect().top - 12;
    let h = anchor - e.clientY;
    h = Math.max(220, Math.min(h, window.innerHeight * 0.85));
    setExpanded(false);
    setAiHeight(h);
  };
  const onGripUp = (e:any) => {
    draggingAiRef.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    document.body.style.userSelect = "";
  };

const [casos, setCasos] = useState<any[]>([]);
const casoActivo = useCasoActivo();
const [tipos, setTipos] = useState<any[]>([]);
const [filtro, setFiltro] = useState("");
const [tipoBusqueda, setTipoBusqueda] = useState("");
const [tiposSeleccionados, setTiposSeleccionados] = useState<string[]>([]);
const [tipoMenuAbierto, setTipoMenuAbierto] = useState(false);

// ===== Estados IA =====
const [mensajeIA, setMensajeIA] = useState("");
const [cargandoIA, setCargandoIA] = useState(false);
const [chat, setChat] = useState<{ rol: "user" | "ia"; texto: string }[]>([]);
const chatRef = useRef<HTMLDivElement>(null);

const listar = async () => {
  const data = await (await CasoService.listarCaso()).data;
  console.log("Casos listar casos:", data);
  setCasos(data);
  return data as any[];
};

const buscar = async (filtro: string) => {
  const data = await (await CasoService.buscarCaso(filtro)).data;
  setCasos(data);
};

const listarTipos = async () => {
  const { data } = await TipoService.listarTipo();
  console.log("Tipos de tipo:", data);
  setTipos(data);
};


const registrar = async (data: any) => {
  try {
    const ahora = new Date();

    const fecha = ahora.toLocaleDateString("en-CA");
    const hora = ahora.toTimeString().slice(0, 8);
      let nombreArchivo = "";
    if (data.archivo && data.archivo instanceof File) {
      const res = await CasoService.subirArchivo(data.archivo);
      nombreArchivo = res.data.nombre;
    }
    const caso = {
      codigo: data.codigo,
      denunciante: data.denunciante,
      denunciado: data.denunciado,
      archivo: nombreArchivo,
      fecha,
      hora,
      estado: 1,
      persona: {
        idpersona: JSON.parse(localStorage.getItem("usuario") || "{}").idpersona ?? 1
      },
      tipoNombre: data.tipo,
    };
 console.log("Enviando casos para registrar:", caso);
    const creado = (await CasoService.registrarCaso(caso)).data;
console.log("Caso registrado:", caso);
    const lista = await listar();
    // El caso recién creado queda abierto: la barra superior lo muestra en todos los módulos
    abrirCaso(lista.find((c) => c.idcaso === creado?.idcaso) || { ...caso, ...creado, tipo: data.tipo });
    form.reset();
    setTiposSeleccionados([]);
    setTipoBusqueda("");
    setTipoMenuAbierto(false);
    setShowForm(false);
  } catch (error) {
    console.error(error);
  }
};


useEffect(() => {
  listar();
  listarTipos();
}, []);

const form = useForm<any>({
  mode: "onChange",
  defaultValues: {
    tipo: "",
    codigo: "",
    denunciante: "",
    denunciado: "",
    archivo: null,
  },
});

const {
  register,
  handleSubmit,
  setValue,
  formState: { errors, isValid },
} = form;

const inputErr = (err: any) =>
  `${inputCls} ${
    err
      ? "border-rose-400 focus:border-rose-400 focus:ring-rose-500/10 dark:border-rose-400/60"
      : ""
  }`;

const opcionesTipoCaso = useMemo(() => {
  const existentes = tipos.map((t: any) => t?.nombre).filter(Boolean);
  return Array.from(new Set([...TIPOS_PENALES_BOLIVIA, ...existentes]));
}, [tipos]);

const sugerenciasTipoCaso = useMemo(() => {
  const consulta = normalizarTexto(tipoBusqueda);
  const tokens = consulta.split(/\s+/).filter(Boolean);
  return opcionesTipoCaso
    .filter((opcion) => !tiposSeleccionados.includes(opcion))
    .filter((opcion) => {
      if (tokens.length === 0) return true;
      const normalizado = normalizarTexto(opcion);
      return tokens.every((token) => normalizado.includes(token));
    })
    .slice(0, 18);
}, [opcionesTipoCaso, tipoBusqueda, tiposSeleccionados]);

const sincronizarTiposSeleccionados = (seleccionados: string[]) => {
  setTiposSeleccionados(seleccionados);
  setValue("tipo", seleccionados.join(" y "), {
    shouldDirty: true,
    shouldTouch: true,
    shouldValidate: true,
  });
};

const agregarTipoPenal = (tipo: string) => {
  const limpio = tipo.trim().replace(/\s+/g, " ");
  if (!limpio || tiposSeleccionados.includes(limpio)) return;
  sincronizarTiposSeleccionados([...tiposSeleccionados, limpio]);
  setTipoBusqueda("");
  setTipoMenuAbierto(false);
};

const quitarTipoPenal = (tipo: string) => {
  sincronizarTiposSeleccionados(tiposSeleccionados.filter((item) => item !== tipo));
};

const manejarTeclaTipo = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const sugerida = sugerenciasTipoCaso[0];
    if (sugerida) agregarTipoPenal(sugerida);
    else if (tipoBusqueda.trim()) agregarTipoPenal(tipoBusqueda);
  }
  if (e.key === "Backspace" && !tipoBusqueda && tiposSeleccionados.length > 0) {
    e.preventDefault();
    quitarTipoPenal(tiposSeleccionados[tiposSeleccionados.length - 1]);
  }
};



const [modalArchivo, setModalArchivo] = useState<{ open: boolean; caso: any }>({
  open: false,
  caso: null,
});
const [nuevoArchivo, setNuevoArchivo] = useState<File | null>(null);

const abrirModalArchivo = (caso: any) => {
  setNuevoArchivo(null);
  setModalArchivo({ open: true, caso });
};

const cerrarModalArchivo = () => {
  setModalArchivo({ open: false, caso: null });
  setNuevoArchivo(null);
};

const actualizarArchivo = async () => {
  if (!nuevoArchivo) {
    alert("Selecciona un archivo primero.");
    return;
  }
  try {
    await CasoService.modificarArchivoCaso(modalArchivo.caso.idcaso, nuevoArchivo);
    await listar();
    cerrarModalArchivo();
  } catch (error) {
    console.error(error);
    alert("Error al actualizar el archivo.");
  }
};




  // IA para casos
const enviarIA = async () => {
  const texto = mensajeIA.trim();
  if (!texto || cargandoIA) return;

  // 1) mete el mensaje del usuario y limpia el input de inmediato
  setChat((prev) => [...prev, { rol: "user", texto }]);
  setMensajeIA("");

  try {
    setCargandoIA(true);
    const { data } = await CasoService.chatUsuario(texto);
    setChat((prev) => [...prev, { rol: "ia", texto: data.respuesta }]);
    await listar(); // refresca la lista por si la IA modificó/cambió estado
  } catch (error) {
    console.error("Error IA:", error);
    setChat((prev) => [...prev, { rol: "ia", texto: "Ocurrió un error al procesar tu solicitud." }]);
  } finally {
    setCargandoIA(false);
  }
};

// auto-scroll al último mensaje
useEffect(() => {
  chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
}, [chat, cargandoIA]);
  
  const wide = expanded || aiHeight > 460;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      <style>{`
        @keyframes despliegue { from { opacity: 0; transform: translateY(-8px) scale(0.99); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .despliegue { animation: despliegue .18s ease-out; }
        @keyframes subir { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .subir { animation: subir .2s ease-out; }
      `}</style>

      <div className="mx-auto max-w-5xl px-6 pb-36 pt-6">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-xl font-semibold tracking-tight">Casos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{casos.length} casos registrados</p>
        </div>

        {/* SEARCH + REGISTRAR */}
        <div className="relative z-30 mb-5">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/10 dark:border-white/10 dark:bg-white/5">
              <Search size={16} className="opacity-50" />
              <input  value={filtro} onChange={(e) => { const valor = e.target.value;
              setFiltro(valor); valor.trim() ? buscar(valor) : listar(); }}
           onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              placeholder="" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
            </div>
            <button
              onClick={() => setShowForm((v) => !v)}
              title="Registrar nuevo caso"
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm transition ${showForm ? "bg-slate-400 dark:bg-slate-600" : "bg-gradient-to-br from-indigo-500 to-violet-500 hover:opacity-90"}`}
            >
              {showForm ? <X size={18} /> : <FilePlus size={18} />}
            </button>
          </div>

          {/* FORM DESPLEGABLE */}
          {showForm && (
            <div className="despliegue absolute left-0 right-0 top-full mt-2 max-h-[74vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-xl ring-1 ring-black/5 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/90">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"><FilePlus size={17} /></div>
                  <div>
                    <div className="text-sm font-semibold">Registrar nuevo caso</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Completa los datos del caso</div>
                  </div>
                </div>
                <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-white/10"><X size={18} /></button>
              </div>
             <form onSubmit={handleSubmit(registrar)}>

<div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">

  {/* Código */}
  <div>
    <label className={labelCls}>Código del caso</label>

    <input
      className={inputErr(errors.codigo)}
      placeholder=""
      inputMode="numeric"
      {...register("codigo", {
        required: "El código es obligatorio",
        minLength: {
          value: 3,
          message: "Debe tener al menos 3 dígitos",
        },
        maxLength: {
          value: 100,
          message: "Máximo 100 dígitos",
        },
        pattern: {
          value: /^\d+$/,
          message: "Solo se permiten números",
        },
      })}
    />

    {errors.codigo && (
      <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-500">
        <AlertCircle size={12} />
        {errors.codigo.message as string}
      </p>
    )}
  </div>

  {/* Tipo */}
  <div>
    <label className={labelCls}>Tipo de caso</label>
    <input
      type="hidden"
      {...register("tipo", {
        required: "Selecciona al menos un tipo penal",
      })}
    />

    <div className="relative">
      <div className={`${inputErr(errors.tipo)} min-h-[46px] px-2 py-1.5`}>
        <div className="flex flex-wrap items-center gap-1.5">
          {tiposSeleccionados.map((tipo) => (
            <span
              key={tipo}
              className="inline-flex max-w-full items-center gap-1 rounded-lg bg-indigo-500/10 px-2 py-1 text-xs font-medium text-indigo-200 ring-1 ring-inset ring-indigo-400/20"
            >
              <span className="truncate">{tipo}</span>
              <button
                type="button"
                onClick={() => quitarTipoPenal(tipo)}
                className="rounded-full p-0.5 text-indigo-200/80 hover:bg-indigo-500/20 hover:text-white"
                title="Quitar tipo penal"
              >
                <X size={12} />
              </button>
            </span>
          ))}
          <input
            value={tipoBusqueda}
            onChange={(e) => {
              setTipoBusqueda(e.target.value);
              setTipoMenuAbierto(true);
            }}
            onFocus={() => setTipoMenuAbierto(true)}
            onKeyDown={manejarTeclaTipo}
            placeholder=""
            className="min-w-[180px] flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      {tipoMenuAbierto && sugerenciasTipoCaso.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-xl ring-1 ring-black/5 dark:border-white/10 dark:bg-slate-900">
          {sugerenciasTipoCaso.map((tipo) => (
            <button
              key={tipo}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => agregarTipoPenal(tipo)}
              className="block w-full px-3 py-2 text-left text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-200 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200"
            >
              {tipo}
            </button>
          ))}
        </div>
      )}
    </div>

    {errors.tipo && (
      <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-500">
        <AlertCircle size={12} />
        {errors.tipo.message as string}
      </p>
    )}
  </div>

  {/* Denunciante */}
  <div>
    <label className={labelCls}>Denunciante</label>

    <input
      className={inputErr(errors.denunciante)}
      placeholder=""
      {...register("denunciante", {
        required: "El denunciante es obligatorio",
        minLength: { value: 3, message: "Debe tener al menos 3 caracteres" },
        maxLength: { value: 200, message: "Máximo 200 caracteres" },
      })}
    />

    {errors.denunciante && (
      <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-500">
        <AlertCircle size={12} />
        {errors.denunciante.message as string}
      </p>
    )}
  </div>

  {/* Denunciado */}
  <div>
    <label className={labelCls}>Denunciado</label>

    <input
      className={inputErr(errors.denunciado)}
      placeholder=""
      {...register("denunciado", {
        required: "El denunciado es obligatorio",
        minLength: { value: 3, message: "Debe tener al menos 3 caracteres" },
        maxLength: { value: 200, message: "Máximo 200 caracteres" },
      })}
    />

    {errors.denunciado && (
      <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-500">
        <AlertCircle size={12} />
        {errors.denunciado.message as string}
      </p>
    )}
  </div>

  {/* Archivo */}
  <div className="sm:col-span-2">
    <label className={labelCls}>Archivo del caso (PDF, Word o Excel)</label>

    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-sm transition hover:border-indigo-400 hover:bg-indigo-50/50 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10">
      <UploadCloud size={18} className="text-indigo-500" />
      <div>
        <div className="font-medium text-slate-600 dark:text-slate-300">
          Arrastra o selecciona un archivo
        </div>
        <div className="text-xs text-slate-400">
          Formatos permitidos: PDF, Word y Excel
        </div>
      </div>

      <input
  type="file"
  className="hidden"
  accept=".pdf,.doc,.docx,.xls,.xlsx"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const permitidos = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (!permitidos.includes(file.type)) {
      alert("Solo se permiten archivos PDF, Word o Excel.");
      e.target.value = "";
      return;
    }
    form.setValue("archivo", file); // 👈 guardarlo en el form
  }}
/>
    </label>
  </div>

</div>

<div className="mt-5 flex items-center justify-between gap-2">

  <button
    type="button"
    onClick={() => setShowForm(false)}
    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100"
  >
    <X size={15} />
    Salir
  </button>

  <button
    type="submit"
    disabled={!isValid}
    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
  >
    <Save size={15} />
    Guardar
  </button>

</div>

</form>
            </div>
        
          )}
        </div>

        {/* GRID DE CASOS */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {casos.map((c) => {
            const estadoNombre = Number(c.estado) === 1 ? "Activo" : "Aplazado";
  const est = ESTADO_STYLES[estadoNombre];
  const tipoCls = TIPO_STYLES[c.tipo?.nombre] || TIPO_STYLES["Otro"];
  const isExcel = /\.xls/i.test(c.archivo);
  const abierto = casoActivo?.idcaso === c.idcaso;
            return (
              <div
                key={c.idcaso}
                onDoubleClick={() => abrirCaso(c)}
                title={abierto ? "Este es el caso abierto" : "Doble clic para abrir este caso"}
                className={`relative cursor-pointer select-none overflow-hidden rounded-2xl border bg-white p-4 pl-5 shadow-sm transition-shadow hover:shadow-md dark:bg-white/[0.04] ${abierto ? "border-blue-500 ring-2 ring-blue-500/30 dark:border-blue-400" : "border-slate-200 dark:border-white/10"}`}
              >
                <span className={`absolute inset-y-0 left-0 w-1.5 ${est.bar}`} />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${tipoCls}`}>{c.tipo?.nombre}</span>
                    <span className="text-xs font-medium text-slate-400">Codigo-{c.codigo}</span>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${est.cls}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${est.dot}`} /> {estadoNombre}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 dark:bg-white/5">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-[10px] font-bold text-rose-600 dark:text-rose-300">{iniciales(c.denunciante)}</div>
                    <div className="min-w-0">
                      <div className={labelCls + " mb-0"}>Denunciante</div>
                      <div className="truncate text-sm font-medium">{c.denunciante}</div>
                    </div>
                  </div>
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm dark:bg-white/10"><ArrowRight size={13} /></div>
                  <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">
                    <div className="min-w-0">
                      <div className={labelCls + " mb-0"}>Denunciado</div>
                      <div className="truncate text-sm font-medium">{c.denunciado}</div>
                    </div>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-500/15 text-[10px] font-bold text-slate-600 dark:text-slate-300">{iniciales(c.denunciado)}</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1"><UserCog size={12} /> {c.persona?.nombre}</span>
                    <span className="flex items-center gap-1"><Calendar size={12} /> {c.fecha}</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {c.hora}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {abierto ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white"><Check size={13} /> Caso abierto</span>
                    ) : (
                      <button onClick={() => abrirCaso(c)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10" title="Trabajar en este caso"><FolderOpen size={13} /> Abrir</button>
                    )}
                    <button  onClick={() => abrirModalArchivo(c)} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-white/10" title="Actualizar Archivo"><UploadCloud size={15} /></button>
                   <button
  onClick={async () => {
    if (!c.archivo) {
      alert("Este caso no tiene archivo adjunto.");
      return;
    }
    try {
      const res = await CasoService.descargarArchivo(c.archivo);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", c.archivo);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Error al descargar el archivo.");
    }
  }}
  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
  title="Descargar archivo"
>
  {isExcel ? (
    <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" />
  ) : (
    <FileText size={14} className="text-blue-600 dark:text-blue-400" />
  )}
  <Download size={13} className="opacity-50" />
</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

{/* 
modal para modificar archivo----------------- */}

{modalArchivo.open && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-800">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Cambiar archivo del caso
        </h3>
        <button
          onClick={cerrarModalArchivo}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
        >
          ✕
        </button>
      </div>

      <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
        Caso: <span className="font-medium">{modalArchivo.caso?.codigo}</span>
      </p>

      {modalArchivo.caso?.archivo && (
        <p className="mb-3 text-xs text-slate-500">
          Archivo actual: <span className="font-mono">{modalArchivo.caso.archivo}</span>
        </p>
      )}

      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm transition hover:border-indigo-400 hover:bg-indigo-50/50 dark:border-white/15 dark:bg-white/5">
        <UploadCloud size={18} className="text-indigo-500" />
        <div className="flex-1">
          <div className="font-medium text-slate-600 dark:text-slate-300">
            {nuevoArchivo ? nuevoArchivo.name : "Selecciona el nuevo archivo"}
          </div>
          <div className="text-xs text-slate-400">PDF, Word o Excel</div>
        </div>
        <input
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx"
          onChange={(e) => setNuevoArchivo(e.target.files?.[0] || null)}
        />
      </label>

      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={cerrarModalArchivo}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300"
        >
          Cancelar
        </button>
        <button
          onClick={actualizarArchivo}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Actualizar archivo
        </button>
      </div>
    </div>
  </div>
)}
















      {/* ================= BARRA DE IA FLOTANTE (abajo, ampliable) ================= */}
{aiOpen && <div className="fixed inset-0 z-30" onClick={() => setAiOpen(false)} />}
<div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-6">
  <div className={`pointer-events-auto w-full transition-[max-width] duration-200 ${wide ? "max-w-3xl" : "max-w-xl"}`}>

    {/* Popover expandido */}
    {aiOpen && (
      <div
        ref={popoverRef}
        style={{ height: expanded ? "82vh" : aiHeight }}
        className="subir mb-3 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/95"
      >
        {/* Barrita para ampliar */}
        <div
          onPointerDown={onGripDown} onPointerMove={onGripMove} onPointerUp={onGripUp}
          title="Arrastra para ampliar"
          className="group flex shrink-0 cursor-ns-resize touch-none items-center justify-center pt-2.5 pb-1"
        >
          <div className="h-1.5 w-10 rounded-full bg-slate-200 transition-colors group-hover:bg-indigo-400 dark:bg-white/15" />
        </div>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 pb-3 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white"><Sparkles size={15} /></div>
            <div>
              <div className="text-sm font-semibold">Asistente IA</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Acciones sobre los casos</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setExpanded((v) => !v)} title={expanded ? "Restaurar" : "Maximizar"} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-white/10">
              {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button onClick={() => setAiOpen(false)} title="Cerrar" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-white/10"><ChevronDown size={18} /></button>
          </div>
        </div>

        {/* Contenido: chat funcional */}
        <div ref={chatRef} className="flex-1 space-y-4 overflow-y-auto p-4">

          {/* Ejemplos (solo si aún no hay chat) */}
          {chat.length === 0 && !cargandoIA && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400"><Wand2 size={12} /> Ejemplos</div>
              <div className="flex flex-wrap gap-2">
                {EJEMPLOS.map((ej, i) => (
                  <button
                    key={i}
                    onClick={() => setMensajeIA(ej)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                  >
                    {ej}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mensajes del chat */}
          <div className="space-y-3">
            {chat.map((m, i) =>
              m.rol === "user" ? (
                // Usuario → derecha
                <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-indigo-500 px-3 py-2 text-xs text-white">
                  {m.texto}
                </div>
              ) : (
                // IA → izquierda
                <div key={i} className="flex items-start gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white"><Sparkles size={13} /></div>
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                    {m.texto}
                  </div>
                </div>
              )
            )}

            {/* Indicador "escribiendo…" mientras procesa */}
            {cargandoIA && (
              <div className="flex items-start gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white"><Sparkles size={13} /></div>
                <div className="flex gap-1 rounded-2xl rounded-bl-md border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/10 dark:bg-white/5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Pastilla de entrada */}
    <div ref={barRef} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl ring-1 ring-black/5 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/95">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm"><Sparkles size={17} /></div>
      <input
        value={mensajeIA}
        onChange={(e) => setMensajeIA(e.target.value)}
        onFocus={() => setAiOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarIA(); }
        }}
        disabled={cargandoIA}
        placeholder="Pregúntale a la IA sobre los casos…"
        className="w-full bg-transparent px-1 text-sm outline-none placeholder:text-slate-400 disabled:opacity-60"
      />
      {aiOpen && (
        <button onClick={() => setExpanded((v) => !v)} title={expanded ? "Restaurar" : "Maximizar"} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 dark:hover:bg-white/10">
          {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      )}
      <button
        onClick={enviarIA}
        disabled={cargandoIA || !mensajeIA.trim()}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {cargandoIA ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} />}
      </button>
    </div>

  </div>
</div>
    </div>
  );
}
