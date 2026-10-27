const path = require("path");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const XLSX = require("xlsx");
const { db } = require("../config/database");

const uploadDir = path.join(__dirname, "..", "..", "uploads", "casos");

// ── POST: subir archivo ──────────────────────────────────
const subirArchivo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ mensaje: "No se envió ningún archivo" });
    }
    res.status(201).json({
      mensaje: "Archivo subido correctamente",
      nombre: req.file.filename,
      nombreOriginal: req.file.originalname,
      tamano: req.file.size,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al subir archivo" });
  }
};

// ── GET: descargar archivo por nombre ────────────────────
const descargarArchivo = async (req, res) => {
  try {
    const { nombre } = req.params;
    const rutaArchivo = path.join(uploadDir, nombre);

    if (!fs.existsSync(rutaArchivo)) {
      return res.status(404).json({ mensaje: "Archivo no encontrado" });
    }
    res.download(rutaArchivo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al descargar archivo" });
  }
};

// ── GET: listar archivos disponibles ─────────────────────
const listarArchivos = async (req, res) => {
  try {
    if (!fs.existsSync(uploadDir)) {
      return res.json([]);
    }
    const archivos = fs.readdirSync(uploadDir).map((nombre) => {
      const stats = fs.statSync(path.join(uploadDir, nombre));
      return {
        nombre,
        tamano: stats.size,
        fechaSubida: stats.mtime,
      };
    });
    res.json(archivos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al listar archivos" });
  }
};

// ── PUT: reemplazar archivo de un caso específico ────────
const modificarArchivoCaso = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ mensaje: "No se envió ningún archivo" });
    }

    const caso = await db.caso.findOne({ where: { idcaso: id } });
    if (!caso) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ mensaje: "Caso no encontrado" });
    }

    // Borrar archivo anterior si existía
    if (caso.archivo) {
      const rutaAnterior = path.join(uploadDir, caso.archivo);
      if (fs.existsSync(rutaAnterior)) {
        fs.unlinkSync(rutaAnterior);
      }
    }

    await db.caso.update(
      { archivo: req.file.filename },
      { where: { idcaso: id } }
    );

    res.json({
      mensaje: "Archivo del caso actualizado",
      idcaso: id,
      archivo: req.file.filename,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al modificar archivo del caso" });
  }
};

// ── LEER contenido del archivo (SOLO LECTURA, para la IA) ─
const leerContenidoArchivo = async (nombreArchivo) => {
  const rutaArchivo = path.join(uploadDir, nombreArchivo);

  if (!fs.existsSync(rutaArchivo)) {
    return { error: "Archivo no encontrado en el servidor." };
  }

  const ext = path.extname(nombreArchivo).toLowerCase();

  try {
    // PDF
    if (ext === ".pdf") {
      const buffer = fs.readFileSync(rutaArchivo);
      const data = await pdfParse(buffer);
      return { contenido: data.text.trim(), tipo: "pdf" };
    }

    // Word (.docx)
    if (ext === ".docx") {
      const result = await mammoth.extractRawText({ path: rutaArchivo });
      return { contenido: result.value.trim(), tipo: "word" };
    }

    // Word antiguo (.doc) → no soportado
    if (ext === ".doc") {
      return { error: "Formato .doc no soportado para lectura. Convierta el archivo a .docx." };
    }

    // Excel (.xls / .xlsx)
    if (ext === ".xls" || ext === ".xlsx") {
      const workbook = XLSX.readFile(rutaArchivo);
      let contenido = "";
      workbook.SheetNames.forEach((nombreHoja) => {
        const hoja = workbook.Sheets[nombreHoja];
        const csv = XLSX.utils.sheet_to_csv(hoja);
        contenido += `\n--- Hoja: ${nombreHoja} ---\n${csv}`;
      });
      return { contenido: contenido.trim(), tipo: "excel" };
    }

    return { error: `Formato no soportado: ${ext}` };
  } catch (error) {
    console.error("Error leyendo archivo:", error);
    return { error: "No se pudo leer el contenido del archivo." };
  }
};

// ── Función usada por la IA (chatCaso) ────────────────────
const leerArchivoDeCasoIA = async (idcaso) => {
  const caso = await db.caso.findOne({ where: { idcaso } });
  if (!caso) return { error: "Caso no encontrado." };
  if (!caso.archivo) return { error: "Este caso no tiene archivo adjunto." };
  return await leerContenidoArchivo(caso.archivo);
};

module.exports = {
  subirArchivo,
  descargarArchivo,
  listarArchivos,
  modificarArchivoCaso,
  leerArchivoDeCasoIA,   // 👈 la usa el chatCaso
};