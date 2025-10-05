import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const PaymentManagement = () => {
  const [payments, setPayments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    status: "all",
    program: "all",
    search: "",
    start_date: "",
    end_date: "",
  });
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [stats, setStats] = useState(null);
  const { user } = useAuth();

  const [manualPaymentData, setManualPaymentData] = useState({
    registration_id: "",
    amount: "",
    amount_paid: "",
    payment_method: "transfer",
    bank_name: "",
    account_number: "",
    payment_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useEffect(() => {
    fetchPayments();
    fetchPrograms();
    fetchStatistics();
  }, [filters]);

  const fetchPayments = async () => {
    try {
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

  const handleUpdateStatus = async (paymentId, status, amount_paid = null) => {
    try {
      const updateData = {
        status,
        verified_by: user.id,
        notes: `Status changed to ${status} by admin`,
      };

      if (amount_paid !== null) {
        updateData.amount_paid = amount_paid;
      }

      const response = await axios.put(
        `/api/payments/${paymentId}/status`,
        updateData
      );
      if (response.data.success) {
        alert("Payment status updated successfully");
        fetchPayments();
        fetchStatistics();
        setShowDetailModal(false);
      }
    } catch (error) {
      console.error("Error updating payment status:", error);
      alert("Error updating payment status");
    }
  };

  const handleManualPaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...manualPaymentData,
        verified_by: user.id,
      };

      const response = await axios.post("/api/payments/manual", data);
      if (response.data.success) {
        alert("Manual payment recorded successfully");
        setShowManualModal(false);
        setManualPaymentData({
          registration_id: "",
          amount: "",
          amount_paid: "",
          payment_method: "transfer",
          bank_name: "",
          account_number: "",
          payment_date: new Date().toISOString().split("T")[0],
          notes: "",
        });
        fetchPayments();
        fetchStatistics();
      }
    } catch (error) {
      console.error("Error creating manual payment:", error);
      alert("Error recording manual payment");
    }
  };

  const handleGenerateReceipt = async (paymentId) => {
    try {
      const response = await axios.get(`/api/payments/${paymentId}/receipt`);
      if (response.data.success) {
        const receiptData = response.data.data;

        // Create a printable receipt
        const receiptWindow = window.open("", "_blank");
        receiptWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Kwitansi Pembayaran - ${receiptData.receipt_number}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .receipt-info { margin-bottom: 20px; }
              .section { margin-bottom: 15px; }
              .total { font-size: 18px; font-weight: bold; margin-top: 20px; }
              .footer { margin-top: 40px; text-align: center; font-size: 12px; }
              table { width: 100%; border-collapse: collapse; }
              td { padding: 8px; border-bottom: 1px solid #ddd; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>KWITANSI PEMBAYARAN</h2>
              <h3>Program Magang Perusahaan</h3>
            </div>
            
            <div class="receipt-info">
              <table>
                <tr><td width="30%">No. Kwitansi</td><td>: ${
                  receiptData.receipt_number
                }</td></tr>
                <tr><td>No. Invoice</td><td>: ${
                  receiptData.invoice_number
                }</td></tr>
                <tr><td>Tanggal</td><td>: ${receiptData.date}</td></tr>
              </table>
            </div>

            <div class="section">
              <h4>Data Peserta</h4>
              <table>
                <tr><td width="30%">Nama</td><td>: ${
                  receiptData.participant.name
                }</td></tr>
                <tr><td>Email</td><td>: ${
                  receiptData.participant.email
                }</td></tr>
                <tr><td>Telepon</td><td>: ${
                  receiptData.participant.phone
                }</td></tr>
              </table>
            </div>

            <div class="section">
              <h4>Detail Program</h4>
              <table>
                <tr><td width="30%">Program</td><td>: ${
                  receiptData.program.name
                }</td></tr>
                <tr><td>Durasi</td><td>: ${
                  receiptData.program.duration
                }</td></tr>
              </table>
            </div>

            <div class="section">
              <h4>Detail Pembayaran</h4>
              <table>
                <tr><td width="30%">Jumlah Tagihan</td><td>: Rp ${receiptData.payment.amount?.toLocaleString(
                  "id-ID"
                )}</td></tr>
                <tr><td>Jumlah Dibayar</td><td>: Rp ${receiptData.payment.amount_paid?.toLocaleString(
                  "id-ID"
                )}</td></tr>
                <tr><td>Tanggal Bayar</td><td>: ${
                  receiptData.payment.payment_date
                }</td></tr>
                <tr><td>Metode Bayar</td><td>: ${
                  receiptData.payment.method
                }</td></tr>
                <tr><td>Diverifikasi oleh</td><td>: ${
                  receiptData.payment.verified_by
                }</td></tr>
              </table>
            </div>

            <div class="total">
              TOTAL PEMBAYARAN: Rp ${receiptData.payment.amount_paid?.toLocaleString(
                "id-ID"
              )}
            </div>

            <div class="footer">
              <p>Terima kasih telah melakukan pembayaran.</p>
              <p>Kwitansi ini sah dan dapat digunakan sebagai bukti pembayaran.</p>
            </div>
          </body>
          </html>
        `);
        receiptWindow.document.close();
        receiptWindow.print();
      }
    } catch (error) {
      console.error("Error generating receipt:", error);
      alert("Error generating receipt");
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: "bg-warning", text: "Pending" },
      down_payment: { class: "bg-info", text: "DP" },
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
              💰 Input Pembayaran Manual
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="row mb-4">
          <div className="col-md-2">
            <div className="card bg-primary text-white">
              <div className="card-body text-center">
                <h4 className="mb-0">{stats.statistics.total_payments}</h4>
                <p className="mb-0">Total</p>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card bg-success text-white">
              <div className="card-body text-center">
                <h4 className="mb-0">
                  Rp {stats.statistics.total_revenue?.toLocaleString("id-ID")}
                </h4>
                <p className="mb-0">Pendapatan</p>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card bg-warning text-white">
              <div className="card-body text-center">
                <h4 className="mb-0">{stats.statistics.pending_payments}</h4>
                <p className="mb-0">Pending</p>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card bg-info text-white">
              <div className="card-body text-center">
                <h4 className="mb-0">{stats.statistics.dp_payments}</h4>
                <p className="mb-0">DP</p>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card bg-danger text-white">
              <div className="card-body text-center">
                <h4 className="mb-0">{stats.statistics.overdue_payments}</h4>
                <p className="mb-0">Jatuh Tempo</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Filters & Search</h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="down_payment">Down Payment</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Program</label>
              <select
                className="form-select"
                value={filters.program}
                onChange={(e) => handleFilterChange("program", e.target.value)}
              >
                <option value="all">All Programs</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Tanggal Mulai</label>
              <input
                type="date"
                className="form-control"
                value={filters.start_date}
                onChange={(e) =>
                  handleFilterChange("start_date", e.target.value)
                }
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Tanggal Akhir</label>
              <input
                type="date"
                className="form-control"
                value={filters.end_date}
                onChange={(e) => handleFilterChange("end_date", e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Search</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search by name, email, invoice, or registration code..."
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
          <h5 className="mb-0">Data Pembayaran ({payments.length})</h5>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={fetchPayments}
          >
            🔄 Refresh
          </button>
        </div>
        <div className="card-body">
          {payments.length === 0 ? (
            <div className="text-center py-5">
              <div className="display-1 text-muted mb-3">💳</div>
              <h5>No payments found</h5>
              <p className="text-muted">
                Try changing your filters or search term
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th>Invoice</th>
                    <th>Peserta</th>
                    <th>Program</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Tanggal</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>
                        <strong>{payment.invoice_number}</strong>
                        {payment.receipt_number && (
                          <div>
                            <small className="text-muted">
                              Receipt: {payment.receipt_number}
                            </small>
                          </div>
                        )}
                      </td>
                      <td>
                        <strong>{payment.full_name}</strong>
                        <div>
                          <small className="text-muted">{payment.email}</small>
                        </div>
                        <div>
                          <small>Kode: {payment.registration_code}</small>
                        </div>
                      </td>
                      <td>{payment.program_name}</td>
                      <td>
                        <div>Rp {payment.amount?.toLocaleString("id-ID")}</div>
                        {payment.amount_paid > 0 && (
                          <small className="text-success">
                            Paid: Rp{" "}
                            {payment.amount_paid?.toLocaleString("id-ID")}
                          </small>
                        )}
                      </td>
                      <td>{getStatusBadge(payment.status)}</td>
                      <td>
                        {new Date(payment.created_at).toLocaleDateString(
                          "id-ID"
                        )}
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-primary"
                            onClick={() => handleViewDetails(payment)}
                            title="View Details"
                          >
                            👁️
                          </button>
                          {payment.status === "pending" && (
                            <>
                              <button
                                className="btn btn-outline-success"
                                onClick={() =>
                                  handleUpdateStatus(
                                    payment.id,
                                    "paid",
                                    payment.amount
                                  )
                                }
                                title="Approve Payment"
                              >
                                ✅
                              </button>
                              <button
                                className="btn btn-outline-info"
                                onClick={() =>
                                  handleUpdateStatus(
                                    payment.id,
                                    "down_payment",
                                    payment.amount * 0.5
                                  )
                                }
                                title="Set as DP"
                              >
                                💰
                              </button>
                            </>
                          )}
                          {payment.status === "paid" &&
                            payment.receipt_number && (
                              <button
                                className="btn btn-outline-secondary"
                                onClick={() =>
                                  handleGenerateReceipt(payment.id)
                                }
                                title="Generate Receipt"
                              >
                                🖨️
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

      {/* Detail Modal */}
      {showDetailModal && selectedPayment && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
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
                      <strong>Telepon:</strong> {selectedPayment.phone}
                    </p>
                    <p>
                      <strong>Alamat:</strong> {selectedPayment.address}
                    </p>
                  </div>
                  <div className="col-md-6">
                    <h6>Informasi Pembayaran</h6>
                    <p>
                      <strong>Invoice:</strong> {selectedPayment.invoice_number}
                    </p>
                    <p>
                      <strong>Receipt:</strong>{" "}
                      {selectedPayment.receipt_number || "N/A"}
                    </p>
                    <p>
                      <strong>Program:</strong> {selectedPayment.program_name}
                    </p>
                    <p>
                      <strong>Total Amount:</strong> Rp{" "}
                      {selectedPayment.amount?.toLocaleString("id-ID")}
                    </p>
                    <p>
                      <strong>Amount Paid:</strong> Rp{" "}
                      {selectedPayment.amount_paid?.toLocaleString("id-ID")}
                    </p>
                    <p>
                      <strong>Status:</strong>{" "}
                      {getStatusBadge(selectedPayment.status)}
                    </p>
                    <p>
                      <strong>Payment Method:</strong>{" "}
                      {selectedPayment.payment_method}
                    </p>
                  </div>
                </div>

                {selectedPayment.proof_image && (
                  <div className="mt-3">
                    <h6>Bukti Pembayaran</h6>
                    <img
                      src={`http://localhost:5000/uploads/payments/${selectedPayment.proof_image}`}
                      alt="Bukti pembayaran"
                      className="img-fluid rounded"
                      style={{ maxHeight: "300px" }}
                    />
                  </div>
                )}

                {selectedPayment.notes && (
                  <div className="mt-3">
                    <h6>Catatan</h6>
                    <p>{selectedPayment.notes}</p>
                  </div>
                )}

                {selectedPayment.history &&
                  selectedPayment.history.length > 0 && (
                    <div className="mt-3">
                      <h6>Riwayat Pembayaran</h6>
                      <div className="table-responsive">
                        <table className="table table-sm">
                          <thead className="table-light">
                            <tr>
                              <th>Tanggal</th>
                              <th>Status Lama</th>
                              <th>Status Baru</th>
                              <th>Changed By</th>
                              <th>Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedPayment.history.map((record) => (
                              <tr key={record.id}>
                                <td>
                                  {new Date(record.changed_at).toLocaleString(
                                    "id-ID"
                                  )}
                                </td>
                                <td>{getStatusBadge(record.old_status)}</td>
                                <td>{getStatusBadge(record.new_status)}</td>
                                <td>{record.changed_by_name}</td>
                                <td>{record.notes}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
              </div>
              <div className="modal-footer">
                {selectedPayment.status === "pending" && (
                  <>
                    <button
                      className="btn btn-success"
                      onClick={() =>
                        handleUpdateStatus(
                          selectedPayment.id,
                          "paid",
                          selectedPayment.amount
                        )
                      }
                    >
                      ✅ Approve Lunas
                    </button>
                    <button
                      className="btn btn-info"
                      onClick={() =>
                        handleUpdateStatus(
                          selectedPayment.id,
                          "down_payment",
                          selectedPayment.amount * 0.5
                        )
                      }
                    >
                      💰 Set sebagai DP
                    </button>
                  </>
                )}
                {selectedPayment.status === "paid" &&
                  selectedPayment.receipt_number && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleGenerateReceipt(selectedPayment.id)}
                    >
                      🖨️ Cetak Kwitansi
                    </button>
                  )}
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setShowDetailModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Payment Modal */}
      {showManualModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Input Pembayaran Manual</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowManualModal(false)}
                ></button>
              </div>
              <form onSubmit={handleManualPaymentSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Registration ID *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={manualPaymentData.registration_id}
                      onChange={(e) =>
                        setManualPaymentData((prev) => ({
                          ...prev,
                          registration_id: e.target.value,
                        }))
                      }
                      required
                    />
                    <div className="form-text">Masukkan ID pendaftaran</div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Total Amount *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={manualPaymentData.amount}
                      onChange={(e) =>
                        setManualPaymentData((prev) => ({
                          ...prev,
                          amount: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Amount Paid *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={manualPaymentData.amount_paid}
                      onChange={(e) =>
                        setManualPaymentData((prev) => ({
                          ...prev,
                          amount_paid: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Payment Method *</label>
                    <select
                      className="form-select"
                      value={manualPaymentData.payment_method}
                      onChange={(e) =>
                        setManualPaymentData((prev) => ({
                          ...prev,
                          payment_method: e.target.value,
                        }))
                      }
                    >
                      <option value="transfer">Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="credit_card">Credit Card</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Bank Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={manualPaymentData.bank_name}
                      onChange={(e) =>
                        setManualPaymentData((prev) => ({
                          ...prev,
                          bank_name: e.target.value,
                        }))
                      }
                      placeholder="Jika transfer, masukkan nama bank"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Account Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={manualPaymentData.account_number}
                      onChange={(e) =>
                        setManualPaymentData((prev) => ({
                          ...prev,
                          account_number: e.target.value,
                        }))
                      }
                      placeholder="Jika transfer, masukkan nomor rekening"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Payment Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={manualPaymentData.payment_date}
                      onChange={(e) =>
                        setManualPaymentData((prev) => ({
                          ...prev,
                          payment_date: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={manualPaymentData.notes}
                      onChange={(e) =>
                        setManualPaymentData((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      placeholder="Catatan tambahan..."
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="submit" className="btn btn-primary">
                    Simpan Pembayaran
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowManualModal(false)}
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentManagement;
