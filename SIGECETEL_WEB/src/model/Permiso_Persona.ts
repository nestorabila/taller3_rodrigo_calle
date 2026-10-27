import type { Permiso } from "./Permiso";
import type { Persona } from "./Persona";

export interface Permiso_Persona {
  persona?: Persona,
  permiso?: Permiso,
  tipo: string
}