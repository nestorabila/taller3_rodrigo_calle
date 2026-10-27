import type { Inscritos } from "../model/Inscritos";
import api from "./api";

/* =========================================================
   PROGRAMAS NO INSCRITOS
========================================================= */

export const obtenerInscritos =
async (): Promise<Inscritos[]> => {

    const { data } =
        await api.get(
            "/excelPrograma"
        );

    return data.datos;
};

/* =========================================================
   PROYECTOS
========================================================= */

export const extraerProyectoPrograma =
async (url: string) => {

    const { data } =
        await api.post(
            "/extraerproyectoPrograma",
            { url }
        );

    return data;
};

export const listarProyectosPrograma =
async () => {

    const { data } =
        await api.get(
            "/listarproyectoPrograma"
        );

    return data;
};

export const limpiarProyectosPrograma =
async () => {

    const { data } =
        await api.delete(
            "/limpiarproyectoPrograma"
        );

    return data;
};

/* =========================================================
   ANALISIS
========================================================= */

export const analizarPrograma =
async () => {

    const { data } =
        await api.post(
            "/analizarPrograma"
        );

    return data;
};

/* =========================================================
   ACTUALIZAR RESULTADO
========================================================= */

export const actualizarResultadoPrograma =
async (codAcadem: string) => {

    const { data } =
        await api.post(
            "/actualizarResultadoPrograma",
            {
                codAcadem
            }
        );

    return data;
};