import type { Persona } from "./Persona";
import type { Tipo } from "./tipo";

export interface Caso {
idcaso: number;
codigo: string;
denunciante: string;
denunciado: string;
archivo: string;
fecha: Date;
hora: string;
estado: number;
persona?: Persona;
tipo?: Tipo
}