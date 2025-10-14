import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

// =============================================
// UTILITY FUNCTIONS - Sistem Alert DIPERBAIKI
// =============================================
const paymentUtils = {
  formatCurrency: (value) => {
    if (!value && value !== 0) return "Rp 0";
    const numValue = parseFloat(value);
    return isNaN(numValue)
      ? "Rp 0"
      : `Rp ${Math.round(numValue).toLocaleString("id-ID")}`;
  },

  parseFloatSafe: (value, defaultValue = 0) => {
    if (value === null || value === undefined || value === "") {
      return defaultValue;
    }
    const numValue = parseFloat(value);
    return isNaN(numValue) ? defaultValue : Math.round(numValue * 100) / 100;
  },

  calculateRemainingSafe: (total, paid) => {
    const totalCents = Math.round(parseFloat(total || 0) * 100);
    const paidCents = Math.round(parseFloat(paid || 0) * 100);
    return Math.max(0, (totalCents - paidCents) / 100);
  },

  getStatusBadge: (status) => {
    const statusConfig = {
      pending: { class: "bg-warning", text: "Menunggu Pembayaran" },
      installment_1: { class: "bg-primary", text: "Cicilan 1" },
      installment_2: { class: "bg-primary", text: "Cicilan 2" },
      installment_3: { class: "bg-primary", text: "Cicilan 3" },
      installment_4: { class: "bg-primary", text: "Cicilan 4" },
      installment_5: { class: "bg-primary", text: "Cicilan 5" },
      installment_6: { class: "bg-primary", text: "Cicilan 6" },
      paid: { class: "bg-success", text: "Lunas" },
      overdue: { class: "bg-danger", text: "Jatuh Tempo" },
      cancelled: { class: "bg-secondary", text: "Dibatalkan" },
    };

    const config = statusConfig[status] || {
      class: "bg-secondary",
      text: status,
    };
    return <span className={`badge ${config.class}`}>{config.text}</span>;
  },

  getStatusText: (status) => {
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
  },

  getInstallmentText: (payment) => {
    if (payment.status === "paid") return "Lunas";
    if (payment.status === "pending") return "Menunggu Pembayaran";
    if (payment.status.startsWith("installment_")) {
      const installmentNum = payment.status.split("_")[1];
      return `Cicilan ${installmentNum}`;
    }
    return payment.status;
  },

  // ✅ DIPERBAIKI: Alert cicilan baru HANYA muncul jika due_date ada (admin sudah terbitkan tagihan)
  checkForNewInstallment: (payment) => {
    if (!payment) return null;

    const totalAmount = paymentUtils.parseFloatSafe(
      payment.program_training_cost
    );
    const paidAmount = paymentUtils.parseFloatSafe(payment.amount_paid);
    const remaining = totalAmount - paidAmount;

    // Jika sudah lunas atau cancelled, tidak ada cicilan baru
    if (
      payment.status === "paid" ||
      payment.status === "cancelled" ||
      remaining <= 0
    ) {
      return null;
    }

    // ✅ KRITERIA PENTING: Hanya tampilkan alert jika due_date ADA (admin sudah terbitkan tagihan)
    if (!payment.due_date) {
      return null;
    }

    // Jika status pending, berarti cicilan 1 sudah tersedia
    if (payment.status === "pending") {
      return {
        type: "info",
        title: "💰 Tagihan Baru Tersedia",
        message: "Tagihan cicilan 1 tersedia untuk dibayar",
        installment_number: 1,
        amount: paymentUtils.calculateNextInstallmentAmount(payment),
        due_date: payment.due_date,
        payment_id: payment.id,
        invoice_number: payment.invoice_number,
      };
    }

    // Jika status installment_X, cek apakah ada cicilan berikutnya
    if (payment.status.startsWith("installment_")) {
      const currentInstallment = parseInt(payment.status.split("_")[1]);
      const totalInstallments = payment.program_installment_plan
        ? parseInt(payment.program_installment_plan.split("_")[0])
        : 4;

      // Jika masih ada cicilan berikutnya
      if (currentInstallment < totalInstallments) {
        const nextInstallment = currentInstallment + 1;

        return {
          type: "info",
          title: "💰 Tagihan Baru Tersedia",
          message: `Tagihan cicilan ${nextInstallment} tersedia untuk dibayar`,
          installment_number: nextInstallment,
          amount: paymentUtils.calculateNextInstallmentAmount(payment),
          due_date: payment.due_date,
          payment_id: payment.id,
          invoice_number: payment.invoice_number,
        };
      }
    }

    return null;
  },

  calculateNextInstallmentAmount: (payment) => {
    const totalAmount = paymentUtils.parseFloatSafe(
      payment.program_training_cost
    );
    const paidAmount = paymentUtils.parseFloatSafe(payment.amount_paid);
    const remaining = totalAmount - paidAmount;

    if (remaining <= 0) return 0;

    const currentStatus = payment.status;
    let remainingInstallments = 1;

    if (currentStatus.startsWith("installment_")) {
      const currentInstallment = parseInt(currentStatus.split("_")[1]);
      const totalInstallments = payment.program_installment_plan
        ? parseInt(payment.program_installment_plan.split("_")[0])
        : 4;
      remainingInstallments = totalInstallments - currentInstallment;
    } else if (currentStatus === "pending") {
      const totalInstallments = payment.program_installment_plan
        ? parseInt(payment.program_installment_plan.split("_")[0])
        : 4;
      remainingInstallments = totalInstallments;
    }

    // Hitung cicilan dengan pembulatan ke ribuan terdekat
    let installmentAmount =
      Math.round(remaining / remainingInstallments / 1000) * 1000;

    // Pastikan tidak melebihi sisa
    installmentAmount = Math.min(installmentAmount, remaining);

    return installmentAmount;
  },

  // ✅ DIPERBAIKI: Cek overdue status
  isOverdue: (payment) => {
    if (!payment.due_date || payment.status === "paid") return false;
    const dueDate = new Date(payment.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  },

  // ✅ DIPERBAIKI: Cek apakah cicilan akan jatuh tempo soon (dalam 3 hari)
  isDueSoon: (payment) => {
    if (!payment.due_date || payment.status === "paid") return false;
    const dueDate = new Date(payment.due_date);
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    return dueDate >= today && dueDate <= threeDaysFromNow;
  },

  // ✅ FUNGSI BARU: Cek apakah payment sedang menunggu verifikasi
  isWaitingVerification: (payment) => {
    // Hanya menunggu verifikasi jika:
    // 1. Ada proof_image (sudah upload bukti)
    // 2. Status masih pending/installment (belum diverifikasi)
    // 3. Tidak ada verified_by (belum diverifikasi admin)
    return (
      payment.proof_image &&
      (payment.status === "pending" ||
        payment.status.startsWith("installment_")) &&
      !payment.verified_by
    );
  },

  // ✅ FUNGSI BARU: Cek apakah payment perlu upload bukti
  needsUpload: (payment) => {
    // Perlu upload jika:
    // 1. Status pending/installment (belum lunas)
    // 2. Tidak ada proof_image (belum upload bukti)
    // 3. Due_date sudah di-set (admin sudah terbitkan tagihan)
    return (
      (payment.status === "pending" ||
        payment.status.startsWith("installment_")) &&
      !payment.proof_image &&
      payment.due_date
    );
  },

  getCurrentInstallmentAmount: (payment) => {
    if (payment.status === "pending") return 0;

    if (payment.status.startsWith("installment_")) {
      const currentInstallment = parseInt(payment.status.split("_")[1]);
      const totalAmount = paymentUtils.parseFloatSafe(
        payment.program_training_cost
      );
      const installmentCount = payment.program_installment_plan
        ? parseInt(payment.program_installment_plan.split("_")[0])
        : 4;

      // Cicilan 1-3: 25% each, cicilan 4: sisa
      if (currentInstallment <= 3) {
        return totalAmount * 0.25;
      } else {
        const paid = paymentUtils.parseFloatSafe(payment.amount_paid);
        return totalAmount - paid;
      }
    }

    return paymentUtils.parseFloatSafe(payment.amount_paid);
  },
};

const Payment = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [paymentAlerts, setPaymentAlerts] = useState([]);

  // =============================================
  // HELPER FUNCTIONS
  // =============================================
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return "-";
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "-";
    }
  };

  // =============================================
  // PROGRESS CALCULATION
  // =============================================
  const safeCalculateProgress = (payment) => {
    const totalAmount =
      paymentUtils.parseFloatSafe(payment?.program_training_cost) || 0;
    const amountPaid = paymentUtils.parseFloatSafe(payment?.amount_paid) || 0;
    if (totalAmount <= 0) return 0;
    return Math.min(100, (amountPaid / totalAmount) * 100);
  };

  const safeCalculateRemaining = (payment) => {
    const totalAmount =
      paymentUtils.parseFloatSafe(payment?.program_training_cost) || 0;
    const amountPaid = paymentUtils.parseFloatSafe(payment?.amount_paid) || 0;
    return paymentUtils.calculateRemainingSafe(totalAmount, amountPaid);
  };

  // =============================================
  // ALERT SYSTEM FUNCTIONS - DIPERBAIKI
  // =============================================
  const generatePaymentAlerts = useCallback((payments) => {
    if (!payments || payments.length === 0) return [];

    const alerts = [];

    payments.forEach((payment) => {
      // 1. ✅ DIPERBAIKI: Alert untuk cicilan baru HANYA jika due_date ada
      const newInstallmentAlert = paymentUtils.checkForNewInstallment(payment);
      if (newInstallmentAlert) {
        alerts.push({
          type: "info",
          title: "💰 Tagihan Baru Tersedia",
          message: newInstallmentAlert.message,
          paymentId: payment.id,
          invoiceNumber: payment.invoice_number,
          installmentNumber: newInstallmentAlert.installment_number,
          amount: newInstallmentAlert.amount,
          dueDate: newInstallmentAlert.due_date,
          icon: "bi-credit-card",
          action: "upload",
        });
      }

      // 2. ✅ Alert untuk pembayaran overdue
      if (paymentUtils.isOverdue(payment)) {
        alerts.push({
          type: "danger",
          title: "⚠️ Pembayaran Terlambat!",
          message: `Tagihan ${payment.invoice_number} sudah melewati batas waktu. Segera lakukan pembayaran.`,
          paymentId: payment.id,
          invoiceNumber: payment.invoice_number,
          dueDate: payment.due_date,
          icon: "bi-exclamation-triangle",
          action: "upload",
        });
      }

      // 3. ✅ Alert untuk pembayaran yang akan jatuh tempo soon
      if (paymentUtils.isDueSoon(payment)) {
        alerts.push({
          type: "warning",
          title: "⏰ Akan Jatuh Tempo",
          message: `Tagihan ${
            payment.invoice_number
          } akan jatuh tempo pada ${formatDate(payment.due_date)}.`,
          paymentId: payment.id,
          invoiceNumber: payment.invoice_number,
          dueDate: payment.due_date,
          icon: "bi-clock",
          action: "upload",
        });
      }

      // 4. ✅ DIPERBAIKI: Alert untuk pembayaran yang butuh upload bukti - HANYA jika due_date ada
      if (paymentUtils.needsUpload(payment)) {
        alerts.push({
          type: "primary",
          title: "📤 Perlu Upload Bukti",
          message: `Silakan upload bukti pembayaran untuk ${paymentUtils.getInstallmentText(
            payment
          )}.`,
          paymentId: payment.id,
          invoiceNumber: payment.invoice_number,
          action: "upload",
          icon: "bi-upload",
        });
      }

      // 5. ✅ DIPERBAIKI: Alert untuk pembayaran yang sedang diverifikasi - HANYA jika belum diverifikasi
      if (paymentUtils.isWaitingVerification(payment)) {
        alerts.push({
          type: "secondary",
          title: "⏳ Menunggu Verifikasi Admin",
          message: `Bukti pembayaran untuk ${payment.invoice_number} sedang diverifikasi admin.`,
          paymentId: payment.id,
          invoiceNumber: payment.invoice_number,
          icon: "bi-hourglass-split",
        });
      }
    });

    // Sort alerts: danger first, then warning, then others
    return alerts.sort((a, b) => {
      const priority = {
        danger: 0,
        warning: 1,
        info: 2,
        primary: 3,
        secondary: 4,
      };
      return priority[a.type] - priority[b.type];
    });
  }, []);

  // =============================================
  // API CALLS & EFFECTS
  // =============================================
  const fetchPayments = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const response = await axios.get(`/api/payments/user/${user.id}`);
      if (response.data.success) {
        const paymentsData = Array.isArray(response.data.data)
          ? response.data.data
          : [];
        setPayments(paymentsData);

        // ✅ Generate alerts setelah data payments diterima
        const alerts = generatePaymentAlerts(paymentsData);
        setPaymentAlerts(alerts);
      } else {
        setMessage({
          type: "error",
          text: response.data.message || "Gagal memuat data pembayaran",
        });
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
      setMessage({
        type: "error",
        text: "Gagal memuat data pembayaran",
      });
    } finally {
      setLoading(false);
    }
  }, [user, generatePaymentAlerts]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // =============================================
  // FILE HANDLERS
  // =============================================
  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith("image/")) {
        setMessage({
          type: "error",
          text: "Hanya file gambar (JPG, PNG) yang diizinkan",
        });
        e.target.value = "";
        return;
      }

      if (selectedFile.size > 5 * 1024 * 1024) {
        setMessage({
          type: "error",
          text: "Ukuran file maksimal 5MB",
        });
        e.target.value = "";
        return;
      }

      setFile(selectedFile);
      setMessage({ type: "", text: "" });

      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    }
  };

  const handleUploadProof = async () => {
    if (!file || !selectedPayment) {
      setMessage({
        type: "error",
        text: "Pilih file bukti pembayaran terlebih dahulu",
      });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("proof_image", file);

    try {
      console.log("📤 Uploading proof for payment:", {
        id: selectedPayment.id,
        currentStatus: selectedPayment.status,
        invoice: selectedPayment.invoice_number,
      });

      const response = await axios.post(
        `/api/payments/${selectedPayment.id}/upload-proof`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        console.log(
          "✅ Upload successful, current status should remain:",
          selectedPayment.status
        );

        setMessage({
          type: "success",
          text: "Bukti pembayaran berhasil diupload dan menunggu verifikasi admin",
        });
        setShowUploadModal(false);
        setFile(null);
        setPreviewUrl(null);
        setSelectedPayment(null);

        // Refresh data untuk memastikan UI up-to-date
        await fetchPayments();
      } else {
        throw new Error(response.data.message || "Upload gagal");
      }
    } catch (error) {
      console.error("❌ Error uploading proof:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Gagal upload bukti pembayaran",
      });
    } finally {
      setUploading(false);
    }
  };

  // =============================================
  // RECEIPT & DOWNLOAD HANDLERS
  // =============================================
  const downloadReceipt = async (payment) => {
    try {
      console.log("Downloading receipt for payment:", payment.id);

      try {
        const response = await axios.get(
          `/api/payments/${payment.id}/receipt`,
          {
            responseType: "blob",
          }
        );

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          `kwitansi-${payment.receipt_number || payment.invoice_number}.pdf`
        );
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        setMessage({
          type: "success",
          text: "Kwitansi PDF berhasil diunduh",
        });
        return;
      } catch (pdfError) {
        console.log("PDF receipt not available, generating HTML receipt...");
      }

      const receiptWindow = window.open("", "_blank");
      const receiptDate = payment.payment_date
        ? new Date(payment.payment_date).toLocaleDateString("id-ID")
        : new Date().toLocaleDateString("id-ID");

      const totalAmount = paymentUtils.parseFloatSafe(
        payment.program_training_cost
      );
      const amountPaid = paymentUtils.parseFloatSafe(payment.amount_paid);
      const remaining = paymentUtils.calculateRemainingSafe(
        totalAmount,
        amountPaid
      );

      const currentInstallmentAmount =
        paymentUtils.getCurrentInstallmentAmount(payment);
      const installmentText = paymentUtils.getInstallmentText(payment);

      receiptWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>KWITANSI - ${
            payment.receipt_number || payment.invoice_number
          }</title>
          <style>
            body { font-family: 'Arial', sans-serif; margin: 20px; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
            .company-info { text-align: center; margin-bottom: 20px; }
            .receipt-info { margin-bottom: 25px; background: #f8f9fa; padding: 15px; border-radius: 5px; }
            .section { margin-bottom: 20px; }
            .section-title { background: #007bff; color: white; padding: 8px 12px; border-radius: 4px; margin-bottom: 10px; }
            .total { font-size: 18px; font-weight: bold; margin-top: 25px; padding: 15px; background: #e9ecef; border-radius: 5px; text-align: center; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            td { padding: 10px; border-bottom: 1px solid #ddd; vertical-align: top; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .border-top { border-top: 2px solid #333; }
            .signature-area { margin-top: 50px; text-align: right; }
            .progress-bar { background: #28a745; height: 20px; border-radius: 10px; margin: 10px 0; }
            .installment-highlight { background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>KWITANSI PEMBAYARAN</h1>
            <h3>Program Magang Perusahaan</h3>
          </div>

          <div class="company-info">
            <p><strong>PT. Intern Registration</strong></p>
            <p>Jl. Contoh Perusahaan No. 123, Jakarta</p>
            <p>Telp: (021) 123-4567 | Email: admin@company.com</p>
          </div>

          <div class="receipt-info">
            <table>
              <tr><td width="30%"><strong>No. Kwitansi</strong></td><td>: ${
                payment.receipt_number || payment.invoice_number
              }</td></tr>
              <tr><td><strong>No. Invoice</strong></td><td>: ${
                payment.invoice_number
              }</td></tr>
              <tr><td><strong>Tanggal Kwitansi</strong></td><td>: ${receiptDate}</td></tr>
              <tr><td><strong>Status Pembayaran</strong></td><td>: ${paymentUtils.getStatusText(
                payment.status
              )}</td></tr>
            </table>
          </div>

          <div class="installment-highlight">
            <h4 style="margin: 0; color: #856404;">${installmentText}</h4>
            <p style="margin: 5px 0; font-size: 18px;">
              <strong>Jumlah Cicilan Ini: ${paymentUtils.formatCurrency(
                currentInstallmentAmount
              )}</strong>
            </p>
          </div>

          <div class="section">
            <div class="section-title">DATA PESERTA</div>
            <table>
              <tr><td width="30%"><strong>Nama Lengkap</strong></td><td>: ${
                user?.full_name || "N/A"
              }</td></tr>
              <tr><td><strong>Email</strong></td><td>: ${
                user?.email || "N/A"
              }</td></tr>
              <tr><td><strong>Nomor Telepon</strong></td><td>: ${
                user?.phone || "N/A"
              }</td></tr>
            </table>
          </div>

          <div class="section">
            <div class="section-title">DETAIL PROGRAM</div>
            <table>
              <tr><td width="30%"><strong>Program Magang</strong></td><td>: ${
                payment.program_name || "N/A"
              }</td></tr>
              <tr><td><strong>Durasi Program</strong></td><td>: ${
                payment.program_duration || "N/A"
              }</td></tr>
              <tr><td><strong>Total Biaya Program</strong></td><td>: ${paymentUtils.formatCurrency(
                totalAmount
              )}</td></tr>
              <tr><td><strong>Plan Cicilan</strong></td><td>: ${
                payment.program_installment_plan || "4 cicilan"
              }</td></tr>
            </table>
          </div>

          <div class="section">
            <div class="section-title">PROGRESS PEMBAYARAN</div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
              <div class="progress-bar" style="width: ${safeCalculateProgress(
                payment
              )}%"></div>
              <div style="text-align: center; margin-top: 10px;">
                <strong>${safeCalculateProgress(payment).toFixed(1)}%</strong> 
                (${paymentUtils.formatCurrency(
                  amountPaid
                )} / ${paymentUtils.formatCurrency(totalAmount)})
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">RINCIAN PEMBAYARAN</div>
            <table>
              <tr><td><strong>Keterangan</strong></td><td class="text-right"><strong>Jumlah</strong></td></tr>
              <tr><td>Biaya Program ${
                payment.program_name || ""
              }</td><td class="text-right">${paymentUtils.formatCurrency(
        totalAmount
      )}</td></tr>
              <tr class="border-top"><td><strong>TOTAL TAGIHAN</strong></td><td class="text-right"><strong>${paymentUtils.formatCurrency(
                totalAmount
              )}</strong></td></tr>
              <tr><td><strong>SUDAH DIBAYAR</strong></td><td class="text-right"><strong>${paymentUtils.formatCurrency(
                amountPaid
              )}</strong></td></tr>
              ${
                remaining > 0
                  ? `<tr><td><strong>SISA TAGIHAN</strong></td><td class="text-right"><strong>${paymentUtils.formatCurrency(
                      remaining
                    )}</strong></td></tr>`
                  : ""
              }
            </table>
          </div>

          <div class="total">
            STATUS: ${
              payment.status === "paid"
                ? "LUNAS"
                : paymentUtils.getInstallmentText(payment).toUpperCase()
            }
          </div>

          ${
            payment.status === "paid"
              ? `
          <div class="section">
            <div class="section-title">KONFIRMASI PEMBAYARAN</div>
            <table>
              <tr><td width="30%"><strong>Status</strong></td><td>: <span style="color: green; font-weight: bold;">LUNAS</span></td></tr>
              <tr><td><strong>Tanggal Pembayaran</strong></td><td>: ${receiptDate}</td></tr>
              <tr><td><strong>Metode Pembayaran</strong></td><td>: ${
                payment.payment_method || "Transfer Bank"
              }</td></tr>
              ${
                payment.bank_name
                  ? `<tr><td><strong>Bank</strong></td><td>: ${payment.bank_name}</td></tr>`
                  : ""
              }
            </table>
          </div>`
              : ""
          }

          <div class="signature-area">
            <p>Jakarta, ${receiptDate}</p>
            <br><br><br>
            <p><strong>Admin PT. Intern Registration</strong></p>
          </div>

          <div class="footer">
            <p>** Kwitansi ini sah dan dapat digunakan sebagai bukti pembayaran yang valid **</p>
            <p>Terima kasih telah mempercayai program magang kami</p>
            <p>Generated on: ${new Date().toLocaleString("id-ID")}</p>
          </div>
        </body>
        </html>
      `);
      receiptWindow.document.close();

      setTimeout(() => {
        receiptWindow.print();
      }, 500);
    } catch (error) {
      console.error("Error generating receipt:", error);
      setMessage({
        type: "error",
        text: "Gagal mengunduh kwitansi: " + (error.message || "Unknown error"),
      });
    }
  };

  // =============================================
  // MODAL HANDLERS
  // =============================================
  const handleShowDetail = (payment) => {
    setSelectedPayment(payment);
    setShowDetailModal(true);
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedPayment(null);
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setSelectedPayment(null);
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  // =============================================
  // VALIDATION FUNCTIONS
  // =============================================
  const canUploadProof = (payment) => {
    return (
      payment.status === "pending" || payment.status.startsWith("installment_")
    );
  };

  const canDownloadReceipt = (payment) => {
    // ✅ PERBAIKAN: Bisa download jika sudah diverifikasi dan bukan status pending
    return (
      payment.verified_by &&
      payment.status !== "pending" &&
      payment.status !== "cancelled"
    );
  };

  // =============================================
  // ALERT HANDLERS
  // =============================================
  const handleAlertAction = (alert) => {
    if (alert.action === "upload") {
      const payment = payments.find((p) => p.id === alert.paymentId);
      if (payment) {
        setSelectedPayment(payment);
        setShowUploadModal(true);
      }
    }
  };

  const dismissAlert = (index) => {
    setPaymentAlerts((prev) => prev.filter((_, i) => i !== index));
  };

  const dismissAllAlerts = () => {
    setPaymentAlerts([]);
  };

  // =============================================
  // RENDER COMPONENT
  // =============================================
  if (loading) {
    return (
      <div className="container mt-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Hitung jumlah per jenis alert untuk summary
  const alertCounts = {
    danger: paymentAlerts.filter((alert) => alert.type === "danger").length,
    warning: paymentAlerts.filter((alert) => alert.type === "warning").length,
    info: paymentAlerts.filter((alert) => alert.type === "info").length,
    primary: paymentAlerts.filter((alert) => alert.type === "primary").length,
    secondary: paymentAlerts.filter((alert) => alert.type === "secondary")
      .length,
  };

  return (
    <div className="container mt-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col">
          <h2>Manajemen Pembayaran</h2>
          <p className="text-muted">
            Kelola pembayaran program magang Anda - Sistem Invoice Progresif
          </p>

          {/* ✅ DIPERBAIKI: Quick Status Summary yang lebih informatif */}
          {paymentAlerts.length > 0 && (
            <div className="alert alert-warning mb-0 mt-2">
              <div className="d-flex align-items-center">
                <i className="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
                <div>
                  <strong>
                    Perhatian: Anda memiliki {paymentAlerts.length}{" "}
                    pemberitahuan:
                  </strong>
                  <div className="mt-1">
                    {alertCounts.danger > 0 && (
                      <span className="badge bg-danger me-2">
                        <i className="bi bi-flag-fill me-1"></i>
                        Terlambat: {alertCounts.danger}
                      </span>
                    )}
                    {alertCounts.warning > 0 && (
                      <span className="badge bg-warning text-dark me-2">
                        <i className="bi bi-clock me-1"></i>
                        Akan Jatuh Tempo: {alertCounts.warning}
                      </span>
                    )}
                    {alertCounts.info > 0 && (
                      <span className="badge bg-info me-2">
                        <i className="bi bi-credit-card me-1"></i>
                        Tagihan Baru: {alertCounts.info}
                      </span>
                    )}
                    {alertCounts.primary > 0 && (
                      <span className="badge bg-primary me-2">
                        <i className="bi bi-upload me-1"></i>
                        Perlu Upload: {alertCounts.primary}
                      </span>
                    )}
                    {alertCounts.secondary > 0 && (
                      <span className="badge bg-secondary me-2">
                        <i className="bi bi-hourglass-split me-1"></i>
                        Menunggu Verifikasi: {alertCounts.secondary}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Alert Message */}
      {message.text && (
        <div
          className={`alert alert-${
            message.type === "error"
              ? "danger"
              : message.type === "success"
              ? "success"
              : "info"
          } alert-dismissible fade show`}
          role="alert"
        >
          {message.text}
          <button
            type="button"
            className="btn-close"
            onClick={() => setMessage({ type: "", text: "" })}
            aria-label="Close"
          ></button>
        </div>
      )}

      {/* ✅ Payment Alerts Section */}
      {paymentAlerts.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                <h6 className="mb-0">
                  <i className="bi bi-bell-fill me-2"></i>
                  Pemberitahuan Pembayaran
                </h6>
                <span className="badge bg-light text-primary">
                  {paymentAlerts.length}
                </span>
              </div>
              <div className="card-body p-0">
                {paymentAlerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`alert alert-${alert.type} alert-dismissible fade show m-3 mb-2`}
                    role="alert"
                  >
                    <div className="d-flex align-items-start">
                      <i className={`bi ${alert.icon} me-3 mt-1 fs-5`}></i>
                      <div className="flex-grow-1">
                        <h6 className="alert-heading mb-1">{alert.title}</h6>
                        <p className="mb-1">{alert.message}</p>
                        {alert.amount && (
                          <p className="mb-1">
                            <strong>
                              Jumlah:{" "}
                              {paymentUtils.formatCurrency(alert.amount)}
                            </strong>
                          </p>
                        )}
                        {alert.dueDate && (
                          <small className="text-muted">
                            <i className="bi bi-calendar-event me-1"></i>
                            Jatuh tempo: {formatDate(alert.dueDate)}
                          </small>
                        )}
                      </div>
                      <div className="ms-3 d-flex flex-column gap-1">
                        {alert.action && (
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleAlertAction(alert)}
                          >
                            <i className="bi bi-upload me-1"></i>
                            Upload
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-close"
                          onClick={() => dismissAlert(index)}
                          aria-label="Close"
                        ></button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Quick Actions */}
                <div className="p-3 bg-light border-top">
                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-muted">
                      {paymentAlerts.length} pemberitahuan aktif
                    </small>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={dismissAllAlerts}
                    >
                      <i className="bi bi-eye-slash me-1"></i>
                      Sembunyikan Semua
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Information Card */}
      <div className="alert alert-info mb-4">
        <p className="mb-0">
          <i className="bi bi-info-circle"></i>{" "}
          <strong>Tagihan hanya muncul ketika admin menerbitkannya.</strong>{" "}
          Anda akan mendapatkan notifikasi ketika tagihan cicilan berikutnya
          tersedia.
        </p>
      </div>

      {/* Payments List */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Invoice Pembayaran</h5>
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={fetchPayments}
                disabled={loading}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
            <div className="card-body">
              {payments.length === 0 ? (
                <div className="text-center py-4">
                  <div className="text-muted mb-3">
                    <i className="bi bi-receipt display-4"></i>
                  </div>
                  <h5>Belum ada pembayaran</h5>
                  <p className="text-muted">
                    Setelah mendaftar program, invoice pembayaran akan muncul di
                    sini.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped table-hover">
                    <thead className="table-light align-middle">
                      <tr>
                        <th>Invoice</th>
                        <th>Program & Biaya</th>
                        <th>Progress Pembayaran</th>
                        <th>Status & Jatuh Tempo</th>
                        <th>Kwitansi</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="align-middle">
                      {payments.map((payment) => {
                        const progress = safeCalculateProgress(payment);
                        const isPaymentOverdue =
                          paymentUtils.isOverdue(payment);
                        const currentInstallmentAmount =
                          paymentUtils.getCurrentInstallmentAmount(payment);

                        return (
                          <tr key={payment.id}>
                            <td>
                              <div>
                                <strong className="d-block">
                                  {payment.invoice_number}
                                </strong>
                                {payment.receipt_number && (
                                  <small className="text-success">
                                    Kwitansi: {payment.receipt_number}
                                  </small>
                                )}
                                {(payment.status === "pending" ||
                                  payment.status.startsWith("installment_")) &&
                                  payment.due_date && (
                                    <div className="small text-primary mt-1">
                                      <strong>
                                        Cicilan:{" "}
                                        {paymentUtils.formatCurrency(
                                          currentInstallmentAmount
                                        )}
                                      </strong>
                                    </div>
                                  )}
                              </div>
                            </td>
                            <td>
                              <div className="fw-bold">
                                {payment.program_name}
                              </div>
                              <div className="small text-muted">
                                {payment.program_duration}
                              </div>
                              <div className="small">
                                <strong>
                                  Total:{" "}
                                  {paymentUtils.formatCurrency(
                                    payment.program_training_cost
                                  )}
                                </strong>
                              </div>
                              <div className="small text-muted">
                                Plan:{" "}
                                {payment.program_installment_plan ||
                                  "4 cicilan"}
                              </div>
                            </td>
                            <td>
                              <div
                                className="progress"
                                style={{ height: "20px" }}
                              >
                                <div
                                  className="progress-bar bg-success"
                                  role="progressbar"
                                  style={{ width: `${progress}%` }}
                                >
                                  {progress.toFixed(0)}%
                                </div>
                              </div>
                              <div className="small text-center mt-1">
                                {paymentUtils.formatCurrency(
                                  payment.amount_paid
                                )}{" "}
                                /{" "}
                                {paymentUtils.formatCurrency(
                                  payment.program_training_cost
                                )}
                              </div>
                              {progress < 100 && (
                                <div className="small text-muted text-center">
                                  Sisa:{" "}
                                  {paymentUtils.formatCurrency(
                                    safeCalculateRemaining(payment)
                                  )}
                                </div>
                              )}
                            </td>
                            <td>
                              <div>
                                {paymentUtils.getStatusBadge(payment.status)}
                                {payment.due_date && (
                                  <div
                                    className={`small mt-1 ${
                                      isPaymentOverdue
                                        ? "text-danger fw-bold"
                                        : "text-muted"
                                    }`}
                                  >
                                    <i className="bi bi-calendar-event me-1"></i>
                                    Jatuh tempo: {formatDate(payment.due_date)}
                                    {isPaymentOverdue && (
                                      <span className="badge bg-danger ms-1">
                                        Terlambat
                                      </span>
                                    )}
                                  </div>
                                )}
                                {!payment.due_date &&
                                  (payment.status === "pending" ||
                                    payment.status.startsWith(
                                      "installment_"
                                    )) && (
                                    <div className="small text-muted mt-1">
                                      <i className="bi bi-clock me-1"></i>
                                      Menunggu tagihan dari admin
                                    </div>
                                  )}
                              </div>
                            </td>
                            <td>
                              {payment.receipt_number ? (
                                <span className="badge bg-success">
                                  {payment.receipt_number}
                                </span>
                              ) : (
                                <span className="badge bg-secondary">-</span>
                              )}
                            </td>
                            <td>
                              <div className="btn-group btn-group-sm">
                                {/* Upload Proof Button - Hanya jika due_date ada */}
                                {canUploadProof(payment) &&
                                  payment.due_date && (
                                    <button
                                      className="btn btn-outline-primary"
                                      onClick={() => {
                                        setSelectedPayment(payment);
                                        setShowUploadModal(true);
                                      }}
                                      title="Upload Bukti Bayar"
                                    >
                                      <i className="bi bi-upload"></i>
                                    </button>
                                  )}

                                {/* Download Receipt Button */}
                                {canDownloadReceipt(payment) && (
                                  <button
                                    className="btn btn-outline-primary"
                                    onClick={() => downloadReceipt(payment)}
                                    title="Download Kwitansi"
                                  >
                                    <i className="bi bi-download"></i>
                                  </button>
                                )}

                                {/* View Details Button */}
                                <button
                                  className="btn btn-outline-primary"
                                  onClick={() => handleShowDetail(payment)}
                                  title="Lihat Detail Pembayaran"
                                >
                                  <i className="bi bi-eye"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upload Proof Modal */}
      {showUploadModal && selectedPayment && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
          tabIndex="-1"
          role="dialog"
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Upload Bukti Pembayaran</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseUploadModal}
                  disabled={uploading}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row mb-4">
                  <div className="col-md-6">
                    <h6>Informasi Pembayaran</h6>
                    <p>
                      <strong>Invoice:</strong> {selectedPayment.invoice_number}
                    </p>
                    <p>
                      <strong>Program:</strong> {selectedPayment.program_name}
                    </p>
                    <p>
                      <strong>Status Saat Ini:</strong>{" "}
                      {paymentUtils.getInstallmentText(selectedPayment)}
                    </p>
                    <p>
                      <strong>Jumlah Cicilan:</strong>{" "}
                      {paymentUtils.formatCurrency(
                        paymentUtils.getCurrentInstallmentAmount(
                          selectedPayment
                        )
                      )}
                    </p>
                    {selectedPayment.due_date && (
                      <p
                        className={
                          paymentUtils.isOverdue(selectedPayment)
                            ? "text-danger fw-bold"
                            : ""
                        }
                      >
                        <strong>Jatuh Tempo:</strong>{" "}
                        {formatDate(selectedPayment.due_date)}
                        {paymentUtils.isOverdue(selectedPayment) && (
                          <span className="badge bg-danger ms-2">
                            TERLAMBAT
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="col-md-6">
                    <h6>Detail Biaya</h6>
                    <p>
                      <strong>Total Biaya:</strong>{" "}
                      {paymentUtils.formatCurrency(
                        selectedPayment.program_training_cost
                      )}
                    </p>
                    <p>
                      <strong>Sudah Dibayar:</strong>{" "}
                      {paymentUtils.formatCurrency(selectedPayment.amount_paid)}
                    </p>
                    <p>
                      <strong>Sisa Tagihan:</strong>{" "}
                      {paymentUtils.formatCurrency(
                        safeCalculateRemaining(selectedPayment)
                      )}
                    </p>
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="proofFile" className="form-label">
                    Pilih File Bukti Pembayaran *
                  </label>
                  <input
                    type="file"
                    className="form-control"
                    id="proofFile"
                    accept="image/*"
                    onChange={handleFileSelect}
                    disabled={uploading}
                  />
                  <div className="form-text">
                    Format: JPG, PNG, GIF (Maksimal 5MB)
                  </div>
                </div>

                {previewUrl && (
                  <div className="mb-3">
                    <h6>Preview:</h6>
                    <img
                      src={previewUrl}
                      alt="Preview bukti pembayaran"
                      className="img-fluid rounded border"
                      style={{ maxHeight: "300px" }}
                    />
                  </div>
                )}

                {file && (
                  <div className="alert alert-info">
                    <strong>File terpilih:</strong> {file.name}
                    <br />
                    <small>
                      Size: {(file.size / 1024 / 1024).toFixed(2)} MB
                    </small>
                  </div>
                )}

                {paymentUtils.isOverdue(selectedPayment) && (
                  <div className="alert alert-warning">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    Pembayaran ini sudah melewati batas waktu. Segera lakukan
                    pembayaran.
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseUploadModal}
                  disabled={uploading}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleUploadProof}
                  disabled={!file || uploading}
                >
                  {uploading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-upload me-2"></i>Upload Bukti
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Payment Modal */}
      {showDetailModal && selectedPayment && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
          tabIndex="-1"
          role="dialog"
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-receipt me-2"></i>Detail Invoice -{" "}
                  {paymentUtils.getInstallmentText(selectedPayment)}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseDetail}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <div className="card mb-3">
                      <div className="card-header bg-primary text-white">
                        <h6 className="mb-0">Informasi Invoice</h6>
                      </div>
                      <div className="card-body">
                        <table className="table table-sm table-borderless">
                          <tbody>
                            <tr>
                              <td>
                                <strong>Nomor Invoice:</strong>
                              </td>
                              <td>{selectedPayment.invoice_number}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Nomor Kwitansi:</strong>
                              </td>
                              <td>
                                {selectedPayment.receipt_number ? (
                                  <span className="badge bg-success">
                                    {selectedPayment.receipt_number}
                                  </span>
                                ) : (
                                  <span className="badge bg-secondary">-</span>
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Program:</strong>
                              </td>
                              <td>{selectedPayment.program_name}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Durasi:</strong>
                              </td>
                              <td>{selectedPayment.program_duration}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Plan Cicilan:</strong>
                              </td>
                              <td>
                                {selectedPayment.program_installment_plan ||
                                  "4 cicilan"}
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Jumlah Cicilan Ini:</strong>
                              </td>
                              <td>
                                <strong>
                                  {paymentUtils.formatCurrency(
                                    paymentUtils.getCurrentInstallmentAmount(
                                      selectedPayment
                                    )
                                  )}
                                </strong>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Jatuh Tempo:</strong>
                              </td>
                              <td>
                                {selectedPayment.due_date ? (
                                  <span
                                    className={
                                      paymentUtils.isOverdue(selectedPayment)
                                        ? "text-danger fw-bold"
                                        : ""
                                    }
                                  >
                                    {formatDate(selectedPayment.due_date)}
                                    {paymentUtils.isOverdue(
                                      selectedPayment
                                    ) && (
                                      <span className="badge bg-danger ms-2">
                                        TERLAMBAT
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="card mb-3">
                      <div className="card-header bg-primary text-white">
                        <h6 className="mb-0">Status Pembayaran</h6>
                      </div>
                      <div className="card-body">
                        <table className="table table-sm table-borderless">
                          <tbody>
                            <tr>
                              <td>
                                <strong>Status:</strong>
                              </td>
                              <td>
                                {paymentUtils.getStatusBadge(
                                  selectedPayment.status
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Tanggal Invoice:</strong>
                              </td>
                              <td>{formatDate(selectedPayment.created_at)}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Tanggal Bayar:</strong>
                              </td>
                              <td>
                                {selectedPayment.payment_date
                                  ? formatDateTime(selectedPayment.payment_date)
                                  : "-"}
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Terverifikasi Oleh:</strong>
                              </td>
                              <td>
                                {selectedPayment.verified_by
                                  ? "Admin"
                                  : "Belum diverifikasi"}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card mb-3">
                  <div className="card-header bg-primary text-white">
                    <h6 className="mb-0">Progress Pembayaran</h6>
                  </div>
                  <div className="card-body">
                    <div className="row text-center">
                      <div className="col-md-4">
                        <div className="border rounded p-3">
                          <h5 className="text-primary">
                            {paymentUtils.formatCurrency(
                              selectedPayment.program_training_cost
                            )}
                          </h5>
                          <small className="text-muted">
                            Total Biaya Program
                          </small>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="border rounded p-3">
                          <h5 className="text-success">
                            {paymentUtils.formatCurrency(
                              selectedPayment.amount_paid
                            )}
                          </h5>
                          <small className="text-muted">Sudah Dibayar</small>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="border rounded p-3">
                          <h5 className="text-warning">
                            {paymentUtils.formatCurrency(
                              safeCalculateRemaining(selectedPayment)
                            )}
                          </h5>
                          <small className="text-muted">Sisa Tagihan</small>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="progress" style={{ height: "25px" }}>
                        <div
                          className="progress-bar bg-success"
                          role="progressbar"
                          style={{
                            width: `${safeCalculateProgress(selectedPayment)}%`,
                          }}
                        >
                          {safeCalculateProgress(selectedPayment).toFixed(0)}%
                        </div>
                      </div>
                      <div className="d-flex justify-content-between mt-1">
                        <small>0%</small>
                        <small>100%</small>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedPayment.payment_method && (
                  <div className="card mb-3">
                    <div className="card-header bg-primary text-white">
                      <h6 className="mb-0">Metode Pembayaran</h6>
                    </div>
                    <div className="card-body">
                      <table className="table table-sm table-borderless">
                        <tbody>
                          <tr>
                            <td width="30%">
                              <strong>Metode:</strong>
                            </td>
                            <td>{selectedPayment.payment_method}</td>
                          </tr>
                          {selectedPayment.bank_name && (
                            <tr>
                              <td>
                                <strong>Bank:</strong>
                              </td>
                              <td>{selectedPayment.bank_name}</td>
                            </tr>
                          )}
                          {selectedPayment.account_number && (
                            <tr>
                              <td>
                                <strong>No. Rekening:</strong>
                              </td>
                              <td>{selectedPayment.account_number}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {selectedPayment.notes && (
                  <div className="card">
                    <div className="card-header bg-primary text-white">
                      <h6 className="mb-0">Catatan</h6>
                    </div>
                    <div className="card-body">
                      <p className="mb-0">{selectedPayment.notes}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseDetail}
                >
                  Tutup
                </button>
                {canDownloadReceipt(selectedPayment) && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      downloadReceipt(selectedPayment);
                      handleCloseDetail();
                    }}
                  >
                    <i className="bi bi-download me-2"></i>Download Kwitansi{" "}
                    {paymentUtils.getInstallmentText(selectedPayment)}
                  </button>
                )}
                {canUploadProof(selectedPayment) &&
                  selectedPayment.due_date && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        handleCloseDetail();
                        setSelectedPayment(selectedPayment);
                        setShowUploadModal(true);
                      }}
                    >
                      <i className="bi bi-upload me-2"></i>Upload Bukti Bayar
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payment;
