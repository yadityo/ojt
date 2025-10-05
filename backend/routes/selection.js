import express from "express";
import db from "../config/database.js";

const router = express.Router();

// Get all selection data with filters
router.get("/", async (req, res) => {
  try {
    const { program, status, search } = req.query;

    let query = `
      SELECT 
        ss.*,
        r.registration_code,
        r.status as registration_status,
        r.application_letter,
        u.full_name,
        u.email,
        u.phone,
        p.name as program_name,
        evaluator.full_name as evaluated_by_name
      FROM selection_status ss
      LEFT JOIN registrations r ON ss.registration_id = r.id
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN programs p ON r.program_id = p.id
      LEFT JOIN users evaluator ON ss.evaluated_by = evaluator.id
      WHERE 1=1
    `;
    const params = [];

    if (program && program !== "all") {
      query += " AND p.id = ?";
      params.push(program);
    }

    if (status && status !== "all") {
      query += " AND ss.status = ?";
      params.push(status);
    }

    if (search) {
      query +=
        " AND (u.full_name LIKE ? OR u.email LIKE ? OR r.registration_code LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += " ORDER BY ss.created_at DESC";

    const [selections] = await db.promise().query(query, params);

    res.json({
      success: true,
      data: selections,
    });
  } catch (error) {
    console.error("Error fetching selection data:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Update selection status and scores
router.put("/:registrationId", async (req, res) => {
  try {
    const {
      status,
      test_score,
      interview_score,
      final_score,
      notes,
      evaluated_by,
    } = req.body;

    // Check if selection record exists
    const [existing] = await db
      .promise()
      .query("SELECT * FROM selection_status WHERE registration_id = ?", [
        req.params.registrationId,
      ]);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Selection record not found",
      });
    }

    // Calculate final score if not provided
    let calculatedFinalScore = final_score;
    if (!final_score && test_score && interview_score) {
      calculatedFinalScore =
        (parseFloat(test_score) + parseFloat(interview_score)) / 2;
    }

    await db.promise().query(
      `UPDATE selection_status 
       SET status = ?, test_score = ?, interview_score = ?, final_score = ?, notes = ?, 
           evaluated_by = ?, evaluated_at = NOW() 
       WHERE registration_id = ?`,
      [
        status,
        test_score,
        interview_score,
        calculatedFinalScore,
        notes,
        evaluated_by,
        req.params.registrationId,
      ]
    );

    // Update registration status based on selection result
    let registrationStatus = "under_review";
    if (status === "lolos") {
      registrationStatus = "accepted";
    } else if (status === "tidak_lolos") {
      registrationStatus = "rejected";
    }

    await db
      .promise()
      .query("UPDATE registrations SET status = ? WHERE id = ?", [
        registrationStatus,
        req.params.registrationId,
      ]);

    res.json({
      success: true,
      message: "Selection status updated successfully",
    });
  } catch (error) {
    console.error("Error updating selection status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get selection statistics
router.get("/statistics", async (req, res) => {
  try {
    const [stats] = await db.promise().query(`
      SELECT 
        COUNT(*) as total_candidates,
        SUM(CASE WHEN status = 'menunggu' THEN 1 ELSE 0 END) as pending_selection,
        SUM(CASE WHEN status = 'lolos_tahap_1' THEN 1 ELSE 0 END) as passed_stage_1,
        SUM(CASE WHEN status = 'lolos_tahap_2' THEN 1 ELSE 0 END) as passed_stage_2,
        SUM(CASE WHEN status = 'lolos' THEN 1 ELSE 0 END) as passed_final,
        SUM(CASE WHEN status = 'tidak_lolos' THEN 1 ELSE 0 END) as failed,
        AVG(test_score) as avg_test_score,
        AVG(interview_score) as avg_interview_score
      FROM selection_status
    `);

    // Get recent evaluations
    const [recentEvaluations] = await db.promise().query(`
      SELECT 
        ss.*,
        u.full_name,
        p.name as program_name
      FROM selection_status ss
      LEFT JOIN registrations r ON ss.registration_id = r.id
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN programs p ON r.program_id = p.id
      WHERE ss.evaluated_at IS NOT NULL
      ORDER BY ss.evaluated_at DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        statistics: stats[0],
        recentEvaluations,
      },
    });
  } catch (error) {
    console.error("Error fetching selection statistics:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Bulk update selection status
router.post("/bulk-update", async (req, res) => {
  try {
    const { registration_ids, status, notes, evaluated_by } = req.body;

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
        `UPDATE selection_status 
         SET status = ?, notes = ?, evaluated_by = ?, evaluated_at = NOW() 
         WHERE registration_id = ?`,
        [status, notes, evaluated_by, registrationId]
      );

      // Update registration status
      let registrationStatus = "under_review";
      if (status === "lolos") {
        registrationStatus = "accepted";
      } else if (status === "tidak_lolos") {
        registrationStatus = "rejected";
      }

      await db
        .promise()
        .query("UPDATE registrations SET status = ? WHERE id = ?", [
          registrationStatus,
          registrationId,
        ]);
    }

    res.json({
      success: true,
      message: `Selection status updated for ${registration_ids.length} candidates`,
    });
  } catch (error) {
    console.error("Error in bulk selection update:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
