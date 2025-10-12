import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Pastikan directory uploads exists
const ensureUploadsDir = (subdir = "") => {
  const uploadsDir = path.join(__dirname, "../uploads");
  const targetDir = subdir ? path.join(uploadsDir, subdir) : uploadsDir;

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
};

// Configure multer for photo uploads
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadsDir("photos");
    cb(null, path.join(__dirname, "../uploads/photos"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "photo-" + uniqueSuffix + ext);
  },
});

// Configure multer for document uploads
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadsDir("documents");
    cb(null, path.join(__dirname, "../uploads/documents"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const docType = req.body.type || "document";
    cb(null, `${docType}-${uniqueSuffix}${ext}`);
  },
});

const uploadPhoto = multer({
  storage: photoStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Hanya file gambar yang diizinkan untuk foto!"), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

const uploadDocument = multer({
  storage: documentStorage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/pdf",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Hanya file JPG, PNG, atau PDF yang diizinkan!"), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Upload photo
router.post("/photo", uploadPhoto.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Tidak ada file foto yang diupload",
      });
    }

    // Path relatif untuk disimpan di database
    const filePath = `/uploads/photos/${req.file.filename}`;

    res.json({
      success: true,
      message: "Foto berhasil diupload",
      data: {
        file_path: filePath,
        file_name: req.file.filename,
        original_name: req.file.originalname,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
      },
    });
  } catch (error) {
    console.error("Error uploading photo:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Gagal mengupload foto",
    });
  }
});

// Upload document
router.post("/document", uploadDocument.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Tidak ada file yang diupload",
      });
    }

    const docType = req.body.type || "document";
    const filePath = `/uploads/documents/${req.file.filename}`;

    res.json({
      success: true,
      message: "Dokumen berhasil diupload",
      data: {
        file_path: filePath,
        file_name: req.file.filename,
        original_name: req.file.originalname,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
        document_type: docType,
      },
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Gagal mengupload dokumen",
    });
  }
});

export default router;
