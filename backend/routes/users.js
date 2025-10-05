import express from "express";
import db from "../config/database.js";

const router = express.Router();

// Get user profile
router.get("/profile", async (req, res) => {
  try {
    // This would typically get user ID from auth middleware
    // For now, return placeholder
    res.json({
      success: true,
      data: {
        message: "User profile endpoint",
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
