import { useState } from "react";
import { useLayout } from "../context/LayoutContext";
import { Link, useLocation } from "react-router-dom";
import { menuItems } from "../menu/menu";
import { menuIcons } from "../model/menuIcons";
import { puede, esAdmin } from "../services/PermisoHelper";
import { Liquid } from "liquid-gooey";

export default function Sidebar() {
  const location = useLocation();
  const { scale, mode } = useLayout();

  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  if (mode === "navbar") return null;

  // Solo mostrar módulos permitidos para el usuario actual
  const itemsVisibles = menuItems.filter((item: any) => puede(item.permiso) && (!item.soloAdmin || esAdmin()));

  return (
    <aside className="relative h-full w-[76px] shrink-0 print:hidden">
      {/* =========================================================
          SIDEBAR PRINCIPAL
      ========================================================= */}
      <div
        className="
          group

          absolute
          inset-y-0
          left-0
          z-40

          w-[76px]
          hover:w-64

          overflow-hidden

          flex
          flex-col

          bg-white
          dark:bg-slate-900

          border-r
          border-slate-200
          dark:border-white/10

          shadow-sm
          hover:shadow-2xl

          transition-[width,box-shadow]
          duration-300
          ease-out
        "
      >
        {/* =======================================================
            GLOW DECORATIVO
        ======================================================= */}
        <div
          className="
            pointer-events-none

            absolute
            -top-24
            -left-24

            h-48
            w-48

            rounded-full

            bg-slate-400/[0.06]
            dark:bg-slate-300/[0.04]

            blur-3xl

            opacity-0
            group-hover:opacity-100

            transition-opacity
            duration-700
          "
        />

        {/* Segundo glow */}
        <div
          className="
            pointer-events-none

            absolute
            -bottom-24
            -right-24

            h-48
            w-48

            rounded-full

            bg-slate-500/[0.04]

            blur-3xl

            opacity-0
            group-hover:opacity-100

            transition-opacity
            duration-1000
          "
        />

        {/* =======================================================
            MENÚ
        ======================================================= */}
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top",
          }}
          className="
            relative
            z-10

            p-3
            space-y-1.5
          "
        >
          {itemsVisibles.map((item) => {
            const Icon = menuIcons[item.path] ?? item.icon;

            const active =
              location.pathname === item.path ||
              location.pathname.startsWith(`${item.path}/`);

            const hovered = hoveredItem === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                title={item.name}
                onMouseEnter={() => setHoveredItem(item.path)}
                onMouseLeave={() => setHoveredItem(null)}
                className={`
                  relative

                  flex
                  items-center
                  gap-3

                  h-11
                  px-[15px]

                  rounded-xl

                  overflow-hidden

                  transition-all
                  duration-300
                  ease-out

                  ${
                    active
                      ? `
                        bg-blue-600
                        dark:bg-blue-500
                        text-white

                        shadow-md
                        shadow-blue-600/20

                        scale-[1.015]
                      `
                      : `
                        text-gray-600
                        dark:text-gray-300

                        hover:bg-blue-500/10
                        hover:text-blue-700
                        dark:hover:bg-blue-400/15
                        dark:hover:text-blue-300

                        hover:translate-x-[3px]
                      `
                  }
                `}
              >
                {/* =================================================
                    BRILLO AL PASAR EL CURSOR
                ================================================= */}
                {hovered && !active && (
                  <span
                    className="
                      pointer-events-none

                      absolute
                      inset-y-0
                      -left-10

                      w-8

                      bg-gradient-to-r
                      from-transparent
                      via-white/60
                      to-transparent

                      blur-sm

                      animate-[sidebar-shine_0.8s_ease-out]
                    "
                  />
                )}

                {/* =================================================
                    EFECTO LIQUID SUTIL
                ================================================= */}
                {active && hovered && (
                  <div
                    className="
                      pointer-events-none

                      absolute
                      right-1
                      top-1/2

                      -translate-y-1/2

                      opacity-40

                      scale-75
                    "
                  >
                    <Liquid
                      blur={5}
                      contrast={14}
                      fill="#ffffff"
                      shadow="0 0 8px rgba(255,255,255,.25)"
                    >
                      {/* Burbuja principal */}
                      <Liquid.Item
                        x={0}
                        y={0}
                        transition="bouncy"
                      >
                        <div
                          className="
                            h-5
                            w-5

                            rounded-full

                            bg-white/30
                          "
                        />
                      </Liquid.Item>

                      {/* Burbuja secundaria */}
                      <Liquid.Item
                        x={8}
                        y={-3}
                        transition="bouncy"
                        delay={30}
                      >
                        <div
                          className="
                            h-3
                            w-3

                            rounded-full

                            bg-white/25
                          "
                        />
                      </Liquid.Item>
                    </Liquid>
                  </div>
                )}

                {/* =================================================
                    ICONO
                ================================================= */}
                <div
                  className={`
                    relative
                    z-10

                    flex
                    items-center
                    justify-center

                    shrink-0

                    transition-all
                    duration-300
                    ease-out

                    ${
                      hovered
                        ? "scale-110"
                        : "scale-100"
                    }

                    ${
                      active
                        ? "rotate-0"
                        : hovered
                          ? "-rotate-3"
                          : "rotate-0"
                    }
                  `}
                >
                  <Icon
                    size={20}
                    className={`
                      shrink-0

                      transition-all
                      duration-300

                      ${
                        active
                          ? `
                            drop-shadow-[0_0_6px_rgba(255,255,255,.35)]
                          `
                          : ""
                      }
                    `}
                  />
                </div>

                {/* =================================================
                    NOMBRE DEL MÓDULO
                ================================================= */}
                <span
                  className="
                    relative
                    z-10

                    whitespace-nowrap

                    text-sm
                    font-medium

                    opacity-0
                    -translate-x-2

                    group-hover:opacity-100
                    group-hover:translate-x-0

                    transition-all
                    duration-300
                  "
                >
                  {item.name}
                </span>

                {/* =================================================
                    INDICADOR ACTIVO
                ================================================= */}
                {active && (
                  <span
                    className={`
                      absolute
                      right-3

                      h-1.5
                      w-1.5

                      rounded-full

                      bg-white

                      shadow-[0_0_8px_rgba(255,255,255,.8)]

                      transition-all
                      duration-300

                      ${
                        hovered
                          ? "scale-150 shadow-[0_0_12px_rgba(255,255,255,1)]"
                          : "scale-100"
                      }
                    `}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* =========================================================
          ANIMACIONES CSS
      ========================================================= */}
      <style>{`
        @keyframes sidebar-shine {
          0% {
            transform: translateX(0);
            opacity: 0;
          }

          20% {
            opacity: 1;
          }

          100% {
            transform: translateX(280px);
            opacity: 0;
          }
        }
      `}</style>
    </aside>
  );
}
