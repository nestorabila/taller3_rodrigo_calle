import { useRef, useState } from "react";
import {
  User,
  Menu,
  LayoutDashboard,
  PanelsTopLeft,
  Moon,
  Sun,
  LogOut,
  ShieldCheck,
} from "lucide-react";

import { useLayout } from "../context/LayoutContext";

export default function UserDropdown() {

  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");

const nombreCompleto = usuario.nombreCompleto || "Usuario";
const rol = usuario.rol || "Sin rol";


  const [open, setOpen] = useState(false);

  // Timer para cerrar con un pequeño retardo. Permite mover el cursor
  // desde el botón hasta la card (cruzando el hueco) sin que se cierre.
  const closeTimer = useRef<number | null>(null);

  const {
    setMode,
    scaleMode,
    setScaleMode,
  } = useLayout();

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("permisos");
    localStorage.removeItem("casoActivo");
    window.location.href = "/";
  };

  const setLightMode = () => {
    document.documentElement.classList.remove("dark");
  };

  const setDarkMode = () => {
    document.documentElement.classList.add("dark");
  };

  const openCard = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
  };

  const scheduleClose = () => {
    closeTimer.current = window.setTimeout(() => setOpen(false), 150);
  };

  return (
    <div
      className="fixed top-4 right-5 z-[999] print:hidden"
      onMouseEnter={openCard}
      onMouseLeave={scheduleClose}
    >

      {/* BOTÓN */}
      <button
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={openCard}
        className="
          h-11 w-11
          flex items-center justify-center
          rounded-2xl

          bg-white dark:bg-slate-900

          border border-slate-200 dark:border-white/10

          backdrop-blur-xl
          shadow-md

          hover:scale-105
          transition-all duration-300
        "
      >
        <Menu size={20} className="text-blue-600 dark:text-blue-400" />
      </button>

      {/* CARD */}
      <div
        className={`
          absolute right-0 top-14
          w-[340px]

          rounded-3xl
          origin-top-right

          border border-slate-200 dark:border-white/10

          bg-white dark:bg-slate-900

          shadow-2xl

          transition-all duration-300 ease-out

          ${
            open
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 -translate-y-4 scale-95 pointer-events-none"
          }
        `}
      >

        {/* PERFIL */}
        <div className="p-4 border-b border-gray-200 dark:border-white/10">

          <div className="flex items-center gap-3">

            <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center">
              <User size={22} className="text-slate-600 dark:text-slate-300" />
            </div>

            <div className="flex-1">

              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {nombreCompleto}
              </h3>

              <div className="flex items-center gap-2 mt-1">

                <ShieldCheck size={13} className="text-green-500" />

                <span className="text-[11px] text-green-500">
                  {rol}
                </span>

              </div>

            </div>

          </div>

        </div>

        {/* CONTENIDO */}
        <div className="px-4 pb-4 space-y-3">

          {/* NAVEGACIÓN */}
          <div>

            <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">
              Navegación
            </p>

            <div className="grid grid-cols-2 gap-2">

              <button
                onClick={() => setMode("sidebar")}
                className="
                  flex items-center justify-center gap-2
                  py-2.5 rounded-xl

                  bg-gray-100 dark:bg-white/5

                  hover:bg-slate-200 dark:hover:bg-white/10

                  text-gray-800 dark:text-gray-200

                  transition-all
                "
              >
                <LayoutDashboard size={16} />
                <span className="text-xs">Panel</span>
              </button>

              <button
                onClick={() => setMode("navbar")}
                className="
                  flex items-center justify-center gap-2
                  py-2.5 rounded-xl

                  bg-gray-100 dark:bg-white/5

                  hover:bg-slate-200 dark:hover:bg-white/10

                  text-gray-800 dark:text-gray-200

                  transition-all
                "
              >
                <PanelsTopLeft size={16} />
                <span className="text-xs">Barra</span>
              </button>

            </div>

          </div>

          {/* TEMA + ESCALA */}
          <div className="grid grid-cols-2 gap-3">

            {/* TEMA */}
            <div>

              <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">
                Tema
              </p>

              <div className="flex gap-2">

                <button
                  onClick={setLightMode}
                  className="
                    flex-1 py-2 rounded-xl
                    bg-gray-100 dark:bg-white/5
                    hover:bg-gray-200 dark:hover:bg-white/10
                    transition
                  "
                >
                  <Sun size={16} className="mx-auto text-yellow-500" />
                </button>

                <button
                  onClick={setDarkMode}
                  className="
                    flex-1 py-2 rounded-xl
                    bg-gray-100 dark:bg-white/5
                    hover:bg-gray-200 dark:hover:bg-white/10
                    transition
                  "
                >
                  <Moon size={16} className="mx-auto text-slate-500 dark:text-slate-300" />
                </button>

              </div>

            </div>

            {/* ESCALA */}
            <div>

              <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">
                Escala
              </p>

              <div className="flex gap-1">

                {["small", "medium", "large"].map((m) => (
                  <button
                    key={m}
                    onClick={() => setScaleMode(m as any)}
                    className={`
                      flex-1 py-2 rounded-xl text-[11px]
                      transition
                      ${
                        scaleMode === m
                          ? "bg-blue-600 text-white dark:bg-blue-500"
                          : "bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-gray-200"
                      }
                    `}
                  >
                    {m === "small" ? "S" : m === "medium" ? "M" : "L"}
                  </button>
                ))}

              </div>

            </div>

          </div>

          {/* LOGOUT */}
          <button
            type="button"
            onClick={cerrarSesion}
            className="
              w-full flex items-center justify-center gap-2
              py-2.5 rounded-xl

              bg-red-500/10 text-red-500

              hover:bg-red-500/20

              transition-all
            "
          >
            <LogOut size={16} />
            <span className="text-sm">Cerrar sesión</span>
          </button>

        </div>

      </div>

    </div>
  );
}
