// src/services/PermisoService.ts
import axios from "axios";
const API = import.meta.env.VITE_API_URL;

export const PermisoService = {
  // Catálogo completo de permisos (para pintar la matriz)
  listarPermiso: () =>
    axios.get(`${API}/listarPermiso`),

  // Permisos asignados a un rol
  permisosRol: (idrol: number) =>
    axios.get(`${API}/permisosRol/${idrol}`),

  // Guardar permisos de un rol (lista final de idpermiso marcados)
  guardarPermisosRol: (idrol: number, permisos: number[]) =>
    axios.post(`${API}/guardarPermisosRol/${idrol}`, { permisos }),

  // Permisos de una persona: { rol, excepciones, efectivo }
  permisosPersona: (idpersona: number) =>
    axios.get(`${API}/permisosPersona/${idpersona}`),

  // Guardar permisos de una persona (lista final; el backend calcula A/D)
  guardarPermisosPersona: (idpersona: number, permisos: number[]) =>
    axios.post(`${API}/guardarPermisosPersona/${idpersona}`, { permisos }),

  // Permisos efectivos del usuario logueado (códigos, para menú y botones)
  misPermisos: () =>
    axios.get(`${API}/misPermisos`),
   chatPermiso: (mensaje: string) => axios.post(`${API}/chatPermiso`, { mensaje }),
   
};