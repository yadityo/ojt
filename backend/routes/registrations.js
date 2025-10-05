import express from "express";
import db from "../config/database.js";
import {
  generateRegistrationCode,
  generateInvoiceNumber,
} from "../config/database.js";

const router = express.Router();

// Helper function untuk generate registration code
// const generateRegistrationCode = async (programId) => {
//   try {
//     const [program] = await db
//       .promise()
//       .query("SELECT name FROM programs WHERE id = ?", [programId]);

//     const programCode = program[0]?.name.substring(0, 3).toUpperCase() || "REG";
//     const timestamp = Date.now().toString().slice(-6);
//     const random = Math.random().toString(36).substring(2, 5).toUpperCase();

//     return `${programCode}-${timestamp}-${random}`;
//   } catch (error) {
//     console.error("Error generating registration code:", error);
//     // Fallback code
//     return `REG-${Date.now().toString().slice(-6)}`;
//   }
// };

// Get all registrations with filtering and search
router.get("/", async (req, res) => {
  try {
    const {
      program,
      status,
      payment_status,
      selection_status,
      placement_status,
      search,
    } = req.query;

    let query = `
      SELECT 
        r.*,
        u.full_name,
        u.email,
        u.phone,
        u.address,
        p.name as program_name,
        p.cost as program_cost,
        p.duration as program_duration,
        ss.status as selection_status,
        ss.test_score,
        ss.interview_score,
        ss.final_score,
        ss.notes as selection_notes,
        ps.status as placement_status,
        ps.company_name,
        ps.position,
        ps.department,
        ps.placement_date,
        py.status as payment_status,
        py.amount,
        py.amount_paid,
        py.invoice_number,
        py.receipt_number,
        py.due_date,
        py.payment_date
      FROM registrations r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN programs p ON r.program_id = p.id
      LEFT JOIN selection_status ss ON r.id = ss.registration_id
      LEFT JOIN placement_status ps ON r.id = ps.registration_id
      LEFT JOIN payments py ON r.id = py.registration_id
      WHERE 1=1
    `;
    const params = [];

    // Filter by program
    if (program && program !== "all") {
      query += " AND p.id = ?";
      params.push(program);
    }

    // Filter by registration status
    if (status && status !== "all") {
      query += " AND r.status = ?";
      params.push(status);
    }

    // Filter by payment status
    if (payment_status && payment_status !== "all") {
      query += " AND py.status = ?";
      params.push(payment_status);
    }

    // Filter by selection status
    if (selection_status && selection_status !== "all") {
      query += " AND ss.status = ?";
      params.push(selection_status);
    }

    // Filter by placement status
    if (placement_status && placement_status !== "all") {
      query += " AND ps.status = ?";
      params.push(placement_status);
    }

    // Search by name, email, or registration code
    if (search) {
      query +=
        " AND (u.full_name LIKE ? OR u.email LIKE ? OR r.registration_code LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += " ORDER BY r.registration_date DESC";

    const [registrations] = await db.promise().query(query, params);

    res.json({
      success: true,
      data: registrations,
    });
  } catch (error) {
    console.error("Error fetching registrations:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Update registration status
router.put("/:id/status", async (req, res) => {
  try {
    const { status, notes } = req.body;

    await db
      .promise()
      .query(
        "UPDATE registrations SET status = ?, selection_notes = ? WHERE id = ?",
        [status, notes, req.params.id]
      );

    res.json({
      success: true,
      message: "Registration status updated successfully",
    });
  } catch (error) {
    console.error("Error updating registration status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Update selection status
router.put("/:id/selection", async (req, res) => {
  try {
    const { status, test_score, interview_score, final_score, notes } =
      req.body;

    await db.promise().query(
      `UPDATE selection_status 
       SET status = ?, test_score = ?, interview_score = ?, final_score = ?, notes = ?, evaluated_at = NOW() 
       WHERE registration_id = ?`,
      [status, test_score, interview_score, final_score, notes, req.params.id]
    );

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

// Update placement status
router.put("/:id/placement", async (req, res) => {
  try {
    const {
      status,
      company_name,
      position,
      department,
      placement_date,
      notes,
    } = req.body;

    await db.promise().query(
      `UPDATE placement_status 
       SET status = ?, company_name = ?, position = ?, department = ?, placement_date = ?, notes = ? 
       WHERE registration_id = ?`,
      [
        status,
        company_name,
        position,
        department,
        placement_date,
        notes,
        req.params.id,
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

// Update payment status
router.put("/:id/payment", async (req, res) => {
  try {
    const { status, amount_paid, payment_date, receipt_number, notes } =
      req.body;

    await db.promise().query(
      `UPDATE payments 
       SET status = ?, amount_paid = ?, payment_date = ?, receipt_number = ?, notes = ? 
       WHERE registration_id = ?`,
      [status, amount_paid, payment_date, receipt_number, notes, req.params.id]
    );

    res.json({
      success: true,
      message: "Payment status updated successfully",
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get registration statistics for admin dashboard
router.get("/statistics/summary", async (req, res) => {
  try {
    const [stats] = await db.promise().query(`
      SELECT 
        COUNT(*) as total_registrations,
        SUM(CASE WHEN r.status = 'accepted' THEN 1 ELSE 0 END) as accepted_registrations,
        SUM(CASE WHEN r.status = 'pending' THEN 1 ELSE 0 END) as pending_registrations,
        SUM(CASE WHEN py.status = 'pending' THEN 1 ELSE 0 END) as pending_payments,
        SUM(CASE WHEN ss.status = 'menunggu' THEN 1 ELSE 0 END) as pending_selections,
        SUM(CASE WHEN ps.status = 'proses' THEN 1 ELSE 0 END) as pending_placements
      FROM registrations r
      LEFT JOIN selection_status ss ON r.id = ss.registration_id
      LEFT JOIN placement_status ps ON r.id = ps.registration_id
      LEFT JOIN payments py ON r.id = py.registration_id
    `);

    // Get recent 5 registrations
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

    res.json({
      success: true,
      data: {
        statistics: stats[0],
        recentRegistrations,
      },
    });
  } catch (error) {
    console.error("Error fetching registration statistics:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const { program_id, application_letter, placement_preference } = req.body;
    const user_id = req.body.user_id || req.user?.userId;

    console.log("Registration request:", {
      user_id,
      program_id,
      application_letter: application_letter?.substring(0, 50) + "...",
      placement_preference,
    });

    // Validasi input
    if (!program_id || !application_letter) {
      return res.status(400).json({
        success: false,
        message: "Program ID dan surat lamaran wajib diisi",
      });
    }

    if (!user_id) {
      return res.status(401).json({
        success: false,
        message: "User tidak terautentikasi",
      });
    }

    // Check if user exists
    const [users] = await db
      .promise()
      .query("SELECT id FROM users WHERE id = ?", [user_id]);

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    // Check if program exists
    const [programs] = await db
      .promise()
      .query(
        "SELECT id, name, capacity, current_participants FROM programs WHERE id = ? AND status = 'active'",
        [program_id]
      );

    if (programs.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Program tidak ditemukan atau tidak aktif",
      });
    }

    const program = programs[0];

    // Check capacity
    if (program.current_participants >= program.capacity) {
      return res.status(400).json({
        success: false,
        message: "Kuota program sudah penuh",
      });
    }

    // Check if user already registered for this program
    const [existingRegistrations] = await db
      .promise()
      .query(
        "SELECT id FROM registrations WHERE user_id = ? AND program_id = ?",
        [user_id, program_id]
      );

    if (existingRegistrations.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Anda sudah terdaftar di program ini",
      });
    }

    // Generate registration code
    const registrationCode = await generateRegistrationCode(program_id);

    console.log("Generated registration code:", registrationCode);

    // Insert registration
    const [result] = await db.promise().query(
      `INSERT INTO registrations 
         (user_id, program_id, registration_code, application_letter, placement_preference, status) 
         VALUES (?, ?, ?, ?, ?, 'pending')`,
      [
        user_id,
        program_id,
        registrationCode,
        application_letter,
        placement_preference,
      ]
    );

    const registrationId = result.insertId;

    const invoiceNumber = await generateInvoiceNumber();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // Jatuh tempo 7 hari dari sekarang

    await db.promise().query(
      `INSERT INTO payments 
       (registration_id, invoice_number, amount, due_date, status) 
       VALUES (?, ?, ?, ?, 'pending')`,
      [registrationId, invoiceNumber, program.cost, dueDate]
    );

    // Create initial selection status
    await db
      .promise()
      .query(
        "INSERT INTO selection_status (registration_id, status) VALUES (?, 'menunggu')",
        [registrationId]
      );

    // Create initial placement status
    await db
      .promise()
      .query(
        "INSERT INTO placement_status (registration_id, status) VALUES (?, 'proses')",
        [registrationId]
      );

    // Update program participant count
    await db
      .promise()
      .query(
        "UPDATE programs SET current_participants = current_participants + 1 WHERE id = ?",
        [program_id]
      );

    console.log("Registration created successfully:", registrationId);

    console.log("✅ Registration and payment created:", {
      registrationId,
      invoiceNumber,
      amount: program.cost,
    });

    res.status(201).json({
      success: true,
      message: "Pendaftaran berhasil",
      data: {
        registration_id: registrationId,
        registration_code: registrationCode,
        invoice_number: invoiceNumber, // Kirim invoice number ke frontend
        amount: program.cost,
      },
    });
  } catch (error) {
    console.error("Error creating registration:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error: " + error.message,
    });
  }
});

export default router;
