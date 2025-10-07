import express from "express";
import axios from "axios";

const router = express.Router();

// Proxy untuk mendapatkan provinsi
router.get("/provinces", async (req, res) => {
  try {
    const response = await axios.get("https://wilayah.id/api/provinces.json");
    res.json({
      success: true,
      data: response.data.data,
    });
  } catch (error) {
    console.error("Error fetching provinces:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data provinsi",
    });
  }
});

// Proxy untuk mendapatkan kabupaten/kota
router.get("/regencies/:provinceCode", async (req, res) => {
  try {
    const { provinceCode } = req.params;
    const response = await axios.get(
      `https://wilayah.id/api/regencies/${provinceCode}.json`
    );
    res.json({
      success: true,
      data: response.data.data,
    });
  } catch (error) {
    console.error("Error fetching regencies:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data kabupaten/kota",
    });
  }
});

// Proxy untuk mendapatkan kecamatan (opsional, untuk future use)
router.get("/districts/:regencyCode", async (req, res) => {
  try {
    const { regencyCode } = req.params;
    const response = await axios.get(
      `https://wilayah.id/api/districts/${regencyCode}.json`
    );
    res.json({
      success: true,
      data: response.data.data,
    });
  } catch (error) {
    console.error("Error fetching districts:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data kecamatan",
    });
  }
});

export default router;
