import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import PDFDocument from "pdfkit";
import db, { generateReceiptNumber } from "../config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Pastikan directory uploads exists
const ensureUploadsDir = () => {
  const uploadsDir = path.join(__dirname, "../uploads");
  const paymentsDir = path.join(uploadsDir, "payments");

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  if (!fs.existsSync(paymentsDir)) {
    fs.mkdirSync(paymentsDir, { recursive: true });
  }
};

ensureUploadsDir();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadsDir();
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
      cb(new Error("Hanya file gambar yang diizinkan!"), false);
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
        p.training_cost,
        p.departure_cost
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

// Get payment statistics for admin dashboard - FIXED FOR INSTALLMENT SYSTEM
router.get("/statistics", async (req, res) => {
  try {
    const [stats] = await db.promise().query(`
      SELECT 
        COUNT(*) as total_payments,
        COALESCE(SUM(CASE WHEN status IN ('paid', 'installment_1', 'installment_2', 'installment_3', 'installment_4', 'installment_5', 'installment_6') THEN amount_paid ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending_payments,
        COALESCE(SUM(CASE WHEN status LIKE 'installment_%' THEN 1 ELSE 0 END), 0) as installment_payments,
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
        p.training_cost,
        p.departure_cost
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
          message: "Tidak ada file yang diupload",
        });
      }

      const proofImage = `/uploads/payments/${req.file.filename}`;

      await db
        .promise()
        .query(
          'UPDATE payments SET proof_image = ?, status = "pending" WHERE id = ?',
          [proofImage, req.params.id]
        );

      res.json({
        success: true,
        message: "Bukti pembayaran berhasil diupload",
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

// Update payment status (approve, reject, etc) - FIXED FOR INSTALLMENT SYSTEM
router.put("/:id/status", async (req, res) => {
  try {
    const { status, amount_paid, notes, verified_by } = req.body;
    const paymentId = req.params.id;

    // Validasi status untuk installment system
    const validStatuses = [
      "pending",
      "installment_1",
      "installment_2",
      "installment_3",
      "installment_4",
      "installment_5",
      "installment_6",
      "paid",
      "overdue",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status pembayaran tidak valid. Status yang diperbolehkan: ${validStatuses.join(
          ", "
        )}`,
      });
    }

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
      message: "Status pembayaran berhasil diperbarui",
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

// Manual payment input by admin - FIXED FOR INSTALLMENT SYSTEM
router.post("/manual", async (req, res) => {
  try {
    const {
      registration_id,
      amount,
      amount_paid = 0,
      payment_method = "transfer",
      bank_name,
      account_number,
      payment_date,
      due_date,
      notes,
      verified_by,
      status = "pending", // Sekarang bisa: pending, installment_1, installment_2, ..., installment_6, paid
    } = req.body;

    console.log("Manual payment request:", req.body);

    // VALIDASI INPUT
    if (!registration_id || !amount) {
      return res.status(400).json({
        success: false,
        message: "Registration ID and amount are required",
      });
    }

    // Validasi amount_paid tidak boleh lebih besar dari amount
    const paidAmount = parseFloat(amount_paid || 0);
    const totalAmount = parseFloat(amount);

    if (paidAmount > totalAmount) {
      return res.status(400).json({
        success: false,
        message: "Amount paid cannot exceed total amount",
      });
    }

    // Validasi status yang diperbolehkan
    const validStatuses = [
      "pending",
      "installment_1",
      "installment_2",
      "installment_3",
      "installment_4",
      "installment_5",
      "installment_6",
      "paid",
      "overdue",
      "cancelled",
    ];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${validStatuses.join(", ")}`,
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

    // Generate invoice number
    const isInvoice = paidAmount === 0; // Jika amount_paid = 0, ini adalah tagihan
    const invoice_number = isInvoice
      ? `INV-${Date.now()}`
      : `PAY-MANUAL-${Date.now()}`;

    // Untuk tagihan (invoice), receipt_number null sampai dibayar
    const receipt_number =
      paidAmount > 0 ? await generateReceiptNumber() : null;

    // Tentukan status - gunakan dari request atau tentukan otomatis
    let paymentStatus = status;
    if (!paymentStatus) {
      // Logic status baru berdasarkan installment system
      if (paidAmount >= totalAmount) {
        paymentStatus = "paid";
      } else if (paidAmount > 0) {
        // Untuk pembayaran cicilan, default ke installment_1
        // Dalam implementasi real, ini harus disesuaikan dengan business logic
        paymentStatus = "installment_1";
      } else {
        paymentStatus = "pending";
      }
    }

    // Create payment record
    const [result] = await db.promise().query(
      `INSERT INTO payments 
       (registration_id, invoice_number, amount, amount_paid, payment_method, bank_name, account_number, 
        status, payment_date, due_date, receipt_number, notes, verified_by, verified_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        registration_id,
        invoice_number,
        totalAmount,
        paidAmount,
        payment_method,
        bank_name,
        account_number,
        paymentStatus,
        payment_date,
        due_date,
        receipt_number,
        notes,
        paidAmount > 0 ? verified_by : null,
        paidAmount > 0 ? new Date() : null,
      ]
    );

    res.status(201).json({
      success: true,
      message: isInvoice
        ? "Invoice created successfully"
        : "Manual payment recorded successfully",
      data: {
        payment_id: result.insertId,
        invoice_number,
        receipt_number,
        status: paymentStatus,
      },
    });
  } catch (error) {
    console.error("Error creating manual payment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error: " + error.message,
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
        u.full_name,
        u.email,
        u.phone,
        u.address,
        p.name as program_name,
        p.training_cost,
        p.departure_cost,
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

// Generate PDF Receipt
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
        p.training_cost,
        p.departure_cost,
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

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers for PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=kwitansi-${
        payment.receipt_number || payment.invoice_number
      }.pdf`
    );

    // Pipe PDF to response
    doc.pipe(res);

    // Add content to PDF
    // Header
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("KWITANSI PEMBAYARAN", { align: "center" });
    doc.fontSize(16).text("Program Magang Perusahaan", { align: "center" });
    doc.moveDown();

    // Company Info
    doc.fontSize(10).font("Helvetica");
    doc.text("PT. Intern Registration", { align: "center" });
    doc.text("Jl. Contoh Perusahaan No. 123, Jakarta", { align: "center" });
    doc.text("Telp: (021) 123-4567 | Email: admin@company.com", {
      align: "center",
    });
    doc.moveDown();

    // Receipt Info
    doc.fontSize(12);
    doc.text(
      `No. Kwitansi: ${payment.receipt_number || payment.invoice_number}`
    );
    doc.text(`No. Invoice: ${payment.invoice_number}`);
    doc.text(
      `Tanggal: ${
        payment.payment_date
          ? new Date(payment.payment_date).toLocaleDateString("id-ID")
          : new Date().toLocaleDateString("id-ID")
      }`
    );
    doc.moveDown();

    // Participant Info
    doc.font("Helvetica-Bold").text("DATA PESERTA:").font("Helvetica");
    doc.text(`Nama: ${payment.full_name || "N/A"}`);
    doc.text(`Email: ${payment.email || "N/A"}`);
    doc.text(`Telepon: ${payment.phone || "N/A"}`);
    doc.moveDown();

    // Program Info
    doc.font("Helvetica-Bold").text("PROGRAM:").font("Helvetica");
    doc.text(`Nama Program: ${payment.program_name}`);
    doc.text(`Durasi: ${payment.program_duration}`);
    doc.moveDown();

    // Payment Details
    doc.font("Helvetica-Bold").text("RINCIAN PEMBAYARAN:").font("Helvetica");

    const tableTop = doc.y;
    const itemX = 50;
    const amountX = 400;

    doc.text("Keterangan", itemX, tableTop);
    doc.text("Jumlah", amountX, tableTop);
    doc.moveDown();

    // Line
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Items
    doc.text(`Biaya Program ${payment.program_name}`, itemX);
    doc.text(
      `Rp ${parseFloat(payment.amount).toLocaleString("id-ID")}`,
      amountX
    );
    doc.moveDown();

    // Total
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    doc.font("Helvetica-Bold");
    doc.text("TOTAL TAGIHAN:", itemX);
    doc.text(
      `Rp ${parseFloat(payment.amount).toLocaleString("id-ID")}`,
      amountX
    );
    doc.moveDown();

    doc.text("SUDAH DIBAYAR:", itemX);
    doc.text(
      `Rp ${parseFloat(payment.amount_paid || 0).toLocaleString("id-ID")}`,
      amountX
    );
    doc.moveDown();

    if (payment.amount_paid < payment.amount) {
      doc.text("SISA TAGIHAN:", itemX);
      doc.text(
        `Rp ${(
          parseFloat(payment.amount) - parseFloat(payment.amount_paid || 0)
        ).toLocaleString("id-ID")}`,
        amountX
      );
      doc.moveDown();
    }

    doc.moveDown();
    doc.font("Helvetica-Bold").fontSize(14);
    doc.text(
      `TOTAL YANG SUDAH DIBAYAR: Rp ${parseFloat(
        payment.amount_paid || 0
      ).toLocaleString("id-ID")}`,
      { align: "center" }
    );
    doc.moveDown();

    // Payment Confirmation
    if (payment.status === "paid") {
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("KONFIRMASI PEMBAYARAN:")
        .font("Helvetica");
      doc.text(`Status: LUNAS`);
      doc.text(
        `Tanggal Pembayaran: ${
          payment.payment_date
            ? new Date(payment.payment_date).toLocaleDateString("id-ID")
            : "-"
        }`
      );
      doc.text(`Metode: ${payment.payment_method || "Transfer Bank"}`);
      if (payment.bank_name) doc.text(`Bank: ${payment.bank_name}`);
      doc.moveDown();
    }

    // Signature
    const signatureY = doc.page.height - 150;
    doc.text(
      "Jakarta, " + new Date().toLocaleDateString("id-ID"),
      400,
      signatureY
    );
    doc.moveDown();
    doc.text("Admin PT. Intern Registration", 400, doc.y);

    // Footer
    doc
      .fontSize(8)
      .text(
        "** Kwitansi ini sah dan dapat digunakan sebagai bukti pembayaran yang valid **",
        { align: "center" }
      );
    doc.text("Terima kasih telah mempercayai program magang kami", {
      align: "center",
    });
    doc.text(`Generated on: ${new Date().toLocaleString("id-ID")}`, {
      align: "center",
    });

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error("Error generating receipt PDF:", error);
    res.status(500).json({
      success: false,
      message: "Gagal membuat PDF kwitansi",
    });
  }
});

// Get receipt data (JSON version - for fallback)
router.get("/:id/receipt-data", async (req, res) => {
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
        p.training_cost,
        p.departure_cost,
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
        payment_date: payment.payment_date
          ? new Date(payment.payment_date).toLocaleDateString("id-ID")
          : null,
        method: payment.payment_method,
        verified_by: payment.verified_by_name,
      },
    };

    res.json({
      success: true,
      data: receiptData,
    });
  } catch (error) {
    console.error("Error generating receipt data:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get active registrations for invoice creation
router.get("/registrations/active", async (req, res) => {
  try {
    const [registrations] = await db.promise().query(`
      SELECT 
        r.*,
        u.full_name,
        u.email,
        p.name as program_name,
        p.training_cost,
        COALESCE(SUM(py.amount_paid), 0) as total_paid
      FROM registrations r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN programs p ON r.program_id = p.id
      LEFT JOIN payments py ON r.id = py.registration_id AND py.status IN ('paid', 'installment_1', 'installment_2', 'installment_3', 'installment_4', 'installment_5', 'installment_6')
      WHERE r.id IN (
        SELECT DISTINCT registration_id 
        FROM payments 
        WHERE status NOT IN ('cancelled')
      )
      GROUP BY r.id
      HAVING total_paid < p.training_cost
      ORDER BY r.registration_date DESC
    `);

    res.json({
      success: true,
      data: registrations,
    });
  } catch (error) {
    console.error("Error fetching active registrations:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get payment installment plan
router.get("/:id/installment-plan", async (req, res) => {
  try {
    const paymentId = req.params.id;

    const [payments] = await db
      .promise()
      .query(`SELECT * FROM payments WHERE id = ?`, [paymentId]);

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const payment = payments[0];

    // Get registration and program info
    const [details] = await db.promise().query(
      `SELECT 
        r.*,
        p.training_cost,
        p.installment_plan,
        p.name as program_name
       FROM registrations r
       LEFT JOIN programs p ON r.program_id = p.id
       WHERE r.id = ?`,
      [payment.registration_id]
    );

    if (details.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    const detail = details[0];

    // Calculate installment details
    const totalAmount = parseFloat(detail.training_cost);
    const paidAmount = parseFloat(payment.amount_paid || 0);
    const remaining = totalAmount - paidAmount;

    // Get installment plan from program
    const installmentPlan = detail.installment_plan || "none";
    let installments = [];

    if (installmentPlan !== "none") {
      const numInstallments = parseInt(installmentPlan.split("_")[0]);
      const installmentAmount = Math.round(remaining / numInstallments);

      installments = Array.from({ length: numInstallments }, (_, i) => ({
        number: i + 1,
        amount: installmentAmount,
        due_date: new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000), // 30 days apart
      }));
    }

    res.json({
      success: true,
      data: {
        payment,
        registration: detail,
        installment_plan: {
          total_amount: totalAmount,
          paid_amount: paidAmount,
          remaining: remaining,
          installments: installments,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching installment plan:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
