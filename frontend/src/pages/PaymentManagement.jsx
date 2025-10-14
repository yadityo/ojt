import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

// Utility functions
const paymentUtils = {
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

  getPaymentMethodText: (method) => {
    const methods = {
      transfer: "Transfer Bank",
      cash: "Tunai",
      credit_card: "Kartu Kredit",
    };
    return methods[method] || method;
  },

  calculateSafe: (a, b, operation = "add") => {
    // Konversi ke sen (cent) untuk menghindari floating point
    const toCents = (value) => Math.round(parseFloat(value || 0) * 100);
    const fromCents = (cents) => cents / 100;

    const aCents = toCents(a);
    const bCents = toCents(b);

    switch (operation) {
      case "add":
        return fromCents(aCents + bCents);
      case "subtract":
        return fromCents(aCents - bCents);
      case "multiply":
        return fromCents(aCents * bCents);
      case "divide":
        return fromCents(aCents / bCents);
      default:
        return fromCents(aCents + bCents);
    }
  },

  formatCurrency: (value, defaultValue = "0") => {
    if (value === null || value === undefined || value === "") {
      return defaultValue;
    }

    // Gunakan pendekatan yang lebih aman untuk angka besar
    const numValue = typeof value === "number" ? value : parseFloat(value);
    if (isNaN(numValue)) {
      return defaultValue;
    }

    // Bulatkan ke bilangan bulat untuk menghindari desimal
    return Math.round(numValue).toLocaleString("id-ID");
  },

  parseFloatSafe: (value, defaultValue = 0) => {
    if (value === null || value === undefined || value === "") {
      return defaultValue;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return defaultValue;
    }

    // Bulatkan ke 2 desimal untuk konsistensi
    return Math.round(numValue * 100) / 100;
  },

  calculateRemainingSafe: (total, paid) => {
    const totalCents = Math.round(parseFloat(total || 0) * 100);
    const paidCents = Math.round(parseFloat(paid || 0) * 100);
    return Math.max(0, (totalCents - paidCents) / 100);
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

  calculateNextInstallment: (payment) => {
    if (!payment || !payment.program_training_cost) {
      console.error("❌ calculateNextInstallment: Data tidak lengkap");
      return {
        number: null,
        amount: 0,
        error: "Data tidak lengkap",
      };
    }

    try {
      const totalAmount = paymentUtils.parseFloatSafe(
        payment.program_training_cost
      );
      const paidAmount = paymentUtils.parseFloatSafe(payment.amount_paid || 0);

      // ✅ PERBAIKAN: Validasi jika sudah lunas
      if (paidAmount >= totalAmount) {
        console.log("✅ calculateNextInstallment: Sudah lunas");
        return {
          number: null,
          amount: 0,
          message: "Pembayaran sudah lunas",
        };
      }

      const remaining = Math.max(0, totalAmount - paidAmount);

      console.log("💰 calculateNextInstallment inputs:", {
        totalAmount,
        paidAmount,
        remaining,
        currentStatus: payment.status,
      });

      // Dapatkan installment plan
      const installmentCount = payment.program_installment_plan
        ? parseInt(payment.program_installment_plan.split("_")[0]) || 4
        : 4;

      let nextInstallmentNumber = 1;

      // ✅ PERBAIKAN: Tentukan cicilan berikutnya dengan logika yang benar
      if (payment.status === "pending") {
        nextInstallmentNumber = 1;
      } else if (payment.status.startsWith("installment_")) {
        const currentInstallment = parseInt(payment.status.split("_")[1]);

        // Validasi: current installment harus valid number
        if (isNaN(currentInstallment)) {
          console.error("❌ Invalid current installment:", payment.status);
          return {
            number: null,
            amount: 0,
            error: "Status installment tidak valid",
          };
        }

        nextInstallmentNumber = currentInstallment + 1;

        // Validasi batas cicilan
        if (nextInstallmentNumber > installmentCount) {
          console.log("✅ calculateNextInstallment: Maksimal cicilan tercapai");
          return {
            number: null,
            amount: 0,
            message: `Maksimal ${installmentCount} cicilan sudah tercapai`,
          };
        }
      } else {
        // Status tidak dikenali, default ke cicilan 1
        nextInstallmentNumber = 1;
      }

      // Hitung amount untuk cicilan berikutnya
      let installmentAmount = 0;
      const remainingInstallments =
        installmentCount - (nextInstallmentNumber - 1);

      if (remainingInstallments === 1) {
        // Cicilan terakhir - pakai semua sisa
        installmentAmount = remaining;
      } else {
        // Bagi rata, bulatkan ke ribuan terdekat
        installmentAmount =
          Math.round(remaining / remainingInstallments / 1000) * 1000;
      }

      // Pastikan tidak melebihi sisa
      installmentAmount = Math.min(installmentAmount, remaining);

      // Validasi amount minimal
      if (installmentAmount <= 0) {
        console.error("❌ calculateNextInstallment: Amount cicilan <= 0");
        return {
          number: null,
          amount: 0,
          error: "Amount cicilan tidak valid",
        };
      }

      const result = {
        number: nextInstallmentNumber,
        amount: installmentAmount,
        totalInstallments: installmentCount,
        remainingAmount: remaining,
      };

      console.log("✅ calculateNextInstallment result:", result);
      return result;
    } catch (error) {
      console.error("❌ Error calculating installment:", error);
      return {
        number: null,
        amount: 0,
        error: error.message,
      };
    }
  },
};

const PaymentManagement = () => {
  const [payments, setPayments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    status: "all",
    program: "all",
    search: "",
  });

  // Modal states
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Form states
  const [stats, setStats] = useState(null);
  const [formData, setFormData] = useState({
    registration_id: "",
    amount: "",
    amount_paid: "",
    payment_method: "transfer",
    bank_name: "",
    account_number: "",
    status: "pending",
    payment_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // ✅ PERBAIKAN: State untuk file upload
  const [proofFile, setProofFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Verification form state
  const [verificationForm, setVerificationForm] = useState({
    status: "paid",
    rejection_reason: "",
    amount_paid: 0,
  });

  // Invoice form state - DIPERBAIKI: due_date lebih fleksibel
  const [invoiceForm, setInvoiceForm] = useState({
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default 30 hari
      .toISOString()
      .split("T")[0],
    amount: 0,
    installment_number: 1,
    notes: "",
  });

  const { user } = useAuth();
  const abortControllerRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Fetch initial data
  useEffect(() => {
    fetchPrograms();
    fetchRegistrations();
    fetchStatistics();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Fetch payments when filters change
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(
      () => {
        fetchPayments();
      },
      filters.search ? 500 : 0
    );

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [filters.status, filters.program, filters.search]);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      const params = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (filters[key] !== "all" && filters[key] !== "") {
          params.append(key, filters[key]);
        }
      });

      const response = await axios.get(`/api/payments?${params}`, {
        signal: abortControllerRef.current.signal,
      });

      if (response.data?.success) {
        const paymentsData = Array.isArray(response.data.data)
          ? response.data.data
          : [];
        setPayments(paymentsData);

        // ✅ LOG untuk debugging
        console.log(
          "📥 Fetched payments:",
          paymentsData.map((p) => ({
            id: p.id,
            invoice: p.invoice_number,
            status: p.status,
            amount_paid: p.amount_paid,
          }))
        );
      } else {
        throw new Error("Format respons tidak valid");
      }
    } catch (error) {
      if (axios.isCancel(error)) {
        return;
      }
      console.error("Error fetching payments:", error);
      setError(error.response?.data?.message || "Error loading payment data");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchPrograms = useCallback(async () => {
    try {
      const response = await axios.get("/api/programs");
      if (response.data?.success) {
        setPrograms(
          Array.isArray(response.data.data) ? response.data.data : []
        );
      }
    } catch (error) {
      console.error("Error fetching programs:", error);
    }
  }, []);

  // ✅ PERBAIKAN BESAR: Fetch registrations dengan error handling yang lebih baik
  const fetchRegistrations = useCallback(async () => {
    try {
      console.log("🔄 Fetching registrations...");
      const response = await axios.get("/api/registrations");

      if (response.data?.success) {
        const registrationsData = Array.isArray(response.data.data)
          ? response.data.data
          : [];

        console.log("✅ Registrations loaded:", registrationsData.length);
        setRegistrations(registrationsData);

        // Debug: Log registration IDs untuk troubleshooting
        if (registrationsData.length > 0) {
          console.log(
            "📋 Available registration IDs:",
            registrationsData.map((reg) => ({
              id: reg.id,
              code: reg.registration_code,
              name: reg.full_name,
              program: reg.program_name,
            }))
          );
        }
      } else {
        throw new Error("Format respons registrasi tidak valid");
      }
    } catch (error) {
      console.error("❌ Error fetching registrations:", error);
      setError(
        "Gagal memuat data pendaftaran: " +
          (error.response?.data?.message || error.message)
      );
    }
  }, []);

  const fetchStatistics = useCallback(async () => {
    try {
      const response = await axios.get("/api/payments/statistics");
      if (response.data?.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching payment statistics:", error);
    }
  }, []);

  const getImageUrl = useCallback((path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `${process.env.REACT_APP_API_URL || "http://localhost:5000"}${path}`;
  }, []);

  // ✅ PERBAIKAN: Handle file upload untuk bukti pembayaran
  const handleFileUpload = async (paymentId, file) => {
    if (!file) return null;

    try {
      setUploadLoading(true);
      const formData = new FormData();
      formData.append("proof_image", file);

      const response = await axios.post(
        `/api/payments/${paymentId}/upload-proof`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data?.success) {
        console.log(
          "✅ Bukti pembayaran berhasil diupload:",
          response.data.data
        );
        return response.data.data.proof_image;
      } else {
        throw new Error("Upload bukti pembayaran gagal");
      }
    } catch (error) {
      console.error("❌ Error uploading proof:", error);
      throw new Error(
        "Gagal mengupload bukti pembayaran: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setUploadLoading(false);
    }
  };

  // ✅ PERBAIKAN: Handle file change
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validasi file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Ukuran file terlalu besar. Maksimal 5MB.");
        e.target.value = "";
        return;
      }

      // Validasi file type
      if (!file.type.startsWith("image/")) {
        alert("Hanya file gambar yang diizinkan.");
        e.target.value = "";
        return;
      }

      setProofFile(file);
    }
  };

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const handleSearchChange = useCallback(
    (value) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        handleFilterChange("search", value);
      }, 0);
    },
    [handleFilterChange]
  );

  const handleViewDetails = async (payment) => {
    if (!payment?.id) {
      alert("Data pembayaran tidak valid");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`/api/payments/${payment.id}`);
      if (response.data?.success) {
        setSelectedPayment(response.data.data);
        setShowDetailModal(true);
      } else {
        throw new Error("Format respons tidak valid");
      }
    } catch (error) {
      console.error("Error fetching payment details:", error);
      alert(
        "Error loading payment details: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenVerification = async (payment) => {
    if (!payment?.id) {
      alert("Data pembayaran tidak valid");
      return;
    }

    try {
      setLoading(true); // ✅ Set loading true di awal

      console.log("🔍 Opening verification for payment:", {
        id: payment.id,
        currentStatus: payment.status,
        invoice: payment.invoice_number,
      });

      // ✅ AMBIL DATA TERBARU dari server untuk memastikan data fresh
      const response = await axios.get(`/api/payments/${payment.id}`);
      if (response.data?.success) {
        const latestPayment = response.data.data;
        setSelectedPayment(latestPayment);

        const totalAmount = paymentUtils.parseFloatSafe(
          latestPayment.program_training_cost
        );
        const paidAmount = paymentUtils.parseFloatSafe(
          latestPayment.amount_paid
        );
        const remainingAmount = totalAmount - paidAmount;

        console.log("📊 Latest payment details:", {
          currentStatus: latestPayment.status,
          amountPaid: paidAmount,
          totalAmount: totalAmount,
          remaining: remainingAmount,
        });

        // ✅ PERBAIKAN: Validasi konsistensi data sebelum buka modal
        const installmentCount = latestPayment.program_installment_plan
          ? parseInt(latestPayment.program_installment_plan.split("_")[0])
          : 4;

        let currentInstallment = 0;
        if (latestPayment.status === "pending") {
          currentInstallment = 0;
        } else if (latestPayment.status.startsWith("installment_")) {
          currentInstallment = parseInt(latestPayment.status.split("_")[1]);
        }

        const expectedAmountPaid =
          (totalAmount / installmentCount) * currentInstallment;
        const discrepancy = Math.abs(paidAmount - expectedAmountPaid);

        if (discrepancy > 1000) {
          alert(
            `⚠️ PERINGATAN: Data pembayaran tidak konsisten!\n\nStatus: ${
              latestPayment.status
            }\nSudah Dibayar: Rp ${paymentUtils.formatCurrency(
              paidAmount
            )}\nSeharusnya: Rp ${paymentUtils.formatCurrency(
              expectedAmountPaid
            )}\n\nSilakan hubungi administrator.`
          );
          return;
        }

        // ✅ PERBAIKAN: Tentukan status berikutnya secara OTOMATIS dan AKURAT
        let nextStatus = "";
        let suggestedAmount = 0;

        // Logika status progression yang benar
        if (latestPayment.status === "pending") {
          nextStatus = "installment_1";
          console.log("🔄 Progress: pending → installment_1");
        } else if (latestPayment.status.startsWith("installment_")) {
          const currentInstallment = parseInt(
            latestPayment.status.split("_")[1]
          );
          const totalInstallments = latestPayment.program_installment_plan
            ? parseInt(latestPayment.program_installment_plan.split("_")[0])
            : 4;

          console.log(
            `📊 Installment info: current=${currentInstallment}, total=${totalInstallments}`
          );

          if (currentInstallment < totalInstallments) {
            nextStatus = `installment_${currentInstallment + 1}`;
            console.log(`🔄 Progress: ${latestPayment.status} → ${nextStatus}`);
          } else {
            nextStatus = "paid";
            console.log(`🔄 Progress: ${latestPayment.status} → paid (final)`);
          }
        } else if (latestPayment.status === "paid") {
          alert("Pembayaran sudah lunas");
          return;
        } else {
          // Fallback
          nextStatus = "installment_1";
          console.log("⚠️ Unknown status, default to installment_1");
        }

        // Hitung suggested amount
        const nextInstallment =
          paymentUtils.calculateNextInstallment(latestPayment);
        suggestedAmount = nextInstallment.amount || 0;

        // Untuk status paid, gunakan sisa tagihan
        if (nextStatus === "paid") {
          suggestedAmount = remainingAmount;
        }

        suggestedAmount = Math.min(suggestedAmount, remainingAmount);

        console.log("🔧 Final verification setup:", {
          currentStatus: latestPayment.status,
          nextStatus: nextStatus,
          suggestedAmount: suggestedAmount,
        });

        setVerificationForm({
          status: nextStatus,
          rejection_reason: "",
          amount_paid: suggestedAmount,
        });
        setShowVerificationModal(true);
      } else {
        throw new Error("Gagal mengambil data terbaru payment");
      }
    } catch (error) {
      console.error("Error preparing verification:", error);
      alert("Error mempersiapkan verifikasi: " + error.message);
    } finally {
      setLoading(false); // ✅ Pastikan loading false di finally
    }
  };

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();

    if (!selectedPayment?.id) {
      alert("Data pembayaran tidak valid");
      return;
    }

    if (
      verificationForm.status === "cancelled" &&
      !verificationForm.rejection_reason.trim()
    ) {
      alert("Harap berikan alasan penolakan");
      return;
    }

    const paymentAmount = paymentUtils.parseFloatSafe(
      verificationForm.amount_paid
    );
    if (paymentAmount <= 0) {
      alert("Jumlah pembayaran harus lebih dari 0");
      return;
    }

    const totalAmount = paymentUtils.parseFloatSafe(
      selectedPayment.program_training_cost
    );
    const currentPaidAmount = paymentUtils.parseFloatSafe(
      selectedPayment.amount_paid
    );
    const newTotalPaid = paymentUtils.calculateSafe(
      currentPaidAmount,
      paymentAmount,
      "add"
    );

    // Validasi tidak melebihi total amount
    if (newTotalPaid > totalAmount) {
      alert(
        `Jumlah pembayaran melebihi sisa tagihan. Sisa tagihan: Rp ${paymentUtils.formatCurrency(
          totalAmount - currentPaidAmount
        )}`
      );
      return;
    }

    console.log("🚀 Submitting verification:", {
      paymentId: selectedPayment.id,
      currentStatus: selectedPayment.status,
      newStatus: verificationForm.status,
      amountPaid: paymentAmount,
      currentTotalPaid: currentPaidAmount,
      newTotalPaid: newTotalPaid,
    });

    try {
      const payload = {
        status: verificationForm.status,
        amount_paid: paymentAmount, // Kirim amount untuk pembayaran ini saja, bukan total
        notes: verificationForm.rejection_reason,
        verified_by: user?.id,
      };

      const response = await axios.put(
        `/api/payments/${selectedPayment.id}/status`,
        payload
      );

      if (response.data?.success) {
        console.log("✅ Verification successful:", response.data.data);
        alert("Verifikasi pembayaran berhasil");
        setShowVerificationModal(false);
        setSelectedPayment(null);
        setVerificationForm({
          status: "paid",
          rejection_reason: "",
          amount_paid: 0,
        });

        // Refresh data
        await fetchPayments();
        await fetchStatistics();

        // Tampilkan pesan info untuk cicilan
        if (response.data.data.status.startsWith("installment_")) {
          const nextInstallment =
            parseInt(response.data.data.status.split("_")[1]) + 1;
          alert(
            `Verifikasi berhasil! Status sekarang: ${paymentUtils.getInstallmentText(
              { status: response.data.data.status }
            )}. Admin dapat menerbitkan tagihan cicilan ${nextInstallment} ketika sudah waktunya.`
          );
        }
      } else {
        throw new Error("Verifikasi gagal");
      }
    } catch (error) {
      console.error("❌ Error verifying payment:", error);
      alert(
        "Error verifying payment: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

  const handleOpenInvoice = (payment) => {
    if (!payment) {
      alert("Data pembayaran tidak valid");
      return;
    }

    console.log("🔧 handleOpenInvoice called for:", {
      id: payment.id,
      status: payment.status,
      amount_paid: payment.amount_paid,
      invoice: payment.invoice_number,
    });

    // Validasi ulang sebelum buka modal
    if (!canIssueInvoice(payment)) {
      const nextInstallment = paymentUtils.calculateNextInstallment(payment);
      alert(
        `Tidak dapat menerbitkan tagihan: ${
          nextInstallment.message ||
          nextInstallment.error ||
          "Alasan tidak diketahui"
        }`
      );
      return;
    }

    const nextInstallment = paymentUtils.calculateNextInstallment(payment);

    if (!nextInstallment.number) {
      alert(
        nextInstallment.message ||
          "Tidak ada cicilan lagi yang perlu diterbitkan."
      );
      return;
    }

    // Default due date: 30 hari dari sekarang
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    setInvoiceForm({
      due_date: dueDate.toISOString().split("T")[0],
      amount: nextInstallment.amount || 0,
      installment_number: nextInstallment.number || 1,
      notes: `Tagihan cicilan ${nextInstallment.number || 1} untuk program ${
        payment.program_name
      }`,
    });

    setSelectedPayment(payment);
    setShowInvoiceModal(true);

    console.log(
      "✅ Modal invoice opened for installment:",
      nextInstallment.number
    );
  };

  const handleInvoiceSubmit = async (e) => {
    e.preventDefault();

    if (!selectedPayment?.id) {
      alert("Data pembayaran tidak valid");
      return;
    }

    if (!invoiceForm.due_date) {
      alert("Harap tentukan tanggal jatuh tempo");
      return;
    }

    // Validasi due_date harus di masa depan
    const dueDate = new Date(invoiceForm.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dueDate < today) {
      alert("Due date harus di masa depan");
      return;
    }

    try {
      // ✅ PERBAIKAN: Hanya kirim due_date dan notes
      const payload = {
        due_date: invoiceForm.due_date,
        notes: invoiceForm.notes,
        verified_by: user?.id,
      };

      console.log("📤 Menerbitkan tagihan baru:", payload);

      const response = await axios.put(
        `/api/payments/${selectedPayment.id}/due-date`,
        payload
      );

      if (response.data?.success) {
        alert("Tagihan berhasil diterbitkan");
        setShowInvoiceModal(false);
        setSelectedPayment(null);
        setInvoiceForm({
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          amount: 0,
          installment_number: 1,
          notes: "",
        });
        fetchPayments();
        fetchStatistics();
      } else {
        throw new Error("Gagal menerbitkan tagihan");
      }
    } catch (error) {
      console.error("Error updating invoice:", error);
      alert(
        "Error updating invoice: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

  // ✅ PERBAIKAN BESAR: Handle manual payment submit dengan upload bukti
  const handleManualPaymentSubmit = async (e) => {
    e.preventDefault();

    console.log("🔄 Starting manual payment submission...");
    console.log("Form data:", formData);
    console.log("Registrations count:", registrations.length);

    // ✅ PERBAIKAN: Validasi lebih detail
    if (!formData.registration_id) {
      alert("Pilih pendaftaran terlebih dahulu");
      return;
    }

    // Konversi ke number untuk comparison yang konsisten
    const registrationId = parseInt(formData.registration_id);
    const selectedRegistration = registrations.find(
      (reg) => reg.id === registrationId
    );

    console.log("Selected registration ID:", registrationId);
    console.log("Found registration:", selectedRegistration);

    if (!selectedRegistration) {
      alert(
        `Data pendaftaran tidak valid. ID: ${registrationId} tidak ditemukan dalam ${registrations.length} registrasi yang tersedia.`
      );
      return;
    }

    const existingPayment = payments.find(
      (p) => p.registration_id === registrationId
    );

    // PERBAIKAN: Gunakan calculation safe
    const currentPaidAmount = paymentUtils.parseFloatSafe(
      existingPayment?.amount_paid || 0
    );
    const newPaymentAmount = paymentUtils.parseFloatSafe(formData.amount_paid);
    const newTotalPaid = paymentUtils.calculateSafe(
      currentPaidAmount,
      newPaymentAmount,
      "add"
    );
    const totalAmount = paymentUtils.parseFloatSafe(
      selectedRegistration.program_training_cost
    );

    if (newTotalPaid > totalAmount) {
      alert(
        `Jumlah pembayaran melebihi total biaya program. Total biaya: Rp ${paymentUtils.formatCurrency(
          totalAmount
        )}`
      );
      return;
    }

    try {
      setUploadLoading(true);

      // Siapkan payload
      const payload = {
        registration_id: registrationId, // ✅ Pastikan pakai registrationId yang sudah dikonversi
        amount_paid: newPaymentAmount,
        payment_method: formData.payment_method,
        bank_name: formData.bank_name,
        account_number: formData.account_number,
        status: formData.status,
        payment_date: formData.payment_date,
        notes: formData.notes,
        verified_by: user?.id,
      };

      console.log("📤 Sending manual payment:", payload);

      let paymentId;
      let proofImageUrl = null;

      if (existingPayment) {
        // UPDATE EXISTING PAYMENT
        const updatePayload = {
          ...payload,
          amount_paid: newTotalPaid, // Untuk update, kirim total yang baru
        };

        const response = await axios.put(
          `/api/payments/${existingPayment.id}/status`,
          updatePayload
        );

        if (response.data?.success) {
          paymentId = existingPayment.id;
          console.log("✅ Existing payment updated:", paymentId);
        } else {
          throw new Error("Gagal mengupdate pembayaran manual");
        }
      } else {
        // CREATE NEW PAYMENT
        const response = await axios.post("/api/payments/manual", payload);

        if (response.data?.success) {
          paymentId = response.data.data.payment_id;
          console.log("✅ New payment created:", paymentId);
        } else {
          throw new Error("Gagal membuat pembayaran manual");
        }
      }

      // ✅ UPLOAD BUKTI PEMBAYARAN JIKA ADA
      if (proofFile && paymentId) {
        try {
          proofImageUrl = await handleFileUpload(paymentId, proofFile);
          console.log("✅ Proof image uploaded:", proofImageUrl);
        } catch (uploadError) {
          console.warn(
            "⚠️ Bukti pembayaran gagal diupload, tetapi pembayaran berhasil:",
            uploadError.message
          );
          // Lanjutkan meski upload gagal
        }
      }

      alert(
        "Pembayaran manual berhasil " +
          (proofFile ? "dengan bukti pembayaran" : "tanpa bukti pembayaran")
      );

      // Reset form dan modal
      setShowManualModal(false);
      setFormData({
        registration_id: "",
        amount: "",
        amount_paid: "",
        payment_method: "transfer",
        bank_name: "",
        account_number: "",
        status: "pending",
        payment_date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      setProofFile(null);

      // Refresh data
      await fetchPayments();
      await fetchStatistics();
    } catch (error) {
      console.error("❌ Error processing manual payment:", error);
      alert(
        "Error processing payment: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setUploadLoading(false);
    }
  };

  // Calculate statistics from actual data
  const calculateRealStats = useCallback(() => {
    if (!payments.length) return null;

    const totalRevenue = payments
      .filter((p) => p.status === "paid" || p.status.includes("installment"))
      .reduce((sum, p) => sum + paymentUtils.parseFloatSafe(p.amount_paid), 0);

    const pendingVerification = payments.filter(
      (p) => p.status === "pending"
    ).length;
    const totalTransactions = payments.length;

    return {
      totalRevenue,
      pendingVerification,
      totalTransactions,
    };
  }, [payments]);

  const realStats = calculateRealStats();

  const resetModals = useCallback(() => {
    setShowDetailModal(false);
    setShowManualModal(false);
    setShowVerificationModal(false);
    setShowInvoiceModal(false);
    setSelectedPayment(null);
    setProofFile(null); // Reset file ketika modal ditutup
  }, []);

  const getPaymentProgress = (payment) => {
    // PERBAIKAN: Gunakan calculation safe
    const total = paymentUtils.parseFloatSafe(payment.program_training_cost);
    const paid = paymentUtils.parseFloatSafe(payment.amount_paid);
    const remaining = paymentUtils.calculateRemainingSafe(total, paid);

    const percentage = total > 0 ? (paid / total) * 100 : 0;

    return {
      percentage: Math.min(100, percentage),
      paid: paid,
      total: total,
      remaining: remaining, // PERBAIKAN: Gunakan nilai yang dihitung dengan safe
    };
  };

  const shouldShowVerifyButton = (payment) => {
    // Tampilkan jika status pending
    if (payment.status === "pending") return true;

    // ATAU tampilkan jika ada proof_image dan status bukan paid/cancelled
    if (
      payment.proof_image &&
      payment.status !== "paid" &&
      payment.status !== "cancelled" &&
      payment.status.startsWith("installment_")
    ) {
      return true;
    }

    return false;
  };

  // Check if can issue invoice (bisa terbitkan tagihan)
  const canIssueInvoice = (payment) => {
    try {
      console.log("🔍 Checking canIssueInvoice for:", {
        id: payment.id,
        status: payment.status,
        amount_paid: payment.amount_paid,
        total: payment.program_training_cost,
      });

      // Jangan tampilkan untuk status tertentu
      if (
        payment.status === "pending" ||
        payment.status === "paid" ||
        payment.status === "cancelled" ||
        payment.status === "overdue"
      ) {
        console.log(
          "❌ Cannot issue invoice - invalid status:",
          payment.status
        );
        return false;
      }

      // Pastikan data lengkap
      if (!payment.program_training_cost) {
        console.log("❌ Cannot issue invoice - missing program_training_cost");
        return false;
      }

      // Hitung cicilan berikutnya
      const nextInstallment = paymentUtils.calculateNextInstallment(payment);
      console.log("📊 Next installment calculation:", nextInstallment);

      // Validasi hasil perhitungan
      const canIssue =
        nextInstallment.number !== null &&
        nextInstallment.number > 0 &&
        nextInstallment.amount > 0;

      console.log(
        "✅ Can issue invoice:",
        canIssue,
        "for installment",
        nextInstallment.number
      );
      return canIssue;
    } catch (error) {
      console.error("❌ Error in canIssueInvoice:", error);
      return false;
    }
  };

  if (loading && payments.length === 0) {
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

  return (
    <div className="container mt-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">Manajemen Pembayaran</h2>
              <p className="text-muted mb-0">
                Kelola dan verifikasi pembayaran peserta - Kontrol Penuh oleh
                Admin
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setShowManualModal(true)}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Tambah Pembayaran Manual
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {realStats && (
        <div className="row mb-4 justify-content-center">
          <div className="col-md-4">
            <div className="card bg-primary text-white">
              <div className="card-body text-center p-3">
                <h4 className="card-title stats-label mb-1">Total Pemasukan</h4>
                <div className="fs-4 fw-bold">
                  Rp {realStats.totalRevenue.toLocaleString("id-ID")}
                </div>
                <small>Dari pembayaran lunas & cicilan</small>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card bg-primary text-white">
              <div className="card-body text-center p-3">
                <h4 className="card-title stats-label mb-1">
                  Menunggu Verifikasi
                </h4>
                <div className="fs-4 fw-bold">
                  {realStats.pendingVerification} Transaksi
                </div>
                <small>Perlu tindakan admin</small>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card bg-primary text-white">
              <div className="card-body text-center p-3">
                <h4 className="card-title stats-label mb-1">Total Transaksi</h4>
                <div className="fs-4 fw-bold">
                  {realStats.totalTransactions} Transaksi
                </div>
                <small>Semua status pembayaran</small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Information Card */}
      <div className="alert alert-info mb-4">
        <h6>
          <i className="bi bi-info-circle me-2"></i>Sistem Pembayaran - Kontrol
          Admin
        </h6>
        <p className="mb-0">
          <strong>Admin mengontrol kapan tagihan diterbitkan.</strong> Setelah
          verifikasi cicilan, admin bisa menentukan kapan menerbitkan tagihan
          cicilan berikutnya sesuai kebijakan perusahaan.
        </p>
      </div>

      {/* Filters Section */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Filter & Pencarian</h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Status Pembayaran</label>
              <select
                className="form-select"
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
              >
                <option value="all">Semua Status</option>
                <option value="pending">Menunggu Pembayaran</option>
                <option value="installment_1">Cicilan 1</option>
                <option value="installment_2">Cicilan 2</option>
                <option value="installment_3">Cicilan 3</option>
                <option value="installment_4">Cicilan 4</option>
                <option value="installment_5">Cicilan 5</option>
                <option value="installment_6">Cicilan 6</option>
                <option value="paid">Lunas</option>
                <option value="overdue">Jatuh Tempo</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Program</label>
              <select
                className="form-select"
                value={filters.program}
                onChange={(e) => handleFilterChange("program", e.target.value)}
              >
                <option value="all">Semua Program</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Pencarian</label>
              <input
                type="text"
                className="form-control"
                placeholder="Cari nama peserta, invoice..."
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Daftar Invoice ({payments.length})</h5>
          <div>
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={fetchPayments}
              disabled={loading}
            >
              <i className="bi bi-arrow-clockwise me-1"></i>
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>
        <div className="card-body">
          {error && (
            <div
              className="alert alert-warning alert-dismissible fade show"
              role="alert"
            >
              {error}
              <button
                type="button"
                className="btn-close"
                onClick={() => setError("")}
              ></button>
            </div>
          )}

          {payments.length === 0 ? (
            <div className="text-center py-5">
              <div className="display-1 text-muted mb-3">💳</div>
              <h5>Tidak ada data pembayaran</h5>
              <p className="text-muted">
                {loading
                  ? "Memuat data..."
                  : "Coba ubah filter atau kata kunci pencarian"}
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light align-middle">
                  <tr>
                    <th>Invoice</th>
                    <th>Peserta</th>
                    <th>Program & Biaya</th>
                    <th>Progress Pembayaran</th>
                    <th>Status</th>
                    <th>Tanggal</th>
                    <th>Metode</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody className="align-middle">
                  {payments.map((payment) => {
                    const progress = getPaymentProgress(payment);
                    const nextInstallment =
                      paymentUtils.calculateNextInstallment(payment);

                    return (
                      <tr key={payment.id}>
                        <td>
                          <div>
                            <strong className="d-block">
                              {payment.invoice_number}
                            </strong>
                            {payment.receipt_number && (
                              <small className="text-muted">
                                Kwitansi: {payment.receipt_number}
                              </small>
                            )}
                          </div>
                        </td>
                        <td>
                          <strong className="d-block">
                            {payment.full_name}
                          </strong>
                          <small className="text-muted d-block">
                            {payment.email}
                          </small>
                          <small className="text-muted">
                            Kode: {payment.registration_code}
                          </small>
                        </td>
                        <td>
                          <div className="fw-bold">{payment.program_name}</div>
                          <div className="small text-muted">
                            {payment.program_duration}
                          </div>
                          <div className="small">
                            <strong>
                              Total: Rp{" "}
                              {paymentUtils.formatCurrency(
                                payment.program_training_cost
                              )}
                            </strong>
                          </div>
                          <div className="small text-muted">
                            Plan:{" "}
                            {payment.program_installment_plan || "4 cicilan"}
                          </div>
                          {nextInstallment.number && (
                            <div className="small text-primary">
                              <strong>
                                Cicilan {nextInstallment.number}: Rp{" "}
                                {paymentUtils.formatCurrency(
                                  nextInstallment.amount
                                )}
                              </strong>
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="progress" style={{ height: "20px" }}>
                            <div
                              className="progress-bar bg-success"
                              role="progressbar"
                              style={{ width: `${progress.percentage}%` }}
                            >
                              {progress.percentage.toFixed(0)}%
                            </div>
                          </div>
                          <div className="small text-center mt-1">
                            Rp {paymentUtils.formatCurrency(progress.paid)} / Rp{" "}
                            {paymentUtils.formatCurrency(progress.total)}
                          </div>
                          {progress.remaining > 0 && (
                            <div className="small text-muted text-center">
                              Sisa: Rp{" "}
                              {paymentUtils.formatCurrency(progress.remaining)}
                            </div>
                          )}
                        </td>
                        <td>{paymentUtils.getStatusBadge(payment.status)}</td>
                        <td>
                          <div className="small">
                            {new Date(payment.created_at).toLocaleDateString(
                              "id-ID"
                            )}
                          </div>
                          {payment.due_date && (
                            <div
                              className={`small ${
                                new Date(payment.due_date) < new Date()
                                  ? "text-danger fw-bold"
                                  : "text-muted"
                              }`}
                            >
                              Jatuh tempo:{" "}
                              {new Date(payment.due_date).toLocaleDateString(
                                "id-ID"
                              )}
                            </div>
                          )}
                        </td>
                        <td>
                          {payment.payment_method && (
                            <span className="badge bg-light text-dark">
                              {paymentUtils.getPaymentMethodText(
                                payment.payment_method
                              )}
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-outline-primary"
                              onClick={() => handleViewDetails(payment)}
                              title="Lihat Detail"
                              disabled={loading}
                            >
                              <i className="bi bi-eye"></i>
                            </button>

                            {/* PERBAIKAN: Tombol Verifikasi untuk status pending ATAU yang ada proof_image */}
                            {shouldShowVerifyButton(payment) && (
                              <button
                                className="btn btn-outline-primary"
                                onClick={() => handleOpenVerification(payment)}
                                title="Verifikasi Pembayaran"
                              >
                                <i className="bi bi-check-lg"></i>
                              </button>
                            )}

                            {/* PERBAIKAN: Tombol Terbitkan Tagihan - hanya yang tidak pending */}
                            {canIssueInvoice(payment) && (
                              <button
                                className="btn btn-outline-primary"
                                onClick={() => handleOpenInvoice(payment)}
                                title="Terbitkan Tagihan Cicilan Berikutnya"
                              >
                                <i className="bi bi-receipt"></i>
                              </button>
                            )}
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

      {/* ✅ PERBAIKAN: Modal Tambah Pembayaran Manual dengan Upload Bukti */}
      {showManualModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={resetModals}
        >
          <div
            className="modal-dialog modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Tambah Pembayaran Manual</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={resetModals}
                ></button>
              </div>
              <form onSubmit={handleManualPaymentSubmit}>
                <div className="modal-body">
                  <div className="alert alert-info">
                    <small>
                      <i className="bi bi-info-circle me-1"></i>
                      Pembayaran manual akan ditambahkan ke invoice yang sudah
                      ada untuk registrasi ini. Jumlah akan terakumulasi dengan
                      pembayaran sebelumnya.
                    </small>
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Pilih Pendaftaran *</label>
                      <select
                        className="form-select"
                        value={formData.registration_id}
                        onChange={(e) => {
                          const registrationId = e.target.value;
                          const selectedReg = registrations.find(
                            (reg) => reg.id === parseInt(registrationId)
                          );
                          const existingPayment = payments.find(
                            (p) =>
                              p.registration_id === parseInt(registrationId)
                          );

                          setFormData({
                            ...formData,
                            registration_id: registrationId,
                            amount: selectedReg
                              ? selectedReg.program_training_cost
                              : "",
                          });

                          if (existingPayment) {
                            const progress =
                              getPaymentProgress(existingPayment);
                            alert(
                              `Informasi Pembayaran:\n\nTotal Biaya: Rp ${paymentUtils.formatCurrency(
                                existingPayment.program_training_cost
                              )}\nSudah Dibayar: Rp ${paymentUtils.formatCurrency(
                                existingPayment.amount_paid
                              )}\nSisa: Rp ${paymentUtils.formatCurrency(
                                progress.remaining
                              )}\nStatus: ${existingPayment.status}`
                            );
                          }
                        }}
                        required
                      >
                        <option value="">Pilih Pendaftaran</option>
                        {registrations.length === 0 ? (
                          <option value="" disabled>
                            Loading data registrasi...
                          </option>
                        ) : (
                          registrations.map((reg) => {
                            const existingPayment = payments.find(
                              (p) => p.registration_id === reg.id
                            );
                            return (
                              <option key={reg.id} value={reg.id}>
                                {reg.registration_code} - {reg.full_name} (
                                {reg.program_name})
                                {existingPayment &&
                                  ` - ${existingPayment.status}`}
                              </option>
                            );
                          })
                        )}
                      </select>
                      {registrations.length === 0 && (
                        <div className="form-text text-warning">
                          Data registrasi sedang dimuat...
                        </div>
                      )}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Jumlah Pembayaran *</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.amount_paid}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            amount_paid: e.target.value,
                          })
                        }
                        min="1"
                        required
                      />
                    </div>

                    {/* ✅ TAMBAHAN: Input Upload Bukti Pembayaran */}
                    <div className="col-12">
                      <label className="form-label">
                        Bukti Pembayaran (Opsional)
                      </label>
                      <input
                        type="file"
                        className="form-control"
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                      <div className="form-text">
                        Upload bukti transfer atau slip pembayaran (maks. 5MB,
                        format: JPG, PNG, JPEG)
                      </div>
                      {proofFile && (
                        <div className="mt-2">
                          <small className="text-success">
                            <i className="bi bi-check-circle me-1"></i>
                            File terpilih: {proofFile.name}
                          </small>
                        </div>
                      )}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">
                        Status Setelah Pembayaran *
                      </label>
                      <select
                        className="form-select"
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({ ...formData, status: e.target.value })
                        }
                        required
                      >
                        <option value="pending">Pending</option>
                        <option value="installment_1">Cicilan 1</option>
                        <option value="installment_2">Cicilan 2</option>
                        <option value="installment_3">Cicilan 3</option>
                        <option value="installment_4">Cicilan 4</option>
                        <option value="installment_5">Cicilan 5</option>
                        <option value="installment_6">Cicilan 6</option>
                        <option value="paid">Lunas</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Metode Pembayaran</label>
                      <select
                        className="form-select"
                        value={formData.payment_method}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            payment_method: e.target.value,
                          })
                        }
                      >
                        <option value="transfer">Transfer Bank</option>
                        <option value="cash">Tunai</option>
                        <option value="credit_card">Kartu Kredit</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Tanggal Pembayaran</label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.payment_date}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            payment_date: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Nama Bank</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.bank_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            bank_name: e.target.value,
                          })
                        }
                        placeholder="BCA, BNI, Mandiri, dll"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Nomor Rekening</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.account_number}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            account_number: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label">Catatan</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData({ ...formData, notes: e.target.value })
                        }
                        placeholder="Catatan tambahan untuk pembayaran ini..."
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={resetModals}
                    disabled={uploadLoading}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={uploadLoading}
                  >
                    {uploadLoading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                        ></span>
                        Menyimpan...
                      </>
                    ) : (
                      "Simpan Pembayaran"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Verifikasi Bukti Pembayaran */}
      {showVerificationModal && selectedPayment && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={resetModals}
        >
          <div
            className="modal-dialog modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Verifikasi Pembayaran Cicilan</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={resetModals}
                ></button>
              </div>
              <form onSubmit={handleVerificationSubmit}>
                <div className="modal-body">
                  <div className="row mb-4">
                    <div className="col-md-6">
                      <h6>Informasi Registrasi</h6>
                      <p>
                        <strong>Peserta:</strong> {selectedPayment.full_name}
                      </p>
                      <p>
                        <strong>Program:</strong> {selectedPayment.program_name}
                      </p>
                      <p>
                        <strong>Kode:</strong>{" "}
                        {selectedPayment.registration_code}
                      </p>
                      <p>
                        <strong>Plan Cicilan:</strong>{" "}
                        {selectedPayment.program_installment_plan ||
                          "4 cicilan"}
                      </p>
                    </div>
                    <div className="col-md-6">
                      <h6>Status Pembayaran</h6>
                      <p>
                        <strong>Status Saat Ini:</strong>{" "}
                        {paymentUtils.getInstallmentText(selectedPayment)}
                      </p>
                      <p>
                        <strong>Total Biaya:</strong> Rp{" "}
                        {paymentUtils.formatCurrency(
                          selectedPayment.program_training_cost
                        )}
                      </p>
                      <p>
                        <strong>Sudah Dibayar:</strong> Rp{" "}
                        {paymentUtils.formatCurrency(
                          selectedPayment.amount_paid
                        )}
                      </p>
                      <p>
                        <strong>Sisa Tagihan:</strong> Rp{" "}
                        {paymentUtils.formatCurrency(
                          paymentUtils.parseFloatSafe(
                            selectedPayment.program_training_cost
                          ) -
                            paymentUtils.parseFloatSafe(
                              selectedPayment.amount_paid
                            )
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="row mb-4">
                    <div className="col-12">
                      <h6>Progress Pembayaran</h6>
                      <div className="progress" style={{ height: "25px" }}>
                        <div
                          className="progress-bar bg-success"
                          role="progressbar"
                          style={{
                            width: `${
                              (paymentUtils.parseFloatSafe(
                                selectedPayment.amount_paid
                              ) /
                                paymentUtils.parseFloatSafe(
                                  selectedPayment.program_training_cost || 1
                                )) *
                              100
                            }%`,
                          }}
                        >
                          {(
                            (paymentUtils.parseFloatSafe(
                              selectedPayment.amount_paid
                            ) /
                              paymentUtils.parseFloatSafe(
                                selectedPayment.program_training_cost || 1
                              )) *
                            100
                          ).toFixed(0)}
                          %
                        </div>
                      </div>
                      <div className="d-flex justify-content-between mt-2">
                        <small>Rp 0</small>
                        <small>
                          Rp{" "}
                          {paymentUtils.formatCurrency(
                            selectedPayment.program_training_cost
                          )}
                        </small>
                      </div>
                    </div>
                  </div>

                  {/* Preview Bukti Pembayaran */}
                  {selectedPayment.proof_image && (
                    <div className="row mb-4">
                      <div className="col-12">
                        <h6>Bukti Pembayaran</h6>
                        <div className="text-center">
                          <img
                            src={getImageUrl(selectedPayment.proof_image)}
                            alt="Bukti Pembayaran"
                            className="img-fluid rounded border"
                            style={{ maxHeight: "300px" }}
                            onError={(e) => {
                              e.target.style.display = "none";
                              const errorDiv = document.createElement("div");
                              errorDiv.className = "alert alert-warning";
                              errorDiv.innerHTML = "Gambar tidak dapat dimuat.";
                              e.target.parentNode.appendChild(errorDiv);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Form Verifikasi */}
                  <div className="row">
                    <div className="col-md-6">
                      <label className="form-label">
                        Status Setelah Verifikasi *
                      </label>
                      <select
                        className="form-select"
                        value={verificationForm.status}
                        onChange={(e) =>
                          setVerificationForm({
                            ...verificationForm,
                            status: e.target.value,
                          })
                        }
                        required
                      >
                        {/* Opsi status DINAMIS berdasarkan status saat ini */}
                        {selectedPayment && (
                          <>
                            {/* Status untuk payment yang masih pending */}
                            {selectedPayment.status === "pending" && (
                              <>
                                <option value="installment_1">Cicilan 1</option>
                                <option value="paid">
                                  Lunas (Bayar Penuh)
                                </option>
                              </>
                            )}

                            {/* Status untuk cicilan 1 */}
                            {selectedPayment.status === "installment_1" && (
                              <>
                                <option value="installment_2">Cicilan 2</option>
                                <option value="paid">Lunas</option>
                              </>
                            )}

                            {/* Status untuk cicilan 2 */}
                            {selectedPayment.status === "installment_2" && (
                              <>
                                <option value="installment_3">Cicilan 3</option>
                                <option value="paid">Lunas</option>
                              </>
                            )}

                            {/* Status untuk cicilan 3 */}
                            {selectedPayment.status === "installment_3" && (
                              <>
                                <option value="installment_4">Cicilan 4</option>
                                <option value="paid">Lunas</option>
                              </>
                            )}

                            {/* Status untuk cicilan 4 */}
                            {selectedPayment.status === "installment_4" && (
                              <>
                                <option value="installment_5">Cicilan 5</option>
                                <option value="paid">Lunas</option>
                              </>
                            )}

                            {/* Status untuk cicilan 5 */}
                            {selectedPayment.status === "installment_5" && (
                              <>
                                <option value="installment_6">Cicilan 6</option>
                                <option value="paid">Lunas</option>
                              </>
                            )}

                            {/* Status untuk cicilan 6 */}
                            {selectedPayment.status === "installment_6" && (
                              <option value="paid">Lunas</option>
                            )}

                            {/* Opsi untuk menolak pembayaran - selalu tersedia */}
                            <option value="cancelled">Tolak Pembayaran</option>
                          </>
                        )}
                      </select>

                      {/* ✅ Informasi status progression */}
                      <div className="form-text">
                        Status saat ini:{" "}
                        <strong>
                          {paymentUtils.getInstallmentText(selectedPayment)}
                        </strong>
                        {verificationForm.status !== "cancelled" && (
                          <span>
                            {" "}
                            → Akan berubah menjadi:{" "}
                            <strong>
                              {paymentUtils.getInstallmentText({
                                status: verificationForm.status,
                              })}
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">
                        Jumlah yang Dibayar (Rp) *
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={verificationForm.amount_paid}
                        onChange={(e) =>
                          setVerificationForm({
                            ...verificationForm,
                            amount_paid: e.target.value,
                          })
                        }
                        min="1"
                        max={
                          paymentUtils.parseFloatSafe(
                            selectedPayment.program_training_cost
                          ) -
                          paymentUtils.parseFloatSafe(
                            selectedPayment.amount_paid
                          )
                        }
                        required
                      />
                      <div className="form-text">
                        Sisa tagihan: Rp{" "}
                        {paymentUtils.formatCurrency(
                          paymentUtils.parseFloatSafe(
                            selectedPayment.program_training_cost
                          ) -
                            paymentUtils.parseFloatSafe(
                              selectedPayment.amount_paid
                            )
                        )}
                      </div>
                    </div>
                  </div>

                  {verificationForm.status === "cancelled" && (
                    <div className="row mt-3">
                      <div className="col-12">
                        <label className="form-label">Alasan Penolakan *</label>
                        <textarea
                          className="form-control"
                          rows="3"
                          value={verificationForm.rejection_reason}
                          onChange={(e) =>
                            setVerificationForm({
                              ...verificationForm,
                              rejection_reason: e.target.value,
                            })
                          }
                          placeholder="Berikan alasan jelas mengapa pembayaran ditolak..."
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="row mt-4">
                    <div className="col-12">
                      <div className="alert alert-info">
                        <h6>Ringkasan Setelah Verifikasi:</h6>
                        <p className="mb-1">
                          <strong>Total Dibayar:</strong> Rp{" "}
                          {paymentUtils.formatCurrency(
                            paymentUtils.parseFloatSafe(
                              selectedPayment.amount_paid
                            ) +
                              paymentUtils.parseFloatSafe(
                                verificationForm.amount_paid
                              )
                          )}
                        </p>
                        <p className="mb-1">
                          <strong>Status Baru:</strong>{" "}
                          {verificationForm.status === "paid"
                            ? "LUNAS"
                            : verificationForm.status.toUpperCase()}
                        </p>
                        <p className="mb-0">
                          <strong>Sisa Tagihan:</strong> Rp{" "}
                          {paymentUtils.formatCurrency(
                            paymentUtils.parseFloatSafe(
                              selectedPayment.program_training_cost
                            ) -
                              (paymentUtils.parseFloatSafe(
                                selectedPayment.amount_paid
                              ) +
                                paymentUtils.parseFloatSafe(
                                  verificationForm.amount_paid
                                ))
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ✅ DEBUG INFO - Hapus bagian ini di production */}
                  {process.env.NODE_ENV === "development" && (
                    <div className="row mt-2">
                      <div className="col-12">
                        <div className="alert alert-warning">
                          <h6>Debug Info - Verification:</h6>
                          <p className="mb-1">
                            <strong>Current Status:</strong>{" "}
                            <code>{selectedPayment.status}</code>
                          </p>
                          <p className="mb-1">
                            <strong>Next Status:</strong>{" "}
                            <code>{verificationForm.status}</code>
                          </p>
                          <p className="mb-1">
                            <strong>Amount Paid:</strong>{" "}
                            <code>
                              {paymentUtils.formatCurrency(
                                verificationForm.amount_paid
                              )}
                            </code>
                          </p>
                          <p className="mb-1">
                            <strong>Current Total Paid:</strong>{" "}
                            <code>
                              {paymentUtils.formatCurrency(
                                selectedPayment.amount_paid
                              )}
                            </code>
                          </p>
                          <p className="mb-0">
                            <strong>Payment ID:</strong>{" "}
                            <code>{selectedPayment.id}</code>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={resetModals}
                  >
                    Batalkan
                  </button>
                  {verificationForm.status === "cancelled" ? (
                    <button type="submit" className="btn btn-danger">
                      Tolak Pembayaran
                    </button>
                  ) : (
                    <button type="submit" className="btn btn-primary">
                      Verifikasi Pembayaran
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Terbitkan Tagihan */}
      {showInvoiceModal && selectedPayment && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={resetModals}
        >
          <div
            className="modal-dialog modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Terbitkan Tagihan Cicilan</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={resetModals}
                ></button>
              </div>
              <form onSubmit={handleInvoiceSubmit}>
                <div className="modal-body">
                  <div className="alert alert-info">
                    <h6>
                      <i className="bi bi-info-circle me-2"></i>Kontrol
                      Penerbitan Tagihan
                    </h6>
                    <p className="mb-0">
                      Admin menentukan kapan tagihan cicilan berikutnya
                      diterbitkan. Sesuaikan dengan kebijakan perusahaan
                      (biasanya 30 hari setelah cicilan sebelumnya).
                    </p>
                  </div>

                  <div className="row mb-4">
                    <div className="col-md-6">
                      <h6>Informasi Peserta</h6>
                      <p>
                        <strong>Nama:</strong> {selectedPayment.full_name}
                      </p>
                      <p>
                        <strong>Program:</strong> {selectedPayment.program_name}
                      </p>
                      <p>
                        <strong>Invoice:</strong>{" "}
                        {selectedPayment.invoice_number}
                      </p>
                      <p>
                        <strong>Status Saat Ini:</strong>{" "}
                        {paymentUtils.getInstallmentText(selectedPayment)}
                      </p>
                    </div>
                    <div className="col-md-6">
                      <h6>Progress Pembayaran</h6>
                      <p>
                        <strong>Total Biaya:</strong> Rp{" "}
                        {paymentUtils.formatCurrency(
                          selectedPayment.program_training_cost
                        )}
                      </p>
                      <p>
                        <strong>Sudah Dibayar:</strong> Rp{" "}
                        {paymentUtils.formatCurrency(
                          selectedPayment.amount_paid
                        )}
                      </p>
                      <p>
                        <strong>Sisa Tagihan:</strong> Rp{" "}
                        {paymentUtils.formatCurrency(
                          paymentUtils.parseFloatSafe(
                            selectedPayment.program_training_cost
                          ) -
                            paymentUtils.parseFloatSafe(
                              selectedPayment.amount_paid
                            )
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Informasi Cicilan Berikutnya */}
                  <div className="card mb-4">
                    <div className="card-header bg-primary text-white">
                      <h6 className="mb-0">Informasi Cicilan Berikutnya</h6>
                    </div>
                    <div className="card-body">
                      <div className="row">
                        <div className="col-md-6">
                          <p>
                            <strong>Cicilan Ke:</strong>{" "}
                            {invoiceForm.installment_number}
                          </p>
                          <p>
                            <strong>Jumlah Disarankan:</strong> Rp{" "}
                            {paymentUtils.formatCurrency(invoiceForm.amount)}
                          </p>
                        </div>
                        <div className="col-md-6">
                          <p>
                            <strong>Total Cicilan:</strong>{" "}
                            {selectedPayment.program_installment_plan ||
                              "4 cicilan"}
                          </p>
                          <p>
                            <strong>Sisa Setelah Cicilan Ini:</strong> Rp{" "}
                            {paymentUtils.formatCurrency(
                              paymentUtils.parseFloatSafe(
                                selectedPayment.program_training_cost
                              ) -
                                paymentUtils.parseFloatSafe(
                                  selectedPayment.amount_paid
                                ) -
                                paymentUtils.parseFloatSafe(invoiceForm.amount)
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form Penerbitan Tagihan */}
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">
                        Tanggal Jatuh Tempo *
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        value={invoiceForm.due_date}
                        onChange={(e) => {
                          const selectedDate = new Date(e.target.value);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);

                          if (selectedDate < today) {
                            alert("Due date harus di masa depan");
                            return;
                          }

                          setInvoiceForm({
                            ...invoiceForm,
                            due_date: e.target.value,
                          });
                        }}
                        min={new Date().toISOString().split("T")[0]} // Hanya izinkan tanggal hari ini dan seterusnya
                        required
                      />
                      <div className="form-text">
                        Tentukan kapan tagihan ini harus dibayar (rekomendasi:
                        30 hari dari sekarang)
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Jumlah Tagihan (Rp)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={invoiceForm.amount}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          const maxAmount =
                            paymentUtils.parseFloatSafe(
                              selectedPayment.program_training_cost
                            ) -
                            paymentUtils.parseFloatSafe(
                              selectedPayment.amount_paid
                            );
                          setInvoiceForm({
                            ...invoiceForm,
                            amount: Math.max(0, Math.min(maxAmount, value)),
                          });
                        }}
                        min="1"
                        max={
                          paymentUtils.parseFloatSafe(
                            selectedPayment.program_training_cost
                          ) -
                          paymentUtils.parseFloatSafe(
                            selectedPayment.amount_paid
                          )
                        }
                      />
                      <div className="form-text">
                        Jumlah yang akan ditagih (bisa disesuaikan)
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label">
                        Catatan untuk Peserta
                      </label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={invoiceForm.notes}
                        onChange={(e) =>
                          setInvoiceForm({
                            ...invoiceForm,
                            notes: e.target.value,
                          })
                        }
                        placeholder="Berikan instruksi atau informasi penting untuk peserta..."
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={resetModals}
                  >
                    Batal
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-receipt me-2"></i>
                    Terbitkan Tagihan
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Pembayaran */}
      {showDetailModal && selectedPayment && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={resetModals}
        >
          <div
            className="modal-dialog modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Detail Invoice</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={resetModals}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row mb-4">
                  <div className="col-md-6">
                    <h6>Informasi Peserta</h6>
                    <p>
                      <strong>Nama:</strong> {selectedPayment.full_name}
                    </p>
                    <p>
                      <strong>Email:</strong> {selectedPayment.email}
                    </p>
                    <p>
                      <strong>Program:</strong> {selectedPayment.program_name}
                    </p>
                    <p>
                      <strong>Kode Pendaftaran:</strong>{" "}
                      {selectedPayment.registration_code}
                    </p>
                  </div>
                  <div className="col-md-6">
                    <h6>Informasi Pembayaran</h6>
                    <p>
                      <strong>Invoice:</strong> {selectedPayment.invoice_number}
                    </p>
                    <p>
                      <strong>Total Biaya:</strong> Rp{" "}
                      {paymentUtils
                        .parseFloatSafe(selectedPayment.program_training_cost)
                        .toLocaleString("id-ID")}
                    </p>
                    <p>
                      <strong>Dibayar:</strong> Rp{" "}
                      {paymentUtils
                        .parseFloatSafe(selectedPayment.amount_paid)
                        .toLocaleString("id-ID")}
                    </p>
                    <p>
                      <strong>Sisa:</strong> Rp{" "}
                      {paymentUtils.formatCurrency(
                        paymentUtils.parseFloatSafe(
                          selectedPayment.program_training_cost
                        ) -
                          paymentUtils.parseFloatSafe(
                            selectedPayment.amount_paid
                          )
                      )}
                    </p>
                    <p>
                      <strong>Status:</strong>{" "}
                      {paymentUtils.getStatusBadge(selectedPayment.status)}
                    </p>
                    {selectedPayment.due_date && (
                      <p>
                        <strong>Jatuh Tempo:</strong>{" "}
                        {new Date(selectedPayment.due_date).toLocaleDateString(
                          "id-ID"
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="row mb-4">
                  <div className="col-12">
                    <h6>Progress Pembayaran</h6>
                    <div className="progress" style={{ height: "25px" }}>
                      <div
                        className="progress-bar bg-success"
                        role="progressbar"
                        style={{
                          width: `${
                            (paymentUtils.parseFloatSafe(
                              selectedPayment.amount_paid
                            ) /
                              paymentUtils.parseFloatSafe(
                                selectedPayment.program_training_cost || 1
                              )) *
                            100
                          }%`,
                        }}
                      >
                        {(
                          (paymentUtils.parseFloatSafe(
                            selectedPayment.amount_paid
                          ) /
                            paymentUtils.parseFloatSafe(
                              selectedPayment.program_training_cost || 1
                            )) *
                          100
                        ).toFixed(0)}
                        %
                      </div>
                    </div>
                    <div className="d-flex justify-content-between mt-2">
                      <small>Rp 0</small>
                      <small>
                        Rp{" "}
                        {paymentUtils.formatCurrency(
                          selectedPayment.program_training_cost
                        )}
                      </small>
                    </div>
                  </div>
                </div>

                {selectedPayment.history &&
                  selectedPayment.history.length > 0 && (
                    <div className="mt-4">
                      <h6>Riwayat Pembayaran</h6>
                      <div className="table-responsive">
                        <table className="table table-sm">
                          <thead>
                            <tr>
                              <th>Tanggal</th>
                              <th>Status Lama</th>
                              <th>Status Baru</th>
                              <th>Jumlah Dibayar</th>
                              <th>Total Dibayar</th>
                              <th>Diubah Oleh</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedPayment.history.map((history) => (
                              <tr key={history.id}>
                                <td>
                                  {new Date(
                                    history.changed_at
                                  ).toLocaleDateString("id-ID")}
                                </td>
                                <td>
                                  {paymentUtils.getStatusBadge(
                                    history.old_status
                                  )}
                                </td>
                                <td>
                                  {paymentUtils.getStatusBadge(
                                    history.new_status
                                  )}
                                </td>
                                <td>
                                  {history.amount_paid_change > 0 &&
                                    `Rp ${paymentUtils.formatCurrency(
                                      history.amount_paid_change
                                    )}`}
                                </td>
                                <td>
                                  Rp{" "}
                                  {paymentUtils.formatCurrency(
                                    history.new_amount_paid
                                  )}
                                </td>
                                <td>{history.changed_by_name || "System"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={resetModals}>
                  Tutup
                </button>
                {selectedPayment.receipt_number && (
                  <a
                    href={`/api/payments/${selectedPayment.id}/receipt`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline-primary"
                  >
                    <i className="bi bi-download me-1"></i>
                    Download Kwitansi
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentManagement;
