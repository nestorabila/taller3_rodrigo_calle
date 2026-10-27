import { useEffect, useMemo, useRef, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { Building2, FileUp, RadioTower, Search } from "lucide-react";
import L from "leaflet";
import * as XLSX from "xlsx";
import axios from "axios";
import { TokenService } from "../services/TokenService";
import "leaflet/dist/leaflet.css";
import MapToolbox, { DEFAULT_TOOLBOX_LAYERS, type HeatSettings } from "../components/MapToolbox";

type Antena = {
  site_id: string;
  nombre: string;
  latitud: number;
  longitud: number;
  categoria: string;
  direccion: string;
  archivo_origen: string;
  fecha_actualizacion: string;
};
const torre = L.divIcon({
  className: "",
  html: '<svg viewBox="0 0 40 48" width="32" height="39" fill="none" stroke="#1f2731" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 2px 2px white) drop-shadow(0 2px 3px #0006)"><path d="M20 9v31M13 40h14M15 40l5-24 5 24M16 33h8M17 26h6"/><circle cx="20" cy="11" r="2.5" fill="#1f2731"/><path d="M13 7a9 9 0 0 0 0 8M27 7a9 9 0 0 1 0 8M8 3a15 15 0 0 0 0 16M32 3a15 15 0 0 1 0 16"/></svg>',
  iconSize: [32, 39],
  iconAnchor: [16, 38],
  popupAnchor: [0, -37],
});
const auth = () => ({ Authorization: `Bearer ${TokenService.getToken()}` });
const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
const buscarValor = (r: Record<string, unknown>, nombres: string[]) => {
  const entries = Object.entries(r);
  for (const n of nombres) {
    const hit = entries.find(([k]) => normalizar(k) === normalizar(n));
    if (hit && hit[1] !== "") return hit[1];
  }
  return "";
};
const bandas = [
  { color: "#009dea", nombre: "Alta probabilidad" },
  { color: "#fe9900", nombre: "Probabilidad media" },
  { color: "#fb2c38", nombre: "Alcance máximo" },
];
function radios(categoria: string, urbanRadius = 500, ruralRadius = 2500) {
  const c = String(categoria).toUpperCase();
  const base = c.includes("RURAL") && !c.includes("URB") ? ruralRadius : urbanRadius;
  return [Math.round(base * 0.3), Math.round(base * 0.6), base];
}
function Ajustar({ items }: { items: Antena[] }) {
  const map = useMap();
  useEffect(() => {
    if (items.length)
      map.fitBounds(
        items.map((a) => [Number(a.latitud), Number(a.longitud)]),
        { padding: [60, 60], maxZoom: 14 },
      );
  }, [items, map]);
  return null;
}

export default function AntenasEntel() {
  const [items, setItems] = useState<Antena[]>([]),
    [busqueda, setBusqueda] = useState(""),
    [mensaje, setMensaje] = useState(""),
    [cargando, setCargando] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const mapaRef = useRef<HTMLDivElement>(null);
  const [activeLayer, setActiveLayer] = useState("estandar");
  const [mapOpacity, setMapOpacity] = useState(100);
  const [heatSettings, setHeatSettings] = useState<HeatSettings>({ enabled: true, urbanRadius: 500, ruralRadius: 2500 });
  const cargar = async () => {
    try {
      const { data } = await axios.get("/api/antenas-entel", {
        headers: auth(),
      });
      setItems(data);
    } catch {
      setMensaje("No se pudo consultar el registro de Entel");
    }
  };
  const sincronizarCasos = async () => {
    setCargando(true);
    try {
      const { data } = await axios.post(
        "/api/antenas-entel/sincronizar-casos",
        {},
        { headers: auth() },
      );
      setMensaje(
        `${data.total} antenas almacenadas · ${data.archivosProcesados} archivos de casos revisados`,
      );
      await cargar();
    } catch {
      setMensaje(
        "No se pudieron sincronizar las antenas guardadas en los casos",
      );
    } finally {
      setCargando(false);
    }
  };
  useEffect(() => {
    sincronizarCasos();
  }, []);
  const visibles = useMemo(() => {
    const q = busqueda.toLowerCase();
    return items.filter((a) =>
      `${a.site_id} ${a.nombre} ${a.categoria} ${a.direccion}`
        .toLowerCase()
        .includes(q),
    );
  }, [items, busqueda]);
  const importar = async (file: File) => {
    setCargando(true);
    setMensaje("");
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" }),
        rows: XLSX.WorkSheet[] = wb.SheetNames.map((n) => wb.Sheets[n]);
      const datos = rows.flatMap((ws) =>
        XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" }),
      );
      const antenas = datos
        .map((r, i) => ({
          siteId: String(
            buscarValor(r, [
              "SITE ID",
              "SITE_ID",
              "ID SITIO",
              "CODIGO",
              "CELDA",
              "ID",
            ]) || `ENTEL-${i + 1}`,
          ),
          nombre: String(
            buscarValor(r, [
              "NOMBRE",
              "NOMBRE ESTACION",
              "ESTACION",
              "SITIO",
              "RADIO BASE",
            ]) || "Antena Entel",
          ),
          lat: Number(
            String(buscarValor(r, ["LATITUD", "LATITUDE", "LAT"])).replace(
              ",",
              ".",
            ),
          ),
          lng: Number(
            String(
              buscarValor(r, ["LONGITUD", "LONGITUDE", "LON", "LNG"]),
            ).replace(",", "."),
          ),
          categoria: String(
            buscarValor(r, ["CATEGORIA", "TIPO", "ZONA"]) || "URBANO",
          ),
          direccion: String(
            buscarValor(r, ["DIRECCION", "UBICACION", "LOCALIDAD"]) || "",
          ),
        }))
        .filter((a) => Number.isFinite(a.lat) && Number.isFinite(a.lng));
      if (!antenas.length)
        throw new Error(
          "El archivo debe incluir columnas de Latitud y Longitud",
        );
      const { data } = await axios.post(
        "/api/antenas-entel/importar",
        { antenas, archivo: file.name },
        { headers: auth() },
      );
      setMensaje(`${data.guardadas} antenas guardadas desde ${file.name}`);
      await cargar();
    } catch (e) {
      setMensaje(
        e instanceof Error ? e.message : "No se pudo importar el archivo",
      );
    } finally {
      setCargando(false);
    }
  };
  const activeLayerDef = DEFAULT_TOOLBOX_LAYERS.find((layer) => layer.id === activeLayer) ?? DEFAULT_TOOLBOX_LAYERS[0];
  const capturarMapa = async () => {
    if (!mapaRef.current) return;
    const { default: html2canvas } = await import("html2canvas-pro");
    const canvas = await html2canvas(mapaRef.current, { useCORS: true, backgroundColor: "#ffffff" });
    const a = document.createElement("a");
    a.download = `antenas-${activeLayer}-${new Date().toISOString().slice(0, 10)}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };
  return (
    <div ref={mapaRef} className="relative h-full min-h-[620px] bg-slate-100">
      <MapContainer
        center={[-16.5, -68.15]}
        zoom={10}
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url={activeLayerDef.url ?? DEFAULT_TOOLBOX_LAYERS[0].url!}
          opacity={mapOpacity / 100}
        />
        <Ajustar items={visibles} />
        <MapToolbox
          activeLayer={activeLayer}
          layers={DEFAULT_TOOLBOX_LAYERS}
          opacity={mapOpacity}
          heat={heatSettings}
          onLayerChange={setActiveLayer}
          onOpacityChange={setMapOpacity}
          onHeatChange={setHeatSettings}
          onCapture={capturarMapa}
          resetCenter={[-16.5, -68.15]}
          resetZoom={10}
        />
        {visibles.map((a) => (
          <span key={a.site_id}>
            {heatSettings.enabled && radios(a.categoria, heatSettings.urbanRadius, heatSettings.ruralRadius).map((radio, i) => (
              <Circle
                key={radio}
                center={[Number(a.latitud), Number(a.longitud)]}
                radius={radio}
                pathOptions={{
                  color: bandas[i].color,
                  fillColor: bandas[i].color,
                  fillOpacity: [0.18, 0.11, 0.06][i],
                  weight: 1.5,
                  dashArray: i === 2 ? "6 5" : undefined,
                }}
              />
            ))}
            <Marker
              position={[Number(a.latitud), Number(a.longitud)]}
              icon={torre}
            >
              <Popup>
                <div className="min-w-60 text-sm">
                  <b className="text-base">📡 {a.nombre}</b>
                  <br />
                  <b>{a.site_id}</b> · {a.categoria}
                  <br />
                  {a.direccion}
                  <hr className="my-2" />
                  <b>
                    Bandas:{" "}
                    {radios(a.categoria, heatSettings.urbanRadius, heatSettings.ruralRadius)
                      .map((r) => (r >= 1000 ? `${r / 1000} km` : `${r} m`))
                      .join(" · ")}
                  </b>
                  <br />
                  <span className="text-xs">
                    Archivo: {a.archivo_origen || "Registro manual"}
                    <br />
                    Actualizado:{" "}
                    {new Date(a.fecha_actualizacion).toLocaleString()}
                  </span>
                </div>
              </Popup>
            </Marker>
          </span>
        ))}
      </MapContainer>
      <div className="absolute left-4 top-4 z-[500] flex max-w-[calc(100%-32px)] flex-wrap items-center gap-2 rounded-2xl bg-white/95 p-3 shadow-xl">
        <b className="flex items-center gap-2 rounded-xl bg-sky-700 px-3 py-2 text-sm text-white">
          <RadioTower size={17} />
          Antenas Entel
        </b>
        <label className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs">
          <Search size={15} />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar antena o SITE ID"
            className="w-52 outline-none"
          />
        </label>
        <button
          disabled={cargando}
          onClick={sincronizarCasos}
          className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800"
        >
          Sincronizar casos
        </button>
        <button
          disabled={cargando}
          onClick={() => input.current?.click()}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
        >
          <FileUp size={16} />
          {cargando ? "Guardando..." : "Subir datos"}
        </button>
        <input
          ref={input}
          hidden
          type="file"
          accept=".xls,.xlsx,.csv"
          onChange={(e) => e.target.files?.[0] && importar(e.target.files[0])}
        />
        {mensaje && <span className="text-xs text-slate-600">{mensaje}</span>}
      </div>
      <div className="absolute bottom-4 left-4 z-[500] overflow-hidden rounded-xl bg-slate-900/85 text-xs text-white shadow-lg">
        <div className="border-b border-white/10 px-3 py-2">
          <span className="flex items-center gap-2 font-semibold">
            <Building2 size={14} />
            {visibles.length} antenas Entel
          </span>
        </div>
        <div className="space-y-1.5 px-3 py-2">
          {bandas.map((b) => (
            <div key={b.nombre} className="flex items-center gap-2">
              <i
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: b.color }}
              />
              {b.nombre}
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 px-3 py-1.5 text-[10px] text-slate-300">
          Urbana hasta {heatSettings.urbanRadius} m · Rural hasta {heatSettings.ruralRadius} m
        </div>
      </div>
    </div>
  );
}


