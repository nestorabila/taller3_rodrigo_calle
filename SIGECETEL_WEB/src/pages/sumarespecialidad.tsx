import { useEffect, useState } from "react";

import type { Inscritos } from "../model/Inscritos";

import {

  obtenerInscritos,

  extraerProyectoPrograma,

  listarProyectosPrograma,

  limpiarProyectosPrograma,



} from "../services/inscritosServive";
import { extraerMalla, obtenerProgramas } from "../services/programaService";
import type { Programa } from "../model/programa";

function SumarespecialidadPage() {

// aqui umentar metood de busacas y todo relaciondo a mallas no queor que mezcle

const limpiarMallas = () => {

  setMallasExtraidas([]);

  setElementosComparar(
    (prev) =>
      prev.filter(
        (item) =>
          !item.startsWith(
            "MALLA "
          )
      )
  );

};

const [mallasExtraidas,
  setMallasExtraidas] =
  useState<
    {
      programa: Programa;
      modulos: string[];
    }[]
  >([]);

const [loadingMalla,
  setLoadingMalla] =
  useState<string | null>(null);

const seleccionarMalla = async (
  malla: Programa
) => {

  try {

    setLoadingMalla(
      malla.codAcadem
    );

    console.log(
      "MALLA SELECCIONADA:",
      malla
    );

    const respuesta =
      await extraerMalla(
        malla.linkMalla
      );

    console.log(
      "MODULOS EXTRAIDOS",
      respuesta
    );

    setMallasExtraidas(
      (prev) => [

        ...prev,

        {
          programa: malla,
          modulos:
            respuesta.data || []
        }

      ]
    );

  } catch (error) {

    console.error(
      "Error extrayendo malla",
      error
    );

  } finally {

    setLoadingMalla(null);

  }

};
// =========================
// MALLAS
// =========================

const [mallas, setMallas] =
  useState<Programa[]>([]);

const [textoBusquedaMalla,
  setTextoBusquedaMalla] =
  useState("");

const [mallasEncontradas,
  setMallasEncontradas] =
  useState<Programa[]>([]);


  const cargarMallas = async () => {

  try {

    const datos =
      await obtenerProgramas();

    setMallas(datos);

  } catch (error) {

    console.error(
      "Error cargando mallas",
      error
    );

  }

};


const normalizarTexto1 = (
  texto: string
) => {

  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

};



const buscarMallas = () => {

  console.log("================================");
  console.log("BUSCAR MALLAS");

  const busqueda =
    normalizarTexto1(
      textoBusquedaMalla
    );

  console.log("Texto original:", textoBusquedaMalla);
  console.log("Texto normalizado:", busqueda);

  console.log(
    "Cantidad de mallas:",
    mallas.length
  );

  if (!busqueda) {

    console.log(
      "Busqueda vacia"
    );

    setMallasEncontradas([]);

    return;
  }

  const resultados =
    mallas.filter((malla) => {

      const nombrePrograma =
        normalizarTexto1(
          malla.nuevoPrograma
        );

      return nombrePrograma.includes(
        busqueda
      );

    });

  console.log(
    "Resultados encontrados:",
    resultados.length
  );

  console.log(
    "Primeros resultados:",
    resultados.slice(0, 5)
  );

  setMallasEncontradas(
    resultados
  );

};
// =========================
// FIN MALLAS
// =========================









const [
  elementosComparar,
  setElementosComparar
] = useState<string[]>([]);

const manejarCheckboxComparacion = (
  nombre: string
) => {

  setElementosComparar(
    (prev) => {

      if (
        prev.includes(nombre)
      ) {

        return prev.filter(
          (item) =>
            item !== nombre
        );

      }

      return [
        ...prev,
        nombre
      ];

    }
  );

};

const normalizarComparacion = (
  texto: string
) => {

  return (texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

};


// const compararListas = (
//   nombreA: string,
//   listaA: string[],
//   nombreB: string,
//   listaB: string[]
// ) => {

//   const filas = [];

//   const total =
//     Math.max(
//       listaA.length,
//       listaB.length
//     );

//   for (
//     let i = 0;
//     i < total;
//     i++
//   ) {

//     const textoA =
//       listaA[i] || "";

//     const textoB =
//       listaB[i] || "";

//     const iguales =

//       normalizarComparacion(
//         textoA
//       ) ===

//       normalizarComparacion(
//         textoB
//       );

//     filas.push({

//       fila: i + 1,

//       estado:
//         iguales
//           ? "IDENTICO"
//           : "DIFERENTE",

//       tieneFaltantes:
//         !textoA ||
//         !textoB,

//       registros: [

//         {
//           origen: nombreA,
//           texto: textoA
//         },

//         {
//           origen: nombreB,
//           texto: textoB
//         }

//       ]

//     });

//   }

//   return filas;

// };

const obtenerDatosComparacion = (
  nombre: string
) => {

  if (
    nombre.startsWith("MALLA")
  ) {

    const indice =
      Number(
        nombre.replace(
          "MALLA ",
          ""
        )
      ) - 1;

    return (
      mallasExtraidas[
        indice
      ]?.modulos || []
    );

  }

  const [
    tipo,
    indiceStr
  ] = nombre.split("|");

  const indice =
    Number(indiceStr);

  const proyecto =
    proyectos[indice];

  if (!proyecto)
    return [];

  switch (tipo) {

    case "PLAN TEMATICO":
      return proyecto.planTematico || [];

    case "FONDO TIEMPO":
      return proyecto.fondoTiempo || [];

    case "CRONOGRAMA":
      return proyecto.cronograma || [];

    case "CLAUSTRO DOCENTE":
      return proyecto.claustroDocente || [];

    default:
      return [];

  }

};

const manejarAnalisis =
  async () => {

    try {

      setAnalizando(
        true
      );

      if (
        elementosComparar.length < 2
      ) {

        alert(
          "Seleccione al menos 2 elementos"
        );

        return;
      }

      const nombres =
  elementosComparar;

const listas =
  elementosComparar.map(
    nombre =>
      obtenerDatosComparacion(
        nombre
      )
  );

const filas =
  compararMultiplesListas(
    nombres,
    listas
  );
      setReporte({

        reporte: filas

      });

      setOpenReporte(
        true
      );

    } catch (error) {

      console.log(error);

    } finally {

      setAnalizando(
        false
      );

    }

  };





const compararMultiplesListas = (
  nombres: string[],
  listas: string[][]
) => {

  const filas = [];

  const totalFilas =
    Math.max(
      ...listas.map(
        lista => lista.length
      )
    );

  for (
    let i = 0;
    i < totalFilas;
    i++
  ) {

    const registros =
      nombres.map(
        (
          nombre,
          index
        ) => ({

          origen: nombre,

          texto:
            listas[index][i]
            || ""

        })
      );

    const valores =
      registros.map(
        r =>
          normalizarComparacion(
            r.texto
          )
      );

    const todosIguales =
      valores.every(
        valor =>
          valor === valores[0]
      );

    filas.push({

      fila: i + 1,

      estado:
        todosIguales
          ? "IDENTICO"
          : "DIFERENTE",

      tieneFaltantes:
        registros.some(
          r => !r.texto
        ),

      registros

    });

  }

  return filas;

};












//  y aqui debe terminar


  const [programas, setProgramas] =
    useState<Inscritos[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [openModal, setOpenModal] =
    useState(false);

  // const [openModal1, setOpenModal1] =
  //   useState(false);

  // const [programaSeleccionado,
  //   setProgramaSeleccionado] =
  //   useState("");

  const [programasFiltrados,
    setProgramasFiltrados] =
    useState<Inscritos[]>([]);

  const [mensaje, setMensaje] =
    useState("");

  const [tipoMensaje,
    setTipoMensaje] =
    useState<"success" | "error" | "">("");

  const [loadingProyecto,
    setLoadingProyecto] =
    useState<string | null>(null);

  const [proyectos,
    setProyectos] =
    useState<any[]>([]);

  const [reporte,
    setReporte] =
    useState<any>(null);

  const [analizando,
    setAnalizando] =
    useState(false);

  const [openReporte,
    setOpenReporte] =
    useState(false);

  // const [openReporte1,
  //   setOpenReporte1] =
  //   useState(false);

  // =========================
  // NORMALIZAR TEXTO
  // =========================

  const normalizarTexto = (
    texto: string
  ) => {

    return texto
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .replace(
        /\./g,
        ""
      )
      .trim()
      .replace(
        /\s+/g,
        " "
      )
      .toLowerCase();
  };

  // =========================
  // FILTRO
  // =========================

  // const programasUnicos = [

  //   ...new Set(

  //     programas.map(
  //       (item) =>
  //         item.programa
  //     )

  //   )

  // ];

  //nuevos flitros aplicado------
const [codigoSeleccionado,
  setCodigoSeleccionado] =
  useState("");

const [versionSeleccionada,
  setVersionSeleccionada] =
  useState("");


  const versionesUnicas = [

  ...new Set(

    programas
      .map(
        (item) =>
          item.version?.trim()
      )
      .filter(Boolean)

  )

];


const aplicarFiltros = (
  codigo: string,
  version: string
) => {

  setCodigoSeleccionado(
    codigo
  );

  setVersionSeleccionada(
    version
  );

  let filtrados =
    [...programas];

  // =========================
  // FILTRO CODIGO
  // =========================

  if (
    codigo.trim() !== ""
  ) {

    filtrados =
      filtrados.filter(
        (item) =>

          item.codAcadem
            ?.toLowerCase()
            .includes(
              codigo
                .trim()
                .toLowerCase()
            )
      );
  }

  // =========================
  // FILTRO VERSION
  // =========================

  if (
    version !== ""
  ) {

    filtrados =
      filtrados.filter(
        (item) =>

          normalizarTexto(
            item.version
          ) ===

          normalizarTexto(
            version
          )
      );
  }

  setProgramasFiltrados(
    filtrados
  );
};

  // =========================
  // CARGAR PROGRAMAS
  // =========================

  const cargarProgramas =
    async () => {

      try {

        const data =
          await obtenerInscritos();

        setProgramas(
          data
        );

        setProgramasFiltrados(
          data
        );

      } catch (error) {

        console.log(error);

      } finally {

        setLoading(false);

      }
    };

  useEffect(() => {

    cargarProgramas();
    cargarMallas();


  }, []);

  // =========================
  // CHECKBOX RESULTADO
  // =========================

  
  // =========================
  // PROYECTO
  // =========================

  const [
    codigosProyecto,
    setCodigosProyecto
  ] = useState<string[]>(
    []
  );

  const manejarExtraerProyecto =
    async (
      link: string,
      codAcadem: string
    ) => {

      try {

        setLoadingProyecto(
          link
        );

        if (
          !link ||
          link.trim() === ""
        ) {

          setTipoMensaje(
            "error"
          );

          setMensaje(
            "No se pudo extraer proyecto."
          );

          setTimeout(
            () => {

              setMensaje("");

              setTipoMensaje(
                ""
              );

            },
            4000
          );

          return;
        }

        await extraerProyectoPrograma(
          link
        );

     const indiceProyecto =
  codigosProyecto.length;

setCodigosProyecto(
  prev => [
    ...prev,
    codAcadem
  ]
);



await cargarProyectos();

setElementosComparar(
  prev => [

    ...prev,

    `PLAN TEMATICO|${indiceProyecto}`,
    `FONDO TIEMPO|${indiceProyecto}`,
    `CRONOGRAMA|${indiceProyecto}`,
    `CLAUSTRO DOCENTE|${indiceProyecto}`

  ]
);

        setTipoMensaje(
          "success"
        );

        setMensaje(
          "Proyecto extraído correctamente."
        );

        setTimeout(
          () => {

            setMensaje("");

            setTipoMensaje(
              ""
            );

          },
          3000
        );

      } catch (error) {

        console.log(error);

        setTipoMensaje(
          "error"
        );

        setMensaje(
          "Error al extraer proyecto."
        );

      } finally {

        setLoadingProyecto(
          null
        );
      }
    };

  const cargarProyectos =
    async () => {

      try {

        const res =
          await listarProyectosPrograma();

        setProyectos(
          res.data
        );

      } catch (error) {

        console.log(error);

      }
    };

  // =========================
  // ANALISIS
  // =========================

  // const manejarAnalisis =
  //   async () => {

  //     try {

  //       setAnalizando(
  //         true
  //       );

  //       const res =
  //         await analizarPrograma();

  //       setReporte(
  //         res
  //       );

  //       alert(
  //         "Análisis completado"
  //       );

  //     } catch (error) {

  //       console.log(error);

  //       alert(
  //         "Error en análisis"
  //       );

  //     } finally {

  //       setAnalizando(
  //         false
  //       );
  //     }
  //   };

  // =========================
  // LIMPIAR MEMORIA
  // =========================

  // =========================
  // LIMPIAR TODO
  // =========================

const limpiarTodo = async () => {

  try {

    await limpiarProyectosPrograma();

    setProyectos([]);

    setCodigosProyecto([]);

    setReporte(null);

    setElementosComparar(
      prev =>
        prev.filter(
          item =>
            item.startsWith("MALLA ")
        )
    );

    setTipoMensaje(
      "success"
    );

    setMensaje(
      "Datos limpiados correctamente."
    );

    setTimeout(() => {

      setMensaje("");

      setTipoMensaje("");

    }, 3000);

  } catch (error) {

    console.log(error);

    setTipoMensaje(
      "error"
    );

    setMensaje(
      "Error al limpiar datos."
    );

  }

};
 return (
  <h1>Sumar Especialidad Page</h1>
);


}

export default SumarespecialidadPage;