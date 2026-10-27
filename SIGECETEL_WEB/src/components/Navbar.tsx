import { useLocation, Link } from "react-router-dom";
import { menuItems } from "../menu/menu";
import { menuIcons } from "../model/menuIcons";
import { puede, esAdmin } from "../services/PermisoHelper";
import { Liquid } from "liquid-gooey";

export default function Navbar() {
  const location = useLocation();

  // Solo los módulos a los que el usuario logueado tiene acceso
  const itemsVisibles = menuItems.filter((item: any) => puede(item.permiso) && (!item.soloAdmin || esAdmin()));

  return (
    <div
      className="
        h-16 print:hidden
        bg-white dark:bg-slate-900
        border-b border-slate-200 dark:border-white/10
        flex items-center
        px-5
        transition-colors
      "
    >
      {/* MENÚ */}
      <nav className="flex items-center gap-1.5 overflow-x-auto">
        {itemsVisibles.map((item) => {
          const Icon = menuIcons[item.path] ?? item.icon;
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              title={item.name}
              className={`
                flex items-center gap-2
                px-3 py-2 rounded-xl
                text-sm font-medium whitespace-nowrap
                transition-all duration-200
                ${
                  active
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20 dark:bg-blue-500 dark:shadow-blue-500/20"
                    : "text-gray-600 dark:text-gray-300 hover:bg-blue-500/10 hover:text-blue-700 dark:hover:bg-blue-400/15 dark:hover:text-blue-300"
                }
              `}
            >
              <Icon size={17} className="shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
