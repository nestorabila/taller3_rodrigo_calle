import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  GripVertical, Sparkles, Wand2, ArrowUp, Save, Check,
  Users, Shield, Lock, LayoutDashboard, FolderKanban, MapPin, BarChart3, Boxes,
  Eye, Plus, Pencil, Trash2, FileBarChart, Loader2,
  Search, X,
} from "lucide-react";
import { RolService } from "../services/RolService";
import { PersonaService } from "../services/PersonaService";
import { PermisoService } from "../services/PermisoService";

/* ============================================================
   Decoración de módulos (solo estética; los módulos REALES
   salen de la BD: prefijo de permiso.codigo antes del punto)
   ============================================================ */
const MODULE_META = {
  panel:    { nombre: "Panel de Control", desc: "Inicio y resumen",            Icon: LayoutDashboard, tint: "bg-sky-500/15 text-sky-600 dark:text-sky-300" },
  usuarios: { nombre: "Usuarios",         desc: "Gestión de cuentas",          Icon: Users,           tint: "bg-violet-500/15 text-violet-600 dark:text-violet-300" },
  roles:    { nombre: "Roles",            desc: "Roles del sistema",           Icon: Shield,          tint: "bg-blue-500/15 text-blue-600 dark:text-blue-300" },
  permisos: { nombre: "Permisos",         desc: "Accesos y acciones",          Icon: Lock,            tint: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300" },
  casos:    { nombre: "Casos",            desc: "Gestión de casos",            Icon: FolderKanban,    tint: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
  acciones: { nombre: "Acciones",         desc: "Análisis de casos y mapas",   Icon: MapPin,          tint: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
  reportes: { nombre: "Reportes",         desc: "Indicadores y reportes",      Icon: BarChart3,       tint: "bg-rose-500/15 text-rose-600 dark:text-rose-300" },
};
const MODULE_ORDER = ["panel", "usuarios", "roles", "permisos", "casos", "acciones", "reportes"];
const DEFAULT_META = (id) => ({
  nombre: id.charAt(0).toUpperCase() + id.slice(1),
  desc: "Módulo del sistema",
  Icon: Boxes,
  tint: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
});

/* Decoración de acciones (los códigos reales vienen de la BD) */
const ACTION_META = {
  ver:      { label: "Ver",      Icon: Eye },
  crear:    { label: "Crear",    Icon: Plus },
  editar:   { label: "Editar",   Icon: Pencil },
  eliminar: { label: "Eliminar", Icon: Trash2 },
  reporte:  { label: "Reporte",  Icon: FileBarChart },
};
const ACTION_ORDER = ["ver", "crear", "editar", "eliminar", "reporte"];
const DEFAULT_ACTION = (id) => ({ label: id.charAt(0).toUpperCase() + id.slice(1), Icon: Check });

const MIN_PANEL = 300, MAX_PANEL = 560, MIN_LISTA = 380, DEFAULT_PANEL = 360;

const EJEMPLOS = [
  "Da acceso de solo lectura al rol Perito",
  "Copia los permisos de Administrador a otro rol",
  "Quita el permiso de Eliminar en todos los módulos",
  "¿Qué puede hacer este usuario?",
];

/* ===== Helpers ===== */
const inicialesDe = (p) => {
  const ini = `${(p?.nombre || "").trim().charAt(0)}${(p?.ap_paterno || "").trim().charAt(0)}`.toUpperCase();
  return ini || "?";
};
const nombreCorto = (p) => {
  const n = `${(p?.nombre || "").trim()} ${(p?.ap_paterno || "").trim()}`.trim();
  return n || p?.correo || `Persona ${p?.idpersona ?? ""}`;
};
const rolDePersona = (p) =>
  Array.isArray(p?.rol) && p.rol.length > 0
    ? p.rol.map((r) => r.nombre).join(" · ")
    : "Sin rol asignado";

/* ===== Interruptor ===== */
function Switch({ on, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-indigo-500" : "bg-slate-300 dark:bg-white/15"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

/* ===== Buscador expandible ===== */
function BuscadorMini({ value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const abrir = () => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); };
  const limpiar = () => { onChange(""); setOpen(false); };
  return (
    <div
      className={`flex items-center overflow-hidden rounded-xl border transition-all duration-300 ${
        open
          ? "w-56 border-indigo-300 bg-white pl-2.5 pr-1 shadow-sm dark:border-indigo-500/40 dark:bg-white/5"
          : "w-8 cursor-pointer border-transparent bg-transparent hover:bg-slate-100 dark:hover:bg-white/10"
      }`}
      onClick={!open ? abrir : undefined}
      title={!open ? "Buscar" : undefined}
    >
      <Search size={14} className="shrink-0 text-slate-400" />
      {open && (
        <>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => { if (!value.trim()) setOpen(false); }}
            placeholder={placeholder}
            className="w-full bg-transparent px-2 py-1.5 text-xs outline-none placeholder:text-slate-400 dark:text-slate-100"
          />
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={limpiar}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200"
          >
            <X size={13} />
          </button>
        </>
      )}
    </div>
  );
}

export default function Permisos() {
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL);
  const [isDesktop, setIsDesktop] = useState(true);
  const [mode, setMode] = useState("rol"); // "rol" | "usuario"

  /* ===== Datos desde la API ===== */
  const [roles, setRoles] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [catalogo, setCatalogo] = useState([]); // [{idpermiso, codigo, descripcion}]
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingPersonas, setLoadingPersonas] = useState(true);
  const [loadingCatalogo, setLoadingCatalogo] = useState(true);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [errorCarga, setErrorCarga] = useState(null);

  const [filtroRol, setFiltroRol] = useState("");
  const [filtroUser, setFiltroUser] = useState("");

  const [rolSel, setRolSel] = useState(null);
  const [userSel, setUserSel] = useState(null);

  /* checkedMap[targetKey] = array de idpermiso marcados (con ediciones sin guardar)
     rolBaseMap["user:id"] = idpermiso heredados del rol (para contar excepciones) */
  const [checkedMap, setCheckedMap] = useState({});
  const [rolBaseMap, setRolBaseMap] = useState({});

  const [guardando, setGuardando] = useState(false);
  const [guardadoOk, setGuardadoOk] = useState(false);

  const containerRef = useRef(null);
  const draggingRef = useRef(false);

  /* ============ MÓDULOS derivados del catálogo (BD) ============
     "casos.crear" -> módulo "casos", acción "crear"               */
  const modules = useMemo(() => {
    const map = {};
    catalogo.forEach((perm) => {
      const [mod, ...resto] = perm.codigo.split(".");
      const accion = resto.join(".") || "ver";
      if (!map[mod]) map[mod] = { id: mod, acciones: [] };
      map[mod].acciones.push({ ...perm, accion });
    });
    const lista = Object.values(map);
    lista.forEach((m) =>
      m.acciones.sort((a, b) => {
        const ia = ACTION_ORDER.indexOf(a.accion), ib = ACTION_ORDER.indexOf(b.accion);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      })
    );
    lista.sort((a, b) => {
      const ia = MODULE_ORDER.indexOf(a.id), ib = MODULE_ORDER.indexOf(b.id);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    return lista;
  }, [catalogo]);

  /* ===== Cargas de listas ===== */
  const cargarRoles = (filtro = "") => {
    setLoadingRoles(true);
    const req = filtro.trim() ? RolService.buscarRol(filtro.trim()) : RolService.listarRol();
    return req
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setRoles(data);
        setRolSel((prev) => (data.some((r) => r.idrol === prev) ? prev : (data[0]?.idrol ?? null)));
      })
      .catch(() => setErrorCarga("No se pudo cargar la lista de roles"))
      .finally(() => setLoadingRoles(false));
  };

  const cargarPersonas = (filtro = "") => {
    setLoadingPersonas(true);
    const req = filtro.trim() ? PersonaService.buscarPersonas(filtro.trim()) : PersonaService.listarPersonas();
    return req
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setPersonas(data);
        setUserSel((prev) => (data.some((p) => p.idpersona === prev) ? prev : (data[0]?.idpersona ?? null)));
      })
      .catch(() => setErrorCarga("No se pudo cargar la lista de personas"))
      .finally(() => setLoadingPersonas(false));
  };

  useEffect(() => {
    cargarRoles();
    cargarPersonas();
    PermisoService.listarPermiso()
      .then((res) => setCatalogo(Array.isArray(res.data) ? res.data : []))
      .catch(() => setErrorCarga("No se pudo cargar el catálogo de permisos"))
      .finally(() => setLoadingCatalogo(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => cargarRoles(filtroRol), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroRol]);

  useEffect(() => {
    const t = setTimeout(() => cargarPersonas(filtroUser), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroUser]);

  /* ===== Cargar permisos del objetivo seleccionado (si no está en caché) ===== */
  const targetKey = mode === "rol" ? `rol:${rolSel}` : `user:${userSel}`;

  useEffect(() => {
    if (mode === "rol" && rolSel == null) return;
    if (mode === "usuario" && userSel == null) return;
    if (checkedMap[targetKey] !== undefined) return; // ya cargado (o editado)

    setLoadingPerms(true);
    const req =
      mode === "rol"
        ? PermisoService.permisosRol(rolSel).then((res) => {
            const ids = (Array.isArray(res.data) ? res.data : []).map((p) => p.idpermiso);
            setCheckedMap((prev) => ({ ...prev, [targetKey]: ids }));
          })
        : PermisoService.permisosPersona(userSel).then((res) => {
            const d = res.data || {};
            setCheckedMap((prev) => ({ ...prev, [targetKey]: d.efectivo || [] }));
            setRolBaseMap((prev) => ({ ...prev, [targetKey]: d.rol || [] }));
          });

    req
      .catch(() => setErrorCarga("No se pudieron cargar los permisos"))
      .finally(() => setLoadingPerms(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, rolSel, userSel]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const onPointerDown = (e) => { draggingRef.current = true; e.currentTarget.setPointerCapture(e.pointerId); document.body.style.userSelect = "none"; document.body.style.cursor = "col-resize"; };
  const onPointerMove = (e) => {
    if (!draggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let w = rect.right - e.clientX;
    const maxAllowed = Math.min(MAX_PANEL, rect.width - MIN_LISTA);
    w = Math.max(MIN_PANEL, Math.min(w, maxAllowed));
    setPanelWidth(w);
  };
  const onPointerUp = (e) => { draggingRef.current = false; try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {} document.body.style.userSelect = ""; document.body.style.cursor = ""; };
  const resetWidth = () => setPanelWidth(DEFAULT_PANEL);

  /* ===== Estado derivado ===== */
  const checked = new Set(checkedMap[targetKey] || []);
  const selectedRole = roles.find((r) => r.idrol === rolSel);
  const selectedUser = personas.find((p) => p.idpersona === userSel);

  const verIdDe = (m) => m.acciones.find((a) => a.accion === "ver")?.idpermiso;
  const moduloActivo = (m) => {
    const verId = verIdDe(m);
    return verId != null ? checked.has(verId) : m.acciones.some((a) => checked.has(a.idpermiso));
  };
  const accesoCount = modules.filter(moduloActivo).length;

  /* Excepciones respecto al rol (solo modo usuario) */
  const excepcionesCount = useMemo(() => {
    if (mode !== "usuario") return 0;
    const base = new Set(rolBaseMap[targetKey] || []);
    let n = 0;
    checked.forEach((id) => { if (!base.has(id)) n++; });
    base.forEach((id) => { if (!checked.has(id)) n++; });
    return n;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, targetKey, checkedMap, rolBaseMap]);

  const cargando = mode === "rol" ? loadingRoles : loadingPersonas;
  const haySeleccion = mode === "rol" ? !!selectedRole : !!selectedUser;
  const listaVacia = mode === "rol" ? roles.length === 0 : personas.length === 0;
  const filtroActivo = mode === "rol" ? filtroRol : filtroUser;

  /* ===== Toggles ===== */
  const setChecked = (updater) =>
    setCheckedMap((prev) => {
      const cur = new Set(prev[targetKey] || []);
      updater(cur);
      return { ...prev, [targetKey]: [...cur] };
    });

  const toggleModulo = (m) => {
    const verId = verIdDe(m);
    const activo = moduloActivo(m);
    setChecked((set) => {
      if (activo) {
        m.acciones.forEach((a) => set.delete(a.idpermiso)); // apaga todo el módulo
      } else if (verId != null) {
        set.add(verId); // enciende solo "ver"
      }
    });
    setGuardadoOk(false);
  };

  const toggleAccion = (m, accionPerm) => {
    if (!moduloActivo(m)) return;
    if (accionPerm.accion === "ver") return; // "ver" se maneja con el switch
    setChecked((set) => {
      if (set.has(accionPerm.idpermiso)) set.delete(accionPerm.idpermiso);
      else set.add(accionPerm.idpermiso);
    });
    setGuardadoOk(false);
  };

  /* ===== Guardar ===== */
  const guardar = () => {
    if (!haySeleccion || guardando) return;
    setGuardando(true);
    setGuardadoOk(false);
    const permisos = checkedMap[targetKey] || [];
    const req =
      mode === "rol"
        ? PermisoService.guardarPermisosRol(rolSel, permisos)
        : PermisoService.guardarPermisosPersona(userSel, permisos);
    req
      .then(() => {
        setGuardadoOk(true);
        // refrescar base del rol tras guardar (por si cambió)
        if (mode === "usuario") {
          PermisoService.permisosPersona(userSel).then((res) => {
            setRolBaseMap((prev) => ({ ...prev, [targetKey]: res.data?.rol || [] }));
          });
        }
      })
      .catch(() => setErrorCarga("No se pudieron guardar los permisos"))
      .finally(() => setGuardando(false));
  };

  const tabCls = (active) =>
    `rounded-lg px-4 py-1.5 text-sm font-medium transition ${active ? "bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`;
  const chipCls = (active) =>
    `inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${active ? "border-indigo-400 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300" : "border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"}`;





/* ============================================================
   PEGAR DENTRO DE export default function Permisos() { ... }
   (después de tus estados y de la función guardar)
   ============================================================ */

// ---- Estado del chat IA ----
const [mensajeIA, setMensajeIA] = useState("");
const [cargandoIA, setCargandoIA] = useState(false);
const [chat, setChat] = useState([]); // [{ rol: "user" | "ia", texto }]
const chatRef = useRef(null);

useEffect(() => {
  chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
}, [chat, cargandoIA]);

/* ---- Refresca la matriz después de que la IA modifica permisos ----
   Borra la caché (checkedMap) del objetivo afectado para que el
   useEffect vuelva a pedir los permisos al backend.                   */
const refrescarDesdeIA = (resultado) => {
  if (!resultado) return;

  const keysABorrar = [];

  if (resultado.idrol) keysABorrar.push(`rol:${resultado.idrol}`);
  if (resultado.idrol_destino) keysABorrar.push(`rol:${resultado.idrol_destino}`);
  if (resultado.idpersona) keysABorrar.push(`user:${resultado.idpersona}`);

  // si tocó un rol, las personas de ese rol también cambian -> limpiamos todo lo de usuarios
  const tocoRol = !!(resultado.idrol || resultado.idrol_destino);

  setCheckedMap((prev) => {
    const copia = { ...prev };
    keysABorrar.forEach((k) => delete copia[k]);
    if (tocoRol) {
      Object.keys(copia).forEach((k) => { if (k.startsWith("user:")) delete copia[k]; });
    }
    return copia;
  });

  if (tocoRol) {
    setRolBaseMap((prev) => {
      const copia = { ...prev };
      Object.keys(copia).forEach((k) => { if (k.startsWith("user:")) delete copia[k]; });
      return copia;
    });
  }

  // Si la IA tocó un rol/persona distinto al seleccionado, lo seleccionamos
  if (resultado.idrol_destino) { setMode("rol"); setRolSel(resultado.idrol_destino); }
  else if (resultado.idrol)     { setMode("rol"); setRolSel(resultado.idrol); }
  else if (resultado.idpersona) { setMode("usuario"); setUserSel(resultado.idpersona); }

  setGuardadoOk(false);
};

// ---- Formatea el resultado del backend para el chat ----
const formatearResultadoPermiso = (resultado) => {
  if (!resultado) return "";

  // catálogo completo
  if (Array.isArray(resultado)) {
    if (resultado.length === 0) return "No hay permisos en el catálogo.";
    return resultado.map((p) => `• ${p.codigo}`).join("\n");
  }

  const lineas = [];

  if (resultado.rol && resultado.permisos) {
    lineas.push(`Rol: ${resultado.rol} — ${resultado.total ?? resultado.permisos.length} permiso(s)`);
    lineas.push(resultado.permisos.map((c) => `• ${c}`).join("\n") || "(sin permisos)");
  }

  if (resultado.persona) {
    lineas.push(`Usuario: ${resultado.persona}`);
    if (resultado.efectivo?.length)
      lineas.push(`Efectivos:\n${resultado.efectivo.map((c) => `• ${c}`).join("\n")}`);
    if (resultado.agregados?.length)
      lineas.push(`Agregados (excepción): ${resultado.agregados.join(", ")}`);
    if (resultado.denegados?.length)
      lineas.push(`Denegados (excepción): ${resultado.denegados.join(", ")}`);
  }

  if (resultado.mensaje) lineas.unshift(resultado.mensaje);
  if (resultado.agregados?.length && resultado.mensaje)
    lineas.push(`Agregados: ${resultado.agregados.join(", ")}`);
  if (resultado.quitados?.length)
    lineas.push(`Quitados: ${resultado.quitados.join(", ")}`);
  if (resultado.concedidos?.length)
    lineas.push(`Concedidos: ${resultado.concedidos.join(", ")}`);
  if (resultado.retirados?.length)
    lineas.push(`Retirados: ${resultado.retirados.join(", ")}`);
  if (resultado.permisos && !resultado.rol)
    lineas.push(`Permisos finales: ${resultado.permisos.join(", ") || "(ninguno)"}`);
  if (resultado.no_encontrados?.length)
    lineas.push(`⚠ No existen: ${resultado.no_encontrados.join(", ")}`);

  return [...new Set(lineas)].filter(Boolean).join("\n\n");
};

// ---- Enviar mensaje a la IA ----
const enviarIA = async (textoDirecto) => {
  const texto = (textoDirecto ?? mensajeIA).trim();
  if (!texto || cargandoIA) return;

  setChat((prev) => [...prev, { rol: "user", texto }]);
  setMensajeIA("");
  setCargandoIA(true);

  try {
    const { data } = await PermisoService.chatPermiso(texto);

    const extra = formatearResultadoPermiso(data.resultado);
    const respuesta = [data.respuesta, extra].filter(Boolean).join("\n\n");

    setChat((prev) => [...prev, { rol: "ia", texto: respuesta || "Listo." }]);

    refrescarDesdeIA(data.resultado);
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
      <div ref={containerRef} className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row lg:gap-0">

        {/* ================= IZQUIERDA ================= */}
        <div className="min-w-0 flex-1 lg:pr-2">
          {/* Header */}
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Permisos</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Define accesos y acciones por rol o por usuario</p>
            </div>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-white/5">
              <button onClick={() => setMode("rol")} className={tabCls(mode === "rol")}>Por rol</button>
              <button onClick={() => setMode("usuario")} className={tabCls(mode === "usuario")}>Por usuario</button>
            </div>
          </div>

          {/* Selector de objetivo */}
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {mode === "rol" ? "Selecciona un rol" : "Selecciona un usuario"}
              </div>
              {mode === "rol" ? (
                <BuscadorMini value={filtroRol} onChange={setFiltroRol} placeholder="Buscar rol…" />
              ) : (
                <BuscadorMini value={filtroUser} onChange={setFiltroUser} placeholder="Buscar persona…" />
              )}
            </div>

            {errorCarga && (
              <div className="mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                {errorCarga}
              </div>
            )}

            {cargando ? (
              <div className="flex flex-wrap gap-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-9 w-32 animate-pulse rounded-xl bg-slate-100 dark:bg-white/10" />
                ))}
              </div>
            ) : listaVacia ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400 dark:border-white/10">
                {filtroActivo.trim() ? `Sin resultados para "${filtroActivo.trim()}"` : "No hay registros disponibles"}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {mode === "rol"
                  ? roles.map((r) => (
                      <button key={r.idrol} onClick={() => setRolSel(r.idrol)} className={chipCls(r.idrol === rolSel)}>
                        <Shield size={14} className="shrink-0" />
                        <span className="whitespace-nowrap">{r.nombre}</span>
                      </button>
                    ))
                  : personas.map((p) => (
                      <button key={p.idpersona} onClick={() => setUserSel(p.idpersona)} className={chipCls(p.idpersona === userSel)}>
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-[10px] font-bold text-indigo-600 dark:text-indigo-300">{inicialesDe(p)}</span>
                        <span className="whitespace-nowrap">{nombreCorto(p)}</span>
                      </button>
                    ))}
              </div>
            )}
          </div>

          {/* Resumen objetivo */}
          {haySeleccion && (
            <div className="mb-4 flex items-center justify-between rounded-2xl bg-gradient-to-r from-indigo-500/10 to-violet-500/10 px-4 py-3 ring-1 ring-inset ring-indigo-500/15">
              <div className="text-sm">
                <span className="text-slate-500 dark:text-slate-400">Editando permisos de </span>
                <span className="font-semibold">{mode === "rol" ? selectedRole.nombre : nombreCorto(selectedUser)}</span>
                {mode === "usuario" && <span className="text-slate-500 dark:text-slate-400"> · {rolDePersona(selectedUser)}</span>}
              </div>
              <div className="flex items-center gap-2">
                {mode === "usuario" && excepcionesCount > 0 && (
                  <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-300">
                    {excepcionesCount} excepci{excepcionesCount === 1 ? "ón" : "ones"} al rol
                  </span>
                )}
                <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-medium text-indigo-600 dark:bg-white/10 dark:text-indigo-300">
                  {accesoCount}/{modules.length} módulos
                </span>
              </div>
            </div>
          )}

          {/* Matriz de módulos (desde la BD) */}
          {loadingCatalogo || loadingPerms ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/10" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {modules.map((m) => {
                const meta = MODULE_META[m.id] || DEFAULT_META(m.id);
                const activo = moduloActivo(m);
                const accionesSinVer = m.acciones.filter((a) => a.accion !== "ver");
                return (
                  <div key={m.id} className={`rounded-2xl border bg-white p-4 shadow-sm transition dark:bg-white/[0.04] ${activo ? "border-indigo-200 dark:border-indigo-500/30" : "border-slate-200 dark:border-white/10"}`}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3.5">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${meta.tint}`}>
                          <meta.Icon size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold">{meta.nombre}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{meta.desc}</div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2.5">
                        <span className="hidden text-xs text-slate-400 sm:inline">{activo ? "Con acceso" : "Sin acceso"}</span>
                        <Switch on={activo} onClick={() => toggleModulo(m)} />
                      </div>
                    </div>

                    {/* Acciones del módulo (las que existan en la BD) */}
                    {activo && accionesSinVer.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-white/10">
                        {accionesSinVer.map((a) => {
                          const am = ACTION_META[a.accion] || DEFAULT_ACTION(a.accion);
                          const active = checked.has(a.idpermiso);
                          return (
                            <button
                              key={a.idpermiso}
                              onClick={() => toggleAccion(m, a)}
                              title={a.descripcion}
                              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${active ? "border-indigo-400 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300" : "border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/10"}`}
                            >
                              {active ? <Check size={13} /> : <am.Icon size={13} />} {am.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Guardar */}
          <div className="mt-5 flex items-center justify-end gap-3">
            {guardadoOk && (
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Check size={14} /> Guardado
              </span>
            )}
            <button
              onClick={guardar}
              disabled={guardando || !haySeleccion}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
            >
              {guardando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {guardando ? "Guardando…" : "Guardar permisos"}
            </button>
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

       {/* ================= DERECHA: PANEL IA (PERMISOS) ================================= */}
<aside style={isDesktop ? { width: panelWidth } : undefined} className="w-full shrink-0 lg:pl-2">
  <div className="sticky top-6 flex h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">

    {/* Header */}
    <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 p-4 dark:border-white/10">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm">
        <Sparkles size={17} />
      </div>
      <div>
        <div className="text-sm font-semibold">Asistente IA</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">Pídeme acciones sobre los permisos</div>
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