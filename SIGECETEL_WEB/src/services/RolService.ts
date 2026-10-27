import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export const RolService = {
  listarRol: () =>
    axios.get(`${API}/listarRol`),

  buscarRol: (filtro: string) =>
    axios.get(`${API}/buscarRol`, {
      params: { filtro },
    }),

  registrarRol: (rol: any) =>
    axios.post(`${API}/registrarRol`, rol),

  modificarRol: (id: number, rol: any) =>
    axios.put(`${API}/modificarRol/${id}`, rol),

    eliminarRol: (id: number) => axios.delete(`${API}/eliminarRol/${id}`),
 
  // IA del módulo Roles
  chatRol: (mensaje: string) => axios.post(`${API}/chatRol`, { mensaje }),

};