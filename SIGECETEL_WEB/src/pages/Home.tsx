import { useEffect, useState } from "react";
import {
  Users, FolderKanban, ShieldCheck, TrendingUp, TrendingDown,
  ArrowUpRight, Activity, UserPlus, FileText, ShieldAlert,
  Sparkles, MoreHorizontal, Calendar, Clock, CheckCircle2, AlertCircle,
} from "lucide-react";

function Home() {
  const [hora, setHora] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setHora(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // ================= DATOS SIMULADOS =================
  const kpis = [
    {
      titulo: "Usuarios totales",
      valor: 48,
      delta: 12.5,
      up: true,
      icon: Users,
      gradient: "from-slate-800 to-slate-600",
      soft: "bg-slate-500/10 text-slate-700 dark:bg-slate-400/10 dark:text-slate-300",
    },
    {
      titulo: "Casos registrados",
      valor: 124,
      delta: 8.2,
      up: true,
      icon: FolderKanban,
      gradient: "from-slate-800 to-slate-600",
      soft: "bg-slate-500/10 text-slate-700 dark:bg-slate-400/10 dark:text-slate-300",
    },
    {
      titulo: "Casos activos",
      valor: 32,
      delta: -3.4,
      up: false,
      icon: Activity,
      gradient: "from-emerald-700 to-emerald-600",
      soft: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
    },
    {
      titulo: "Roles asignados",
      valor: 6,
      delta: 0,
      up: true,
      icon: ShieldCheck,
      gradient: "from-slate-800 to-slate-600",
      soft: "bg-slate-500/10 text-slate-700 dark:bg-slate-400/10 dark:text-slate-300",
    },
  ];

  // Datos para gráfico de barras (casos por mes)
  const casosPorMes = [
    { mes: "Ene", valor: 12 }, { mes: "Feb", valor: 18 }, { mes: "Mar", valor: 15 },
    { mes: "Abr", valor: 24 }, { mes: "May", valor: 21 }, { mes: "Jun", valor: 32 },
    { mes: "Jul", valor: 28 },
  ];
  const maxCasos = Math.max(...casosPorMes.map((d) => d.valor));

  // Distribución por tipo (donut)
  const tipos = [
    { nombre: "Acoso",    valor: 34, color: "#007ac8" },
    { nombre: "Plagio",   valor: 22, color: "#00bcff" },
    { nombre: "Fraude",   valor: 18, color: "#36414d" },
    { nombre: "Maltrato", valor: 15, color: "#98a3ae" },
    { nombre: "Otro",     valor: 11, color: "#cdd5dd" },
  ];
  const totalTipos = tipos.reduce((s, t) => s + t.valor, 0);

  // Cálculo del donut (arcos)
  let acumulado = 0;
  const arcos = tipos.map((t) => {
    const porcentaje = (t.valor / totalTipos) * 100;
    const startAngle = (acumulado / 100) * 360;
    acumulado += porcentaje;
    const endAngle = (acumulado / 100) * 360;
    return { ...t, porcentaje, startAngle, endAngle };
  });

  // Función para generar path SVG del arco (donut)
  const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return ["M", start.x, start.y, "A", r, r, 0, largeArcFlag, 0, end.x, end.y].join(" ");
  };
  const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return { x: cx + r * Math.cos(angleInRadians), y: cy + r * Math.sin(angleInRadians) };
  };

  // Actividad reciente
  const actividad = [
    { icon: UserPlus,    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", txt: "Se registró a Rodrigo Calle Maydana",       hora: "hace 5 min" },
    { icon: FileText,    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",         txt: "Nuevo caso CASO-124 · Acoso",                hora: "hace 22 min" },
    { icon: ShieldAlert, color: "bg-rose-500/10 text-rose-600 dark:text-rose-400",         txt: "Usuario juanp bloqueado",                    hora: "hace 1 h" },
    { icon: CheckCircle2,color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",txt: "Caso CASO-120 marcado como resuelto",        hora: "hace 3 h" },
    { icon: AlertCircle, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",      txt: "Se aplazó el caso CASO-118",                 hora: "hace 5 h" },
  ];

  // Roles con distribución
  const roles = [
    { nombre: "Administrador",         cantidad: 3,  color: "bg-slate-700 dark:bg-slate-300",  soft: "bg-slate-500/10 text-slate-700 dark:text-slate-300" },
    { nombre: "Coordinador Nacional",  cantidad: 8,  color: "bg-blue-500",    soft: "bg-blue-500/10 text-blue-600 dark:text-blue-300" },
    { nombre: "Proyectista",           cantidad: 14, color: "bg-amber-500",   soft: "bg-amber-500/10 text-amber-600 dark:text-amber-300" },
    { nombre: "Marketing Sede",        cantidad: 23, color: "bg-slate-400",    soft: "bg-slate-500/10 text-slate-600 dark:text-slate-300" },
  ];
  const totalRoles = roles.reduce((s, r) => s + r.cantidad, 0);

  const fechaFmt = hora.toLocaleDateString("es-BO", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const horaFmt = hora.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* ============ HEADER ============ */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-white shadow-sm dark:bg-slate-700">
                <Sparkles size={17} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Panel general</h1>
            </div>
            <p className="text-sm capitalize text-slate-500 dark:text-slate-400">
              {fechaFmt} · {horaFmt}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 sm:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Sistema en línea
            </div>
            <button className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 dark:bg-blue-500 dark:shadow-blue-500/20 dark:hover:bg-blue-400">
              <ArrowUpRight size={16} /> Ver reportes
            </button>
          </div>
        </div>

        {/* ============ KPIs ============ */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k, i) => {
            const Icon = k.icon;
            return (
              <div
                key={i}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-white/[0.04]"
              >
                {/* Decoración */}
                <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${k.gradient} opacity-10 blur-2xl transition group-hover:opacity-20`} />

                <div className="flex items-start justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${k.gradient} text-white shadow-sm`}>
                    <Icon size={18} />
                  </div>
                  <button className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-white/10">
                    <MoreHorizontal size={16} />
                  </button>
                </div>

                <div className="mt-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{k.titulo}</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <div className="text-3xl font-bold">{k.valor}</div>
                    {k.delta !== 0 && (
                      <div className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                        k.up
                          ? "border border-emerald-500/20 bg-emerald-500/15 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/15 dark:text-emerald-300"
                          : "border border-rose-500/20 bg-rose-500/15 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/15 dark:text-rose-300"
                      }`}>
                        {k.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {Math.abs(k.delta)}%
                      </div>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">vs. mes anterior</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ============ FILA 2: BARRAS + DONUT ============ */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

          {/* Gráfico de barras - Casos por mes */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] lg:col-span-2">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold">Casos registrados por mes</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Últimos 7 meses</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-slate-500" />
                  Casos
                </span>
              </div>
            </div>

            <div className="flex h-56 items-end justify-between gap-3 px-1">
              {casosPorMes.map((d, i) => {
                const altura = (d.valor / maxCasos) * 100;
                return (
                  <div key={i} className="group flex flex-1 flex-col items-center gap-2">
                    <div className="relative flex w-full flex-1 items-end">
                      {/* Tooltip */}
                      <div className="absolute -top-8 left-1/2 hidden -translate-x-1/2 rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg group-hover:block dark:bg-white dark:text-slate-900">
                        {d.valor} casos
                      </div>
                      <div
                        style={{ height: `${altura}%` }}
                        className="w-full rounded-t-lg bg-gradient-to-t from-slate-700 to-slate-500 shadow-sm transition group-hover:from-slate-800 group-hover:to-slate-600"
                      />
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{d.mes}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Donut - Distribución por tipo */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold">Casos por tipo</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Distribución total</p>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="relative">
                <svg width="180" height="180" viewBox="0 0 180 180">
                  {arcos.map((a, i) => (
                    <path
                      key={i}
                      d={describeArc(90, 90, 70, a.startAngle, a.endAngle)}
                      fill="none"
                      stroke={a.color}
                      strokeWidth="22"
                      strokeLinecap="butt"
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-2xl font-bold">{totalTipos}</div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-400">Casos</div>
                </div>
              </div>

              {/* Leyenda */}
              <div className="mt-4 w-full space-y-1.5">
                {tipos.map((t, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: t.color }} />
                      <span className="text-slate-600 dark:text-slate-300">{t.nombre}</span>
                    </div>
                    <span className="font-semibold">{t.valor}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ============ FILA 3: ROLES + ACTIVIDAD ============ */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

          {/* Roles */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold">Distribución de roles</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{totalRoles} personas asignadas</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-300">
                <ShieldCheck size={15} />
              </div>
            </div>

            <div className="space-y-4">
              {roles.map((r, i) => {
                const pct = (r.cantidad / totalRoles) * 100;
                return (
                  <div key={i}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-200">{r.nombre}</span>
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${r.soft}`}>{r.cantidad}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                      <div
                        style={{ width: `${pct}%` }}
                        className={`h-full rounded-full ${r.color} transition-all duration-500`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actividad reciente */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] lg:col-span-2">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold">Actividad reciente</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Últimos movimientos del sistema</p>
              </div>
              <button className="rounded-lg bg-blue-500/10 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-500/20 dark:bg-blue-400/15 dark:text-blue-300 dark:hover:bg-blue-400/25">
                Ver todo
              </button>
            </div>

            <div className="space-y-3">
              {actividad.map((a, i) => {
                const Icon = a.icon;
                return (
                  <div
                    key={i}
                    className="group flex items-center gap-3 rounded-xl border border-transparent p-2 transition hover:border-slate-200 hover:bg-slate-50 dark:hover:border-white/10 dark:hover:bg-white/5"
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${a.color}`}>
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{a.txt}</div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock size={10} /> {a.hora}
                      </div>
                    </div>
                    <ArrowUpRight
                      size={14}
                      className="shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100 dark:text-slate-500"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ============ FOOTER INFO ============ */}
        <div className="rounded-2xl border border-slate-200 bg-slate-100 p-5 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-white shadow-sm dark:bg-slate-700">
                <Sparkles size={17} />
              </div>
              <div>
                <div className="text-sm font-semibold">Asistente IA disponible</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Pídele acciones sobre usuarios, casos o roles desde cualquier módulo.
                </div>
              </div>
            </div>
            <button className="inline-flex items-center gap-1.5 rounded-xl border border-blue-500/25 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-500/20 dark:border-blue-400/25 dark:bg-blue-400/15 dark:text-blue-300 dark:hover:bg-blue-400/25">
              <Calendar size={13} /> Ver historial
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Home;
