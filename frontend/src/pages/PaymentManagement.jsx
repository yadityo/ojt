import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

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

  // Verification form state
  const [verificationForm, setVerificationForm] = useState({
    status: "paid",
    rejection_reason: "",
    amount_paid: 0,
  });

  // Invoice form state
  const [invoiceForm, setInvoiceForm] = useState({
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0], // 7 hari dari sekarang
    amount: 0,
    installment_number: 1,
    notes: "",
  });

  const { user } = useAuth();

  useEffect(() => {
    fetchPayments();
    fetchPrograms();
    fetchRegistrations();
    fetchStatistics();
  }, [filters]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (filters[key] !== "all" && filters[key] !== "") {
          params.append(key, filters[key]);
        }
      });

      const response = await axios.get(`/api/payments?${params}`);
      if (response.data.success) {
        setPayments(response.data.data);
      } else {
        setError("Failed to fetch payments");
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
      setError("Error loading payment data");
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    try {
      const response = await axios.get("/api/programs");
      if (response.data.success) {
        setPrograms(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching programs:", error);
    }
  };

  const fetchRegistrations = async () => {
    try {
      const response = await axios.get("/api/registrations");
      if (response.data.success) {
        setRegistrations(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching registrations:", error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await axios.get("/api/payments/statistics");
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching payment statistics:", error);
    }
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    // Jika path sudah berupa URL lengkap, return langsung
    if (path.startsWith("http")) return path;
    // Jika path relatif, tambahkan base URL
    return `${process.env.REACT_APP_API_URL || "http://localhost:5000"}${path}`;
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleViewDetails = async (payment) => {
    try {
      const response = await axios.get(`/api/payments/${payment.id}`);
      if (response.data.success) {
        setSelectedPayment(response.data.data);
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error("Error fetching payment details:", error);
      alert("Error loading payment details");
    }
  };

  // Handle Verifikasi Bukti Pembayaran
  const handleOpenVerification = (payment) => {
    setSelectedPayment(payment);
    setVerificationForm({
      status: "paid",
      rejection_reason: "",
      amount_paid: payment.amount,
    });
    setShowVerificationModal(true);
  };

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        status: verificationForm.status,
        amount_paid: verificationForm.amount_paid,
        notes: verificationForm.rejection_reason,
        verified_by: user.id,
      };

      const response = await axios.put(
        `/api/payments/${selectedPayment.id}/status`,
        payload
      );

      if (response.data.success) {
        alert("Verifikasi pembayaran berhasil");
        setShowVerificationModal(false);
        setSelectedPayment(null);
        setVerificationForm({
          status: "paid",
          rejection_reason: "",
          amount_paid: 0,
        });
        fetchPayments();
        fetchStatistics();
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      alert(
        "Error verifying payment: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

  // Handle Penerbitan Tagihan
  const handleOpenInvoice = (payment) => {
    if (!payment) {
      alert("Data pembayaran tidak valid");
      return;
    }

    setSelectedPayment({ registration: payment });

    const nextInstallment = calculateNextInstallment(payment);

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // Jatuh tempo 7 hari dari sekarang

    setInvoiceForm({
      due_date: dueDate.toISOString().split("T")[0],
      amount: nextInstallment.amount || 0,
      installment_number: nextInstallment.number || 1,
      notes: `Tagihan cicilan ${nextInstallment.number || 1}`,
    });

    setShowInvoiceModal(true);
  };

  const calculateNextInstallment = (registration) => {
    // Pastikan data ada dan valid
    if (!registration || !registration.program_training_cost) {
      return {
        number: 1,
        amount: 0,
      };
    }

    try {
      const totalAmount = parseFloat(registration.program_training_cost) || 0;
      const paidAmount = parseFloat(registration.amount_paid || 0) || 0;
      const remaining = totalAmount - paidAmount;

      // Logika sederhana untuk cicilan
      // Dalam implementasi real, ini harus disesuaikan dengan business logic
      const installmentCount = registration.program_installment_plan
        ? parseInt(registration.program_installment_plan.split("_")[0]) || 4
        : 4;

      const nextInstallmentNumber = 1; // Default untuk cicilan pertama
      const installmentAmount = Math.max(
        0,
        Math.round(remaining / Math.max(1, installmentCount))
      );

      return {
        number: nextInstallmentNumber,
        amount: installmentAmount,
      };
    } catch (error) {
      console.error("Error calculating installment:", error);
      return {
        number: 1,
        amount: 0,
      };
    }
  };

  const safeCurrencyFormat = (value, defaultValue = "0") => {
    if (value === null || value === undefined || value === "") {
      return defaultValue;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return defaultValue;
    }

    return numValue.toLocaleString("id-ID");
  };

  const safeParseFloat = (value, defaultValue = 0) => {
    if (value === null || value === undefined || value === "") {
      return defaultValue;
    }

    const numValue = parseFloat(value);
    return isNaN(numValue) ? defaultValue : numValue;
  };

  const handleInvoiceSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        registration_id: selectedPayment.registration.id,
        amount: invoiceForm.amount,
        amount_paid: 0,
        payment_method: "transfer",
        status: "pending",
        due_date: invoiceForm.due_date,
        notes: invoiceForm.notes,
        verified_by: user.id,
      };

      const response = await axios.post("/api/payments/manual", payload);

      if (response.data.success) {
        alert("Tagihan berhasil diterbitkan");
        setShowInvoiceModal(false);
        setSelectedPayment(null);
        setInvoiceForm({
          due_date: "",
          amount: "",
          installment_number: 1,
          notes: "",
        });
        fetchPayments();
        fetchStatistics();
      }
    } catch (error) {
      console.error("Error creating invoice:", error);
      alert(
        "Error creating invoice: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

  const handleManualPaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        verified_by: user.id,
      };

      const response = await axios.post("/api/payments/manual", payload);

      if (response.data.success) {
        alert("Pembayaran manual berhasil ditambahkan");
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
        fetchPayments();
        fetchStatistics();
      }
    } catch (error) {
      console.error("Error creating manual payment:", error);
      alert(
        "Error creating manual payment: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: "bg-warning", text: "Menunggu" },
      installment_1: { class: "bg-info", text: "Cicilan 1" },
      installment_2: { class: "bg-info", text: "Cicilan 2" },
      installment_3: { class: "bg-info", text: "Cicilan 3" },
      installment_4: { class: "bg-info", text: "Cicilan 4" },
      installment_5: { class: "bg-info", text: "Cicilan 5" },
      installment_6: { class: "bg-info", text: "Cicilan 6" },
      paid: { class: "bg-success", text: "Lunas" },
      overdue: { class: "bg-danger", text: "Jatuh Tempo" },
      cancelled: { class: "bg-secondary", text: "Dibatalkan" },
    };
    const config = statusConfig[status] || {
      class: "bg-secondary",
      text: status,
    };
    return <span className={`badge ${config.class}`}>{config.text}</span>;
  };

  const getPaymentMethodText = (method) => {
    const methods = {
      transfer: "Transfer Bank",
      cash: "Tunai",
      credit_card: "Kartu Kredit",
    };
    return methods[method] || method;
  };

  const getInstallmentText = (payment) => {
    if (payment.status === "paid") return "Lunas";
    if (payment.status === "pending") return "Menunggu Pembayaran";
    if (payment.status.startsWith("installment_")) {
      const installmentNum = payment.status.split("_")[1];
      return `Cicilan ${installmentNum}`;
    }
    return payment.status;
  };

  // Calculate statistics from actual data
  const calculateRealStats = () => {
    if (!payments.length) return null;

    const totalRevenue = payments
      .filter((p) => p.status === "paid" || p.status.includes("installment"))
      .reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);

    const pendingVerification = payments.filter(
      (p) => p.status === "pending"
    ).length;
    const totalTransactions = payments.length;

    return {
      totalRevenue,
      pendingVerification,
      totalTransactions,
    };
  };

  const realStats = calculateRealStats();

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

  return (
    <div className="container mt-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">Manajemen Pembayaran</h2>
              <p className="text-muted mb-0">
                Kelola dan verifikasi pembayaran peserta
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

      {/* Statistics Cards - REAL DATA */}
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

      {/* Filters Section */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Filter & Pencarian</h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Status Pembayaran</label>
              <select
                className="form-select"
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
              >
                <option value="all">Semua Status</option>
                <option value="pending">Menunggu</option>
                <option value="installment_1">Cicilan 1</option>
                <option value="installment_2">Cicilan 2</option>
                <option value="installment_3">Cicilan 3</option>
                <option value="paid">Lunas</option>
                <option value="overdue">Jatuh Tempo</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Pencarian</label>
              <input
                type="text"
                className="form-control"
                placeholder="Cari nama peserta, invoice..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Daftar Transaksi ({payments.length})</h5>
          <div>
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={fetchPayments}
            >
              <i className="bi bi-arrow-clockwise me-1"></i>
              Refresh
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
                Coba ubah filter atau kata kunci pencarian
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light align-middle">
                  <tr>
                    <th>Invoice</th>
                    <th>Peserta</th>
                    <th>Program</th>
                    <th>Nominal</th>
                    <th>Status</th>
                    <th>Tanggal</th>
                    <th>Metode</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody className="align-middle">
                  {payments.map((payment) => (
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
                        <strong className="d-block">{payment.full_name}</strong>
                        <small className="text-muted d-block">
                          {payment.email}
                        </small>
                        <small className="text-muted">
                          Kode: {payment.registration_code}
                        </small>
                      </td>
                      <td>
                        <div>{payment.program_name}</div>
                        <small className="text-muted">
                          {payment.program_duration}
                        </small>
                      </td>
                      <td>
                        <div className="fw-bold">
                          Rp {safeCurrencyFormat(payment.amount)}
                        </div>
                        {payment.amount_paid > 0 && (
                          <small className="text-success">
                            Dibayar: Rp{" "}
                            {safeCurrencyFormat(payment.amount_paid)}
                          </small>
                        )}
                      </td>
                      <td>{getStatusBadge(payment.status)}</td>
                      <td>
                        <div className="small">
                          {new Date(payment.created_at).toLocaleDateString(
                            "id-ID"
                          )}
                        </div>
                        {payment.due_date && (
                          <div className="small text-muted">
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
                            {getPaymentMethodText(payment.payment_method)}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-primary"
                            onClick={() => handleViewDetails(payment)}
                            title="Lihat Detail"
                          >
                            <i className="bi bi-eye"></i>
                          </button>

                          {/* Tombol Verifikasi untuk status pending */}
                          {payment.status === "pending" && (
                            <button
                              className="btn btn-outline-primary"
                              onClick={() => handleOpenVerification(payment)}
                              title="Verifikasi Pembayaran"
                            >
                              <i className="bi bi-check-lg"></i>
                            </button>
                          )}

                          {/* Tombol Terbitkan Tagihan untuk registrasi yang belum lunas */}
                          {payment.status !== "paid" &&
                            payment.status !== "cancelled" && (
                              <button
                                className="btn btn-outline-primary"
                                onClick={() => handleOpenInvoice(payment)}
                                title="Terbitkan Tagihan"
                              >
                                <i className="bi bi-receipt"></i>
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Tambah Pembayaran Manual */}
      {showManualModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Tambah Pembayaran Manual</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowManualModal(false)}
                ></button>
              </div>
              <form onSubmit={handleManualPaymentSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Pilih Pendaftaran *</label>
                      <select
                        className="form-select"
                        value={formData.registration_id}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            registration_id: e.target.value,
                          })
                        }
                        required
                      >
                        <option value="">Pilih Pendaftaran</option>
                        {registrations.map((reg) => (
                          <option key={reg.id} value={reg.id}>
                            {reg.registration_code} - {reg.full_name} (
                            {reg.program_name})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Total Amount *</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.amount}
                        onChange={(e) =>
                          setFormData({ ...formData, amount: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Amount Paid *</label>
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
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Status *</label>
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
                    onClick={() => setShowManualModal(false)}
                  >
                    Batal
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Simpan Pembayaran
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
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Verifikasi Bukti Pembayaran</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowVerificationModal(false)}
                ></button>
              </div>
              <form onSubmit={handleVerificationSubmit}>
                <div className="modal-body">
                  <div className="row mb-4">
                    <div className="col-md-6">
                      <h6>Informasi Transaksi</h6>
                      <p>
                        <strong>ID Transaksi:</strong>{" "}
                        {selectedPayment.invoice_number}
                      </p>
                      <p>
                        <strong>Nama Peserta:</strong>{" "}
                        {selectedPayment.full_name}
                      </p>
                      <p>
                        <strong>Program:</strong> {selectedPayment.program_name}
                      </p>
                      <p>
                        <strong>Total Tagihan:</strong> Rp{" "}
                        {safeCurrencyFormat(selectedPayment.amount)}
                      </p>
                    </div>
                    <div className="col-md-6">
                      <h6>Detail Pembayaran</h6>
                      <p>
                        <strong>Tanggal Upload:</strong>{" "}
                        {new Date(
                          selectedPayment.created_at
                        ).toLocaleDateString("id-ID")}
                      </p>
                      <p>
                        <strong>Cicilan yang Diverifikasi:</strong>{" "}
                        {getInstallmentText(selectedPayment)}
                      </p>
                      <p>
                        <strong>Jumlah Pembayaran:</strong> Rp{" "}
                        {safeCurrencyFormat(selectedPayment.amount)}
                      </p>
                    </div>
                  </div>

                  {/* Preview Bukti Pembayaran - DIPERBAIKI */}
                  <div className="row mb-4">
                    <div className="col-12">
                      <h6>Preview Bukti Pembayaran</h6>
                      {selectedPayment.proof_image ? (
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
                              errorDiv.innerHTML =
                                "Gambar tidak dapat dimuat. Path: " +
                                selectedPayment.proof_image;
                              e.target.parentNode.appendChild(errorDiv);
                            }}
                          />
                          {/* <div className="mt-2">
                            <small className="text-muted">
                              Path: {selectedPayment.proof_image}
                            </small>
                          </div> */}
                        </div>
                      ) : (
                        <div className="text-center text-muted py-4 border rounded">
                          <i className="bi bi-image display-4 d-block mb-2"></i>
                          Tidak ada bukti pembayaran yang diupload
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Form Verifikasi */}
                  <div className="row">
                    <div className="col-md-6">
                      <label className="form-label">Status Verifikasi *</label>
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
                        <option value="paid">Setujui & Verifikasi</option>
                        <option value="cancelled">Tolak Pembayaran</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">
                        Jumlah yang Dibayar *
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
                        required
                      />
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
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowVerificationModal(false)}
                  >
                    Batalkan
                  </button>
                  {verificationForm.status === "cancelled" ? (
                    <button type="submit" className="btn btn-danger">
                      Tolak Pembayaran
                    </button>
                  ) : (
                    <button type="submit" className="btn btn-primary">
                      Setujui & Verifikasi
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Penerbitan Tagihan */}
      {showInvoiceModal && selectedPayment && selectedPayment.registration && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Konfirmasi Penerbitan Tagihan</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowInvoiceModal(false)}
                ></button>
              </div>
              <form onSubmit={handleInvoiceSubmit}>
                <div className="modal-body">
                  <div className="row mb-4">
                    <div className="col-md-6">
                      <h6>Detail Peserta</h6>
                      <p>
                        <strong>Nama Peserta:</strong>{" "}
                        {selectedPayment.registration.full_name ||
                          "Tidak tersedia"}
                      </p>
                      <p>
                        <strong>Program:</strong>{" "}
                        {selectedPayment.registration.program_name ||
                          "Tidak tersedia"}
                      </p>
                      <p>
                        <strong>ID Transaksi:</strong>{" "}
                        {selectedPayment.registration.registration_code ||
                          "Tidak tersedia"}
                      </p>
                    </div>
                    <div className="col-md-6">
                      <h6>Informasi Pembayaran</h6>
                      <p>
                        <strong>Total Biaya Program:</strong> Rp{" "}
                        {safeCurrencyFormat(
                          selectedPayment.registration.program_training_cost,
                          "0"
                        )}
                      </p>
                      <p>
                        <strong>Sudah Dibayar:</strong> Rp{" "}
                        {safeCurrencyFormat(
                          selectedPayment.registration.amount_paid,
                          "0"
                        )}
                      </p>
                      <p>
                        <strong>Sisa Tagihan:</strong> Rp{" "}
                        {safeCurrencyFormat(
                          safeParseFloat(
                            selectedPayment.registration.program_training_cost
                          ) -
                            safeParseFloat(
                              selectedPayment.registration.amount_paid
                            )
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Form Penerbitan Tagihan */}
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Cicilan Ke-*</label>
                      <input
                        type="number"
                        className="form-control"
                        value={invoiceForm.installment_number || ""}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 1;
                          setInvoiceForm({
                            ...invoiceForm,
                            installment_number: Math.max(1, Math.min(6, value)),
                          });
                        }}
                        min="1"
                        max="6"
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">
                        Jumlah Tagihan (Rp) *
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={invoiceForm.amount || ""}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setInvoiceForm({
                            ...invoiceForm,
                            amount: Math.max(0, value),
                          });
                        }}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">
                        Tanggal Jatuh Tempo *
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        value={invoiceForm.due_date || ""}
                        onChange={(e) =>
                          setInvoiceForm({
                            ...invoiceForm,
                            due_date: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Catatan</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={invoiceForm.notes || ""}
                        onChange={(e) =>
                          setInvoiceForm({
                            ...invoiceForm,
                            notes: e.target.value,
                          })
                        }
                        placeholder="Catatan untuk tagihan ini..."
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowInvoiceModal(false)}
                  >
                    Batal
                  </button>
                  <button type="submit" className="btn btn-primary">
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
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Detail Pembayaran</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDetailModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
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
                      <strong>Total:</strong> Rp{" "}
                      {parseFloat(selectedPayment.amount).toLocaleString(
                        "id-ID"
                      )}
                    </p>
                    <p>
                      <strong>Dibayar:</strong> Rp{" "}
                      {parseFloat(
                        selectedPayment.amount_paid || 0
                      ).toLocaleString("id-ID")}
                    </p>
                    <p>
                      <strong>Status:</strong>{" "}
                      {getStatusBadge(selectedPayment.status)}
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
                                <td>{getStatusBadge(history.old_status)}</td>
                                <td>{getStatusBadge(history.new_status)}</td>
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
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowDetailModal(false)}
                >
                  Tutup
                </button>
                {selectedPayment.receipt_number && (
                  <a
                    href={`/api/payments/${selectedPayment.id}/receipt`}
                    target="_blank"
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
