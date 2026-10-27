// src/services/PersonaService.ts
import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export const PersonaService = {
  listarGenero: () =>
    axios.get(`${API}/listarGenero`),

  listarPersonas: () =>
    axios.get(`${API}/listarPersonas`),

  listarReportePersona: (params?: any) =>
    axios.get(`${API}/listarReportePersona`, { params }),

  listarPersonasFiltradas: (filtro: string) =>
    axios.get(`${API}/listarPersonasFiltradas`, {
      params: { filtro },
    }),

  registrarPersona: (persona: any) =>
    axios.post(`${API}/registrarPersona`, persona),

  modificarPersona: (id: number, persona: any) =>
    axios.put(`${API}/modificarPersona/${id}`, persona),

  buscarPersonas: (filtro: string) =>
    axios.get(`${API}/buscarPersonas`, {
      params: { filtro },
    }),

  cambiarEstadoPersona: (id: number, estado: number) =>
    axios.put(`${API}/cambiarEstadoPersona/${id}`, { estado }),

  verDetallesPersona: (id: number) =>
    axios.get(`${API}/verDetallesPersona/${id}`),
};