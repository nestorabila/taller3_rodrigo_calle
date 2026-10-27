import { LayoutDashboard, AppWindow } from "lucide-react";

export const menuItems = [
  { name: "Panel de Control", path: "/app/home",     icon: LayoutDashboard,    permiso: "panel.ver" },
{ name: "Usuarios",         path: "/app/usuarios", icon: AppWindow, permiso: "usuarios.ver" },
{ name: "Roles",            path: "/app/roles",    icon: AppWindow, permiso: "roles.ver" },
{ name: "Permisos",         path: "/app/permisos", icon: AppWindow, permiso: "permisos.ver" },
{ name: "Extractor IA",     path: "/app/entel",    icon: AppWindow, permiso: "acciones.ver" },
{ name: "Casos",            path: "/app/casos",    icon: AppWindow, permiso: "casos.ver" },
{ name: "Llamadas/SMS",      path: "/app/mapas",    icon: AppWindow, permiso: "acciones.ver" },
{ name: "Datos",             path: "/app/tigo",     icon: AppWindow, permiso: "acciones.ver" },
{ name: "Antenas Viva",     path: "/app/viva",     icon: AppWindow, permiso: "acciones.ver" },
{ name: "Antenas Tigo",     path: "/app/antenas-tigo", icon: AppWindow, permiso: "acciones.ver", soloAdmin: true },
{ name: "Antenas Entel",    path: "/app/antenas-entel", icon: AppWindow, permiso: "acciones.ver", soloAdmin: true },
{ name: "Reporte",          path: "/app/monitoreo",icon: AppWindow, permiso: "reportes.ver" },
];
