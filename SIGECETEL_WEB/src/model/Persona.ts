import type { Credencial } from "./Credencial";
import type { Genero } from "./Genero";
import type { Rol } from "./Rol";

export interface Persona {
  idpersona: number;
  cedula: string;
  nombre: string;
  ap_paterno: string;
  ap_materno: string;
  telefono: string;
  fotografia: string;
  fecha: string;   // ISO date recomendado
  hora: string;    // HH:mm:ss
  correo: string;
  estado: number;
  genero?: Genero
  credencial?: Credencial;
  rol?: Rol[];

}