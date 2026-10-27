import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { esAdmin } from "../services/PermisoHelper";

/** Muestra el contenido solo al administrador; al resto, un aviso */
export default function SoloAdmin({ children }: { children: ReactNode }) {
  if (esAdmin()) return <>{children}</>;
  return (
    <div className="grid min-h-[60vh] place-items-center p-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"><ShieldAlert size={20} /></div>
        <p className="font-semibold text-slate-800 dark:text-slate-100">Solo para el administrador</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          La base de antenas completa la administra el administrador del sistema. En tus casos verás las antenas que aparecen en la sábana que subas.
        </p>
      </div>
    </div>
  );
}
