const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Asegurar que la carpeta exista
const uploadDir = path.join(__dirname, "..", "..", "uploads", "casos");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Nombre único: timestamp + nombre original (evita colisiones)
    const timestamp = Date.now();
    const nombreLimpio = file.originalname
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");
    cb(null, `${timestamp}_${nombreLimpio}`);
  },
});

// Filtro de tipos permitidos (PDF, Word, Excel)
const fileFilter = (req, file, cb) => {
  const permitidos = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];
  if (permitidos.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Formato no permitido. Solo PDF, Word o Excel."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB máximo
});

module.exports = upload;