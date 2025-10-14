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

// =============================================
// HELPER FUNCTIONS
// =============================================

// Fungsi untuk mendapatkan status berikutnya
const getNextStatus = (currentStatus, installmentPlan = "4_cicilan") => {
  const totalInstallments = parseInt(installmentPlan.split("_")[0]) || 4;

  if (currentStatus === "pending") {
    return "installment_1";
  }

  if (currentStatus.startsWith("installment_")) {
    const currentInstallment = parseInt(currentStatus.split("_")[1]);
    if (currentInstallment < totalInstallments) {
      return `installment_${currentInstallment + 1}`;
    } else {
      return "paid";
    }
  }

  return currentStatus;
};

// Fungsi untuk validasi status progression
const validateStatusProgression = (
  currentStatus,
  requestedStatus,
  installmentPlan = "4_cicilan"
) => {
  const totalInstallments = parseInt(installmentPlan.split("_")[0]) || 4;

  // Dari pending ke installment_1 adalah progression yang valid
  if (currentStatus === "pending" && requestedStatus === "installment_1") {
    return true;
  }

  // Dari installment_X ke installment_X+1 adalah progression yang valid
  if (
    currentStatus.startsWith("installment_") &&
    requestedStatus.startsWith("installment_")
  ) {
    const currentInstallment = parseInt(currentStatus.split("_")[1]);
    const requestedInstallment = parseInt(requestedStatus.split("_")[1]);

    return requestedInstallment === currentInstallment + 1;
  }

  // Dari installment_terakhir ke paid adalah progression yang valid
  if (currentStatus.startsWith("installment_") && requestedStatus === "paid") {
    const currentInstallment = parseInt(currentStatus.split("_")[1]);
    return currentInstallment === totalInstallments;
  }

  return false;
};

// Fungsi untuk menghitung expected amount berdasarkan status
const calculateExpectedAmount = (
  totalAmount,
  currentStatus,
  currentAmountPaid,
  installmentPlan = "4_cicilan"
) => {
  const totalInstallments = parseInt(installmentPlan.split("_")[0]) || 4;
  const amountPerInstallment = totalAmount / totalInstallments;

  let currentInstallment = 0;

  // ✅ PERBAIKAN: Status pending berarti belum ada cicilan yang dibayar
  if (currentStatus === "pending") {
    currentInstallment = 0; // Belum ada cicilan yang dibayar
  } else if (currentStatus.startsWith("installment_")) {
    currentInstallment = parseInt(currentStatus.split("_")[1]);
  }

  const expectedAmountPaid = amountPerInstallment * currentInstallment;
  return {
    expectedAmountPaid,
    amountPerInstallment,
    currentInstallment,
  };
};

// Helper functions untuk PDF receipt
const getStatusText = (status) => {
  const statusTexts = {
    pending: "Menunggu Pembayaran",
    installment_1: "Cicilan 1",
    installment_2: "Cicilan 2",
    installment_3: "Cicilan 3",
    installment_4: "Cicilan 4",
    installment_5: "Cicilan 5",
    installment_6: "Cicilan 6",
    paid: "Lunas",
    overdue: "Terlambat",
    cancelled: "Dibatalkan",
  };
  return statusTexts[status] || status;
};

const formatCurrency = (value) => {
  if (!value && value !== 0) return "Rp 0";
  const numValue = parseFloat(value);
  return isNaN(numValue)
    ? "Rp 0"
    : `Rp ${Math.round(numValue).toLocaleString("id-ID")}`;
};

// =============================================
// ROUTES
// =============================================

// Debug middleware
router.use("/:id/upload-proof", (req, res, next) => {
  console.log("📤 Upload proof request for payment:", req.params.id);
  next();
});

router.use("/:id/status", (req, res, next) => {
  console.log(
    "🔄 Status update request for payment:",
    req.params.id,
    "body:",
    req.body
  );
  next();
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
        p.training_cost as program_training_cost,
        p.departure_cost as program_departure_cost,
        p.duration as program_duration,
        p.installment_plan as program_installment_plan
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
        COALESCE(SUM(amount_paid), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending_payments,
        COALESCE(SUM(CASE WHEN status LIKE 'installment_%' THEN 1 ELSE 0 END), 0) as installment_payments,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END), 0) as paid_payments,
        COALESCE(SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END), 0) as overdue_payments
      FROM payments
      WHERE status != 'cancelled'
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
      WHERE py.status != 'cancelled'
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
        p.training_cost as program_training_cost,
        p.departure_cost as program_departure_cost,
        p.duration as program_duration,
        p.installment_plan as program_installment_plan
      FROM payments py
      LEFT JOIN registrations r ON py.registration_id = r.id
      LEFT JOIN programs p ON r.program_id = p.id
      WHERE r.user_id = ? AND py.status != 'cancelled'
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

// ✅ PERBAIKAN: Upload proof TIDAK mengubah status
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

      // ✅ PERBAIKAN PENTING: Hanya update proof_image, JANGAN ubah status!
      await db
        .promise()
        .query("UPDATE payments SET proof_image = ? WHERE id = ?", [
          proofImage,
          req.params.id,
        ]);

      res.json({
        success: true,
        message:
          "Bukti pembayaran berhasil diupload dan menunggu verifikasi admin",
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

// ✅ PERBAIKAN BESAR: Update payment status dengan logika yang benar
router.put("/:id/status", async (req, res) => {
  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();

    const { status, amount_paid, notes, verified_by } = req.body;
    const paymentId = req.params.id;

    console.log("🔧 Update payment status:", {
      paymentId,
      status,
      amount_paid,
      verified_by,
    });

    // Validasi status
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
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Status pembayaran tidak valid. Gunakan: ${validStatuses.join(
          ", "
        )}`,
      });
    }

    // Dapatkan data payment saat ini
    const [currentPayments] = await connection.query(
      `SELECT 
        py.*,
        p.training_cost as program_training_cost,
        p.installment_plan as program_installment_plan
       FROM payments py
       LEFT JOIN registrations r ON py.registration_id = r.id
       LEFT JOIN programs p ON r.program_id = p.id
       WHERE py.id = ?`,
      [paymentId]
    );

    if (currentPayments.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const currentPayment = currentPayments[0];
    const totalAmount = parseFloat(currentPayment.program_training_cost);
    const currentAmountPaid = parseFloat(currentPayment.amount_paid || 0);
    const newPaymentAmount = parseFloat(amount_paid || 0);
    const newTotalPaid = currentAmountPaid + newPaymentAmount;

    console.log("💰 Payment calculation:", {
      totalAmount,
      currentAmountPaid,
      newPaymentAmount,
      newTotalPaid,
      currentStatus: currentPayment.status,
      requestedStatus: status,
    });

    // ✅ PERBAIKAN KRITIS: Deklarasi variabel di AWAL
    let finalStatus = status;
    let receipt_number = currentPayment.receipt_number;
    let due_date = currentPayment.due_date;

    // Validasi: amount_paid tidak boleh melebihi total amount
    if (newTotalPaid > totalAmount) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Jumlah pembayaran melebihi total tagihan. Total: ${totalAmount}, Sudah dibayar: ${currentAmountPaid}, Maksimal: ${
          totalAmount - currentAmountPaid
        }`,
      });
    }

    // ✅ PERBAIKAN: LOGIKA AUTO-LUNAS - HARUS SEBELUM VALIDASI LAIN
    if (newTotalPaid >= totalAmount && finalStatus !== "cancelled") {
      console.log("🎉 Auto-lunas: Pembayaran mencapai total amount");
      finalStatus = "paid";

      if (!receipt_number) {
        receipt_number = await generateReceiptNumber();
        console.log(
          "🧾 Generated receipt number untuk auto-lunas:",
          receipt_number
        );
      }
    }

    // ✅ PERBAIKAN: Validasi status 'paid' manual - hanya jika diminta manual
    if (status === "paid" && newTotalPaid < totalAmount) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Status tidak bisa diubah menjadi 'paid' karena pembayaran belum lunas. Total: ${totalAmount}, Dibayar: ${newTotalPaid}, Kurang: ${
          totalAmount - newTotalPaid
        }`,
      });
    }

    // Validasi progression status untuk cicilan
    if (status.startsWith("installment_")) {
      const installmentCount = currentPayment.program_installment_plan
        ? parseInt(currentPayment.program_installment_plan.split("_")[0])
        : 4;

      const { expectedAmountPaid, amountPerInstallment, currentInstallment } =
        calculateExpectedAmount(
          totalAmount,
          currentPayment.status,
          currentAmountPaid,
          currentPayment.program_installment_plan
        );

      const requestedInstallment = parseInt(status.split("_")[1]);

      console.log("🔍 Status progression validation:", {
        currentStatus: currentPayment.status,
        currentInstallment: currentInstallment,
        requestedInstallment: requestedInstallment,
        amountPerInstallment: amountPerInstallment,
      });

      // Validasi progression status
      if (
        !validateStatusProgression(
          currentPayment.status,
          status,
          currentPayment.program_installment_plan
        )
      ) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Progression status tidak valid. Dari ${currentPayment.status} tidak bisa langsung ke ${status}`,
        });
      }

      // Validasi jumlah pembayaran untuk cicilan
      const expectedPayment = amountPerInstallment;
      const tolerance = 1000;

      if (Math.abs(newPaymentAmount - expectedPayment) > tolerance) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Jumlah pembayaran untuk cicilan ${requestedInstallment} tidak sesuai. Seharusnya: Rp ${expectedPayment.toLocaleString(
            "id-ID"
          )}`,
        });
      }
    }

    // Auto-progression logic
    if (finalStatus !== "cancelled" && newPaymentAmount > 0) {
      const autoNextStatus = getNextStatus(
        currentPayment.status,
        currentPayment.program_installment_plan
      );

      console.log("🔄 Auto-progression check:", {
        current: currentPayment.status,
        requested: finalStatus,
        autoNext: autoNextStatus,
      });

      if (
        (finalStatus.startsWith("installment_") || finalStatus === "paid") &&
        autoNextStatus !== finalStatus &&
        validateStatusProgression(
          currentPayment.status,
          autoNextStatus,
          currentPayment.program_installment_plan
        )
      ) {
        finalStatus = autoNextStatus;
        console.log("🚀 Auto-progression applied:", {
          from: currentPayment.status,
          to: finalStatus,
        });
      }
    }

    // Generate receipt number untuk pembayaran yang berhasil
    if (
      !receipt_number &&
      finalStatus !== "pending" &&
      finalStatus !== "cancelled" &&
      newPaymentAmount > 0
    ) {
      receipt_number = await generateReceiptNumber();
      console.log("🧾 Generated receipt number:", receipt_number);
    }

    // Kosongkan due_date setelah verifikasi berhasil
    if (finalStatus !== "paid" && finalStatus !== "cancelled") {
      due_date = null;
      console.log("📅 Due date dikosongkan untuk cicilan berikutnya");
    }

    // Update payment dengan status yang sudah dikoreksi
    await connection.query(
      `UPDATE payments 
       SET status = ?, amount_paid = ?, receipt_number = ?, notes = COALESCE(?, notes), 
           verified_by = ?, verified_at = NOW(), amount = ?, due_date = ?
       WHERE id = ?`,
      [
        finalStatus,
        newTotalPaid,
        receipt_number,
        notes,
        verified_by,
        totalAmount,
        due_date,
        paymentId,
      ]
    );

    // Add to payment history
    await connection.query(
      `INSERT INTO payment_history 
       (payment_id, old_status, new_status, old_amount_paid, new_amount_paid, amount_changed, notes, changed_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paymentId,
        currentPayment.status,
        finalStatus,
        currentAmountPaid,
        newTotalPaid,
        newPaymentAmount,
        notes ||
          `Status berubah dari ${currentPayment.status} ke ${finalStatus}`,
        verified_by,
      ]
    );

    await connection.commit();

    console.log("✅ Payment status updated successfully:", {
      paymentId,
      oldStatus: currentPayment.status,
      newStatus: finalStatus,
      receipt_number,
      amount_paid: newTotalPaid,
    });

    res.json({
      success: true,
      message: "Status pembayaran berhasil diperbarui",
      data: {
        receipt_number,
        amount_paid: newTotalPaid,
        status: finalStatus,
        due_date: due_date,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("❌ Error updating payment status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error: " + error.message,
    });
  } finally {
    connection.release();
  }
});

// ✅ PERBAIKAN BESAR: Endpoint terbitkan tagihan dengan VALIDASI KETAT
router.put("/:id/due-date", async (req, res) => {
  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();

    const { due_date, notes, verified_by } = req.body;
    const paymentId = req.params.id;

    console.log("📅 Admin menerbitkan tagihan:", {
      paymentId,
      due_date,
      verified_by,
    });

    // Check if payment exists dengan data lengkap
    const [payments] = await connection.query(
      `
      SELECT 
        py.*,
        p.training_cost as program_training_cost,
        p.installment_plan as program_installment_plan
      FROM payments py
      LEFT JOIN registrations r ON py.registration_id = r.id  
      LEFT JOIN programs p ON r.program_id = p.id
      WHERE py.id = ?
      `,
      [paymentId]
    );

    if (payments.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const currentPayment = payments[0];
    const totalAmount = parseFloat(currentPayment.program_training_cost);

    // ✅ PERBAIKAN: Validasi due_date
    if (!due_date) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Due date is required",
      });
    }

    const dueDate = new Date(due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dueDate < today) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Due date harus di masa depan",
      });
    }

    // ✅ PERBAIKAN: Validasi status
    if (currentPayment.status === "paid") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message:
          "Tidak bisa menerbitkan tagihan untuk pembayaran yang sudah LUNAS",
      });
    }

    // ✅ PERBAIKAN PENTING: TIDAK mengubah status, hanya set due_date
    // Status tetap sama, hanya due_date yang diupdate
    const currentStatus = currentPayment.status;

    // Update HANYA due_date, status TETAP
    await connection.query(
      `UPDATE payments 
       SET due_date = ?, notes = COALESCE(?, notes), updated_at = NOW()
       WHERE id = ?`,
      [due_date, notes, paymentId]
    );

    const changedBy = verified_by || null;

    // Add to payment history - Tandai sebagai penerbitan tagihan
    await connection.query(
      `INSERT INTO payment_history 
       (payment_id, old_status, new_status, notes, changed_by) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        paymentId,
        currentStatus,
        currentStatus, // Status tetap sama
        `Tagihan diterbitkan. Jatuh tempo: ${new Date(
          due_date
        ).toLocaleDateString("id-ID")} - Status tetap: ${currentStatus} - ${
          notes || "Tidak ada catatan"
        }`,
        changedBy,
      ]
    );

    await connection.commit();

    console.log("✅ Tagihan berhasil diterbitkan:", {
      paymentId,
      status: currentStatus,
      due_date: due_date,
    });

    res.json({
      success: true,
      message: "Tagihan berhasil diterbitkan",
      data: {
        due_date: due_date,
        status: currentStatus, // Kembalikan status yang sama
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("❌ Error updating due date:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error: " + error.message,
    });
  } finally {
    connection.release();
  }
});

// Manual payment input by admin
router.post("/manual", async (req, res) => {
  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();

    const {
      registration_id,
      amount_paid = 0,
      payment_method = "transfer",
      bank_name,
      account_number,
      payment_date,
      due_date,
      notes,
      verified_by,
      status = "pending",
    } = req.body;

    console.log("🔧 Manual payment request:", req.body);

    // VALIDASI INPUT
    if (!registration_id) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Registration ID is required",
      });
    }

    // Check if registration exists dan dapatkan program info
    const [registrations] = await connection.query(
      `
      SELECT r.*, p.training_cost, p.installment_plan 
      FROM registrations r
      LEFT JOIN programs p ON r.program_id = p.id
      WHERE r.id = ?
      `,
      [registration_id]
    );

    if (registrations.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    const registration = registrations[0];
    const totalAmount = parseFloat(registration.training_cost);
    const paymentAmount = parseFloat(amount_paid);

    if (paymentAmount <= 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Amount paid must be greater than 0",
      });
    }

    // Cari payment yang sudah ada untuk registrasi ini
    const [existingPayments] = await connection.query(
      "SELECT * FROM payments WHERE registration_id = ? AND status != 'cancelled'",
      [registration_id]
    );

    if (existingPayments.length > 0) {
      // UPDATE EXISTING PAYMENT (SISTEM SATU INVOICE)
      const existingPayment = existingPayments[0];
      const currentAmountPaid = parseFloat(existingPayment.amount_paid || 0);
      const newTotalPaid = currentAmountPaid + paymentAmount;

      // Validasi tidak melebihi total amount
      if (newTotalPaid > totalAmount) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Jumlah pembayaran melebihi total tagihan. Total: ${totalAmount}, Sudah dibayar: ${currentAmountPaid}, Maksimal: ${
            totalAmount - currentAmountPaid
          }`,
        });
      }

      // Tentukan status baru
      let newStatus = status;
      if (newTotalPaid >= totalAmount) {
        newStatus = "paid";
      } else if (status === "pending" && currentAmountPaid === 0) {
        newStatus = "installment_1"; // Otomatis ke cicilan 1 jika pertama kali bayar
      }

      let receipt_number = existingPayment.receipt_number;
      if (newStatus === "paid" && !receipt_number) {
        receipt_number = await generateReceiptNumber();
      }

      // Update payment yang sudah ada
      await connection.query(
        `UPDATE payments 
         SET amount_paid = ?, status = ?, receipt_number = ?, 
             payment_method = ?, bank_name = ?, account_number = ?,
             payment_date = ?, due_date = ?, notes = COALESCE(?, notes),
             verified_by = ?, verified_at = NOW(), amount = ?
         WHERE id = ?`,
        [
          newTotalPaid,
          newStatus,
          receipt_number,
          payment_method,
          bank_name,
          account_number,
          payment_date,
          due_date,
          notes,
          verified_by,
          totalAmount,
          existingPayment.id,
        ]
      );

      // Add to payment history
      await connection.query(
        `INSERT INTO payment_history 
         (payment_id, old_status, new_status, old_amount_paid, new_amount_paid, amount_changed, notes, changed_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          existingPayment.id,
          existingPayment.status,
          newStatus,
          currentAmountPaid,
          newTotalPaid,
          paymentAmount,
          notes,
          verified_by,
        ]
      );

      await connection.commit();

      res.json({
        success: true,
        message:
          "Pembayaran manual berhasil ditambahkan ke invoice yang sudah ada",
        data: {
          payment_id: existingPayment.id,
          invoice_number: existingPayment.invoice_number,
          receipt_number: receipt_number,
          status: newStatus,
          amount_paid: newTotalPaid,
        },
      });
    } else {
      // BUAT PAYMENT BARU (hanya untuk registrasi yang belum punya payment)
      const invoice_number = `INV-${Date.now()}`;

      let paymentStatus = status;
      if (paymentAmount >= totalAmount) {
        paymentStatus = "paid";
      } else if (paymentAmount > 0) {
        paymentStatus = "installment_1";
      }

      let receipt_number = null;
      if (paymentStatus === "paid") {
        receipt_number = await generateReceiptNumber();
      }

      // Create payment record
      const [result] = await connection.query(
        `INSERT INTO payments 
         (registration_id, invoice_number, amount, amount_paid, payment_method, bank_name, account_number, 
          status, payment_date, due_date, receipt_number, notes, verified_by, verified_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          registration_id,
          invoice_number,
          totalAmount,
          paymentAmount,
          payment_method,
          bank_name,
          account_number,
          paymentStatus,
          payment_date,
          due_date,
          receipt_number,
          notes,
          verified_by,
          paymentAmount > 0 ? new Date() : null,
        ]
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        message: "Invoice pembayaran berhasil dibuat",
        data: {
          payment_id: result.insertId,
          invoice_number,
          receipt_number,
          status: paymentStatus,
          amount_paid: paymentAmount,
        },
      });
    }
  } catch (error) {
    await connection.rollback();
    console.error("❌ Error creating manual payment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error: " + error.message,
    });
  } finally {
    connection.release();
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
        p.training_cost as program_training_cost,
        p.departure_cost as program_departure_cost,
        p.duration as program_duration,
        p.installment_plan as program_installment_plan,
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

    const payment = payments[0];

    // Pastikan amount sesuai dengan program_training_cost
    if (
      parseFloat(payment.amount) !== parseFloat(payment.program_training_cost)
    ) {
      // Auto-correct jika tidak sesuai
      await db
        .promise()
        .query("UPDATE payments SET amount = ? WHERE id = ?", [
          payment.program_training_cost,
          payment.id,
        ]);
      payment.amount = payment.program_training_cost;
    }

    res.json({
      success: true,
      data: {
        ...payment,
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
  let doc;
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
        p.training_cost as program_training_cost,
        p.departure_cost as program_departure_cost,
        p.duration as program_duration,
        p.installment_plan as program_installment_plan,
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

    // Validasi: hanya payment yang sudah diverifikasi yang bisa download kwitansi
    if (!payment.verified_by) {
      return res.status(400).json({
        success: false,
        message:
          "Kwitansi hanya tersedia untuk pembayaran yang sudah diverifikasi",
      });
    }

    const totalAmount = parseFloat(payment.program_training_cost);
    const amountPaid = parseFloat(payment.amount_paid || 0);

    // Hitung jumlah cicilan saat ini
    let currentInstallment = 0;
    let currentInstallmentAmount = 0;

    if (payment.status === "pending") {
      currentInstallment = 0;
      currentInstallmentAmount = 0;
    } else if (payment.status.startsWith("installment_")) {
      currentInstallment = parseInt(payment.status.split("_")[1]);
      // Hitung amount untuk cicilan ini berdasarkan selisih dengan history
      const [history] = await db.promise().query(
        `SELECT amount_changed FROM payment_history 
         WHERE payment_id = ? AND new_status = ? 
         ORDER BY changed_at DESC LIMIT 1`,
        [payment.id, payment.status]
      );

      if (history.length > 0) {
        currentInstallmentAmount = parseFloat(history[0].amount_changed);
      } else {
        // Fallback calculation
        const installmentCount = payment.program_installment_plan
          ? parseInt(payment.program_installment_plan.split("_")[0])
          : 4;
        currentInstallmentAmount = totalAmount / installmentCount;
      }
    } else if (payment.status === "paid") {
      currentInstallmentAmount = amountPaid;
    }

    // Create PDF document
    doc = new PDFDocument({ margin: 50 });

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
    doc.text(`Status: ${getStatusText(payment.status)}`);
    doc.text(
      `Tanggal: ${
        payment.payment_date
          ? new Date(payment.payment_date).toLocaleDateString("id-ID")
          : new Date().toLocaleDateString("id-ID")
      }`
    );

    // Tampilkan informasi cicilan khusus
    if (payment.status.startsWith("installment_")) {
      doc.text(
        `Cicilan Ke: ${currentInstallment} - ${getStatusText(payment.status)}`
      );
    }
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
    doc.text(`Total Biaya: ${formatCurrency(totalAmount)}`);
    doc.text(
      `Plan Cicilan: ${payment.program_installment_plan || "4 cicilan"}`
    );
    doc.moveDown();

    // Payment Progress
    doc.font("Helvetica-Bold").text("PROGRESS PEMBAYARAN:").font("Helvetica");
    const progressPercentage =
      totalAmount > 0 ? (amountPaid / totalAmount) * 100 : 0;
    doc.text(`Progress: ${progressPercentage.toFixed(1)}%`);
    doc.text(`Sudah Dibayar: ${formatCurrency(amountPaid)}`);
    doc.text(`Sisa: ${formatCurrency(totalAmount - amountPaid)}`);
    doc.moveDown();

    // Payment Details - RINCIAN CICILAN
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

    // Items - Tampilkan informasi cicilan
    if (payment.status.startsWith("installment_")) {
      doc.text(
        `Pembayaran Cicilan ${currentInstallment} - ${payment.program_name}`,
        itemX
      );
      doc.text(`${formatCurrency(currentInstallmentAmount)}`, amountX);
    } else if (payment.status === "paid") {
      doc.text(`Pelunasan Program ${payment.program_name}`, itemX);
      doc.text(`${formatCurrency(currentInstallmentAmount)}`, amountX);
    } else {
      doc.text(`Biaya Program ${payment.program_name}`, itemX);
      doc.text(`${formatCurrency(totalAmount)}`, amountX);
    }
    doc.moveDown();

    // Total
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    doc.font("Helvetica-Bold");
    doc.text("TOTAL TAGIHAN:", itemX);
    doc.text(`${formatCurrency(totalAmount)}`, amountX);
    doc.moveDown();

    doc.text("SUDAH DIBAYAR:", itemX);
    doc.text(`${formatCurrency(amountPaid)}`, amountX);
    doc.moveDown();

    if (amountPaid < totalAmount) {
      doc.text("SISA TAGIHAN:", itemX);
      doc.text(`${formatCurrency(totalAmount - amountPaid)}`, amountX);
    }
    doc.moveDown();

    doc.moveDown();
    doc.font("Helvetica-Bold").fontSize(14);
    doc.text(
      `STATUS: ${
        payment.status === "paid"
          ? "LUNAS"
          : getStatusText(payment.status).toUpperCase()
      }`,
      { align: "center" }
    );
    doc.moveDown();

    // Payment Confirmation
    if (payment.status === "paid" || payment.verified_by) {
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("KONFIRMASI PEMBAYARAN:")
        .font("Helvetica");
      doc.text(`Status: ${getStatusText(payment.status)}`);
      doc.text(
        `Tanggal Pembayaran: ${
          payment.payment_date
            ? new Date(payment.payment_date).toLocaleDateString("id-ID")
            : "-"
        }`
      );
      doc.text(`Metode: ${payment.payment_method || "Transfer Bank"}`);
      if (payment.bank_name) doc.text(`Bank: ${payment.bank_name}`);
      if (payment.verified_by_name) {
        doc.text(`Terverifikasi oleh: ${payment.verified_by_name}`);
      }
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
      )
      .text("Terima kasih telah mempercayai program magang kami", {
        align: "center",
      })
      .text(`Generated on: ${new Date().toLocaleString("id-ID")}`, {
        align: "center",
      });

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error("Error generating receipt PDF:", error);

    // Jika doc sudah dibuat, hancurkan
    if (doc) {
      doc.end();
    }

    // Kirim error response hanya jika header belum terkirim
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Gagal membuat PDF kwitansi: " + error.message,
      });
    }
  }
});

// Get active registrations for payment management
router.get("/registrations/active", async (req, res) => {
  try {
    const [registrations] = await db.promise().query(`
      SELECT 
        r.*,
        u.full_name,
        u.email,
        p.name as program_name,
        p.training_cost,
        p.installment_plan,
        COALESCE(py.amount_paid, 0) as amount_paid,
        py.status as payment_status,
        py.invoice_number
      FROM registrations r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN programs p ON r.program_id = p.id
      LEFT JOIN payments py ON r.id = py.registration_id AND py.status != 'cancelled'
      WHERE r.id NOT IN (
        SELECT registration_id 
        FROM payments 
        WHERE status = 'cancelled'
      )
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

export default router;
