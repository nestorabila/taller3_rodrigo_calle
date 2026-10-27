import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  KeyRound,
  ScanText,
  FolderOpen,
  PhoneCall,
  Wifi,
  RadioTower,
  Antenna,
  TowerControl,
  ChartColumn,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Icono por módulo, indexado por ruta.
 * Todo el sistema usa la misma familia de iconos (lucide), con el mismo trazo.
 * Los componentes eligen el icono con menuIcons[item.path] y caen a item.icon si falta.
 */
export const menuIcons: Record<string, LucideIcon> = {
  "/app/home": LayoutDashboard, // Panel de Control
  "/app/usuarios": Users, // Usuarios
  "/app/roles": ShieldCheck, // Roles
  "/app/permisos": KeyRound, // Permisos
  "/app/entel": ScanText, // Extractor IA
  "/app/casos": FolderOpen, // Casos
  "/app/mapas": PhoneCall, // Llamadas/SMS
  "/app/tigo": Wifi, // Datos
  "/app/viva": RadioTower, // Antenas Viva
  "/app/antenas-tigo": Antenna, // Antenas Tigo
  "/app/antenas-entel": TowerControl, // Antenas Entel
  "/app/monitoreo": ChartColumn, // Reporte
};
