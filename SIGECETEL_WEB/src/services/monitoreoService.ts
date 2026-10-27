import api from "./api";
import type { Monitoreo } from "../model/monitoreo";

/* =========================================================
   PROGRAMAS NUEVOS
========================================================= */

export const obtenerProgramasNuevos =
async (): Promise<Monitoreo[]> => {

    const { data } =
        await api.get("/excelvale");

    return data.datos;
};

/* =========================================================
   NOTAS (antes mallas)
========================================================= */

export const extraerNotas =
async (url: string) => {

    const { data } =
        await api.post(
            "/extraernota",
            { url }
        );

    return data;
};

export const listarNotas =
async () => {

    const { data } =
        await api.get(
            "/listarnotas"
        );

    return data;
};

export const limpiarNotas =
async () => {

    const { data } =
        await api.delete(
            "/limpiarnotas"
        );

    return data;
};

/* =========================================================
   PROYECTO (igual, solo rename limpio)
========================================================= */

export const extraerProyectoNuevo =
async (url: string) => {

    const { data } =
        await api.post(
            "/extraerproyectoVale",
            { url }
        );

    return data;
};

export const listarProyectosNuevos =
async () => {

    const { data } =
        await api.get(
            "/listarproyectoVale"
        );

    return data;
};

export const limpiarProyectosNuevos =
async () => {

    const { data } =
        await api.delete(
            "/limpiarproyectoVale"
        );

    return data;
};

/* =========================================================
   ANALISIS (igual lógica)
========================================================= */

export const analizarDatosNuevos = async () => {

    console.log("Llamando API...");

    const { data } = await api.post("/analizarVale");

    console.log("Data recibida:", data);

    return data;
};


//metodo para checkbok de excel
export const actualizarResultado =
async (codAcadem: string) => {

    const { data } = await api.post(
        "/actualizarResultado",
        {
            codAcadem
        }
    );

    return data;
};