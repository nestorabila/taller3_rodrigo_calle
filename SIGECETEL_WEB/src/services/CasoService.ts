import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export const CasoService = {
  listarCaso: () =>
    axios.get(`${API}/listarCaso`),

  buscarCaso: (filtro: string) =>
    axios.get(`${API}/buscarCaso`, {
      params: { filtro },
    }),

  registrarCaso: (caso: any) =>
    axios.post(`${API}/registrarCaso`, caso),

  modificarCaso: (id: number, caso: any) =>
    axios.put(`${API}/modificarCaso/${id}`, caso),

  reporteCaso: () =>
    axios.get(`${API}/reporteCaso`),


  // IA del módulo caso
  chatUsuario: (mensaje: string) =>  axios.post(`${API}/chatCaso`, {
      mensaje,
    }),

  subirArchivo: (file: File) => {
    const formData = new FormData();
    formData.append("archivo", file);
    return axios.post(`${API}/subirArchivo`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  listarArchivos: () => axios.get(`${API}/listarArchivos`),

  descargarArchivo: (nombre: string) =>
    axios.get(`${API}/descargarArchivo/${nombre}`, {
      responseType: "blob",
    }),

  modificarArchivoCaso: (id: number, file: File) => {
    const formData = new FormData();
    formData.append("archivo", file);
    return axios.put(`${API}/modificarArchivoCaso/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },


};

