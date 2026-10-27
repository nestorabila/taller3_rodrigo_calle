// src/services/CredencialService.ts
import axios from "axios";
import type { Credencial } from "../model/Credencial";


const API = import.meta.env.VITE_API_URL;

export const CredencialService = {
  login: async (usuario: string, contrasena: string) => {
    const response = await axios.post(`${API}/login`, {
      usuario,
      contrasena,
    });

    return response.data;
  },

  listarCredencial: () =>
    axios.get(`${API}/listarCredencial`),

  registrarCredencial: (credencial: Credencial) =>
    axios.post(`${API}/registrarCredencial`, credencial),

  modificarCredencial: (id: number, credencial: Credencial) =>
    axios.put(`${API}/modificarCredencial/${id}`, credencial),

    // IA del módulo Usuarios
  chatUsuario: (mensaje: string) =>  axios.post(`${API}/chatUsuario`, {
      mensaje,
    }),


};