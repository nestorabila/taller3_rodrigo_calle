import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ChartColumn,
  Clock,
  FileSpreadsheet,
  FolderOpen,
  Info,
  Loader2,
  PhoneCall,
  FileDown,
  RadioTower,
  Wifi,
} from "lucide-react";
import { MapContainer, TileLayer, Circle, Marker, Polyline } from "react-leaflet";
import L from "leaflet";
import { AnalisisService } from "../services/AnalisisService";
import { CasoService } from "../services/CasoService";
import { abrirCaso, leerCasoActivo } from "../services/CasoActivo";

/* ============================================================
   REPORTE · resumen de todo el análisis de un caso
   No calcula nada nuevo sobre la sábana: toma lo que ya entrega
   el análisis de Llamadas/SMS y de Datos (las mismas rutas que
   usan los mapas) y lo resume en cifras, tablas y conclusiones.
   ============================================================ */

type CasoAnalisis = {
  idcaso: number;
  codigo: string;
  denunciante: string;
  denunciado: string;
  archivo: string;
  llamadas: number;
  datos: number;
};

type Seccion = { hoja: string; operador: string; data: any };

/* ───────────── Helpers ───────────── */

const aFecha = (s: any): Date | null => {
  const m = String(s ?? "")
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) : null;
};

const dosDig = (n: number) => String(n).padStart(2, "0");

const fechaTexto = (d: Date | null) =>
  d ? `${dosDig(d.getDate())}/${dosDig(d.getMonth() + 1)}/${d.getFullYear()} ${dosDig(d.getHours())}:${dosDig(d.getMinutes())}` : "sin fecha";

const aSegundos = (txt: any) => {
  const m = String(txt ?? "").trim().match(/^(\d+):(\d{2}):(\d{2})$/);
  return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0;
};

const tiempoTexto = (seg: number) => {
  if (!seg) return "0 min";
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = seg % 60;
  if (h) return `${h} h ${m} min`;
  if (m) return `${m} min ${s} s`;
  return `${s} s`;
};

/** "770,62" → 770.62 */
const aMB = (txt: any) => {
  const n = parseFloat(String(txt ?? "").replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
};

const mbTexto = (mb: number) =>
  mb >= 1024
    ? `${(mb / 1024).toLocaleString("es-BO", { maximumFractionDigits: 2 })} GB`
    : `${mb.toLocaleString("es-BO", { maximumFractionDigits: 2 })} MB`;

const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

const contar = (lista: string[]) => {
  const mapa = new Map<string, number>();
  lista.forEach((v) => mapa.set(v, (mapa.get(v) || 0) + 1));
  return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
};

/** Cifras comunes a llamadas y datos: periodo, horas, días, antenas */
const resumenBase = (puntos: any[]) => {
  const fechas = puntos.map((p) => aFecha(p.fecha_ini)).filter(Boolean) as Date[];
  const orden = [...fechas].sort((a, b) => a.getTime() - b.getTime());
  const porHora = Array(24).fill(0) as number[];
  fechas.forEach((d) => porHora[d.getHours()]++);
  const dias = new Set(fechas.map((d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`));
  const horaPico = porHora.indexOf(Math.max(...porHora));

  return {
    inicio: orden[0] || null,
    fin: orden[orden.length - 1] || null,
    porHora,
    horaPico: fechas.length ? horaPico : null,
    eventosHoraPico: fechas.length ? porHora[horaPico] : 0,
    diasActivos: dias.size,
    zonas: contar(puntos.map((p) => String(p.zona || "SIN ZONA"))),
    antenas: contar(puntos.map((p) => String(p.rbs || "Sin radio base"))),
  };
};

const resumirLlamadas = (data: any) => {
  const puntos: any[] = data?.puntos || [];
  const base = resumenBase(puntos);
  const tramos: any[] = data?.recorrido?.tramos || [];
  const paradas = (data?.recorrido?.puntos || []).filter((p: any) => p.parada).length;

  return {
    ...base,
    numero: data?.numero || "",
    total: puntos.length,
    tipos: contar(puntos.map((p) => String(p.tipo || "SIN TIPO"))),
    segundosLlamadas: puntos
      .filter((p) => String(p.tipo || "").includes("LLAMADA"))
      .reduce((a, p) => a + aSegundos(p.duracion), 0),
    distanciaKm: tramos.reduce((a, t) => a + (Number(t.distancia_km) || 0), 0),
    tramos: tramos.length,
    tramosNoFisicos: tramos.filter((t) => t.imposible).length,
    paradas,
  };
};

const resumirDatos = (data: any) => {
  const puntos: any[] = data?.puntos || [];
  const base = resumenBase(puntos);

  const porAntena = new Map<string, { sesiones: number; mb: number }>();
  puntos.forEach((p) => {
    const clave = String(p.rbs || "Sin radio base");
    const actual = porAntena.get(clave) || { sesiones: 0, mb: 0 };
    actual.sesiones++;
    actual.mb += aMB(p.mb_total);
    porAntena.set(clave, actual);
  });

  return {
    ...base,
    numero: data?.numero || "",
    total: puntos.length,
    mbSubida: aMB(data?.totales?.mb_sub),
    mbDescarga: aMB(data?.totales?.mb_des),
    mbTotal: aMB(data?.totales?.mb_total),
    segundos: puntos.reduce((a, p) => a + aSegundos(p.duracion), 0),
    antenasMB: [...porAntena.entries()].sort((a, b) => b[1].mb - a[1].mb),
  };
};

/* ───────────── Piezas visuales ───────────── */

const tarjeta =
  "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900 print:shadow-none";

function Cifra({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) {
  return (
    <div className="rounded-xl bg-slate-100/70 px-4 py-3 dark:bg-white/5">
      <div className="text-xs text-slate-500 dark:text-slate-400">{titulo}</div>
      <div className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight">{valor}</div>
      {detalle && <div className="text-xs text-slate-500 dark:text-slate-400">{detalle}</div>}
    </div>
  );
}

/** Barras horizontales con el valor escrito: sirve para tipos, zonas y antenas */
function Barras({ filas, total, sufijo = "" }: { filas: [string, number][]; total: number; sufijo?: string }) {
  const maximo = Math.max(...filas.map((f) => f[1]), 1);
  return (
    <div className="space-y-2.5">
      {filas.map(([nombre, valor]) => (
        <div key={nombre}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate" title={nombre}>{nombre}</span>
            <span className="shrink-0 tabular-nums text-slate-500 dark:text-slate-400">
              {valor.toLocaleString("es-BO", { maximumFractionDigits: 2 })}{sufijo} · {pct(valor, total)} %
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/10">
            <div className="h-full rounded-full bg-blue-600 dark:bg-blue-500" style={{ width: `${(valor / maximo) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Actividad por hora del día (0 a 23) */
function Horas({ porHora, horaPico }: { porHora: number[]; horaPico: number | null }) {
  const maximo = Math.max(...porHora, 1);
  return (
    <div>
      <div className="flex h-28 items-end gap-[3px]">
        {porHora.map((n, h) => (
          <div
            key={h}
            title={`${dosDig(h)}:00 a ${dosDig(h)}:59 — ${n} registro${n === 1 ? "" : "s"}`}
            className="flex h-full flex-1 items-end"
          >
            <div
              className={`w-full rounded-t-sm ${h === horaPico ? "bg-blue-600 dark:bg-blue-400" : "bg-slate-300 dark:bg-slate-600"}`}
              style={{ height: n ? `${Math.max((n / maximo) * 100, 4)}%` : "1px" }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
        <span>00 h</span><span>06 h</span><span>12 h</span><span>18 h</span><span>23 h</span>
      </div>
    </div>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">{titulo}</h3>
      {children}
    </div>
  );
}

/* ───────────── Recorrido y análisis antena por antena ───────────── */

/** Sector según el nombre de la radio base ("..._4G-13" → sector 3), igual que el análisis */
const sectorDeRBS = (rbs: string) => {
  const m = String(rbs || "").match(/-(\d)(\d)\b/);
  const sec = m ? parseInt(m[2], 10) : 0;
  return sec >= 1 && sec <= 3 ? sec : null;
};

const AZIMUT_SECTOR: Record<number, string> = { 1: "0° (norte)", 2: "120° (sureste)", 3: "240° (suroeste)" };

const fechaRegistro = (iso: any) => {
  const d = aFecha(iso);
  return d ? fechaTexto(d) : String(iso || "sin fecha");
};

const marcador = (texto: string, repetida: boolean) =>
  L.divIcon({
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    html:
      `<div style="width:26px;height:26px;border-radius:50%;display:grid;place-items:center;` +
      `background:${repetida ? "#1f2731" : "#007ac8"};color:#fff;border:2px solid #fff;` +
      `font:600 11px Inter,sans-serif;box-shadow:0 1px 3px rgba(0,0,0,.45)">${texto}</div>`,
  });

/**
 * Mapa del recorrido: cada registro numerado en la antena que lo atendió,
 * unido en orden cronológico. Los tramos no físicos se dibujan punteados en rojo.
 */
function MapaRecorrido({ puntos, tramos }: { puntos: any[]; tramos?: any[] }) {
  const validos = puntos.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (!validos.length) return null;

  const limites = L.latLngBounds(validos.map((p) => [p.lat, p.lng] as [number, number])).pad(0.25);

  // Varias conexiones a la misma antena caen en el mismo punto: se muestra el rango "3-5"
  const porLugar = new Map<string, any[]>();
  validos.forEach((p) => {
    const clave = `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
    porLugar.set(clave, [...(porLugar.get(clave) || []), p]);
  });

  return (
    <div className="isolate h-[420px] overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 print:h-[380px]">
      <MapContainer bounds={limites} scrollWheelZoom={false} className="h-full w-full" style={{ background: "#e1e7ed" }}>
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {[...porLugar.values()].map((grupo) => (
          <Circle
            key={`c-${grupo[0].nro}`}
            center={[grupo[0].lat, grupo[0].lng]}
            radius={grupo[0].radio || 300}
            pathOptions={{ color: "#007ac8", weight: 1, fillColor: "#007ac8", fillOpacity: 0.07 }}
          />
        ))}

        {validos.slice(1).map((p, i) => {
          const noFisico = tramos?.[i]?.imposible;
          return (
            <Polyline
              key={`t-${p.nro}-${i}`}
              positions={[[validos[i].lat, validos[i].lng], [p.lat, p.lng]]}
              pathOptions={
                noFisico
                  ? { color: "#e7000f", weight: 2, dashArray: "5 7", opacity: 0.9 }
                  : { color: "#1f2731", weight: 2.5, opacity: 0.85 }
              }
            />
          );
        })}

        {[...porLugar.values()].map((grupo) => {
          const texto = grupo.length === 1 ? String(grupo[0].nro) : `${grupo[0].nro}+`;
          return <Marker key={`m-${grupo[0].nro}`} position={[grupo[0].lat, grupo[0].lng]} icon={marcador(texto, grupo.length > 1)} />;
        })}
      </MapContainer>
    </div>
  );
}

function LeyendaMapa({ conTramos }: { conTramos: boolean }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
      <span className="flex items-center gap-1.5"><i className="inline-block h-3 w-3 rounded-full bg-blue-600" /> Antena con un registro (número de orden)</span>
      <span className="flex items-center gap-1.5"><i className="inline-block h-3 w-3 rounded-full bg-slate-800 dark:bg-slate-300" /> Antena con varios registros (primer número +)</span>
      <span className="flex items-center gap-1.5"><i className="inline-block h-0.5 w-5 bg-slate-800 dark:bg-slate-300" /> Orden cronológico</span>
      {conTramos && <span className="flex items-center gap-1.5"><i className="inline-block h-0 w-5 border-t-2 border-dashed border-red-600" /> Tramo no físico</span>}
      <span className="flex items-center gap-1.5"><i className="inline-block h-3 w-3 rounded-full border border-blue-600 bg-blue-600/10" /> Alcance referencial</span>
    </div>
  );
}

/** Tramo por tramo: de qué antena a cuál, distancia, dirección, tiempo y velocidad */
function TablaTramos({ tramos }: { tramos: any[] }) {
  if (!tramos.length) return null;
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
            <th className="py-2 pr-3 font-medium">Tramo</th>
            <th className="py-2 pr-3 text-right font-medium">Distancia</th>
            <th className="py-2 pr-3 font-medium">Dirección</th>
            <th className="py-2 pr-3 font-medium">Tiempo entre registros</th>
            <th className="py-2 pr-3 text-right font-medium">Velocidad necesaria</th>
            <th className="py-2 font-medium">Certeza</th>
          </tr>
        </thead>
        <tbody>
          {tramos.map((t) => (
            <tr key={`${t.desde}-${t.hasta}`} className="border-b border-slate-100 align-top dark:border-white/5 print:break-inside-avoid">
              <td className="py-2 pr-3 font-medium">{t.desde} → {t.hasta}</td>
              <td className="py-2 pr-3 text-right">{Number(t.distancia_km).toLocaleString("es-BO", { maximumFractionDigits: 2 })} km</td>
              <td className="py-2 pr-3">{t.direccion} ({t.azimut}°)</td>
              <td className="py-2 pr-3">{t.tiempo_texto}</td>
              <td className={`py-2 pr-3 text-right ${t.imposible ? "font-semibold text-red-700 dark:text-red-400" : ""}`}>
                {t.velocidad_kmh === null || t.velocidad_kmh === undefined ? "—" : `${Number(t.velocidad_kmh).toLocaleString("es-BO", { maximumFractionDigits: 0 })} km/h`}
                {t.imposible ? " · no físico" : ""}
              </td>
              <td className="py-2">{t.certeza}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Lectura de cada tramo, tal como la redacta el análisis */
function LecturaTramos({ tramos }: { tramos: any[] }) {
  const conTexto = tramos.filter((t) => t.interpretacion);
  if (!conTexto.length) return null;
  return (
    <ol className="mt-4 space-y-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
      {conTexto.map((t) => (
        <li key={`${t.desde}-${t.hasta}`} className="print:break-inside-avoid">
          <span className="font-semibold text-slate-900 dark:text-white">{t.desde} → {t.hasta}.</span> {t.interpretacion}
        </li>
      ))}
    </ol>
  );
}

/**
 * Antena por antena: cada radio base en el orden en que aparece por primera vez,
 * con sus datos y todos los registros que atendió, cada uno con su interpretación.
 */
function AntenaPorAntena({ puntos, esDatos }: { puntos: any[]; esDatos?: boolean }) {
  const grupos = useMemo(() => {
    const mapa = new Map<string, any[]>();
    puntos.forEach((p) => {
      const clave = String(p.rbs || "Sin radio base");
      mapa.set(clave, [...(mapa.get(clave) || []), p]);
    });
    return [...mapa.entries()];
  }, [puntos]);

  return (
    <div className="space-y-4">
      {grupos.map(([rbs, registros], i) => {
        const p0 = registros[0];
        const sector = sectorDeRBS(rbs);
        const celdas = [...new Set(registros.map((r) => String(r.celda || "").trim()).filter(Boolean))];
        const mb = registros.reduce((a, r) => a + aMB(r.mb_total), 0);
        return (
          <article key={rbs} className="rounded-xl border border-slate-200 dark:border-white/10 print:break-inside-avoid-page">
            <header className="flex flex-wrap items-start gap-x-6 gap-y-2 border-b border-slate-200 px-4 py-3 dark:border-white/10">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-800 text-xs font-semibold tabular-nums text-white dark:bg-slate-200 dark:text-slate-900">{i + 1}</span>
                <div className="min-w-0">
                  <h4 className="break-words text-sm font-semibold">{rbs}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {registros.length} registro{registros.length === 1 ? "" : "s"}
                    {esDatos ? ` · ${mbTexto(mb)}` : ""}
                    {registros.length > 1 ? ` · del ${fechaRegistro(p0.fecha_ini)} al ${fechaRegistro(registros[registros.length - 1].fecha_ini)}` : ` · ${fechaRegistro(p0.fecha_ini)}`}
                  </p>
                </div>
              </div>
              <dl className="ml-auto grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
                <div><dt className="text-slate-500 dark:text-slate-400">Zona</dt><dd className="font-medium">{p0.zona || "—"} · {p0.rango || "—"}</dd></div>
                <div><dt className="text-slate-500 dark:text-slate-400">Sector</dt><dd className="font-medium">{sector ? `${sector} · ${AZIMUT_SECTOR[sector]}` : "No identificado"}</dd></div>
                <div><dt className="text-slate-500 dark:text-slate-400">Celda{celdas.length === 1 ? "" : "s"}</dt><dd className="break-words font-medium">{celdas.join(", ") || "—"}</dd></div>
                <div><dt className="text-slate-500 dark:text-slate-400">Coordenadas</dt><dd className="font-medium tabular-nums">{p0.lat}, {p0.lng}</dd></div>
              </dl>
            </header>

            <ul className="divide-y divide-slate-100 dark:divide-white/5">
              {registros.map((r) => (
                <li key={r.nro} className="px-4 py-3 print:break-inside-avoid">
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                    <span className="font-semibold tabular-nums">{r.etiqueta}</span>
                    <span className="tabular-nums">{fechaRegistro(r.fecha_ini)}</span>
                    <span className="font-medium">{r.tipo}</span>
                    {r.duracion && r.duracion !== "-" && <span className="tabular-nums text-slate-500 dark:text-slate-400">Duración {r.duracion}</span>}
                    {esDatos && (
                      <span className="tabular-nums text-slate-500 dark:text-slate-400">
                        {r.mb_total} MB ({r.mb_des} MB de descarga, {r.mb_sub} MB de subida)
                      </span>
                    )}
                  </div>
                  {r.interpretacion && (
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{r.interpretacion}</p>
                  )}
                </li>
              ))}
            </ul>
          </article>
        );
      })}
    </div>
  );
}

/* ───────────── Secciones del reporte ───────────── */

function SeccionLlamadas({ seccion }: { seccion: Seccion }) {
  const r = useMemo(() => resumirLlamadas(seccion.data), [seccion]);
  const antenaTop = r.antenas[0];
  const puntos: any[] = seccion.data?.puntos || [];
  const tramos: any[] = seccion.data?.recorrido?.tramos || [];

  const conclusiones = [
    `El número ${r.numero || "analizado"} registra ${r.total} evento${r.total === 1 ? "" : "s"} de llamadas y SMS entre el ${fechaTexto(r.inicio)} y el ${fechaTexto(r.fin)}, en ${r.diasActivos} día${r.diasActivos === 1 ? "" : "s"} con actividad.`,
    antenaTop && `La radio base más utilizada fue ${antenaTop[0]}, con ${antenaTop[1]} evento${antenaTop[1] === 1 ? "" : "s"} (${pct(antenaTop[1], r.total)} % del total). En total se conectó a ${r.antenas.length} radio${r.antenas.length === 1 ? " base" : "s base"} distinta${r.antenas.length === 1 ? "" : "s"}.`,
    r.horaPico !== null && `La franja con más actividad fue de ${dosDig(r.horaPico)}:00 a ${dosDig(r.horaPico)}:59, con ${r.eventosHoraPico} evento${r.eventosHoraPico === 1 ? "" : "s"}.`,
    r.tramos > 0 && `El recorrido estimado entre antenas suma ${r.distanciaKm.toLocaleString("es-BO", { maximumFractionDigits: 1 })} km en ${r.tramos} tramo${r.tramos === 1 ? "" : "s"}, con ${r.paradas} punto${r.paradas === 1 ? "" : "s"} de permanencia probable${r.tramosNoFisicos ? ` y ${r.tramosNoFisicos} tramo${r.tramosNoFisicos === 1 ? "" : "s"} con velocidad no física (${r.tramosNoFisicos === 1 ? "no representa" : "no representan"} un camino real)` : ""}.`,
  ].filter(Boolean) as string[];

  return (
    <section className={`${tarjeta} p-5`}>
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white"><PhoneCall size={18} /></div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight">Llamadas y SMS · {seccion.operador}</h2>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">
            Número {r.numero || "sin identificar"} · hoja {seccion.hoja}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cifra titulo="Eventos" valor={String(r.total)} detalle={`${r.diasActivos} día${r.diasActivos === 1 ? "" : "s"} con actividad`} />
        <Cifra titulo="Tiempo en llamadas" valor={tiempoTexto(r.segundosLlamadas)} />
        <Cifra titulo="Radios base distintas" valor={String(r.antenas.length)} />
        <Cifra titulo="Recorrido estimado" valor={`${r.distanciaKm.toLocaleString("es-BO", { maximumFractionDigits: 1 })} km`} detalle={`${r.tramos} tramo${r.tramos === 1 ? "" : "s"}`} />
      </div>

      <p className="mt-3 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Clock size={14} className="shrink-0" /> Del {fechaTexto(r.inicio)} al {fechaTexto(r.fin)}
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <Bloque titulo="Tipo de registro"><Barras filas={r.tipos} total={r.total} /></Bloque>
        <Bloque titulo="Actividad por hora del día"><Horas porHora={r.porHora} horaPico={r.horaPico} /></Bloque>
        <Bloque titulo="Radios base más utilizadas"><Barras filas={r.antenas.slice(0, 6)} total={r.total} /></Bloque>
        <Bloque titulo="Tipo de zona"><Barras filas={r.zonas} total={r.total} /></Bloque>
      </div>

      <Conclusiones lineas={conclusiones} />

      <div className="mt-8 print:break-before-page">
        <h3 className="text-base font-semibold tracking-tight">Recorrido completo</h3>
        <p className="mb-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
          Los {r.total} registros en orden cronológico, cada uno ubicado en la antena que atendió la comunicación
        </p>
        <MapaRecorrido puntos={puntos} tramos={tramos} />
        <LeyendaMapa conTramos />
        <TablaTramos tramos={tramos} />
        <LecturaTramos tramos={tramos} />
      </div>

      <div className="mt-8">
        <h3 className="text-base font-semibold tracking-tight">Análisis antena por antena</h3>
        <p className="mb-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
          Las {r.antenas.length} radios base del recorrido, en el orden en que aparecen, con cada registro y su interpretación
        </p>
        <AntenaPorAntena puntos={puntos} />
      </div>
    </section>
  );
}

function SeccionDatos({ seccion }: { seccion: Seccion }) {
  const r = useMemo(() => resumirDatos(seccion.data), [seccion]);
  const antenaTop = r.antenasMB[0];
  const puntos: any[] = seccion.data?.puntos || [];

  const conclusiones = [
    `El número ${r.numero || "analizado"} registra ${r.total} ${r.total === 1 ? "sesión" : "sesiones"} de datos móviles entre el ${fechaTexto(r.inicio)} y el ${fechaTexto(r.fin)}, en ${r.diasActivos} día${r.diasActivos === 1 ? "" : "s"} con actividad.`,
    `El volumen total fue de ${mbTexto(r.mbTotal)}: ${mbTexto(r.mbDescarga)} de descarga y ${mbTexto(r.mbSubida)} de subida. La duración sumada de las sesiones es de ${tiempoTexto(r.segundos)}; como varias sesiones pueden estar abiertas a la vez, esa suma puede superar el tiempo real transcurrido.`,
    antenaTop && `La radio base con más tráfico fue ${antenaTop[0]}, con ${mbTexto(antenaTop[1].mb)} en ${antenaTop[1].sesiones} ${antenaTop[1].sesiones === 1 ? "sesión" : "sesiones"} (${pct(antenaTop[1].mb, r.mbTotal)} % del volumen).`,
    r.horaPico !== null && `La franja con más sesiones iniciadas fue de ${dosDig(r.horaPico)}:00 a ${dosDig(r.horaPico)}:59, con ${r.eventosHoraPico}.`,
  ].filter(Boolean) as string[];

  return (
    <section className={`${tarjeta} p-5`}>
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-white dark:bg-slate-700"><Wifi size={18} /></div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight">Datos móviles · {seccion.operador}</h2>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">
            Número {r.numero || "sin identificar"} · hoja {seccion.hoja}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cifra titulo="Sesiones" valor={String(r.total)} detalle={`${r.diasActivos} día${r.diasActivos === 1 ? "" : "s"} con actividad`} />
        <Cifra titulo="Volumen total" valor={mbTexto(r.mbTotal)} />
        <Cifra titulo="Descarga / subida" valor={mbTexto(r.mbDescarga)} detalle={`${mbTexto(r.mbSubida)} de subida`} />
        <Cifra titulo="Duración sumada de sesiones" valor={tiempoTexto(r.segundos)} detalle="Las sesiones pueden solaparse" />
      </div>

      <p className="mt-3 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Clock size={14} className="shrink-0" /> Del {fechaTexto(r.inicio)} al {fechaTexto(r.fin)}
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <Bloque titulo="Volumen por radio base">
          <Barras filas={r.antenasMB.slice(0, 6).map(([n, v]) => [n, Number(v.mb.toFixed(2))] as [string, number])} total={r.mbTotal} sufijo=" MB" />
        </Bloque>
        <Bloque titulo="Sesiones iniciadas por hora del día"><Horas porHora={r.porHora} horaPico={r.horaPico} /></Bloque>
        <Bloque titulo="Sesiones por radio base"><Barras filas={r.antenas.slice(0, 6)} total={r.total} /></Bloque>
        <Bloque titulo="Tipo de zona"><Barras filas={r.zonas} total={r.total} /></Bloque>
      </div>

      <Conclusiones lineas={conclusiones} />

      <div className="mt-8 print:break-before-page">
        <h3 className="text-base font-semibold tracking-tight">Recorrido completo</h3>
        <p className="mb-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
          Las {r.total} sesiones en orden cronológico, cada una ubicada en la antena que la atendió
        </p>
        <MapaRecorrido puntos={puntos} />
        <LeyendaMapa conTramos={false} />
      </div>

      <div className="mt-8">
        <h3 className="text-base font-semibold tracking-tight">Análisis antena por antena</h3>
        <p className="mb-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
          Las {r.antenas.length} radios base utilizadas, en el orden en que aparecen, con cada sesión y su interpretación
        </p>
        <AntenaPorAntena puntos={puntos} esDatos />
      </div>
    </section>
  );
}

function Conclusiones({ lineas }: { lineas: string[] }) {
  return (
    <div className="mt-6 rounded-xl border border-slate-200 p-4 dark:border-white/10">
      <h3 className="mb-2 text-sm font-semibold">Resumen</h3>
      <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {lineas.map((l) => <li key={l}>{l}</li>)}
      </ul>
    </div>
  );
}

/* ───────────── Explicaciones del reporte ───────────── */

/** Esquema de una radio base: tres sectores y el área probable de cobertura */
function EsquemaAntena() {
  // Sectores según la convención trisectorial que usa el análisis: 0°, 120° y 240°
  const sector = (azimut: number) => {
    const punto = (grados: number, r: number) => {
      const rad = ((grados - 90) * Math.PI) / 180;
      return `${(150 + r * Math.cos(rad)).toFixed(1)},${(130 + r * Math.sin(rad)).toFixed(1)}`;
    };
    return `M150,130 L${punto(azimut - 60, 100)} A100,100 0 0 1 ${punto(azimut + 60, 100)} Z`;
  };
  return (
    <svg viewBox="0 0 300 262" role="img" aria-label="Esquema de una radio base con tres sectores" className="w-full max-w-[320px]">
      <circle cx="150" cy="130" r="100" className="fill-none stroke-slate-300 dark:stroke-slate-600" strokeDasharray="4 4" />
      <path d={sector(0)} className="fill-blue-600/25 stroke-blue-700 dark:stroke-blue-400" strokeWidth="1.5" />
      <path d={sector(120)} className="fill-slate-400/15 stroke-slate-400" strokeWidth="1" />
      <path d={sector(240)} className="fill-slate-400/15 stroke-slate-400" strokeWidth="1" />
      <circle cx="150" cy="130" r="6" className="fill-slate-800 dark:fill-slate-100" />
      <circle cx="176" cy="78" r="4.5" className="fill-blue-700 dark:fill-blue-400" />
      <g className="fill-slate-700 stroke-white text-[11px] dark:fill-slate-200 dark:stroke-slate-900" strokeWidth="3" paintOrder="stroke" strokeLinejoin="round" fontFamily="inherit">
        <text x="150" y="14" textAnchor="middle" className="font-semibold">Norte (0°)</text>
        <text x="150" y="62" textAnchor="middle">Sector 1</text>
        <text x="206" y="172" textAnchor="middle">Sector 2</text>
        <text x="94" y="172" textAnchor="middle">Sector 3</text>
        <text x="150" y="150" textAnchor="middle" className="text-[10px]">Radio base</text>
        <text x="184" y="92" className="text-[10px]">Teléfono</text>
        <text x="150" y="254" textAnchor="middle" className="text-[10px]">Línea punteada: alcance referencial de la antena</text>
      </g>
    </svg>
  );
}

function Fundamentos() {
  return (
    <section className={`${tarjeta} p-5 print:break-before-page`}>
      <h2 className="text-base font-semibold tracking-tight">Cómo funcionan las antenas y las celdas</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Lo necesario para leer este reporte sin conocimientos técnicos</p>

      <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_320px] print:grid-cols-[1fr_260px]">
        <div className="space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <p>
            <strong className="font-semibold text-slate-900 dark:text-white">La radio base.</strong> Un teléfono celular no se comunica
            directamente con otro teléfono: se conecta por radio a una antena cercana de su operadora, llamada radio base (RBS).
            Cada radio base está instalada en un punto fijo y la operadora conoce su latitud y longitud.
          </p>
          <p>
            <strong className="font-semibold text-slate-900 dark:text-white">Los sectores y las celdas.</strong> Una radio base no emite
            igual hacia todos lados. Normalmente tiene tres grupos de antenas, cada uno apuntando en una dirección distinta y
            cubriendo un tercio del círculo (120°). Cada uno de esos tercios es un sector, y el área que cubre un sector es una
            celda. Por eso se habla de telefonía «celular»: el territorio está dividido en celdas contiguas.
          </p>
          <p>
            <strong className="font-semibold text-slate-900 dark:text-white">A qué celda se conecta el teléfono.</strong> El teléfono se
            conecta a la celda que le da mejor señal, que casi siempre es la más cercana. Si la persona se mueve, el teléfono
            cambia de celda sin que el usuario lo note. Una antena cercana puede no ser la elegida si está saturada o si un cerro
            o un edificio bloquea la señal.
          </p>
          <p>
            <strong className="font-semibold text-slate-900 dark:text-white">Qué guarda la operadora.</strong> Cada vez que el teléfono
            hace o recibe una llamada, envía o recibe un SMS o usa datos móviles, la operadora registra el número, el equipo
            (IMEI), la fecha y hora, la duración y la radio base y celda que atendieron la comunicación. Ese listado es la
            «sábana» de tráfico que se adjunta al caso.
          </p>
          <p>
            <strong className="font-semibold text-slate-900 dark:text-white">Qué significa para la ubicación.</strong> Un registro no dice
            dónde estaba exactamente el teléfono. Dice que estaba dentro del área que cubre esa celda. En ciudad las antenas
            están muy juntas y cada celda es pequeña, así que la ubicación es más precisa; en el campo una sola antena cubre
            kilómetros y la ubicación es mucho más amplia.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <EsquemaAntena />
          <table className="w-full text-sm">
            <caption className="mb-2 text-left text-sm font-semibold">Alcance referencial por tipo de zona</caption>
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
                <th className="py-1.5 pr-2 font-medium">Zona</th>
                <th className="py-1.5 pr-2 font-medium">Llamadas y SMS</th>
                <th className="py-1.5 font-medium">Datos (3 anillos)</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              <tr className="border-b border-slate-100 dark:border-white/5"><td className="py-1.5 pr-2">Urbana</td><td className="pr-2">300 m</td><td>300 m, 500 m, 700 m</td></tr>
              <tr className="border-b border-slate-100 dark:border-white/5"><td className="py-1.5 pr-2">Semiurbana</td><td className="pr-2">5 km</td><td>2 km, 3,5 km, 5 km</td></tr>
              <tr><td className="py-1.5 pr-2">Rural</td><td className="pr-2">10 km</td><td>4 km, 7 km, 10 km</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Metodologia() {
  const pasos: [string, string][] = [
    ["Fuente de los datos",
      "Se usa la sábana de tráfico en Excel adjunta al caso. Cada hoja de llamadas y SMS o de datos móviles se analiza por separado. Solo se toman en cuenta los registros que traen la latitud y longitud de la radio base; los demás no se pueden ubicar y quedan fuera."],
    ["Ubicación de cada registro",
      "Cada registro se sitúa en las coordenadas de la radio base que atendió la comunicación. Alrededor se dibuja un círculo con el alcance referencial de la zona (urbana, semiurbana o rural). Si la sábana indica un rango propio, se usa ese; si no indica zona, se asume rural, que es el caso más amplio."],
    ["Sector de la antena",
      "El sector se deduce del nombre de la radio base: en terminaciones como «4G-13» o «LTE-33», el segundo dígito es el sector. Se aplica la convención estándar de tres sectores: sector 1 hacia el norte (0°), sector 2 a 120° y sector 3 a 240°. La orientación real de cada antena solo la conoce la operadora."],
    ["Datos móviles",
      "Para cada sesión se toman los bytes subidos y descargados y se convierten a megabytes. La cobertura se dibuja en tres anillos: alta probabilidad, probabilidad media y alcance máximo. Si la sábana no trae la duración, se calcula con la hora de inicio y de fin."],
    ["Recorrido estimado",
      "Los registros se ordenan por fecha y hora. Entre cada par consecutivo se calcula la distancia en línea recta entre antenas, la dirección y la velocidad que habría hecho falta para ir de una a otra. El punto estimado de cada registro se desplaza medio radio hacia el registro anterior y el siguiente, es decir, hacia el lado por donde la persona venía o iba."],
    ["Paradas y saltos",
      "Una conexión de 5 minutos o más en la misma antena se considera permanencia probable. Si un tramo exigiría más de 130 km/h, se marca como salto no físico: la línea entre esas dos antenas no representa un camino real, y suele deberse a un cambio de antena sin que la persona se haya movido."],
    ["Nivel de certeza",
      "La certeza de cada tramo depende de la zona menos precisa que atraviesa: alta en zona urbana, media en semiurbana y baja en rural."],
    ["Cifras de este reporte",
      "Los totales, las antenas más utilizadas, la actividad por hora y los días con actividad se obtienen contando esos mismos registros. Ninguna cifra se estima ni se completa con inteligencia artificial."],
  ];

  return (
    <section className={`${tarjeta} p-5 print:break-inside-avoid-page`}>
      <h2 className="text-base font-semibold tracking-tight">Cómo se realizó la interpretación</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Los pasos que sigue el sistema, siempre con las mismas reglas para todos los casos</p>

      <ol className="mt-5 grid gap-x-10 gap-y-5 lg:grid-cols-2 print:grid-cols-2">
        {pasos.map(([titulo, texto], i) => (
          <li key={titulo} className="flex gap-3 print:break-inside-avoid">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-800 text-xs font-semibold tabular-nums text-white dark:bg-slate-200 dark:text-slate-900">{i + 1}</span>
            <div>
              <h3 className="text-sm font-semibold">{titulo}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{texto}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex gap-3 rounded-xl border border-slate-200 p-4 text-sm leading-relaxed text-slate-700 dark:border-white/10 dark:text-slate-300">
        <Info size={16} className="mt-0.5 shrink-0" />
        <p>
          <strong className="font-semibold">Alcance de las conclusiones.</strong> Este análisis ubica al dispositivo por celda telefónica,
          no por GPS: indica el área probable donde estaba el teléfono, no un punto exacto, y ubica al equipo, no a la persona
          que lo llevaba. El recorrido es una estimación geométrica entre antenas y debe leerse junto con el resto de la
          evidencia del caso.
        </p>
      </div>
    </section>
  );
}

/* ───────────── Página ───────────── */

export default function Reporte() {
  const [casos, setCasos] = useState<CasoAnalisis[]>([]);
  const [totalCasos, setTotalCasos] = useState<number | null>(null);
  const [todos, setTodos] = useState<any[]>([]);
  const [idcaso, setIdcaso] = useState<number | null>(null);
  const [llamadas, setLlamadas] = useState<Seccion[]>([]);
  const [datos, setDatos] = useState<Seccion[]>([]);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  // Lista de casos con sábana cargada + total de casos del sistema
  useEffect(() => {
    AnalisisService.listarCasosAnalisis()
      .then(({ data }) => {
        setCasos(data || []);
        // Arranca con el caso abierto, si tiene sábana
        const abierto = leerCasoActivo();
        if (abierto && (data || []).some((c: CasoAnalisis) => c.idcaso === abierto.idcaso)) setIdcaso(abierto.idcaso);
      })
      .catch(() => setError("No se pudo cargar la lista de casos. Revisa que el servidor esté encendido."))
      .finally(() => setCargandoLista(false));

    CasoService.reporteCaso()
      .then(({ data }) => {
        setTotalCasos(Array.isArray(data) ? data.length : null);
        setTodos(Array.isArray(data) ? data : []);
      })
      .catch(() => setTotalCasos(null));
  }, []);

  // Trae TODAS las hojas del caso (si hay varias, una por una)
  useEffect(() => {
    if (idcaso === null) return;
    let vigente = true;

    const traer = async (tipo: "llamadas" | "datos") => {
      const pedir = (hoja?: string) =>
        tipo === "llamadas"
          ? AnalisisService.analizarCaso(idcaso, hoja)
          : AnalisisService.analizarCasoDatos(idcaso, hoja);

      const secciones: Seccion[] = [];
      const fallos: string[] = [];
      try {
        const { data } = await pedir();
        if (data?.requiereSeleccion) {
          for (const op of data.opciones || []) {
            try {
              const r = await pedir(op.hoja);
              secciones.push({ hoja: op.hoja, operador: op.operador, data: r.data });
            } catch (e: any) {
              fallos.push(`Hoja ${op.hoja}: ${e?.response?.data?.mensaje || "no se pudo analizar"}`);
            }
          }
        } else {
          secciones.push({ hoja: data.hoja, operador: data.operador, data });
        }
      } catch (e: any) {
        fallos.push(`${tipo === "llamadas" ? "Llamadas y SMS" : "Datos móviles"}: ${e?.response?.data?.mensaje || "no se pudo analizar"}`);
      }
      return { secciones, fallos };
    };

    const cargar = async () => {
      const caso = casos.find((c) => c.idcaso === idcaso);
      setCargando(true);
      setLlamadas([]);
      setDatos([]);
      setAvisos([]);

      const vacio = { secciones: [] as Seccion[], fallos: [] as string[] };
      const [a, b] = await Promise.all([
        caso && caso.llamadas === 0 ? vacio : traer("llamadas"),
        caso && caso.datos === 0 ? vacio : traer("datos"),
      ]);
      if (!vigente) return;
      setLlamadas(a.secciones);
      setDatos(b.secciones);
      setAvisos([...a.fallos, ...b.fallos]);
      setCargando(false);
    };

    cargar();
    return () => { vigente = false; };
  }, [idcaso, casos]);

  const caso = casos.find((c) => c.idcaso === idcaso);
  const hojasLlamadas = casos.reduce((a, c) => a + c.llamadas, 0);
  const hojasDatos = casos.reduce((a, c) => a + c.datos, 0);

  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
  const generado = new Date();

  // Exporta con el diálogo de impresión del navegador (destino «Guardar como PDF»).
  // Siempre en claro, y con el código del caso como nombre de archivo.
  const exportarPDF = () => {
    const raiz = document.documentElement;
    const oscuro = raiz.classList.contains("dark");
    const tituloAnterior = document.title;
    const restaurar = () => {
      document.title = tituloAnterior;
      if (oscuro) raiz.classList.add("dark");
      window.removeEventListener("afterprint", restaurar);
    };
    window.addEventListener("afterprint", restaurar);
    raiz.classList.remove("dark");
    document.title = `Reporte SIGECETEL - ${caso?.codigo || "caso"}`;
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800 dark:bg-slate-950 dark:text-slate-100 print:bg-white print:p-0">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Encabezado */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Reporte de análisis</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Resumen de las llamadas, SMS y datos móviles analizados en cada caso
            </p>
          </div>

          <div className="hidden text-right text-xs leading-relaxed text-slate-600 print:block">
            <div>SIGECETEL · Sistema de georreferenciación de celdas telefónicas</div>
            <div>Generado el {fechaTexto(generado)}{usuario.nombreCompleto ? ` por ${usuario.nombreCompleto}` : ""}</div>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-white/10 dark:bg-slate-900">
              <FolderOpen size={16} className="shrink-0 text-slate-400" />
              <span className="sr-only">Caso</span>
              <select
                value={idcaso ?? ""}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setIdcaso(id);
                  // El caso elegido pasa a ser el caso abierto en todo el sistema
                  const c = todos.find((x) => x.idcaso === id) || casos.find((x) => x.idcaso === id);
                  if (c) abrirCaso(c);
                }}
                disabled={!casos.length}
                className="max-w-[240px] bg-transparent outline-none dark:bg-slate-900"
              >
                <option value="" disabled>{casos.length ? "Selecciona un caso" : "Sin casos con sábana"}</option>
                {casos.map((c) => (
                  <option key={c.idcaso} value={c.idcaso}>{c.codigo} · {c.denunciado}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={exportarPDF}
              disabled={cargando || (!llamadas.length && !datos.length)}
              className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileDown size={16} /> Exportar PDF
            </button>
          </div>
        </div>

        {/* Cifras generales del sistema */}
        <div className={`${tarjeta} grid grid-cols-2 gap-3 p-4 lg:grid-cols-4 print:hidden`}>
          <Cifra titulo="Casos registrados" valor={totalCasos === null ? "—" : String(totalCasos)} />
          <Cifra titulo="Casos con sábana analizable" valor={String(casos.length)} />
          <Cifra titulo="Hojas de llamadas y SMS" valor={String(hojasLlamadas)} />
          <Cifra titulo="Hojas de datos móviles" valor={String(hojasDatos)} />
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</div>
        )}

        {/* Sin casos */}
        {!cargandoLista && !error && !casos.length && (
          <div className={`${tarjeta} flex flex-col items-center gap-2 p-10 text-center`}>
            <FileSpreadsheet size={28} className="text-slate-400" />
            <p className="font-medium">Todavía no hay nada que resumir</p>
            <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
              El reporte aparece cuando un caso tiene adjunta una sábana en Excel con hojas de llamadas o de datos.
              Adjunta el archivo desde el módulo Casos.
            </p>
          </div>
        )}

        {/* Con casos, pero ninguno elegido todavía */}
        {!cargandoLista && casos.length > 0 && !caso && (
          <div className={`${tarjeta} flex flex-col items-center gap-2 p-10 text-center`}>
            <FolderOpen size={28} className="text-slate-400" />
            <p className="font-medium">Selecciona un caso</p>
            <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
              El reporte se arma con la sábana de ese caso. Los casos sin sábana no aparecen en la lista: súbela desde Llamadas/SMS, Datos o Casos.
            </p>
          </div>
        )}

        {/* Caso elegido */}
        {caso && (
          <div className={`${tarjeta} flex flex-wrap items-center gap-x-8 gap-y-3 p-5`}>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"><ChartColumn size={18} /></div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Caso</div>
                <div className="font-semibold">{caso.codigo}</div>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Denunciante</div>
              <div className="text-sm font-medium">{caso.denunciante}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Denunciado</div>
              <div className="text-sm font-medium">{caso.denunciado}</div>
            </div>
            <div className="min-w-0">
              <div className="text-xs text-slate-500 dark:text-slate-400">Sábana analizada</div>
              <div className="truncate text-sm font-medium" title={caso.archivo}>{caso.archivo}</div>
            </div>
            <div className="ml-auto flex gap-4 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><RadioTower size={14} /> {llamadas.length + datos.length} hoja{llamadas.length + datos.length === 1 ? "" : "s"} analizada{llamadas.length + datos.length === 1 ? "" : "s"}</span>
            </div>
          </div>
        )}

        {cargando && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 size={16} className="animate-spin" /> Analizando la sábana del caso…
          </div>
        )}

        {avisos.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <p className="mb-1 font-medium">Parte de la sábana no se pudo resumir</p>
            <ul className="list-disc pl-5">{avisos.map((a) => <li key={a}>{a}</li>)}</ul>
          </div>
        )}

        {!cargando && llamadas.map((s) => <SeccionLlamadas key={`l-${s.hoja}`} seccion={s} />)}
        {!cargando && datos.map((s) => <SeccionDatos key={`d-${s.hoja}`} seccion={s} />)}

        {/* Explicación: primero cómo funciona la red, después cómo se interpretó */}
        {!cargando && (llamadas.length > 0 || datos.length > 0) && (
          <>
            <Fundamentos />
            <Metodologia />
          </>
        )}
      </div>
    </div>
  );
}
