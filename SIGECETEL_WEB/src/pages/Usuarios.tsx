import React, { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Search, ChevronDown, Eye, Pencil, ShieldOff, Mail, IdCard, Phone, Calendar,
  Clock, KeyRound, VenusAndMars, Sparkles, Wand2, ArrowUp, GripVertical,
  UserPlus, X, Save, Lock, User, ShieldCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { PersonaService } from "../services/PersonaService";
import { RolService } from "../services/RolService";
import { CredencialService } from "../services/CredencialService";

const ROLE_STYLES = {
  Administrador: { badge: "bg-violet-500/10 text-violet-600 dark:text-violet-300 ring-1 ring-inset ring-violet-500/20", avatar: "bg-violet-500/15 text-violet-600 dark:text-violet-300" },
  "Coordinador Nacional": { badge: "bg-blue-500/10 text-blue-600 dark:text-blue-300 ring-1 ring-inset ring-blue-500/20", avatar: "bg-blue-500/15 text-blue-600 dark:text-blue-300" },
  Proyectista: { badge: "bg-amber-500/10 text-amber-600 dark:text-amber-300 ring-1 ring-inset ring-amber-500/20", avatar: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
  "Marketing Sede": { badge: "bg-rose-500/10 text-rose-600 dark:text-rose-300 ring-1 ring-inset ring-rose-500/20", avatar: "bg-rose-500/15 text-rose-600 dark:text-rose-300" },
};



const MIN_PANEL = 300, MAX_PANEL = 560, MIN_LISTA = 360, DEFAULT_PANEL = 360;

const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-white/5";
const labelCls = "mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400";

export default function Usuarios() {
 const [open, setOpen] = useState<number | null>(null);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL);
  const [isDesktop, setIsDesktop] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAccess, setShowAccess] = useState(false);

  const containerRef = useRef(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const onPointerDown = (e: any) => { draggingRef.current = true; e.currentTarget.setPointerCapture(e.pointerId); document.body.style.userSelect = "none"; document.body.style.cursor = "col-resize"; };
  const onPointerMove = (e: any) => {
    if (!draggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let w = rect.right - e.clientX;
    const maxAllowed = Math.min(MAX_PANEL, rect.width - MIN_LISTA);
    w = Math.max(MIN_PANEL, Math.min(w, maxAllowed));
    setPanelWidth(w);
  };
  const onPointerUp = (e: any) => { draggingRef.current = false; try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {} document.body.style.userSelect = ""; document.body.style.cursor = ""; };
  const resetWidth = () => setPanelWidth(DEFAULT_PANEL);

  const cerrarForm = () => { setShowForm(false); setShowAccess(false); };


  // metodos----------------------
const [users, setUsers] = useState<any[]>([]);
const [filtro, setFiltro] = useState("");
// Más adelante cambiaremos respuestaIA por un historial de chat
const [mensajeIA, setMensajeIA] = useState("");

const [cargandoIA, setCargandoIA] = useState(false);
const [chat, setChat] = useState<{ rol: "user" | "ia"; texto: string }[]>([]);
const chatRef = useRef<HTMLDivElement>(null);
// mensajeIA y cargandoIA se quedan igual




const listar = async () => {
  const data = await (await PersonaService.listarPersonas()).data;
  setUsers(data);
   if (data.length > 0) setOpen(data[0].idpersona);
};

const [generos, setGeneros] = useState<any[]>([]);
const [rolesLista, setRolesLista] = useState<any[]>([]);

const listarGeneros = async () => {
  const { data } = await PersonaService.listarGenero();
  setGeneros(data);
};

const listarRoles = async () => {
  const { data } = await RolService.listarRol();
  setRolesLista(data);
};

const buscar = async (filtro: string) => {
  const data = await (await PersonaService.buscarPersonas(filtro)).data;
  setUsers(data);
};

// registrar persona----------------
const form = useForm({
  mode: "onChange",   // 👈 valida en vivo para habilitar el botón
  defaultValues: {
    cedula: "", nombre: "", ap_paterno: "", ap_materno: "",
    telefono: "", correo: "", genero: "", rol: [],
    usuario: "", contrasena: "",
  },
});

const {
  register,
  handleSubmit,
  formState: { errors, isValid },   // 👈 isValid
} = form;

const inputErr = (err: any) =>
  `${inputCls} ${err ? "border-rose-400 focus:border-rose-400 focus:ring-rose-500/10 dark:border-rose-400/60" : ""}`;

const registrar = async (data: any) => {
  try {
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString("en-CA"); // YYYY-MM-DD (hora local Bolivia)
    const hora  = ahora.toTimeString().slice(0, 8);   // HH:mm:ss

    // ---- 1) PERSONA (estado siempre 1, fecha/hora automáticas) ----
    const persona = {
      cedula:     data.cedula,
      nombre:     data.nombre,
      ap_paterno: data.ap_paterno,
      ap_materno: data.ap_materno,
      telefono:   data.telefono,
      correo:     data.correo,
      estado:     1,
      fecha,
      hora,
      genero: data.genero ? { idgenero: Number(data.genero) } : null,
      rol: (data.rol || []).map((id: any) => ({ idrol: Number(id) })), // 1 o más
    };

    const resp = await PersonaService.registrarPersona(persona);
    const personaCreada = resp.data; // <- trae idpersona

    // ---- 2) CREDENCIAL (solo si abriste "Registrar acceso" y llenaste ambos) ----
    if (showAccess && data.usuario && data.contrasena) {
      await CredencialService.registrarCredencial({
        usuario:    data.usuario,
        contrasena: data.contrasena,
        persona: { idpersona: personaCreada.idpersona },
      } as any);
    }

    await listar();
    form.reset();
    setShowForm(false);
    setShowAccess(false);
  } catch (error) {
    console.error("Error al registrar:", error);
  }
};



// cargar
useEffect(() => {
  listar();
  listarGeneros();
  listarRoles();
}, []);

// IA para buscar
const enviarIA = async () => {
  const texto = mensajeIA.trim();
  if (!texto || cargandoIA) return;

  // 1) mete el mensaje del usuario y limpia el input de inmediato
  setChat((prev) => [...prev, { rol: "user", texto }]);
  setMensajeIA("");

  try {
    setCargandoIA(true);
    const { data } = await CredencialService.chatUsuario(texto);
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






  const roles = Object.keys(ROLE_STYLES);

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
            <h1 className="text-xl font-semibold tracking-tight">Usuarios</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{users.length} cuentas</p>
          </div>

         {/* SEARCH + BOTÓN REGISTRAR */}
<div className="relative z-30 mb-6">
  <form onSubmit={handleSubmit(registrar)}>
    <div className="flex items-center gap-2">
      <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/10 dark:border-white/10 dark:bg-white/5">
        <Search size={16} className="opacity-50" />
        <input
          value={filtro}
          onChange={(e) => { const valor = e.target.value; setFiltro(valor); valor.trim() ? buscar(valor) : listar(); }}
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          placeholder="Buscar personas…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </div>
      <button
        type="button"
        onClick={() => setShowForm((v) => !v)}
        title="Registrar nuevo usuario"
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm transition ${showForm ? "bg-slate-400 dark:bg-slate-600" : "bg-gradient-to-br from-indigo-500 to-violet-500 hover:opacity-90"}`}
      >
        {showForm ? <X size={18} /> : <UserPlus size={18} />}
      </button>
    </div>

    {/* ===== FORMULARIO DESPLEGABLE ===== */}
    {showForm && (
      <div className="despliegue absolute left-0 right-0 top-full mt-2 max-h-[72vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-xl ring-1 ring-black/5 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/90">
        {/* Cabecera */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"><UserPlus size={17} /></div>
            <div>
              <div className="text-sm font-semibold">Registrar nuevo usuario</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Completa los datos del usuario</div>
            </div>
          </div>
          <button type="button" onClick={cerrarForm} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-white/10"><X size={18} /></button>
        </div>

        {/* Campos */}
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">

          {/* Nombres */}
          <div>
            <label className={labelCls}>Nombres</label>
            <input
              className={inputErr(errors.nombre)}
              placeholder=""
              {...register("nombre", {
                required: "El nombre es obligatorio",
                minLength: { value: 2, message: "Debe tener al menos 2 caracteres" },
                maxLength: { value: 40, message: "Máximo 40 caracteres" },
              })}
            />
            {errors.nombre && <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-500 dark:text-rose-400"><AlertCircle size={12} className="shrink-0" /> {errors.nombre.message as string}</p>}
          </div>

          {/* Apellido paterno */}
          <div>
            <label className={labelCls}>Apellido paterno</label>
            <input
              className={inputErr(errors.ap_paterno)}
              placeholder=""
              {...register("ap_paterno", {
                required: "El apellido paterno es obligatorio",
                maxLength: { value: 40, message: "Máximo 40 caracteres" },
              })}
            />
            {errors.ap_paterno && <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-500 dark:text-rose-400"><AlertCircle size={12} className="shrink-0" /> {errors.ap_paterno.message as string}</p>}
          </div>

          {/* Apellido materno (opcional) */}
          <div>
            <label className={labelCls}>Apellido materno <span className="text-slate-300 normal-case">(opcional)</span></label>
            <input
              className={inputErr(errors.ap_materno)}
              placeholder=""
              {...register("ap_materno", {
                validate: (v) => {
                  if (!v) return true;
                  if (v.length < 3) return "Debe tener al menos 3 caracteres";
                  if (v.length > 30) return "Máximo 30 caracteres";
                  return true;
                },
              })}
            />
            {errors.ap_materno && <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-500 dark:text-rose-400"><AlertCircle size={12} className="shrink-0" /> {errors.ap_materno.message as string}</p>}
          </div>

          {/* Teléfono (opcional) */}
          <div>
            <label className={labelCls}>Teléfono <span className="text-slate-300 normal-case">(opcional)</span></label>
            <input
              className={inputErr(errors.telefono)}
              placeholder=""
              {...register("telefono", {
                validate: (v) => {
                  if (!v) return true;
                  if (!/^[0-9]+$/.test(v)) return "Solo se permiten números";
                  if (v.length < 7) return "Debe tener al menos 7 dígitos";
                  if (v.length > 29) return "Máximo 29 dígitos";
                  return true;
                },
              })}
            />
            {errors.telefono && <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-500 dark:text-rose-400"><AlertCircle size={12} className="shrink-0" /> {errors.telefono.message as string}</p>}
          </div>

          {/* Cédula */}
          <div>
            <label className={labelCls}>Cédula</label>
            <input
              className={inputErr(errors.cedula)}
              placeholder=""
              {...register("cedula", {
                required: "La cédula es obligatoria",
                pattern: { value: /^[0-9]+$/, message: "Solo se permiten números" },
                minLength: { value: 7, message: "Debe tener al menos 7 dígitos" },
                maxLength: { value: 15, message: "Máximo 15 caracteres" },
              })}
            />
            {errors.cedula && <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-500 dark:text-rose-400"><AlertCircle size={12} className="shrink-0" /> {errors.cedula.message as string}</p>}
          </div>

          {/* Correo (opcional) */}
          <div>
            <label className={labelCls}>Correo <span className="text-slate-300 normal-case">(opcional)</span></label>
            <input
              className={inputErr(errors.correo)}
              placeholder=""
              {...register("correo", {
                validate: (v) => {
                  if (!v) return true;
                  if (v.length > 200) return "Máximo 200 caracteres";
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Formato de correo no válido";
                  return true;
                },
              })}
            />
            {errors.correo && <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-500 dark:text-rose-400"><AlertCircle size={12} className="shrink-0" /> {errors.correo.message as string}</p>}
          </div>

          {/* Género */}
          <div>
            <label className={labelCls}>Género</label>
            <select
              defaultValue=""
              className={inputErr(errors.genero)}
              {...register("genero", { required: "Selecciona un género" })}
            >
              <option value="" disabled>Selecciona…</option>
              {generos.map((g) => <option key={g.idgenero} value={g.idgenero}>{g.nombre}</option>)}
            </select>
            {errors.genero && <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-500 dark:text-rose-400"><AlertCircle size={12} className="shrink-0" /> {errors.genero.message as string}</p>}
          </div>

          {/* Rol (múltiple) */}
          <div className="sm:col-span-2">
            <label className={labelCls}>Rol <span className="text-slate-300 normal-case">(Ctrl/Cmd + clic para varios)</span></label>
            <select
              multiple
              className={`${inputErr(errors.rol)} h-auto min-h-[88px]`}
              {...register("rol", {
                validate: (v) => (v && v.length > 0) || "Selecciona al menos un rol",
              })}
            >
              {rolesLista.map((r) => <option key={r.idrol} value={r.idrol}>{r.nombre}</option>)}
            </select>
            {errors.rol && <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-500 dark:text-rose-400"><AlertCircle size={12} className="shrink-0" /> {errors.rol.message as string}</p>}
          </div>
        </div>

        {/* Botones */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={cerrarForm} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10">
            <X size={15} /> Salir
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowAccess((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${showAccess ? "border-indigo-400 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300" : "border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"}`}
            >
              <ShieldCheck size={15} /> Registrar acceso
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:opacity-40"
            >
              <Save size={15} /> Guardar
            </button>
          </div>
        </div>

        {/* ===== DESPLEGABLE DE ACCESO ===== */}
        {showAccess && (
          <div className="despliegue mt-4 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Lock size={15} className="text-indigo-500" /> Datos de acceso</div>
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Usuario</label>
                <div className="relative">
                  <User size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className={`${inputCls} pl-9`} placeholder="" {...register("usuario")} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Contraseña</label>
                <div className="relative">
                  <KeyRound size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="password" className={`${inputCls} pl-9`} placeholder="" {...register("contrasena")} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )}
  </form>
</div>

          {/* CARDS */}
          <div className="space-y-3">
            {users.map((u) => {
              const rolNombre = u.rol?.[0]?.nombre || "Administrador";
           const style = ROLE_STYLES[rolNombre] || ROLE_STYLES.Administrador;
              const isOpen = open === u.idpersona;
              return (
                <div key={u.idpersona} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="flex items-center justify-between gap-4 p-4">
                    <div className="flex min-w-0 items-center gap-3.5">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold ${style.avatar}`}>{u.nombre.charAt(0)}{u.ap_paterno.charAt(0)}</div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-semibold">{u.nombre} {u.ap_paterno} {u.ap_materno}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${style.badge}`}>{u.rol?.map((r:any) => r.nombre).join(", ")}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1"><Mail size={12} /> {u.correo}</span>
                          <span className="flex items-center gap-1"><IdCard size={12} /> {u.cedula}</span>
                          <span className="text-slate-400">@{u.credencial?.usuario}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${u.estado ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${u.estado ? "bg-emerald-500" : "bg-rose-500"}`} />
                        {u.estado ? "Activo" : "Bloqueado"}
                      </span>
                      <button onClick={() => setOpen(isOpen ? null : u.idpersona)} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-white/10">
                        <ChevronDown size={18} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="border-t border-slate-200 px-4 pb-4 pt-4 dark:border-white/10">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-3">
                        <div><div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">Teléfono</div><div className="flex items-center gap-2 text-sm"><Phone size={14} className="text-slate-400" /> {u.telefono}</div></div>
                        <div><div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">Género</div><div className="flex items-center gap-2 text-sm"><VenusAndMars size={14} className="text-slate-400" /> {u.genero?.nombre}</div></div>
                        <div><div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">Registro</div><div className="flex items-center gap-2 text-sm"><Calendar size={14} className="text-slate-400" /> {u.fecha}</div></div>
                        <div><div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">Hora</div><div className="flex items-center gap-2 text-sm"><Clock size={14} className="text-slate-400" /> {u.hora}</div></div>
                        <div><div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">Contraseña</div><div className="flex items-center gap-2 text-sm"><KeyRound size={14} className="text-slate-400" /> ••••••••</div></div>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <button className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10" title="Ver Detalle Desde Agente de IA"><Eye size={14} /> Ver</button>
                        <button className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10" title="Editar Desde Agente de IA"><Pencil size={14} /> Editar</button>
                        <button className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-500/20 dark:text-rose-400" title="Bloquear Desde Agente de IA"><ShieldOff size={14} /> Bloquear</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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

      {/* ================= DERECHA: PANEL IA ================= */}
<aside style={isDesktop ? { width: panelWidth } : undefined} className="w-full shrink-0 lg:pl-2">
  <div className="sticky top-6 flex h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">

    {/* Header (fijo) */}
    <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 p-4 dark:border-white/10">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm"><Sparkles size={17} /></div>
      <div>
        <div className="text-sm font-semibold">Asistente IA</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">Pídeme acciones sobre los usuarios</div>
      </div>
    </div>

    {/* Chat (crece y hace scroll). min-h-0 es lo que evita que se estire hacia abajo */}
    <div ref={chatRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">

      {chat.length === 0 && !cargandoIA && (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-slate-400">
          <Wand2 size={18} />
          <p className="text-xs">Escribe una acción, ej: “bloquea a Juan” o “cambia el nombre de…”</p>
        </div>
      )}

      {chat.map((m, i) =>
        m.rol === "user" ? (
          // Usuario → derecha
          <div key={i} className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-indigo-500 to-violet-500 px-3 py-2 text-xs text-white shadow-sm">
              {m.texto}
            </div>
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

    {/* Input (fijo abajo) */}
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
          onClick={enviarIA}
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

function setChat(arg0: (prev: any) => any[]) {
  throw new Error("Function not implemented.");
}
