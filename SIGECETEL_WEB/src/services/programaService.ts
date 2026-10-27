import api from "./api";
import type { Programa } from "../model/programa";

/* =========================================================
   PROGRAMAS
========================================================= */

export const obtenerProgramas =
async (): Promise<Programa[]> => {

    const { data } =
        await api.get("/excel");
         console.log("MALLAS RECIBIDAS:", data);
        console.log("DATOS:", data.datos);

    return data.datos;
};

/* =========================================================
   MALLAS
========================================================= */

export const extraerMalla =
async (url: string) => {

    const { data } =
        await api.post(
            "/mallas",
            { url }
        );

    return data;
};

export const listarMallas =
async () => {

    const { data } =
        await api.get(
            "/listarmallas"
        );

    return data;
};

export const limpiarMallas =
async () => {

    const { data } =
        await api.delete(
            "/mallas"
        );

    return data;
};

/* =========================================================
   PROYECTOS
========================================================= */

export const extraerProyecto =
async (url: string) => {

    const { data } =
        await api.post(
            "/proyecto",
            { url }
        );

    return data;
};

export const listarProyectos =
async () => {

    const { data } =
        await api.get(
            "/listarproyecto"
        );

    return data;
};

export const limpiarProyectos =
async () => {

    const { data } =
        await api.delete(
            "/limpiarproyecto"
        );

    return data;
};

/* =========================================================
   ANALISIS
========================================================= */

export const analizarDatos =
async () => {

    const { data } =
        await api.post(
            "/analizar"
        );

    return data;
};