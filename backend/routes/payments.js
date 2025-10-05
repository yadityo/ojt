import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import db, { generateReceiptNumber } from "../config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads/payments"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "payment-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// Get all payments with filters for admin
router.get("/", async (req, res) => {
  try {
    const { status, program, search, start_date, end_date } = req.query;

    let query = `
      SELECT 
        py.*,
        r.registration_code,
        r.id as registration_id,
        u.full_name,
        u.email,
        u.phone,
        p.name as program_name,
        p.cost as program_cost
      FROM payments py
      LEFT JOIN registrations r ON py.registration_id = r.id
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN programs p ON r.program_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== "all") {
      query += " AND py.status = ?";
      params.push(status);
    }

    if (program && program !== "all") {
      query += " AND p.id = ?";
      params.push(program);
    }

    if (search) {
      query +=
        " AND (u.full_name LIKE ? OR u.email LIKE ? OR py.invoice_number LIKE ? OR r.registration_code LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (start_date) {
      query += " AND DATE(py.created_at) >= ?";
      params.push(start_date);
    }

    if (end_date) {
      query += " AND DATE(py.created_at) <= ?";
      params.push(end_date);
    }

    query += " ORDER BY py.created_at DESC";

    const [payments] = await db.promise().query(query, params);

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get payment statistics for admin dashboard
router.get("/statistics", async (req, res) => {
  try {
    const [stats] = await db.promise().query(`
      SELECT 
        COUNT(*) as total_payments,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_paid ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending_payments,
        COALESCE(SUM(CASE WHEN status = 'down_payment' THEN 1 ELSE 0 END), 0) as dp_payments,
        COALESCE(SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END), 0) as overdue_payments
      FROM payments
    `);

    // Get recent payments
    const [recentPayments] = await db.promise().query(`
      SELECT 
        py.*,
        u.full_name,
        p.name as program_name
      FROM payments py
      LEFT JOIN registrations r ON py.registration_id = r.id
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN programs p ON r.program_id = p.id
      ORDER BY py.created_at DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        statistics: stats[0],
        recentPayments,
      },
    });
  } catch (error) {
    console.error("Error fetching payment statistics:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get user payments
router.get("/user/:userId", async (req, res) => {
  try {
    const [payments] = await db.promise().query(
      `
      SELECT 
        py.*,
        r.registration_code,
        p.name as program_name,
        p.cost as program_cost
      FROM payments py
      LEFT JOIN registrations r ON py.registration_id = r.id
      LEFT JOIN programs p ON r.program_id = p.id
      WHERE r.user_id = ?
      ORDER BY py.created_at DESC
    `,
      [req.params.userId]
    );

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error("Error fetching user payments:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Upload payment proof
router.post(
  "/:id/upload-proof",
  upload.single("proof_image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      const proofImage = req.file.filename;

      await db
        .promise()
        .query(
          'UPDATE payments SET proof_image = ?, status = "pending" WHERE id = ?',
          [proofImage, req.params.id]
        );

      res.json({
        success: true,
        message: "Payment proof uploaded successfully",
        data: {
          proof_image: proofImage,
        },
      });
    } catch (error) {
      console.error("Error uploading payment proof:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Update payment status (approve, reject, etc)
router.put("/:id/status", async (req, res) => {
  try {
    const { status, amount_paid, notes, verified_by } = req.body;
    const paymentId = req.params.id;

    let receipt_number = null;
    if (status === "paid") {
      receipt_number = await generateReceiptNumber();
    }

    await db.promise().query(
      `UPDATE payments 
       SET status = ?, amount_paid = ?, receipt_number = ?, notes = ?, verified_by = ?, verified_at = NOW() 
       WHERE id = ?`,
      [status, amount_paid, receipt_number, notes, verified_by, paymentId]
    );

    // Add to payment history
    await db.promise().query(
      `INSERT INTO payment_history (payment_id, old_status, new_status, amount_changed, notes, changed_by) 
       SELECT id, status, ?, ?, ?, ? FROM payments WHERE id = ?`,
      [status, amount_paid, notes, verified_by, paymentId]
    );

    res.json({
      success: true,
      message: "Payment status updated successfully",
      data: {
        receipt_number,
      },
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Manual payment input by admin
router.post("/manual", async (req, res) => {
  try {
    const {
      registration_id,
      amount,
      amount_paid,
      payment_method,
      bank_name,
      account_number,
      payment_date,
      notes,
      verified_by,
    } = req.body;

    // VALIDASI INPUT
    if (!registration_id || !amount || !amount_paid) {
      return res.status(400).json({
        success: false,
        message: "Registration ID, amount, and amount paid are required",
      });
    }

    if (parseFloat(amount_paid) > parseFloat(amount)) {
      return res.status(400).json({
        success: false,
        message: "Amount paid cannot exceed total amount",
      });
    }

    // Check if registration exists
    const [registrations] = await db
      .promise()
      .query("SELECT * FROM registrations WHERE id = ?", [registration_id]);

    if (registrations.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    const registration = registrations[0];
    const invoice_number = `INV-MANUAL-${Date.now()}`;
    const receipt_number = await generateReceiptNumber();
    const status = amount_paid >= amount ? "paid" : "down_payment";

    // Create payment record
    const [result] = await db.promise().query(
      `INSERT INTO payments 
       (registration_id, invoice_number, amount, amount_paid, payment_method, bank_name, account_number, 
        status, payment_date, receipt_number, notes, verified_by, verified_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        registration_id,
        invoice_number,
        amount,
        amount_paid,
        payment_method,
        bank_name,
        account_number,
        status,
        payment_date,
        receipt_number,
        notes,
        verified_by,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Manual payment recorded successfully",
      data: {
        payment_id: result.insertId,
        invoice_number,
        receipt_number,
      },
    });
  } catch (error) {
    console.error("Error creating manual payment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get payment details by ID
router.get("/:id", async (req, res) => {
  try {
    const [payments] = await db.promise().query(
      `
      SELECT 
        py.*,
        r.registration_code,
        r.application_letter,
        u.full_name,
        u.email,
        u.phone,
        u.address,
        p.name as program_name,
        p.cost as program_cost,
        p.duration as program_duration,
        p.schedule as program_schedule,
        verifier.full_name as verified_by_name
      FROM payments py
      LEFT JOIN registrations r ON py.registration_id = r.id
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN programs p ON r.program_id = p.id
      LEFT JOIN users verifier ON py.verified_by = verifier.id
      WHERE py.id = ?
    `,
      [req.params.id]
    );

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Get payment history
    const [history] = await db.promise().query(
      `
      SELECT ph.*, u.full_name as changed_by_name
      FROM payment_history ph
      LEFT JOIN users u ON ph.changed_by = u.id
      WHERE ph.payment_id = ?
      ORDER BY ph.changed_at DESC
    `,
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        ...payments[0],
        history,
      },
    });
  } catch (error) {
    console.error("Error fetching payment details:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Generate receipt data (for PDF generation)
router.get("/:id/receipt", async (req, res) => {
  try {
    const [payments] = await db.promise().query(
      `
      SELECT 
        py.*,
        r.registration_code,
        u.full_name,
        u.email,
        u.phone,
        u.address,
        p.name as program_name,
        p.cost as program_cost,
        p.duration as program_duration,
        verifier.full_name as verified_by_name
      FROM payments py
      LEFT JOIN registrations r ON py.registration_id = r.id
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN programs p ON r.program_id = p.id
      LEFT JOIN users verifier ON py.verified_by = verifier.id
      WHERE py.id = ?
    `,
      [req.params.id]
    );

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const payment = payments[0];

    // Simulate receipt data - in production, you would generate PDF here
    const receiptData = {
      receipt_number: payment.receipt_number,
      invoice_number: payment.invoice_number,
      date: new Date().toLocaleDateString("id-ID"),
      participant: {
        name: payment.full_name,
        email: payment.email,
        phone: payment.phone,
        address: payment.address,
      },
      program: {
        name: payment.program_name,
        duration: payment.program_duration,
      },
      payment: {
        amount: payment.amount,
        amount_paid: payment.amount_paid,
        payment_date: new Date(payment.payment_date).toLocaleDateString(
          "id-ID"
        ),
        method: payment.payment_method,
        verified_by: payment.verified_by_name,
      },
    };

    res.json({
      success: true,
      data: receiptData,
      message: "Receipt data generated successfully",
    });
  } catch (error) {
    console.error("Error generating receipt:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
