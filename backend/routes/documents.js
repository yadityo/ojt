import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import db from "../config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/photos");
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "photo-" + uniqueSuffix + ext);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Hanya file gambar yang diizinkan!"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Upload photo endpoint
router.post("/upload-photo", upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Tidak ada file yang diupload",
      });
    }

    const filePath = `uploads/photos/${req.file.filename}`;

    res.json({
      success: true,
      data: {
        file_path: filePath,
        file_name: req.file.filename,
        original_name: req.file.originalname,
        file_size: req.file.size,
      },
    });
  } catch (error) {
    console.error("Error uploading photo:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengupload foto",
    });
  }
});

export default router;
