import express from "express";
import db from "../config/database.js";

const router = express.Router();

// Admin dashboard statistics
router.get("/dashboard", async (req, res) => {
  try {
    // Get total statistics
    const [stats] = await db.promise().query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE user_type = 'participant') as total_participants,
        (SELECT COUNT(*) FROM registrations) as total_registrations,
        (SELECT COUNT(*) FROM programs) as total_programs,
        (SELECT SUM(amount_paid) FROM payments WHERE status = 'paid') as total_revenue
    `);

    // Get recent registrations
    const [recentRegistrations] = await db.promise().query(`
      SELECT 
        r.*,
        u.full_name,
        u.email,
        p.name as program_name
      FROM registrations r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN programs p ON r.program_id = p.id
      ORDER BY r.registration_date DESC
      LIMIT 5
    `);

    // Get payment status counts
    const [paymentStats] = await db.promise().query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM payments 
      GROUP BY status
    `);

    res.json({
      success: true,
      data: {
        statistics: stats[0],
        recentRegistrations,
        paymentStats,
      },
    });
  } catch (error) {
    console.error("Error fetching admin dashboard:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
