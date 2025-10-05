import express from "express";
import db from "../config/database.js";

const router = express.Router();

// Get all placement data with filters
router.get("/", async (req, res) => {
  try {
    const { program, status, search } = req.query;

    let query = `
      SELECT 
        ps.*,
        r.registration_code,
        r.status as registration_status,
        u.full_name,
        u.email,
        u.phone,
        p.name as program_name,
        ss.status as selection_status,
        ss.final_score
      FROM placement_status ps
      LEFT JOIN registrations r ON ps.registration_id = r.id
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN programs p ON r.program_id = p.id
      LEFT JOIN selection_status ss ON r.id = ss.registration_id
      WHERE 1=1
    `;
    const params = [];

    if (program && program !== "all") {
      query += " AND p.id = ?";
      params.push(program);
    }

    if (status && status !== "all") {
      query += " AND ps.status = ?";
      params.push(status);
    }

    if (search) {
      query +=
        " AND (u.full_name LIKE ? OR u.email LIKE ? OR r.registration_code LIKE ? OR ps.company_name LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += " ORDER BY ps.created_at DESC";

    const [placements] = await db.promise().query(query, params);

    res.json({
      success: true,
      data: placements,
    });
  } catch (error) {
    console.error("Error fetching placement data:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Update placement status
router.put("/:registrationId", async (req, res) => {
  try {
    const {
      status,
      company_name,
      position,
      department,
      placement_date,
      supervisor_name,
      supervisor_contact,
      notes,
    } = req.body;

    // Check if placement record exists
    const [existing] = await db
      .promise()
      .query("SELECT * FROM placement_status WHERE registration_id = ?", [
        req.params.registrationId,
      ]);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Placement record not found",
      });
    }

    await db.promise().query(
      `UPDATE placement_status 
       SET status = ?, company_name = ?, position = ?, department = ?, placement_date = ?,
           supervisor_name = ?, supervisor_contact = ?, notes = ? 
       WHERE registration_id = ?`,
      [
        status,
        company_name,
        position,
        department,
        placement_date,
        supervisor_name,
        supervisor_contact,
        notes,
        req.params.registrationId,
      ]
    );

    res.json({
      success: true,
      message: "Placement status updated successfully",
    });
  } catch (error) {
    console.error("Error updating placement status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get placement statistics
router.get("/statistics", async (req, res) => {
  try {
    const [stats] = await db.promise().query(`
      SELECT 
        COUNT(*) as total_placements,
        SUM(CASE WHEN status = 'proses' THEN 1 ELSE 0 END) as in_process,
        SUM(CASE WHEN status = 'lolos' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN status = 'ditempatkan' THEN 1 ELSE 0 END) as placed,
        SUM(CASE WHEN status = 'gagal' THEN 1 ELSE 0 END) as failed,
        COUNT(DISTINCT company_name) as total_companies
      FROM placement_status
      WHERE company_name IS NOT NULL AND company_name != ''
    `);

    // Get recent placements
    const [recentPlacements] = await db.promise().query(`
      SELECT 
        ps.*,
        u.full_name,
        p.name as program_name
      FROM placement_status ps
      LEFT JOIN registrations r ON ps.registration_id = r.id
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN programs p ON r.program_id = p.id
      WHERE ps.status = 'ditempatkan'
      ORDER BY ps.placement_date DESC
      LIMIT 5
    `);

    // Get company statistics
    const [companyStats] = await db.promise().query(`
      SELECT 
        company_name,
        COUNT(*) as total_placements
      FROM placement_status 
      WHERE company_name IS NOT NULL AND company_name != ''
      GROUP BY company_name
      ORDER BY total_placements DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        statistics: stats[0],
        recentPlacements,
        companyStats,
      },
    });
  } catch (error) {
    console.error("Error fetching placement statistics:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Bulk update placement status
router.post("/bulk-update", async (req, res) => {
  try {
    const {
      registration_ids,
      status,
      company_name,
      position,
      department,
      notes,
    } = req.body;

    if (
      !registration_ids ||
      !Array.isArray(registration_ids) ||
      registration_ids.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "No registration IDs provided",
      });
    }

    for (const registrationId of registration_ids) {
      await db.promise().query(
        `UPDATE placement_status 
         SET status = ?, company_name = ?, position = ?, department = ?, notes = ? 
         WHERE registration_id = ?`,
        [status, company_name, position, department, notes, registrationId]
      );
    }

    res.json({
      success: true,
      message: `Placement status updated for ${registration_ids.length} candidates`,
    });
  } catch (error) {
    console.error("Error in bulk placement update:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
