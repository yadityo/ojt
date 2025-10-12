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

    try {
      if (
        program.curriculum_json &&
        typeof program.curriculum_json === "string"
      ) {
        program.curriculum_json = JSON.parse(program.curriculum_json);
      }
      if (
        program.facilities_json &&
        typeof program.facilities_json === "string"
      ) {
        program.facilities_json = JSON.parse(program.facilities_json);
      }
      if (program.timeline_json && typeof program.timeline_json === "string") {
        program.timeline_json = JSON.parse(program.timeline_json);
      }
      if (
        program.fee_details_json &&
        typeof program.fee_details_json === "string"
      ) {
        program.fee_details_json = JSON.parse(program.fee_details_json);
      }
      if (
        program.requirements_list &&
        typeof program.requirements_list === "string"
      ) {
        program.requirements_list = JSON.parse(program.requirements_list);
      }
    } catch (parseError) {
      console.warn("⚠️ Error parsing JSON fields:", parseError);
      // Tetap lanjutkan meski ada error parsing
    }

    // Get related programs in the same category
    const [relatedPrograms] = await db.promise().query(
      `
      SELECT id, name, description, duration, training_cost, departure_cost, installment_plan
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

// Update program (admin only)
router.put("/:id", async (req, res) => {
  try {
    const {
      name,
      description,
      schedule,
      duration,
      capacity,
      contact_info,
      status,
      training_cost,
      departure_cost,
      installment_plan,
      location,
      bridge_fund,
      curriculum_json,
      facilities_json,
      timeline_json,
      fee_details_json,
      requirements_list,
    } = req.body;

    await db.promise().query(
      `UPDATE programs 
       SET name = ?, description = ?, schedule = ?, duration = ?, capacity = ?, 
           contact_info = ?, status = ?, training_cost = ?, departure_cost = ?,
           installment_plan = ?, location = ?, bridge_fund = ?, curriculum_json = ?, facilities_json = ?,
           timeline_json = ?, fee_details_json = ?, requirements_list = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name,
        description,
        schedule,
        duration,
        capacity,
        contact_info,
        status,
        training_cost,
        departure_cost,
        installment_plan,
        location,
        bridge_fund,
        curriculum_json ? JSON.stringify(curriculum_json) : null,
        facilities_json ? JSON.stringify(facilities_json) : null,
        timeline_json ? JSON.stringify(timeline_json) : null,
        fee_details_json ? JSON.stringify(fee_details_json) : null,
        requirements_list ? JSON.stringify(requirements_list) : null,
        req.params.id,
      ]
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

// POST /api/programs - Create new program
router.post("/", async (req, res) => {
  try {
    const {
      category_id,
      name,
      description,
      requirements,
      schedule,
      duration,
      capacity,
      contact_info,
      status,
      location,
      training_cost,
      departure_cost,
      installment_plan,
      bridge_fund,
      curriculum_json,
      facilities_json,
      timeline_json,
      fee_details_json,
      requirements_list,
    } = req.body;

    const [result] = await db.promise().query(
      `INSERT INTO programs 
       (category_id, name, description, requirements, schedule, duration, capacity, 
        contact_info, status, location, training_cost, departure_cost, installment_plan, 
        bridge_fund, curriculum_json, facilities_json, timeline_json, fee_details_json, requirements_list) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        category_id,
        name,
        description,
        requirements,
        schedule,
        duration,
        capacity,
        contact_info,
        status,
        location,
        training_cost,
        departure_cost,
        installment_plan,
        bridge_fund,
        curriculum_json,
        facilities_json,
        timeline_json,
        fee_details_json,
        requirements_list,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Program created successfully",
      data: {
        id: result.insertId,
      },
    });
  } catch (error) {
    console.error("Error creating program:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// DELETE /api/programs/:id - Delete program
router.delete("/:id", async (req, res) => {
  try {
    const programId = req.params.id;

    // Check if program exists
    const [programs] = await db
      .promise()
      .query("SELECT id FROM programs WHERE id = ?", [programId]);

    if (programs.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    // Delete program
    await db.promise().query("DELETE FROM programs WHERE id = ?", [programId]);

    res.json({
      success: true,
      message: "Program deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting program:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
