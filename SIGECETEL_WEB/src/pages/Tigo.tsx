import { useState, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Circle, CircleMarker, Marker, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import MapToolbox, { DEFAULT_TOOLBOX_LAYERS, type HeatSettings } from "../components/MapToolbox";
import { AnalisisService } from "../services/AnalisisService";
import { listarCasosParaAnalisis } from "../services/CasosAnalisis";
import SubirSabana from "../components/SubirSabana";
import { abrirCaso, leerCasoActivo } from "../services/CasoActivo";

/* ───────── Capas base ───────── */
const LAYERS = {
  estandar: {
    name: "Estándar",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap",
  },
  humanitario: {
    name: "Humanitario OSM",
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors, HOT",
  },
  relieve: {
    name: "Relieve",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenTopoMap (CC-BY-SA)",
    maxZoom: 17,
  },
  satelite: {
    name: "Satélite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri, Maxar, Earthstar Geographics",
  },
  hibrido: {
    name: "Híbrido",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    overlay:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri",
  },
} as const;

type LayerKey = keyof typeof LAYERS;

const coordenadaValida = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
/* ───────── Iconos ───────── */
const Ico = ({ d, className = "h-[18px] w-[18px]" }: { d: React.ReactNode; className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const ICONS = {
  estandar: <Ico d={<><path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3Z" /><path d="M9 3v15M15 6v15" /></>} />,
  humanitario: <Ico d={<><path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3Z" /><path d="M9 3v15M15 6v15" /></>} />,
  relieve: <Ico d={<path d="m8 3 4 8 5-5 5 14H2L8 3Z" />} />,
  satelite: <Ico d={<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>} />,
  hibrido: <Ico d={<><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 17l9 5 9-5" /></>} />,
  layers: <Ico d={<><path d="m12 2 10 5-10 5L2 7l10-5Z" /><path d="m2 12 10 5 10-5M2 17l10 5 10-5" /></>} />,
  camara: <Ico d={<><path d="M14.5 4h-5L8 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4l-1.5-2Z" /><circle cx="12" cy="13" r="3.5" /></>} />,
  calendario: <Ico d={<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>} />,
  regla: <Ico d={<><path d="m3 17 14-14 4 4L7 21H3v-4Z" /><path d="m14 6 4 4M11 9l2 2M8 12l2 2" /></>} />,
  buscar: <Ico d={<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>} className="h-4 w-4" />,
  carpeta: <Ico d={<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />} />,
  chevron: <Ico d={<path d="m6 9 6 6 6-6" />} className="h-4 w-4" />,
  play: <Ico d={<path d="m6 3 14 9-14 9V3Z" />} className="h-4 w-4" />,
  cerrar: <Ico d={<path d="M18 6 6 18M6 6l12 12" />} className="h-[14px] w-[14px]" />,
  check: <Ico d={<path d="m5 12 5 5L20 7" />} className="h-4 w-4" />,
  mover: <Ico d={<><circle cx="9" cy="7" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="9" cy="17" r="1" /><circle cx="15" cy="7" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="17" r="1" /></>} className="h-[14px] w-[14px]" />,
  leyenda: <Ico d={<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></>} className="h-[14px] w-[14px]" />,
  anterior: <Ico d={<path d="m15 18-6-6 6-6" />} className="h-[13px] w-[13px]" />,
  siguiente: <Ico d={<path d="m9 18 6-6-6-6" />} className="h-[13px] w-[13px]" />,
} as const;

/* ───────── Vidrio translúcido ───────── */
const VIDRIO =
  "bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl ring-1 ring-slate-900/10 dark:ring-white/10 shadow-lg";
const BOTON_ICONO =
  `flex h-9 w-9 items-center justify-center rounded-xl ${VIDRIO} text-slate-700 dark:text-slate-200 ` +
  "transition hover:bg-white dark:hover:bg-slate-800 active:scale-95";

/** Encuadra el mapa sobre los puntos analizados */
function FitBounds({ puntos }: { puntos: any[] }) {
  const map = useMap();
  useEffect(() => {
    const bounds = puntos
      .map((p) => [Number(p?.lat), Number(p?.lng)] as [number, number])
      .filter(([lat, lng]) => coordenadaValida(lat, lng));
    if (!bounds.length) return;
    map.fitBounds(bounds, { padding: [70, 70] });
  }, [puntos, map]);
  return null;
}

/** Recalcula el tamaño del mapa cuando cambia el contenedor */
function AjustarTamano() {
  const map = useMap();
  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    setTimeout(() => map.invalidateSize(), 200);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

/** Marcador "D1", "D2"… */
const dIcon = (etiqueta: string, activo: boolean) =>
  L.divIcon({
    className: "",
    html:
      `<div style="background:${activo ? "#007ac8" : "#0f171f"};color:#fff;border:2.5px solid ${activo ? "#fff" : "#007ac8"};` +
      `border-radius:9999px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;` +
      `font-weight:700;font-size:11px;font-family:ui-sans-serif,system-ui;` +
      `box-shadow:0 3px 10px rgba(0,0,0,.45)">${etiqueta}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

/* ═══════════ Tarjeta de interpretación (arrastrable) ═══════════ */
function TarjetaInterpretacion({
  p, contRef, onClose,
}: { p: any; contRef: React.RefObject<HTMLDivElement>; onClose: () => void }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const tarjetaRef = useRef<HTMLDivElement>(null);
  const offset = useRef<{ ox: number; oy: number } | null>(null);

  useEffect(() => {
    if (pos || !contRef.current) return;
    const r = contRef.current.getBoundingClientRect();
    setPos({ x: Math.max(12, r.width - 352), y: 100 });
  }, [contRef, pos]);

  const onDown = (e: React.PointerEvent) => {
    const r = tarjetaRef.current!.getBoundingClientRect();
    offset.current = { ox: e.clientX - r.left, oy: e.clientY - r.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!offset.current || !contRef.current || !tarjetaRef.current) return;
    const cont = contRef.current.getBoundingClientRect();
    const card = tarjetaRef.current.getBoundingClientRect();
    const x = Math.min(Math.max(0, e.clientX - cont.left - offset.current.ox), cont.width - card.width);
    const y = Math.min(Math.max(0, e.clientY - cont.top - offset.current.oy), cont.height - card.height);
    setPos({ x, y });
  };

  const onUp = () => { offset.current = null; };

  const fechaHora = String(p.titulo).split(" - ").slice(1).join(" - ");

  return (
    <div
      ref={tarjetaRef}
      style={{ left: pos?.x ?? 12, top: pos?.y ?? 100, visibility: pos ? "visible" : "hidden" }}
      className="absolute z-[600] w-[332px] overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-900/15 dark:bg-slate-900 dark:ring-white/15"
    >
      {/* Barra de arrastre */}
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="flex cursor-move touch-none select-none items-center gap-2 border-b border-slate-200/80 px-2.5 py-1.5 dark:border-slate-700/80"
        title="Arrastra para mover la tarjeta"
      >
        <span className="text-slate-300 dark:text-slate-600">{ICONS.mover}</span>
        <span className="shrink-0 rounded-md bg-violet-600 px-1.5 text-[10px] font-bold leading-[17px] text-white">
          {p.etiqueta}
        </span>
        <span className="shrink-0 whitespace-nowrap text-[11px] font-semibold leading-[17px] text-slate-800 dark:text-slate-100">
          {p.tipo}
        </span>
        <span className="ml-auto shrink-0 whitespace-nowrap text-[10px] leading-[17px] text-slate-400">
          {fechaHora}
        </span>
        <button
          onClick={onClose}
          onPointerDown={(e) => e.stopPropagation()}
          className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-500/10 hover:text-slate-700 dark:hover:text-slate-200"
        >
          {ICONS.cerrar}
        </button>
      </div>

      {/* Ficha */}
      <div className="px-2.5 py-1.5">
        {(Array.isArray(p.ficha) ? p.ficha : []).map((f: any, i: number) => (
          <div key={i} className="flex gap-2">
            <span className="w-[56px] shrink-0 text-[9px] uppercase leading-[16px] tracking-wide text-slate-400">
              {f.etiqueta}
            </span>
            <span className="min-w-0 flex-1 break-words text-[11px] font-medium leading-[16px] text-slate-700 dark:text-slate-200">
              {f.valor}
            </span>
          </div>
        ))}
      </div>

      {/* Anillos de cobertura de este punto */}
      <div className="flex items-center gap-3 border-t border-slate-200/80 px-2.5 py-1.5 dark:border-slate-700/80">
        {(Array.isArray(p.anillos) ? p.anillos : []).map((a: any, i: number) => (
          <span key={i} className="flex items-center gap-1 text-[9px] text-slate-500 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full" style={{ background: a.color }} />
            {a.texto}
          </span>
        ))}
      </div>

      {/* Interpretación forense: completa, sin scroll */}
      <p className="border-t border-slate-200/80 bg-slate-50 px-2.5 py-2 text-[10px] leading-[16px] text-slate-600 dark:border-slate-700/80 dark:bg-slate-800/60 dark:text-slate-300"
         style={{ textAlign: "justify" }}>
        {p.interpretacion}
      </p>
    </div>
  );
}

/* ═══════════ Selector de caso con buscador ═══════════ */
function SelectorCaso({
  casos, idcaso, onSelect,
}: { casos: any[]; idcaso: string; onSelect: (id: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState("");
  const cajaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fuera = (e: MouseEvent) => {
      if (cajaRef.current && !cajaRef.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  const seleccionado = casos.find((c) => String(c.idcaso) === idcaso);
  const q = filtro.trim().toLowerCase();
  const visibles = q
    ? casos.filter((c) =>
        `${c.codigo} ${c.denunciante} ${c.denunciado} ${c.archivo}`.toLowerCase().includes(q))
    : casos;

  return (
    <div ref={cajaRef} className="relative">
      <button
        onClick={() => setAbierto((v) => !v)}
        className={
          `flex h-9 w-[190px] items-center gap-2 rounded-xl ${VIDRIO} px-2.5 ` +
          "text-[13px] font-medium text-slate-700 transition hover:bg-white dark:text-slate-200 dark:hover:bg-slate-800 " +
          (abierto ? "ring-violet-400" : "")
        }
      >
        <span className="text-violet-500">{ICONS.carpeta}</span>
        <span className="flex-1 truncate text-left">
          {seleccionado ? seleccionado.codigo : "Seleccionar caso…"}
        </span>
        <span className={"text-slate-400 transition-transform " + (abierto ? "rotate-180" : "")}>
          {ICONS.chevron}
        </span>
      </button>

      {abierto && (
        <div className={`absolute left-0 mt-2 w-[300px] overflow-hidden rounded-xl ${VIDRIO}`}>
          <div className="flex items-center gap-2 border-b border-slate-200/70 px-3 py-2 dark:border-slate-700/70">
            <span className="text-slate-400">{ICONS.buscar}</span>
            <input
              autoFocus
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Buscar caso…"
              className="w-full bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100"
            />
            {filtro && (
              <button onClick={() => setFiltro("")} className="text-slate-400 hover:text-slate-600">
                {ICONS.cerrar}
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto p-1.5">
            {visibles.length === 0 && (
              <p className="px-3 py-5 text-center text-xs text-slate-400">Sin resultados</p>
            )}
            {visibles.map((c) => {
              const activo = String(c.idcaso) === idcaso;
              return (
                <button
                  key={c.idcaso}
                  onClick={() => { onSelect(String(c.idcaso)); setAbierto(false); setFiltro(""); }}
                  className={
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition " +
                    (activo ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-slate-500/10 dark:text-slate-300")
                  }
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold leading-tight">{c.codigo}</p>
                    <p className={"truncate text-[11px] leading-tight " + (activo ? "text-violet-100" : "text-slate-400")}>
                      {c.denunciante} / {c.denunciado}
                    </p>
                  </div>
                  {c.sinSabana && (
                    <span className={"shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium " + (activo ? "bg-white/20 text-white" : "bg-amber-500/15 text-amber-700 dark:text-amber-300")}>
                      Sin sábana
                    </span>
                  )}
                  {activo && ICONS.check}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════ Componente principal ═══════════ */
export default function MapasDatos() {
  const CENTER: [number, number] = [-21.5355, -64.7296];

  const [activeKey, setActiveKey] = useState<LayerKey>("estandar");
  const [mapOpacity, setMapOpacity] = useState(100);
  const [heatSettings, setHeatSettings] = useState<HeatSettings>({ enabled: true, urbanRadius: 500, ruralRadius: 2500 });
  const [openLayers, setOpenLayers] = useState(false);

  const [casos, setCasos] = useState<any[]>([]);
  const [idcaso, setIdcaso] = useState(() => String(leerCasoActivo()?.idcaso ?? ""));
  const [analisis, setAnalisis] = useState<any>(null);
  const [sel, setSel] = useState<any>(null);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [calendarioAbierto, setCalendarioAbierto] = useState(false);
  const [modoMedicion, setModoMedicion] = useState(false);
  const [puntosMedicion, setPuntosMedicion] = useState<[number, number][]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [capturando, setCapturando] = useState(false);
  const [aviso, setAviso] = useState("");
  const lienzoRef = useRef<HTMLDivElement>(null);

  // Cuando el caso tiene varias hojas DATOS_*, el backend pide elegir
  const [opcionesHoja, setOpcionesHoja] = useState<any[]>([]);

  // Todos los casos, sin elegir ninguno por defecto: cada análisis empieza
  // con el caso que el usuario seleccione y con la sábana de ese caso.
  const cargarCasos = () =>
    listarCasosParaAnalisis("datos")
      .then((lista) => {
        setCasos(lista);
        // Mantiene al día los datos del caso abierto (por ejemplo, tras subir su sábana)
        const abierto = lista.find((c) => c.idcaso === leerCasoActivo()?.idcaso);
        if (abierto) abrirCaso(abierto);
      })
      .catch(() => setError("No se pudieron cargar los casos."));

  useEffect(() => { cargarCasos(); }, []);

  const casoSel = casos.find((c) => String(c.idcaso) === idcaso);

  const graficar = async (hoja?: string) => {
    if (!idcaso) return;
    setBusy(true);
    setError("");
    setSel(null);
    setOpcionesHoja([]);
    try {
      const { data } = await AnalisisService.analizarCasoDatos(Number(idcaso), hoja);
      if (data?.requiereSeleccion) {
        setAnalisis(null);
        setOpcionesHoja(data.opciones || []);
        return;
      }
      setAnalisis(data);
    } catch (e: any) {
      setAnalisis(null);
      setError(e?.response?.data?.mensaje || "Error al analizar el caso.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const fechas = (Array.isArray(analisis?.puntos) ? analisis.puntos : [])
      .map((p: any) => fechaClave(p.fecha_ini))
      .filter(Boolean)
      .sort();
    setFechaInicio(fechas[0] || "");
    setFechaFin(fechas[fechas.length - 1] || "");
    setSel(null);
  }, [analisis]);

  /** Captura el mapa tal como se ve (con la tarjeta abierta) */
  const capturar = async () => {
    if (!lienzoRef.current) return;
    setCapturando(true);
    setAviso("");
    try {
      await new Promise((r) => setTimeout(r, 250));
      const { default: html2canvas } = await import("html2canvas-pro");
      const lienzo = await html2canvas(lienzoRef.current, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        scale: 2,
        logging: false,
        imageTimeout: 20000,
        scrollX: 0,
        scrollY: 0,
        windowWidth: document.documentElement.clientWidth,
        windowHeight: document.documentElement.clientHeight,
      });
      lienzo.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const codigo = casos.find((c) => String(c.idcaso) === idcaso)?.codigo || "mapa";
        const etq = sel ? `_${sel.etiqueta}` : "";
        a.href = url;
        a.download = `datos_${codigo}${etq}.png`;
        a.click();
        URL.revokeObjectURL(url);
        setAviso("Captura descargada");
        setTimeout(() => setAviso(""), 2500);
      }, "image/png");
    } catch (e) {
      console.error(e);
      setAviso("No se pudo capturar");
      setTimeout(() => setAviso(""), 2500);
    } finally {
      setCapturando(false);
    }
  };

  const active = LAYERS[activeKey];
  const puntos = useMemo(() => {
    const origen = Array.isArray(analisis?.puntos) ? analisis.puntos : [];
    return origen
      .map((p: any) => ({
        ...p,
        lat: Number(p?.lat),
        lng: Number(p?.lng),
        anillos: Array.isArray(p?.anillos) ? p.anillos : [],
      }))
      .filter((p: any) => coordenadaValida(p.lat, p.lng));
  }, [analisis]);
  const puntosFiltrados = useMemo(() => [...puntos]
    .filter((p: any) => {
      const fecha = fechaClave(p.fecha_ini);
      if (!fecha) return !fechaInicio && !fechaFin;
      return (!fechaInicio || fecha >= fechaInicio) && (!fechaFin || fecha <= fechaFin);
    })
    .sort((a: any, b: any) => String(a.fecha_ini).localeCompare(String(b.fecha_ini))),
  [puntos, fechaInicio, fechaFin]);
  const distancia = puntosMedicion.length === 2
    ? distanciaMetros(puntosMedicion[0], puntosMedicion[1])
    : null;
  const agregarPuntoMedicion = (p: [number, number]) => {
    setPuntosMedicion((prev) => prev.length >= 2 ? [p] : [...prev, p]);
  };
  const ocultar = capturando ? "pointer-events-none opacity-0" : "opacity-100";

  useEffect(() => {
    if (sel && !puntosFiltrados.some((p: any) => p.nro === sel.nro)) setSel(null);
  }, [puntosFiltrados, sel]);

  /* ── ENFOQUE ──
     Sin selección se ven todos los puntos. Al hacer clic en uno, solo quedan
     visibles ese, el anterior y el siguiente, para poder leer su cobertura sin
     que los demás anillos la tapen. Otro clic en el mismo punto (o cerrar la
     tarjeta) vuelve a mostrar todo. */
  const idxSel = sel ? puntosFiltrados.findIndex((p: any) => p.nro === sel.nro) : -1;
  const visibles = idxSel < 0
    ? puntosFiltrados
    : puntosFiltrados.slice(Math.max(0, idxSel - 1), idxSel + 2);
  const rutaVisible = visibles.map((p: any) => [Number(p.lat), Number(p.lng)] as [number, number]);

  /* Avanza o retrocede una sesión sin salir del enfoque */
  const irA = (delta: number) => {
    if (!puntosFiltrados.length) return;
    const i = idxSel < 0 ? (delta < 0 ? puntosFiltrados.length - 1 : 0) : idxSel + delta;
    setSel(puntosFiltrados[Math.min(Math.max(0, i), puntosFiltrados.length - 1)]);
  };

  return (
    <div
      ref={lienzoRef}
      className="relative h-full w-full overflow-hidden rounded-2xl bg-slate-100 text-slate-800 ring-1 ring-slate-900/10 dark:bg-slate-950 dark:text-slate-100 dark:ring-white/10"
    >
      <style>{`
        .leaflet-container { font-family: inherit; background: transparent; }
        .leaflet-control-zoom a {
          background: rgba(255,255,255,.75); backdrop-filter: blur(10px);
          color: #36414d; border: none; font-weight: 400;
        }
        .leaflet-control-zoom a:hover { background: #fff; }
        .leaflet-control-attribution {
          background: rgba(255,255,255,.6) !important; backdrop-filter: blur(6px);
          font-size: 10px; border-radius: 6px 0 0 0;
        }
      `}</style>

      {/* preferCanvas: los anillos se dibujan en canvas y no en SVG,
          así la captura los reproduce en su posición exacta */}
      <MapContainer
        center={CENTER}
        zoom={12}
        zoomControl={false}
        preferCanvas
        className="absolute inset-0 z-0 h-full w-full"
      >
        <TileLayer key={active.url} url={active.url} attribution={active.attribution}
          crossOrigin="anonymous" opacity={mapOpacity / 100} maxZoom={"maxZoom" in active ? active.maxZoom : 19} />
        {"overlay" in active && active.overlay && (
          <TileLayer url={active.overlay} crossOrigin="anonymous" opacity={mapOpacity / 100} />
        )}
        <CapturarMedicion activo={modoMedicion} onPunto={agregarPuntoMedicion} />

        {puntosMedicion.map((p, i) => (
          <CircleMarker
            key={`medicion-${i}`}
            center={p}
            radius={6}
            pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#1f2731", fillOpacity: 1 }}
          />
        ))}
        {puntosMedicion.length === 2 && (
          <Polyline
            positions={puntosMedicion}
            pathOptions={{ color: "#1f2731", weight: 3, dashArray: "7 6", opacity: 0.95 }}
          />
        )}

        {/* Anillos concéntricos: del externo al interno para que el relleno no tape */}
        {visibles.map((p: any) =>
          (Array.isArray(p.anillos) ? [...p.anillos] : []).reverse().map((a: any, k: number) => {
            const activo = sel?.nro === p.nro;
            return (
              <Circle
                key={`c-${p.nro}-${k}`}
                center={[p.lat, p.lng]}
                radius={Number(a.radio) || 1}
                pathOptions={{
                  color: a.color || "#007ac8",
                  weight: activo ? 2.5 : 1.5,
                  fillColor: a.color || "#007ac8",
                  fillOpacity: activo ? Number(a.opacidad ?? 0.18) : Number(a.opacidad ?? 0.18) * 0.45,
                  dashArray: activo ? undefined : "4 5",
                }}
              />
            );
          })
        )}

        {visibles.length > 1 && (
          <Polyline positions={rutaVisible}
            pathOptions={{ color: "#007ac8", weight: 2, dashArray: "6 7", opacity: 0.9 }} />
        )}

        {visibles.map((p: any) => (
          <Marker
            key={`m-${p.nro}`}
            position={[p.lat, p.lng]}
            icon={dIcon(p.etiqueta, sel?.nro === p.nro)}
            eventHandlers={{
              // Clic en el mismo punto = quitar el enfoque
              click: () => setSel((s: any) => (s?.nro === p.nro ? null : p)),
            }}
          />
        ))}

        <FitBounds puntos={puntosFiltrados} />
        <CentrarPunto punto={sel} />
        <MapToolbox
          activeLayer={activeKey}
          layers={DEFAULT_TOOLBOX_LAYERS}
          opacity={mapOpacity}
          heat={heatSettings}
          measuring={modoMedicion}
          onLayerChange={(layerId) => setActiveKey(layerId as LayerKey)}
          onOpacityChange={setMapOpacity}
          onHeatChange={setHeatSettings}
          onCapture={puntos.length ? capturar : undefined}
          onMeasure={() => {
            setModoMedicion((v) => !v);
            if (modoMedicion) setPuntosMedicion([]);
          }}
          resetCenter={CENTER}
          resetZoom={12}
        />
        <AjustarTamano />
      </MapContainer>

      {/* ── Selector de hoja: aparece si el caso tiene varios números ── */}
      {opcionesHoja.length > 0 && (
        <div className="absolute inset-0 z-[700] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
          <div className={`w-[320px] rounded-2xl ${VIDRIO} p-4`}>
            <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
              Este caso tiene varios números
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              Elige la línea de datos móviles que quieres graficar:
            </p>
            <div className="mt-3 flex flex-col gap-1.5">
              {opcionesHoja.map((o: any) => (
                <button
                  key={o.hoja}
                  onClick={() => graficar(o.hoja)}
                  className="flex items-center justify-between rounded-xl bg-white/60 px-3 py-2.5 text-left transition hover:bg-violet-600 hover:text-white dark:bg-slate-800/60 dark:hover:bg-violet-600"
                >
                  <span className="text-[13px] font-semibold">{o.etiqueta}</span>
                  <span className="text-[10px] opacity-60">{o.hoja}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setOpcionesHoja([])}
              className="mt-3 w-full rounded-lg py-1.5 text-[12px] text-slate-500 transition hover:bg-slate-500/10 dark:text-slate-400"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Tarjeta arrastrable con la interpretación ── */}
      {sel && (
        <TarjetaInterpretacion p={sel} contRef={lienzoRef} onClose={() => setSel(null)} />
      )}

      {/* ── Superior izquierda: caso + graficar ── */}
      <div className={`absolute left-3 top-3 z-[500] flex items-center gap-2 transition-opacity duration-150 ${ocultar}`}>
        <SelectorCaso casos={casos} idcaso={idcaso} onSelect={(id) => { setIdcaso(id); setOpcionesHoja([]); setAnalisis(null); const c = casos.find((x) => String(x.idcaso) === id); if (c) abrirCaso(c); }} />
        <button
          onClick={() => graficar()}
          disabled={!idcaso || busy || casoSel?.sinSabana}
          className="flex h-9 items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 text-[13px] font-semibold text-white shadow-lg transition hover:bg-violet-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy
            ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            : ICONS.play}
          {busy ? "Analizando…" : "Graficar datos"}
        </button>
      </div>

      {/* Controles antiguos ocultos: se reemplazaron por MapToolbox */}
      <div className="hidden">
        <div className="relative">
          <button
            onClick={() => setOpenLayers((v) => !v)}
            title="Capas del mapa"
            className={
              `flex h-9 items-center gap-2 rounded-xl ${VIDRIO} px-2.5 text-[13px] font-medium ` +
              "text-slate-700 transition hover:bg-white dark:text-slate-200 dark:hover:bg-slate-800 " +
              (openLayers ? "ring-violet-400" : "")
            }
          >
            {ICONS.layers}
            <span className="hidden sm:inline">{active.name}</span>
            <span className={"text-slate-400 transition-transform " + (openLayers ? "rotate-180" : "")}>
              {ICONS.chevron}
            </span>
          </button>

          {openLayers && (
            <div className={`absolute right-0 mt-2 w-44 rounded-xl p-1.5 ${VIDRIO}`}>
              {(Object.entries(LAYERS) as [LayerKey, any][]).map(([key, l]) => (
                <button
                  key={key}
                  onClick={() => { setActiveKey(key); setOpenLayers(false); }}
                  className={
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition " +
                    (activeKey === key
                      ? "bg-violet-600 text-white shadow"
                      : "text-slate-600 hover:bg-slate-500/10 dark:text-slate-300")
                  }
                >
                  {ICONS[key]} {l.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={capturar}
          disabled={!puntos.length}
          title="Capturar el mapa como imagen"
          className={BOTON_ICONO + " disabled:cursor-not-allowed disabled:opacity-40"}
        >
          {ICONS.camara}
        </button>

        <div className="relative">
          <button
            onClick={() => setCalendarioAbierto((v) => !v)}
            disabled={!analisis}
            title="Filtrar por rango de fechas"
            className={
              (calendarioAbierto
                ? "bg-violet-600 text-white ring-violet-400 hover:bg-violet-700 "
                : `${VIDRIO} text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-800 `) +
              "flex h-9 w-9 items-center justify-center rounded-xl transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            }
          >
            {ICONS.calendario}
          </button>

          {calendarioAbierto && analisis && (
            <div className={`absolute right-12 top-0 w-[260px] rounded-xl ${VIDRIO} p-3`}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Rango de fechas</span>
                <span className="text-[10px] text-slate-400">{puntosFiltrados.length}/{puntos.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Inicio
                  <input
                    type="date"
                    value={fechaInicio}
                    max={fechaFin || undefined}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white/80 px-2 text-[11px] font-medium text-slate-700 outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-200"
                  />
                </label>
                <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Fin
                  <input
                    type="date"
                    value={fechaFin}
                    min={fechaInicio || undefined}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white/80 px-2 text-[11px] font-medium text-slate-700 outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-200"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            setModoMedicion((v) => !v);
            if (modoMedicion) setPuntosMedicion([]);
          }}
          title={modoMedicion ? "Cerrar medición" : "Medir distancia"}
          className={
            (modoMedicion
              ? "bg-blue-600 text-white ring-blue-400 hover:bg-blue-700 "
              : `${VIDRIO} text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-800 `) +
            "flex h-9 w-9 items-center justify-center rounded-xl transition active:scale-95"
          }
        >
          {ICONS.regla}
        </button>

        {modoMedicion && (
          <div className={`absolute right-12 top-[132px] whitespace-nowrap rounded-lg ${VIDRIO} px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300`}>
            {distancia === null
              ? `${puntosMedicion.length}/2 puntos · haz clic en el mapa`
              : distancia >= 1000
                ? `${(distancia / 1000).toFixed(2)} km`
                : `${distancia.toFixed(0)} m`}
          </div>
        )}
      </div>

      {/* ── Leyenda de bandas de cobertura ── */}
      {Array.isArray(analisis?.leyenda) && analisis.leyenda.length > 0 && (
        <div className={`absolute bottom-14 left-3 z-[500] rounded-xl ${VIDRIO} px-3 py-2 ${capturando ? "" : ""}`}>
          <p className="mb-1 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {ICONS.leyenda} Bandas de cobertura
          </p>
          {analisis.leyenda.map((l: any, i: number) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px] leading-[15px] text-slate-600 dark:text-slate-300">
              <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
              {l.etiqueta}
            </div>
          ))}
        </div>
      )}

      {/* ── Inferior izquierda: resumen ── */}
      {(analisis || error || aviso) && (
        <div className={`absolute bottom-3 left-3 z-[500] flex items-center gap-2.5 rounded-xl ${VIDRIO} px-3 py-2 text-[11px] transition-opacity duration-150 ${capturando ? "pointer-events-none opacity-0" : ""}`}>
          {analisis && (
            <>
              <span className="font-mono"><span className="text-violet-500">N°</span> {analisis.numero}</span>
              {analisis.operador && (
                <>
                  <span className="h-3 w-px bg-slate-400/30" />
                  <span className="font-mono text-slate-500 dark:text-slate-400">{analisis.operador}</span>
                </>
              )}
              <span className="h-3 w-px bg-slate-400/30" />
              <span className="font-mono"><span className="text-violet-500">SES</span> {analisis.total}</span>
              <span className="h-3 w-px bg-slate-400/30" />
              <span className="font-mono"><span className="text-violet-500">TOTAL</span> {analisis.totales?.mb_total} MB</span>
              {puntosFiltrados.length > 0 && (
                <>
                  <span className="h-3 w-px bg-slate-400/30" />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => irA(-1)}
                      disabled={idxSel === 0}
                      title="Sesión anterior"
                      className="rounded-md p-1 text-slate-500 transition hover:bg-slate-500/10 hover:text-slate-800 disabled:opacity-30 dark:hover:text-slate-100"
                    >
                      {ICONS.anterior}
                    </button>
                    <button
                      onClick={() => setSel(null)}
                      title="Ver todos los puntos"
                      className="flex items-center gap-1 rounded-md bg-violet-600/10 px-1.5 py-0.5 font-mono text-violet-600 transition hover:bg-violet-600/20 dark:text-violet-400"
                    >
                      {sel ? `${sel.etiqueta} · ${idxSel + 1}/${puntosFiltrados.length}` : `${puntosFiltrados.length}/${puntos.length} por fecha`}
                      {sel && ICONS.cerrar}
                    </button>
                    <button
                      onClick={() => irA(1)}
                      disabled={idxSel === puntosFiltrados.length - 1}
                      title="Sesión siguiente"
                      className="rounded-md p-1 text-slate-500 transition hover:bg-slate-500/10 hover:text-slate-800 disabled:opacity-30 dark:hover:text-slate-100"
                    >
                      {ICONS.siguiente}
                    </button>
                    {sel && (
                      <span className="ml-1 whitespace-nowrap font-mono text-[10px] text-slate-500 dark:text-slate-400">
                        {String(sel.fecha_ini).replace("T", " ")}
                      </span>
                    )}
                  </div>
                </>
              )}
            </>
          )}
          {error && <span className="text-red-500">{error}</span>}
          {aviso && <span className="text-emerald-500">{aviso}</span>}
        </div>
      )}

      {/* ── Estado vacío: elegir caso, pedir la sábana o graficar ── */}
      {!analisis && !busy && (
        <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center">
          {casoSel?.sinSabana ? (
            <SubirSabana
              caso={casoSel}
              tipo="datos"
              onListo={() => { setError(""); cargarCasos(); }}
            />
          ) : (
            <div className={`rounded-2xl ${VIDRIO} px-5 py-3.5 text-center`}>
              <p className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
                {!casos.length ? "Todavía no hay casos registrados" : casoSel ? "Presiona Graficar datos para analizar el caso seleccionado" : "Selecciona un caso para empezar"}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {!casos.length ? "Registra un caso desde el módulo Casos" : casoSel ? "Se leerá la sábana adjunta a este caso" : "Cada caso se analiza con su propia sábana"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Centra suavemente el mapa en el punto recorrido desde la línea temporal */
function CentrarPunto({ punto }: { punto: any | null }) {
  const map = useMap();
  useEffect(() => {
    if (!punto) return;
    const lat = Number(punto.lat);
    const lng = Number(punto.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 0.65 });
  }, [punto, map]);
  return null;
}

function CapturarMedicion({ activo, onPunto }: { activo: boolean; onPunto: (p: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      if (activo) onPunto([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

const distanciaMetros = (a: [number, number], b: [number, number]) => {
  const rad = (v: number) => v * Math.PI / 180;
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

/** Normaliza fechas YYYY-MM-DD o DD/MM/YYYY para los controles date */
const fechaClave = (valor: unknown) => {
  const txt = String(valor || "").trim();
  const iso = txt.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const latam = txt.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return latam ? `${latam[3]}-${latam[2]}-${latam[1]}` : "";
};









