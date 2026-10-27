import { useMemo, useState } from "react";
import { useMap } from "react-leaflet";
import {
  Camera,
  Check,
  Expand,
  LocateFixed,
  Navigation,
  Menu,
  Minus,
  Plus,
  RotateCcw,
  Ruler,
  Settings,
  X,
} from "lucide-react";

export type HeatSettings = {
  enabled: boolean;
  urbanRadius: number;
  ruralRadius: number;
};

export type ToolboxLayer = {
  id: string;
  name: string;
  url?: string;
  swatch: string;
};

export const DEFAULT_TOOLBOX_LAYERS: ToolboxLayer[] = [
  {
    id: "estandar",
    name: "Mapa de OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    swatch: "from-lime-200 via-sky-100 to-lime-300",
  },
  {
    id: "humanitario",
    name: "Humanitario OSM",
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    swatch: "from-teal-200 via-stone-100 to-red-300",
  },
  {
    id: "relieve",
    name: "Mapa topografico abierto",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    swatch: "from-emerald-200 via-yellow-100 to-emerald-500",
  },
  {
    id: "satelite",
    name: "Satelite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    swatch: "from-slate-950 via-emerald-900 to-stone-300",
  },
];

type MapToolboxProps = {
  activeLayer: string;
  layers?: ToolboxLayer[];
  opacity?: number;
  heat?: HeatSettings;
  measuring?: boolean;
  onLayerChange: (layerId: string) => void;
  onOpacityChange?: (value: number) => void;
  onHeatChange?: (settings: HeatSettings) => void;
  onCapture?: () => void;
  onMeasure?: () => void;
  resetCenter?: [number, number];
  resetZoom?: number;
  className?: string;
};

const buttonBase =
  "grid h-12 w-12 place-items-center rounded-2xl bg-white text-blue-800 shadow-lg ring-1 ring-sky-100 transition hover:bg-sky-50 hover:text-sky-600 active:scale-95";

export default function MapToolbox({
  activeLayer,
  layers = DEFAULT_TOOLBOX_LAYERS,
  opacity = 100,
  heat = { enabled: true, urbanRadius: 500, ruralRadius: 2500 },
  measuring = false,
  onLayerChange,
  onOpacityChange,
  onHeatChange,
  onCapture,
  onMeasure,
  resetCenter,
  resetZoom,
  className = "",
}: MapToolboxProps) {
  const map = useMap();
  const [panel, setPanel] = useState<"heat" | "layers" | null>(null);
  const [localHeat, setLocalHeat] = useState(heat);

  const selectedLayer = useMemo(
    () => layers.find((layer) => layer.id === activeLayer) ?? layers[0],
    [activeLayer, layers],
  );

  const updateHeat = (next: HeatSettings) => {
    setLocalHeat(next);
    onHeatChange?.(next);
  };

  const resetMap = () => {
    if (resetCenter) {
      map.setView(resetCenter, resetZoom ?? map.getZoom(), { animate: true });
      return;
    }
    map.setZoom(resetZoom ?? 12);
  };

  const locateMe = () => {
    map.locate({ setView: true, maxZoom: 16 });
  };

  const toggleFullscreen = async () => {
    const container = map.getContainer().parentElement ?? map.getContainer();
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else if (container.requestFullscreen) {
      await container.requestFullscreen();
    }
    setTimeout(() => map.invalidateSize(), 250);
  };

  return (
    <div className={`pointer-events-none absolute right-4 top-4 z-[650] flex items-start gap-3 ${className}`}>
      <div className="pointer-events-auto relative">
        {panel === "layers" && (
          <div className="absolute right-[62px] top-16 w-[368px] max-w-[calc(100vw-96px)] rounded-2xl bg-white p-5 text-slate-800 shadow-2xl ring-1 ring-sky-100">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black tracking-wide">CONFIGURACION</h3>
              <button onClick={() => setPanel(null)} className="rounded-full p-1 hover:bg-slate-100" title="Cerrar">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              {layers.map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => onLayerChange(layer.id)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left font-bold transition ${
                    activeLayer === layer.id
                      ? "border-sky-400 bg-sky-100 text-slate-800"
                      : "border-transparent hover:bg-slate-100"
                  }`}
                >
                  <span className={`h-10 w-10 rounded-md bg-gradient-to-br ${layer.swatch} ring-1 ring-slate-300`} />
                  <span className="flex-1">{layer.name}</span>
                  {activeLayer === layer.id && <Check size={18} className="text-sky-600" />}
                </button>
              ))}
            </div>
            <div className="mt-5">
              <label className="text-sm font-black uppercase tracking-wide text-slate-500">Opacidad del mapa base</label>
              <div className="mt-2 flex items-center gap-3 text-sm font-bold text-sky-700">
                <span>Baja</span>
                <input
                  type="range"
                  min={25}
                  max={100}
                  value={opacity}
                  onChange={(event) => onOpacityChange?.(Number(event.target.value))}
                  className="h-2 flex-1 accent-blue-600"
                />
                <span>{opacity}%</span>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">Capa activa: {selectedLayer?.name}</div>
            </div>
          </div>
        )}

        {panel === "heat" && (
          <div className="absolute right-[62px] top-44 w-[350px] max-w-[calc(100vw-96px)] rounded-lg border border-sky-200 bg-white p-4 text-slate-800 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="text-lg font-black">Control de calor</h3>
              <label className="flex items-center gap-3 text-base font-black">
                <input
                  type="checkbox"
                  checked={localHeat.enabled}
                  onChange={(event) => updateHeat({ ...localHeat, enabled: event.target.checked })}
                  className="h-5 w-5 accent-blue-600"
                />
                Activo
              </label>
            </div>
            <label className="mb-2 block font-black text-slate-500">Radio urbano</label>
            <input
              type="number"
              value={localHeat.urbanRadius}
              onChange={(event) => updateHeat({ ...localHeat, urbanRadius: Number(event.target.value) || 0 })}
              className="mb-4 w-full rounded-lg border border-sky-200 px-3 py-3 text-lg font-bold outline-none focus:border-sky-500"
            />
            <label className="mb-2 block font-black text-slate-500">Radio rural</label>
            <input
              type="number"
              value={localHeat.ruralRadius}
              onChange={(event) => updateHeat({ ...localHeat, ruralRadius: Number(event.target.value) || 0 })}
              className="w-full rounded-lg border border-sky-200 px-3 py-3 text-lg font-bold outline-none focus:border-sky-500"
            />
          </div>
        )}

        <div className="flex flex-col items-center gap-2">
          <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/95 text-slate-800 shadow-lg ring-1 ring-sky-100">
            <div className="flex flex-col items-center justify-center leading-none">
              <span className="text-[10px] font-black leading-none">N</span>
              <Navigation size={21} className="mt-0.5" />
            </div>
          </div>
          <button onClick={onCapture} disabled={!onCapture} className={buttonBase} title="Capturar mapa">
            <Camera size={22} />
          </button>
          <button onClick={locateMe} className={buttonBase} title="Centrar ubicacion">
            <LocateFixed size={23} />
          </button>
          <button onClick={toggleFullscreen} className={buttonBase} title="Expandir pantalla">
            <Expand size={22} />
          </button>
          <button onClick={onMeasure} disabled={!onMeasure} className={`${buttonBase} ${measuring ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`} title="Medir distancia">
            <Ruler size={22} />
          </button>
          <button onClick={() => setPanel((value) => (value === "heat" ? null : "heat"))} className={`${buttonBase} ${panel === "heat" ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`} title="Configuracion del mapa">
            <Menu size={24} />
          </button>
          <button onClick={() => setPanel((value) => (value === "layers" ? null : "layers"))} className={`${buttonBase} ${panel === "layers" ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`} title="Tipos de mapa">
            <Settings size={22} />
          </button>
          <button onClick={resetMap} className={buttonBase} title="Resetear mapa">
            <RotateCcw size={22} />
          </button>
          <button onClick={() => map.zoomIn()} className={buttonBase} title="Acercar">
            <Plus size={24} />
          </button>
          <button onClick={() => map.zoomOut()} className={buttonBase} title="Alejar">
            <Minus size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}






