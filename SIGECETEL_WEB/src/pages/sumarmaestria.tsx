import { useState } from "react";

export default function TablaHoras() {
 
const configuraciones = {
  14: [
    { thp: 64, thnp: 96 },
    { thp: 64, thnp: 96 },
    { thp: 64, thnp: 96 },
    { thp: 64, thnp: 96 },
    { thp: 64, thnp: 96 },
    { thp: 64, thnp: 96 },
    { thp: 64, thnp: 96 },
    { thp: 64, thnp: 96 },
    { thp: 64, thnp: 96 },
    { thp: 64, thnp: 96 },
    { thp: 80, thnp: 120 },
    { thp: 80, thnp: 120 },
    { thp: 80, thnp: 120 },
    { thp: 80, thnp: 120 },
  ],

  15: [
    { thp: 64, thnp: 96 },
    { thp: 64, thnp: 96 },
    { thp: 64, thnp: 96 },
    { thp: 64, thnp: 96 },
    { thp: 64, thnp: 96 },
    { thp: 64, thnp: 96 },
    { thp: 64, thnp: 96 },
    { thp: 64, thnp: 96 },
    { thp: 64, thnp: 96 },
    { thp: 64, thnp: 96 },
    { thp: 64, thnp: 96 },
    { thp: 64, thnp: 96 },
    { thp: 64, thnp: 96 },
    { thp: 64, thnp: 96 },
    { thp: 64, thnp: 96 },
  ],

  17: [
    { thp: 60, thnp: 100 },
    { thp: 60, thnp: 100 },
    { thp: 60, thnp: 100 },
    { thp: 60, thnp: 100 },
    { thp: 60, thnp: 100 },
    { thp: 55, thnp: 65 },
    { thp: 55, thnp: 65 },
    { thp: 55, thnp: 65 },
    { thp: 55, thnp: 65 },
    { thp: 55, thnp: 65 },
    { thp: 55, thnp: 65 },
    { thp: 55, thnp: 65 },
    { thp: 55, thnp: 105 },
    { thp: 55, thnp: 105 },
    { thp: 55, thnp: 105 },
    { thp: 55, thnp: 65 },
    { thp: 55, thnp: 105 },
  ],

  18: [
    { thp: 40, thnp: 80 },
    { thp: 40, thnp: 80 },
    { thp: 40, thnp: 80 },
    { thp: 40, thnp: 80 },
    { thp: 40, thnp: 80 },
    { thp: 40, thnp: 80 },
    { thp: 40, thnp: 80 },
    { thp: 40, thnp: 80 },
    { thp: 40, thnp: 80 },
    { thp: 40, thnp: 80 },
    { thp: 40, thnp: 80 },
    { thp: 40, thnp: 80 },
    { thp: 40, thnp: 80 },
    { thp: 40, thnp: 80 },
    { thp: 40, thnp: 80 },
    { thp: 120, thnp: 80 },
    { thp: 120, thnp: 80 },
    { thp: 120, thnp: 80 },
  ],
  19: [
  { thp: 44, thnp: 76 },
  { thp: 44, thnp: 76 },
  { thp: 44, thnp: 76 },
  { thp: 64, thnp: 96 },
  { thp: 64, thnp: 96 },
  { thp: 64, thnp: 96 },
  { thp: 54, thnp: 66 },
  { thp: 54, thnp: 66 },
  { thp: 54, thnp: 66 },
  { thp: 54, thnp: 66 },
  { thp: 48, thnp: 72 },
  { thp: 48, thnp: 72 },
  { thp: 44, thnp: 76 },
  { thp: 44, thnp: 76 },
  { thp: 44, thnp: 76 },
  { thp: 44, thnp: 76 },
  { thp: 44, thnp: 76 },
  { thp: 44, thnp: 76 },
  { thp: 60, thnp: 60 },
],

};

const [tipo, setTipo] = useState(18);

const datos = (configuraciones as any)[tipo];

const [filas, setFilas] = useState(
  configuraciones[18].map(() => ({
    valor1: "",
    valor2: "",
  }))
);

const cambiarTipo = (nuevoTipo: any) => {
  setTipo(nuevoTipo);

  setFilas(
    (configuraciones as any)[nuevoTipo].map(() => ({
  valor1: "",
  valor2: "",
}))
  );
};

const pegarDatos = (e: any) => {
  e.preventDefault();

  const texto = e.clipboardData.getData("text");

  const numeros = texto.match(/\d+(\.\d+)?/g) || [];

  const nuevasFilas = datos.map(() => ({
    valor1: "",
    valor2: "",
  }));

  let indice = 0;

  for (
    let fila = 0;
    fila < nuevasFilas.length && indice < numeros.length;
    fila++
  ) {
    nuevasFilas[fila].valor1 = numeros[indice] || "";
    indice++;

    nuevasFilas[fila].valor2 = numeros[indice] || "";
    indice++;
  }

  setFilas(nuevasFilas);
};

const actualizar = (i: any, campo: any, valor: any) => {
  const copia = [...filas];

  (copia[i] as any)[campo] = valor;

  setFilas(copia);
};

const totalTHP = datos.reduce(
  (a:any, b:any) => a + b.thp,
  0
);

const totalTHNP = datos.reduce(
  (a:any, b:any) => a + b.thnp,
  0
);

const totalValor1 = filas.reduce(
  (a:any, b:any) => a + (Number(b.valor1) || 0),
  0
);

const totalValor2 = filas.reduce(
  (a, b) => a + (Number(b.valor2) || 0),
  0
);

const limpiarDatos = () => {
  setFilas(
    datos.map(() => ({
      valor1: "",
      valor2: "",
    }))
  );

};



return (
  <div className="p-6">
    <div className="mb-4 text-center text-sm text-slate-500 dark:text-slate-400">
      Copia dos columnas desde Word o Excel y pégalas en cualquier campo.
    </div>

    <div className="flex justify-center gap-6 items-start">
      {/* Radios */}
      <div
        className="
          bg-white
          dark:bg-slate-900
          rounded-xl
          shadow-lg
          p-4
          text-slate-500 dark:text-slate-400
          flex
          flex-col
          gap-3
          min-w-[80px]
        "
      >
        <div className="text-xs font-semibold text-center text-slate-500 dark:text-slate-400">
          Filas
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="tipo"
            checked={tipo === 14}
            onChange={() => cambiarTipo(14)}
          />
          <span>14</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="tipo"
            checked={tipo === 15}
            onChange={() => cambiarTipo(15)}
          />
          <span>15</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="tipo"
            checked={tipo === 17}
            onChange={() => cambiarTipo(17)}
          />
          <span>17</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="tipo"
            checked={tipo === 18}
            onChange={() => cambiarTipo(18)}
          />
          <span>18</span>
        </label>

          <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="tipo"
            checked={tipo === 19}
            onChange={() => cambiarTipo(19)}
          />
          <span>19</span>
        </label>

      </div>

      {/* Tabla */}
      <table
        className="
          overflow-hidden
          rounded-xl
          shadow-lg
          bg-white
          dark:bg-slate-900
          dark:text-white
        "
      >
        <thead>
          <tr>
            <th
              className="
                px-6 py-3
                bg-amber-200
                dark:bg-amber-800
                text-center
                font-semibold
              "
            >
              THP
            </th>

            <th
              className="
                px-4 py-3
                bg-slate-100
                dark:bg-slate-800
                text-center
                font-semibold
              "
            >
              Valor 1
            </th>

            <th
              className="
                px-6 py-3
                bg-emerald-200
                dark:bg-emerald-800
                text-center
                font-semibold
              "
            >
              THNP
            </th>

            <th
              className="
                px-4 py-3
                bg-slate-100
                dark:bg-slate-800
                text-center
                font-semibold
              "
            >
              Valor 2
            </th>
          </tr>
        </thead>

        <tbody>
          {datos.map((fila: any, i: any) => (
            <tr
              key={i}
              className="
                border-b
                border-slate-200
                dark:border-slate-700
              "
            >
              <td
                className="
                  px-6 py-3
                  text-center
                  font-semibold
                  bg-amber-50
                  dark:bg-amber-950/40
                "
              >
                {fila.thp}
              </td>

              <td className="px-3 py-2 text-center">
                <input
                  type="number"
                  value={filas[i]?.valor1 || ""}
                  onChange={(e) =>
                    actualizar(i, "valor1", e.target.value)
                  }
                  onPaste={pegarDatos}
                  className="
                    w-14
                    rounded-md
                    border
                    border-slate-300
                    dark:border-slate-600
                    text-center
                    py-1
                    bg-white
                    dark:bg-slate-800
                  "
                />
              </td>

              <td
                className="
                  px-6 py-3
                  text-center
                  font-semibold
                  bg-emerald-50
                  dark:bg-emerald-950/40
                "
              >
                {fila.thnp}
              </td>

              <td className="px-3 py-2 text-center">
                <input
                  type="number"
                  value={filas[i]?.valor2 || ""}
                  onChange={(e) =>
                    actualizar(i, "valor2", e.target.value)
                  }
                  onPaste={pegarDatos}
                  className="
                    w-14
                    rounded-md
                    border
                    border-slate-300
                    dark:border-slate-600
                    text-center
                    py-1
                    bg-white
                    dark:bg-slate-800
                  "
                />
              </td>
            </tr>
          ))}

          <tr className="font-bold text-lg">
            <td className="bg-amber-200 dark:bg-amber-800 py-3 text-center">
              {totalTHP}
            </td>

            <td className="bg-slate-100 dark:bg-slate-800 text-center">
              {totalValor1}
            </td>

            <td className="bg-emerald-200 dark:bg-emerald-800 py-3 text-center">
              {totalTHNP}
            </td>

            <td className="bg-slate-100 dark:bg-slate-800 text-center">
              {totalValor2}
            </td>
          </tr>

          <tr>
            <td
              colSpan={4}
              className="
                bg-slate-50
                dark:bg-slate-800
                p-4
                text-center
              "
            >
              <button
                onClick={limpiarDatos}
                className="
                  px-5
                  py-2
                  rounded-lg
                  bg-red-500
                  text-white
                  hover:bg-red-600
                  transition
                "
              >
                Limpiar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);



}