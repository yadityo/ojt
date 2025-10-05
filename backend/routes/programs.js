import express from "express";
import db from "../config/database.js";

const router = express.Router();

// Get all programs
router.get("/", async (req, res) => {
  try {
    console.log("📡 Fetching programs from database...");

    const [programs] = await db.promise().query(`
      SELECT p.*, pc.name as category_name 
      FROM programs p 
      LEFT JOIN program_categories pc ON p.category_id = pc.id 
      WHERE p.status = 'active'
      ORDER BY p.created_at DESC
    `);

    console.log(`✅ Found ${programs.length} programs`);

    res.json({
      success: true,
      data: programs,
    });
  } catch (error) {
    console.error("❌ Error fetching programs:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error: " + error.message,
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Get program by ID with detailed information
router.get("/:id", async (req, res) => {
  try {
    const programId = req.params.id;
    console.log(`📡 Fetching program details for ID: ${programId}`);

    const [programs] = await db.promise().query(
      `
      SELECT p.*, pc.name as category_name 
      FROM programs p 
      LEFT JOIN program_categories pc ON p.category_id = pc.id 
      WHERE p.id = ?
    `,
      [programId]
    );

    if (programs.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    const program = programs[0];

    // Get program content
    const [content] = await db.promise().query(
      `SELECT section_name, content_type, content, file_path, display_order 
       FROM program_content 
       WHERE program_id = ? AND is_active = TRUE 
       ORDER BY display_order`,
      [programId]
    );

    // Get related programs in the same category
    const [relatedPrograms] = await db.promise().query(
      `
      SELECT id, name, description, cost, duration 
      FROM programs 
      WHERE category_id = ? AND id != ? AND status = 'active' 
      LIMIT 3
    `,
      [program.category_id, programId]
    );

    res.json({
      success: true,
      data: {
        ...program,
        content,
        relatedPrograms,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching program:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error: " + error.message,
    });
  }
});

// Update program (admin only) - will be used later
router.put("/:id", async (req, res) => {
  try {
    const { name, description, schedule, cost, contact_info, status } =
      req.body;

    await db.promise().query(
      `UPDATE programs 
       SET name = ?, description = ?, schedule = ?, cost = ?, contact_info = ?, status = ?
       WHERE id = ?`,
      [name, description, schedule, cost, contact_info, status, req.params.id]
    );

    res.json({
      success: true,
      message: "Program updated successfully",
    });
  } catch (error) {
    console.error("Error updating program:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
