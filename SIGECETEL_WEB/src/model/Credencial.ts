import type { Persona } from "./Persona";

export interface Credencial {
  usuario: string;
  contrasena: string;
  persona?: Persona
}