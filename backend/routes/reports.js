import express from "express";
import db from "../config/database.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

const router = express.Router();

// Get financial reports summary
router.get("/financial/summary", async (req, res) => {
  try {
    const { start_date, end_date, program } = req.query;

    let query = `
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_paid ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_pending,
        COALESCE(SUM(CASE WHEN status = 'down_payment' THEN (amount - amount_paid) ELSE 0 END), 0) as total_outstanding,
        COALESCE(SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END), 0) as total_overdue,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(amount_paid), 0) as total_amount_paid
      FROM payments
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      query += " AND DATE(created_at) >= ?";
      params.push(start_date);
    }

    if (end_date) {
      query += " AND DATE(created_at) <= ?";
      params.push(end_date);
    }

    if (program && program !== "all") {
      query +=
        " AND registration_id IN (SELECT id FROM registrations WHERE program_id = ?)";
      params.push(program);
    }

    const [summary] = await db.promise().query(query, params);

    // Get payment status distribution
    const [statusDistribution] = await db.promise().query(`
      SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(amount_paid), 0) as total_paid
      FROM payments
      GROUP BY status
    `);

    // Get monthly revenue trend
    const [monthlyTrend] = await db.promise().query(`
      SELECT 
        DATE_FORMAT(payment_date, '%Y-%m') as month,
        COUNT(*) as transaction_count,
        COALESCE(SUM(amount_paid), 0) as revenue
      FROM payments 
      WHERE status = 'paid' AND payment_date IS NOT NULL
      GROUP BY DATE_FORMAT(payment_date, '%Y-%m')
      ORDER BY month DESC
      LIMIT 6
    `);

    res.json({
      success: true,
      data: {
        summary: summary[0],
        statusDistribution,
        monthlyTrend,
      },
    });
  } catch (error) {
    console.error("Error fetching financial summary:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get detailed financial report
router.get("/financial/detailed", async (req, res) => {
  try {
    const { start_date, end_date, program, status, search } = req.query;

    let query = `
      SELECT 
        py.*,
        r.registration_code,
        u.full_name,
        u.email,
        u.phone,
        p.name as program_name,
        p.cost as program_cost,
        verifier.full_name as verified_by_name
      FROM payments py
      LEFT JOIN registrations r ON py.registration_id = r.id
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN programs p ON r.program_id = p.id
      LEFT JOIN users verifier ON py.verified_by = verifier.id
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      query += " AND DATE(py.created_at) >= ?";
      params.push(start_date);
    }

    if (end_date) {
      query += " AND DATE(py.created_at) <= ?";
      params.push(end_date);
    }

    if (program && program !== "all") {
      query += " AND p.id = ?";
      params.push(program);
    }

    if (status && status !== "all") {
      query += " AND py.status = ?";
      params.push(status);
    }

    if (search) {
      query +=
        " AND (u.full_name LIKE ? OR u.email LIKE ? OR py.invoice_number LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += " ORDER BY py.created_at DESC";

    const [payments] = await db.promise().query(query, params);

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error("Error fetching detailed financial report:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Export to Excel
router.get("/financial/export/excel", async (req, res) => {
  try {
    const { start_date, end_date, program, status } = req.query;

    let query = `
      SELECT 
        py.invoice_number,
        py.receipt_number,
        py.amount,
        py.amount_paid,
        py.status,
        py.payment_method,
        py.payment_date,
        py.created_at,
        r.registration_code,
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

    if (start_date) {
      query += " AND DATE(py.created_at) >= ?";
      params.push(start_date);
    }

    if (end_date) {
      query += " AND DATE(py.created_at) <= ?";
      params.push(end_date);
    }

    if (program && program !== "all") {
      query += " AND p.id = ?";
      params.push(program);
    }

    if (status && status !== "all") {
      query += " AND py.status = ?";
      params.push(status);
    }

    query += " ORDER BY py.created_at DESC";

    const [payments] = await db.promise().query(query, params);

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Laporan Keuangan");

    // Add headers
    worksheet.columns = [
      { header: "No", key: "no", width: 5 },
      { header: "Invoice Number", key: "invoice_number", width: 20 },
      { header: "Receipt Number", key: "receipt_number", width: 20 },
      { header: "Nama Peserta", key: "full_name", width: 25 },
      { header: "Email", key: "email", width: 25 },
      { header: "Program", key: "program_name", width: 20 },
      { header: "Amount", key: "amount", width: 15 },
      { header: "Amount Paid", key: "amount_paid", width: 15 },
      { header: "Status", key: "status", width: 15 },
      { header: "Payment Method", key: "payment_method", width: 15 },
      { header: "Payment Date", key: "payment_date", width: 15 },
      { header: "Created At", key: "created_at", width: 15 },
    ];

    // Add data
    payments.forEach((payment, index) => {
      worksheet.addRow({
        no: index + 1,
        ...payment,
        amount: payment.amount,
        amount_paid: payment.amount_paid,
        payment_date: payment.payment_date
          ? new Date(payment.payment_date).toLocaleDateString("id-ID")
          : "-",
        created_at: new Date(payment.created_at).toLocaleDateString("id-ID"),
      });
    });

    // Add summary row
    const totalRow = payments.length + 3;
    worksheet.addRow({});
    worksheet.addRow({
      no: "TOTAL",
      amount: payments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
      amount_paid: payments.reduce(
        (sum, p) => sum + parseFloat(p.amount_paid),
        0
      ),
    });

    // Style the header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE6E6FA" },
    };

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="financial-report-${
        new Date().toISOString().split("T")[0]
      }.xlsx"`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Export to PDF
router.get("/financial/export/pdf", async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    // Get summary data
    const [summary] = await db.promise().query(`
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_paid ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_pending,
        COALESCE(SUM(CASE WHEN status = 'down_payment' THEN (amount - amount_paid) ELSE 0 END), 0) as total_outstanding
      FROM payments
      WHERE 1=1
      ${start_date ? " AND DATE(created_at) >= '" + start_date + "'" : ""}
      ${end_date ? " AND DATE(created_at) <= '" + end_date + "'" : ""}
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
      LIMIT 10
    `);

    // Create PDF document
    const doc = new PDFDocument();

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="financial-report-${
        new Date().toISOString().split("T")[0]
      }.pdf"`
    );

    // Pipe PDF to response
    doc.pipe(res);

    // Add content to PDF
    doc.fontSize(20).text("Laporan Keuangan", 100, 100);
    doc
      .fontSize(12)
      .text(`Tanggal: ${new Date().toLocaleDateString("id-ID")}`, 100, 130);

    // Add summary
    doc.text("Ringkasan Keuangan:", 100, 170);
    doc.text(
      `Total Pendapatan: Rp ${summary[0].total_revenue.toLocaleString(
        "id-ID"
      )}`,
      120,
      190
    );
    doc.text(
      `Pending: Rp ${summary[0].total_pending.toLocaleString("id-ID")}`,
      120,
      210
    );
    doc.text(
      `Outstanding: Rp ${summary[0].total_outstanding.toLocaleString("id-ID")}`,
      120,
      230
    );

    // Add recent transactions
    doc.text("Transaksi Terbaru:", 100, 270);
    let yPosition = 290;

    recentPayments.forEach((payment, index) => {
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 100;
      }

      doc.text(
        `${index + 1}. ${payment.full_name} - ${
          payment.program_name
        } - Rp ${payment.amount_paid.toLocaleString("id-ID")} (${
          payment.status
        })`,
        120,
        yPosition
      );
      yPosition += 20;
    });

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error("Error exporting to PDF:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
