import { useEffect, useState } from "react";

import type { Monitoreo } from "../model/monitoreo";

import {
  actualizarResultado,
  analizarDatosNuevos,
  extraerNotas,
  extraerProyectoNuevo,
  limpiarNotas,
  limpiarProyectosNuevos,
  listarNotas,
  listarProyectosNuevos,
  obtenerProgramasNuevos
} from "../services/monitoreoService";

import {
  obtenerProgramas,
  extraerMalla,
  listarMallas,
  limpiarMallas,
  limpiarProyectos
} from "../services/programaService";






function MonitoreoPage() {

// funciones para mallas
const [codigoMalla, setCodigoMalla] =
  useState("");

const [mallas, setMallas] =
  useState<any[]>([]);

const [loadingMalla, setLoadingMalla] =
  useState(false);

const [programasMalla, setProgramasMalla] =
  useState<any[]>([]);


const cargarProgramasMalla =
async () => {

  try {

    const data =
      await obtenerProgramas();

    setProgramasMalla(data);

  } catch (error) {

    console.log(error);

  }

};

const buscarMallaPorCodigo =
async (codigo: string) => {

  try {

    if (!codigo.trim()) return;

    setLoadingMalla(true);

    const programa =
      programasMalla.find(
        (item) =>
          item.codAcadem
            .trim()
            .toLowerCase() ===
          codigo
            .trim()
            .toLowerCase()
      );

    if (!programa) {

      alert(
        "No se encontró el código"
      );

      return;
    }

    await extraerMalla(
      programa.linkMalla
    );

    const resultado =
      await listarMallas();
      console.log(resultado);


    setMallas(resultado.data[0]);

  } catch (error) {

    console.log(error);

    alert(
      "Error al extraer malla"
    );

  } finally {

    setLoadingMalla(false);

  }

};



  // LIMPIAR MEMORIA
 const manejarLimpiarMemoriaMalla =
async () => {

  try {

    await limpiarMallas();

    setMallas([]);
    setCodigoMalla("");

    setReporte(null);

    setTipoMensaje("success");

    setMensaje(
      "Datos de mallas eliminados correctamente."
    );

    setTimeout(() => {

      setMensaje("");
      setTipoMensaje("");

    }, 3000);

  } catch (error) {

    console.log(error);

    setTipoMensaje("error");

    setMensaje(
      "No se pudieron limpiar las mallas."
    );

    setTimeout(() => {

      setMensaje("");
      setTipoMensaje("");

    }, 5000);

  }

};



const normalizarTexto1 = (
  texto: string
) => {

  return texto
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

};

const manejarAnalisis1 = () => {

  if (
    notas.length === 0 ||
    mallas.length === 0
  ) {

    alert(
      "Debe tener notas y mallas cargadas"
    );

    return;
  }

  const notasLista =
    Array.isArray(notas[0])
      ? notas[0]
      : [];

  const totalFilas =
    Math.max(
      notasLista.length,
      mallas.length
    );

  const resultado = [];

  for (
    let i = 0;
    i < totalFilas;
    i++
  ) {

    const nota =
      notasLista[i] || "";

    const malla =
      mallas[i] || "";

    const iguales =
      normalizarTexto1(nota) ===
      normalizarTexto1(malla);

    resultado.push({

      fila: i + 1,

      estado: iguales
        ? "IDENTICO"
        : "DIFERENTE",

      registros: [

        {
          origen: "NOTA",
          texto: nota
        },

        {
          origen: "MALLA",
          texto: malla
        }

      ]

    });

  }

  setReporte({
    reporte: resultado
  });

};


  // aqui terminar funciones de mallas














  const [programas, setProgramas] = useState<Monitoreo[]>([]);
  const [loading, setLoading] = useState(true);

  const [openModal, setOpenModal] = useState(false);
    const [openModal1, setOpenModal1] = useState(false);

  const [programaSeleccionado, setProgramaSeleccionado] = useState("");
  const [programasFiltrados, setProgramasFiltrados] = useState<Monitoreo[]>([]);

  const [responsableSeleccionado, setResponsableSeleccionado] = useState("");
  const [notasSistemaSeleccionadas, setNotasSistemaSeleccionadas] = useState<string[]>([]);


  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState<"success" | "error" | "">("");

  const [loadingNota, setLoadingNota] = useState<string | null>(null);
  const [loadingProyecto, setLoadingProyecto] = useState<string | null>(null);

  const [notas, setNotas] = useState<any[]>([]);
  const [proyectos, setProyectos] = useState<any[]>([]);

  const [reporte, setReporte] = useState<any>(null);
  const [analizando, setAnalizando] = useState(false);

  const [openReporte, setOpenReporte] = useState(false);
   const [openReporte1, setOpenReporte1] = useState(false);


  // metodo para checbok excel
const manejarResultado = async (
  codAcadem: string
) => {

  try {

    await actualizarResultado(
      codAcadem
    );

    setProgramasFiltrados(prev =>
      prev.map(item =>
        item.codAcadem === codAcadem
          ? { ...item, resultado: "OK" }
          : item
      )
    );

    await cargarProgramas();

    aplicarFiltros(
      programaSeleccionado,
      responsableSeleccionado,
      notasSistemaSeleccionadas
    );

  } catch (error) {

    console.log(error);

    alert(
      "Error al actualizar resultado"
    );
  }
};

  // =========================
  // NORMALIZAR TEXTO
  // =========================
  const normalizarTexto = (texto: string) => {
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\./g, "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  };

  // =========================
  // FILTRO
  // =========================
  const programasUnicos = [
    ...new Set(programas.map((item) => item.programa))
  ];

  const responsablesUnicos = [
  ...new Set(
    programas
      .map((item) => item.responsable?.trim())
      .filter((r) => r && r !== "")
  )
];
// =========================
// NORMALIZAR NOTAS SISTEMA
// =========================
const normalizarNotasSistema = (
  texto: string
) => {

  const valor = normalizarTexto(texto);

  // =========================
  // IGNORAR BASURA
  // =========================
  if (
    valor === "#n/a" ||
    valor === "n/a" ||
    valor === "-"
  ) {
    return null;
  }

  // =========================
  // SI
  // =========================
  if (
    valor.includes("si") &&
    valor.includes("reporte")
  ) {
    return "SI (reporte listo)";
  }

  if (valor === "si") {
    return "SI";
  }

  // =========================
  // SUBIR
  // =========================
  if (
    valor.includes("subir") &&
    valor.includes("no listo")
  ) {
    return "SUBIR (reporte no listo)";
  }

  if (
    valor.includes("subir") &&
    valor.includes("reporte")
  ) {
    return "SUBIR (reporte listo)";
  }

  if (valor === "subir") {
    return "SUBIR";
  }

  // =========================
  // EN DESARROLLO
  // =========================
  if (
    valor.includes("desarrollo")
  ) {
    return "EN DESARROLLO";
  }

  // =========================
  // NO
  // =========================
  if (
    valor === "no" ||
    valor.includes("no corresponde")
  ) {
    return "NO";
  }

  // =========================
  // DEFAULT
  // =========================
  return texto.trim();
};

// =========================
// CHECKBOX ÚNICOS
// =========================
const notasSistemaUnicos = [

  ...new Set(

    programas
      .map((item) =>
        normalizarNotasSistema(
          item.notasSistema || ""
        )
      )
      .filter(Boolean)
  )
];

const [busquedaPrograma, setBusquedaPrograma] = useState("");
const aplicarFiltros = (
  programa: string,
  responsable: string,
  notasSeleccionadas: string[]
) => {

  setProgramaSeleccionado(programa);

  setResponsableSeleccionado(
    responsable
  );

  setNotasSistemaSeleccionadas(
    notasSeleccionadas
  );

  let filtrados = [...programas];

  // =========================
  // FILTRO PROGRAMA
  // =========================
  if (programa !== "") {

    filtrados = filtrados.filter(
      (item) =>
        normalizarTexto(item.programa) ===
        normalizarTexto(programa)
    );
  }

  // =========================
  // FILTRO RESPONSABLE
  // =========================
  if (responsable !== "") {

    filtrados = filtrados.filter(
      (item) =>
        normalizarTexto(
          item.responsable || ""
        ) ===
        normalizarTexto(responsable)
    );
  }

  // =========================
  // FILTRO NOTAS SISTEMA
  // =========================
  // =========================
// FILTRO NOTAS SISTEMA
// =========================
if (notasSeleccionadas.length > 0) {

  filtrados = filtrados.filter(
    (item) =>

      notasSeleccionadas.some(
        (nota) =>

          normalizarNotasSistema(
            item.notasSistema || ""
          ) === nota
      )
  );
}

  setProgramasFiltrados(filtrados);
};

  // =========================
  // CARGAR PROGRAMAS
  // =========================
  const cargarProgramas = async () => {

    try {

      const data = await obtenerProgramasNuevos();

      setProgramas(data);
      setProgramasFiltrados(data);

    } catch (error) {

      console.log(error);

    } finally {

      setLoading(false);

    }
  };

  useEffect(() => {
    cargarProgramas();
  }, []);

  // =========================
  // NOTAS (ANTES MALLAS)
  // =========================
  const manejarExtraerNota = async (link: string) => {

    try {

      setLoadingNota(link);

      if (!link || link.trim() === "") {

        setTipoMensaje("error");
        setMensaje("No se pudo extraer notas.");

        setTimeout(() => {
          setMensaje("");
          setTipoMensaje("");
        }, 4000);

        return;
      }

      await extraerNotas(link);
      await cargarNotas();

      setTipoMensaje("success");
      setMensaje("Notas extraídas correctamente.");

      setTimeout(() => {
        setMensaje("");
        setTipoMensaje("");
      }, 3000);

    } catch (error) {

      console.log(error);

      setTipoMensaje("error");
      setMensaje("Error al extraer notas.");

    } finally {
      setLoadingNota(null);
    }
  };

  const cargarNotas = async () => {

    try {
      const res = await listarNotas();
      setNotas(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  // =========================
  // PROYECTO
  // =========================
// datos para guardar ------------------
// guardar idcodigo para visualizar
const [codigosProyecto, setCodigosProyecto] =
  useState<string[]>([]);


  const manejarExtraerProyecto = async (link: string,  codAcadem: string) => {

    try {

      setLoadingProyecto(link);

      if (!link || link.trim() === "") {

        setTipoMensaje("error");
        setMensaje("No se pudo extraer proyecto.");

        setTimeout(() => {
          setMensaje("");
          setTipoMensaje("");
        }, 4000);

        return;
      }

      await extraerProyectoNuevo(link);
      // GUARDAR SOLO EL ULTIMO CODIGO
    setCodigosProyecto([
      codAcadem
    ]);
      await cargarProyectos();

      setTipoMensaje("success");
      setMensaje("Proyecto extraído correctamente.");

      setTimeout(() => {
        setMensaje("");
        setTipoMensaje("");
      }, 3000);

    } catch (error) {

      console.log(error);

      setTipoMensaje("error");
      setMensaje("Error al extraer proyecto.");

    } finally {
      setLoadingProyecto(null);
    }
  };

  const cargarProyectos = async () => {

    try {
      const res = await listarProyectosNuevos();
      setProyectos(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  // =========================
  // ANALISIS
  // =========================
  const manejarAnalisis = async () => {

    try {

      setAnalizando(true);

      const res = await analizarDatosNuevos();

      setReporte(res);

      alert("Análisis completado");

    } catch (error) {

      console.log(error);
      alert("Error en análisis");

    } finally {
      setAnalizando(false);
    }
  };

  // =========================
  // LIMPIAR
  // =========================

  // LIMPIAR MEMORIA
  const manejarLimpiarMemoriaProyecto =
  async () => {
  
    try {
  
        await limpiarProyectosNuevos();
        await limpiarProyectos();
  
      // LIMPIAR FRONTEND
      
      setProyectos([]);
      setReporte(null);
  
      // MENSAJE EXITO
      setTipoMensaje("success");
  
      setMensaje(
        "Datos de memoria limpiados con éxito."
      );
  
      setTimeout(() => {
  
        setMensaje("");
        setTipoMensaje("");
  
      }, 3000);
  
    } catch (error) {
  
      console.log(error);
  
      setTipoMensaje("error");
  
      setMensaje(
        "No se pudieron limpiar los datos."
      );
  
      setTimeout(() => {
  
        setMensaje("");
        setTipoMensaje("");
  
      }, 5000);
  
    }
  
  };


  const limpiarTodo = async () => {

    try {

      await limpiarNotas();
      await limpiarProyectosNuevos();
      await limpiarProyectos();

      setNotas([]);
      setProyectos([]);
      setReporte(null);

      setTipoMensaje("success");
      setMensaje("Datos limpiados correctamente.");

    } catch (error) {

      console.log(error);

      setTipoMensaje("error");
      setMensaje("Error al limpiar datos.");
    }
  };

 return (
  <h1>Sumar Especialidad Page</h1>
);


}

export default MonitoreoPage;