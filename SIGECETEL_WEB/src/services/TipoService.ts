import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export const TipoService = {
  listarTipo: () =>
    axios.get(`${API}/listarTipo`),

  buscarTipo: (filtro: string) =>
    axios.get(`${API}/buscarTipo`, {
      params: { filtro },
    }),

  registrarTipo: (tipo: any) =>
    axios.post(`${API}/registrarTipo`, tipo),

  modificarTipo: (id: number, tipo: any) =>
    axios.put(`${API}/modificarTipo/${id}`, tipo),

  reporteTipo: () =>
    axios.get(`${API}/reporteTipo`),
};