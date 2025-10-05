import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const UserDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const { user } = useAuth();
  const [userPayments, setUserPayments] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentForUpload, setSelectedPaymentForUpload] =
    useState(null);
  const [uploading, setUploading] = useState(false);
  const [apiErrors, setApiErrors] = useState({});
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [registrationDetail, setRegistrationDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchUserPayments();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setError("");
      const response = await axios.get(`/api/user-dashboard/${user.id}`);
      if (response.data.success) {
        setDashboardData(response.data.data);
      } else {
        setError("Failed to load dashboard data");
      }
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      setError(error.response?.data?.message || "Error loading dashboard data");
      setApiErrors((prev) => ({ ...prev, dashboard: error.message }));
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPayments = async () => {
    try {
      setPaymentsLoading(true);
      const response = await axios.get(`/api/payments/user/${user.id}`);
      if (response.data.success) {
        setUserPayments(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching user payments:", error);
      setApiErrors((prev) => ({ ...prev, payments: error.message }));
    } finally {
      setPaymentsLoading(false);
    }
  };

  const handleUploadProof = async (e) => {
    e.preventDefault();
    if (!selectedPaymentForUpload) return;

    const formData = new FormData();
    const fileInput = e.target.proof_image;
    const file = fileInput.files[0];

    if (!file) {
      alert("Pilih file bukti pembayaran terlebih dahulu");
      return;
    }

    // Validasi file
    if (!file.type.startsWith("image/")) {
      alert("Hanya file gambar yang diizinkan");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran file maksimal 5MB");
      return;
    }

    formData.append("proof_image", file);

    setUploading(true);
    try {
      const response = await axios.post(
        `/api/payments/${selectedPaymentForUpload.id}/upload-proof`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        alert("Bukti pembayaran berhasil diupload");
        setShowPaymentModal(false);
        setSelectedPaymentForUpload(null);
        fetchUserPayments();
        fetchDashboardData();
      }
    } catch (error) {
      console.error("Error uploading proof:", error);
      alert(
        error.response?.data?.message || "Error uploading bukti pembayaran"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateReceipt = async (payment) => {
    try {
      const response = await axios.get(`/api/payments/${payment.id}/receipt`, {
        responseType: "blob",
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `receipt-${payment.receipt_number || payment.invoice_number}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading receipt:", error);

      const receiptWindow = window.open("", "_blank");
      receiptWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kwitansi - ${payment.invoice_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .section { margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          td { padding: 8px; border-bottom: 1px solid #ddd; }
          .total { font-size: 18px; font-weight: bold; margin-top: 20px; padding: 10px; background: #f8f9fa; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>KWITANSI PEMBAYARAN</h2>
          <h3>Program Magang</h3>
        </div>
        
        <div class="section">
          <table>
            <tr><td width="30%"><strong>No. Invoice</strong></td><td>${
              payment.invoice_number
            }</td></tr>
            <tr><td><strong>No. Kwitansi</strong></td><td>${
              payment.receipt_number || "N/A"
            }</td></tr>
            <tr><td><strong>Tanggal</strong></td><td>${new Date().toLocaleDateString(
              "id-ID"
            )}</td></tr>
          </table>
        </div>

        <div class="section">
          <h4>Detail Pembayaran</h4>
          <table>
            <tr><td width="30%">Program</td><td>${
              payment.program_name
            }</td></tr>
            <tr><td>Jumlah Tagihan</td><td>Rp ${payment.amount?.toLocaleString(
              "id-ID"
            )}</td></tr>
            <tr><td>Jumlah Dibayar</td><td>Rp ${payment.amount_paid?.toLocaleString(
              "id-ID"
            )}</td></tr>
            <tr><td>Status</td><td>${payment.status}</td></tr>
            <tr><td>Tanggal Bayar</td><td>${
              payment.payment_date
                ? new Date(payment.payment_date).toLocaleDateString("id-ID")
                : "N/A"
            }</td></tr>
          </table>
        </div>

        <div class="total">
          TOTAL: Rp ${payment.amount_paid?.toLocaleString("id-ID")}
        </div>

        <div class="footer">
          <p>Terima kasih telah melakukan pembayaran.</p>
          <p>Kwitansi ini sah dan dapat digunakan sebagai bukti pembayaran.</p>
          <p>Generated on: ${new Date().toLocaleString("id-ID")}</p>
        </div>
      </body>
      </html>
    `);
      receiptWindow.document.close();
    }
  };

  // Helper functions for status badges
  const getPaymentStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: "bg-warning", text: "Belum Bayar" },
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

  const getSelectionStatusBadge = (status) => {
    const statusConfig = {
      menunggu: { class: "bg-warning", text: "Menunggu" },
      lolos_tahap_1: { class: "bg-info", text: "Lolos Tahap 1" },
      lolos_tahap_2: { class: "bg-primary", text: "Lolos Tahap 2" },
      lolos: { class: "bg-success", text: "Lolos" },
      tidak_lolos: { class: "bg-danger", text: "Tidak Lolos" },
    };
    const config = statusConfig[status] || {
      class: "bg-secondary",
      text: status,
    };
    return <span className={`badge ${config.class}`}>{config.text}</span>;
  };

  const getPlacementStatusBadge = (status) => {
    const statusConfig = {
      proses: { class: "bg-warning", text: "Proses" },
      lolos: { class: "bg-success", text: "Lolos" },
      ditempatkan: { class: "bg-success", text: "Ditempatkan" },
      gagal: { class: "bg-danger", text: "Gagal" },
    };
    const config = statusConfig[status] || {
      class: "bg-secondary",
      text: status,
    };
    return <span className={`badge ${config.class}`}>{config.text}</span>;
  };

  const getRegistrationStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: "bg-warning", text: "Menunggu" },
      under_review: { class: "bg-info", text: "Dalam Review" },
      accepted: { class: "bg-success", text: "Diterima" },
      rejected: { class: "bg-danger", text: "Ditolak" },
      waiting_list: { class: "bg-secondary", text: "Waiting List" },
    };
    const config = statusConfig[status] || {
      class: "bg-secondary",
      text: status,
    };
    return <span className={`badge ${config.class}`}>{config.text}</span>;
  };

  const handleShowDetail = async (registration) => {
    setSelectedRegistration(registration);
    setShowDetailModal(true);
    setDetailLoading(true);

    try {
      const response = await axios.get(
        `/api/user-dashboard/registration/${registration.id}`
      );
      if (response.data.success) {
        setRegistrationDetail(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching registration details:", error);
      setRegistrationDetail(registration);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedRegistration(null);
    setRegistrationDetail(null);
  };

  const handleRefresh = () => {
    setLoading(true);
    setPaymentsLoading(true);
    fetchDashboardData();
    fetchUserPayments();
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
        <div className="text-center mt-3">
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          <h5>Error Loading Dashboard</h5>
          <p className="mb-0">{error}</p>
          <button
            className="btn btn-sm btn-outline-danger mt-2"
            onClick={fetchDashboardData}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="container mt-4">
        <div className="alert alert-info">
          <h5>Welcome, {user?.full_name}!</h5>
          <p>You haven't registered for any programs yet.</p>
          <Link to="/programs" className="btn btn-primary">
            Browse Programs
          </Link>
        </div>
      </div>
    );
  }

  const { user: userInfo, registrations, statistics } = dashboardData;

  return (
    <div className="container mt-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">Dashboard Peserta</h2>
              <p className="text-muted mb-0">
                Welcome back, <strong>{userInfo.full_name}</strong>
              </p>
            </div>
            <button
              className="btn btn-outline-primary me-2"
              onClick={handleRefresh}
              title="Refresh Data"
            >
              <i class="bi bi-arrow-repeat"></i> Resfresh Data
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h4 className="mb-0">{statistics.totalRegistrations}</h4>
                  <p className="mb-0">Total Pendaftaran</p>
                </div>
                <div className="align-self-center">
                  <span className="display-6"><i class="bi bi-clipboard"></i></span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h4 className="mb-0">{statistics.acceptedRegistrations}</h4>
                  <p className="mb-0">Diterima</p>
                </div>
                <div className="align-self-center">
                  <span className="display-6"><i class="bi bi-check-circle"></i></span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h4 className="mb-0">{statistics.pendingPayments}</h4>
                  <p className="mb-0">Pending Payment</p>
                </div>
                <div className="align-self-center">
                  <span className="display-6"><i class="bi bi-credit-card"></i></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="row">
        <div className="col-12">
          <ul className="nav nav-tabs" id="dashboardTabs" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${
                  activeTab === "overview" ? "active" : ""
                }`}
                onClick={() => setActiveTab("overview")}
              >
                📊 Overview
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${
                  activeTab === "registrations" ? "active" : ""
                }`}
                onClick={() => setActiveTab("registrations")}
              >
                <i class="bi bi-pencil-square"></i> Pendaftaran
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${
                  activeTab === "profile" ? "active" : ""
                }`}
                onClick={() => setActiveTab("profile")}
              >
                <i class="bi bi-person"></i> Profile
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${
                  activeTab === "payments" ? "active" : ""
                }`}
                onClick={() => setActiveTab("payments")}
              >
                <i class="bi bi-credit-card"></i> Pembayaran
              </button>
            </li>
          </ul>

          <div className="tab-content mt-4">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="tab-pane fade show active">
                <div className="row">
                  <div className="col-lg-8">
                    <div className="card">
                      <div className="card-header">
                        <h5 className="mb-0">Status Pendaftaran Terkini</h5>
                      </div>
                      <div className="card-body">
                        {registrations.length === 0 ? (
                          <div className="text-center py-4">
                            <p className="text-muted">
                              Belum ada pendaftaran program
                            </p>
                            <Link to="/programs" className="btn btn-primary">
                              Daftar Program Pertama
                            </Link>
                          </div>
                        ) : (
                          registrations.slice(0, 3).map((registration) => (
                            <div
                              key={registration.id}
                              className="border-bottom pb-3 mb-3"
                            >
                              <div className="d-flex justify-content-between align-items-start">
                                <div>
                                  <h6 className="mb-1">
                                    {registration.program_name}
                                  </h6>
                                  <p className="text-muted small mb-2">
                                    Kode: {registration.registration_code} |
                                    Tanggal:{" "}
                                    {new Date(
                                      registration.registration_date
                                    ).toLocaleDateString("id-ID")}
                                  </p>
                                </div>
                              </div>

                              <div className="row mt-2">
                                <div className="col-md-4">
                                  <small className="text-muted">
                                    Pembayaran:
                                  </small>
                                  <div>
                                    {getPaymentStatusBadge(
                                      registration.payment_status
                                    )}
                                  </div>
                                </div>
                                <div className="col-md-4">
                                  <small className="text-muted">Seleksi:</small>
                                  <div>
                                    {getSelectionStatusBadge(
                                      registration.selection_status
                                    )}
                                  </div>
                                </div>
                                <div className="col-md-4">
                                  <small className="text-muted">
                                    Penyaluran:
                                  </small>
                                  <div>
                                    {getPlacementStatusBadge(
                                      registration.placement_status
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="col-lg-4">
                    <div className="card">
                      <div className="card-header">
                        <h5 className="mb-0">Quick Actions</h5>
                      </div>
                      <div className="card-body">
                        <div className="d-grid gap-2">
                          <Link
                            to="/programs"
                            className="btn btn-outline-primary"
                          >
                            <i class="bi bi-card-text"></i> Lihat Program
                          </Link>
                          <Link
                            to="/payment"
                            className="btn btn-outline-primary"
                          >
                            <i class="bi bi-credit-card"></i> Kelola Pembayaran
                          </Link>
                          <button
                            className="btn btn-outline-primary"
                            onClick={() => setActiveTab("profile")}
                          >
                            <i class="bi bi-person"></i> Edit Profile
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="card mt-3">
                      <div className="card-header">
                        <h5 className="mb-0">Status Summary</h5>
                      </div>
                      <div className="card-body">
                        <div className="mb-2">
                          <strong>Pembayaran Tertunda:</strong>
                          <span className="float-end">
                            {
                              registrations.filter(
                                (r) => r.payment_status === "pending"
                              ).length
                            }
                          </span>
                        </div>
                        <div className="mb-2">
                          <strong>Dalam Seleksi:</strong>
                          <span className="float-end">
                            {
                              registrations.filter(
                                (r) => r.selection_status === "menunggu"
                              ).length
                            }
                          </span>
                        </div>
                        <div className="mb-2">
                          <strong>Diterima:</strong>
                          <span className="float-end">
                            {
                              registrations.filter(
                                (r) => r.status === "accepted"
                              ).length
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Registrations Tab */}
            {activeTab === "registrations" && (
              <div className="tab-pane fade show active">
                <div className="card">
                  <div className="card-header">
                    <h5 className="mb-0">Semua Pendaftaran Program</h5>
                  </div>
                  <div className="card-body">
                    {registrations.length === 0 ? (
                      <div className="text-center py-5">
                        <div className="display-1 text-muted mb-3">📋</div>
                        <h5>Belum ada pendaftaran</h5>
                        <p className="text-muted mb-4">
                          Mulai daftar program magang pertama Anda
                        </p>
                        <Link to="/programs" className="btn btn-primary">
                          Lihat Program Tersedia
                        </Link>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover align-middle">
                          <thead className="table-light">
                            <tr>
                              <th>Program</th>
                              <th>Kode Pendaftaran</th>
                              <th>Tanggal</th>
                              <th>Status</th>
                              <th>Pembayaran</th>
                              <th>Seleksi</th>
                              <th>Penyaluran</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {registrations.map((registration) => (
                              <tr key={registration.id}>
                                <td>
                                  <strong>{registration.program_name}</strong>
                                  <br />
                                  <small className="text-muted">
                                    {registration.program_duration}
                                  </small>
                                </td>
                                <td>
                                  <code>{registration.registration_code}</code>
                                </td>
                                <td>
                                  {new Date(
                                    registration.registration_date
                                  ).toLocaleDateString("id-ID")}
                                </td>
                                <td>
                                  {getRegistrationStatusBadge(
                                    registration.status
                                  )}
                                </td>
                                <td>
                                  {getPaymentStatusBadge(
                                    registration.payment_status
                                  )}
                                  <br />
                                  <small>
                                    {registration.amount_paid > 0 &&
                                      `Rp ${registration.amount_paid.toLocaleString(
                                        "id-ID"
                                      )}`}
                                  </small>
                                </td>
                                <td>
                                  {getSelectionStatusBadge(
                                    registration.selection_status
                                  )}
                                  {registration.test_score && <br />}
                                  {registration.test_score && (
                                    <small>
                                      Nilai: {registration.test_score}
                                    </small>
                                  )}
                                </td>
                                <td>
                                  {getPlacementStatusBadge(
                                    registration.placement_status
                                  )}
                                  {registration.company_name && <br />}
                                  {registration.company_name && (
                                    <small>{registration.company_name}</small>
                                  )}
                                </td>
                                <td>
                                  <button
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={() =>
                                      handleShowDetail(registration)
                                    }
                                    title="Lihat Detail Lengkap"
                                  >
                                    <i className="bi bi-eye"></i> Detail
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="tab-pane fade show active">
                <div className="row">
                  <div className="col-lg-8">
                    <div className="card">
                      <div className="card-header">
                        <h5 className="mb-0">Informasi Pribadi</h5>
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label className="form-label">Nama Lengkap</label>
                              <input
                                type="text"
                                className="form-control"
                                value={userInfo.full_name || ""}
                                readOnly
                              />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label className="form-label">Email</label>
                              <input
                                type="email"
                                className="form-control"
                                value={userInfo.email || ""}
                                readOnly
                              />
                            </div>
                          </div>
                        </div>

                        <div className="row">
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label className="form-label">
                                Nomor Telepon
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                value={userInfo.phone || ""}
                                readOnly
                              />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label className="form-label">Alamat</label>
                              <textarea
                                className="form-control"
                                rows="2"
                                value={userInfo.address || ""}
                                readOnly
                              />
                            </div>
                          </div>
                        </div>

                        <div className="alert alert-info">
                          <small>
                            Untuk mengubah data pribadi, silakan hubungi
                            administrator.
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-lg-4">
                    <div className="card">
                      <div className="card-header">
                        <h5 className="mb-0">Account Summary</h5>
                      </div>
                      <div className="card-body">
                        <div className="mb-3">
                          <strong>Member Since:</strong>
                          <br />
                          <span className="text-muted">
                            {user?.created_at
                              ? new Date(user.created_at).toLocaleDateString(
                                  "id-ID"
                                )
                              : "N/A"}
                          </span>
                        </div>
                        <div className="mb-3">
                          <strong>Total Programs:</strong>
                          <br />
                          <span className="text-primary">
                            {statistics.totalRegistrations}
                          </span>
                        </div>
                        <div className="mb-3">
                          <strong>Active Applications:</strong>
                          <br />
                          <span className="text-success">
                            {
                              registrations.filter((r) =>
                                [
                                  "pending",
                                  "under_review",
                                  "accepted",
                                ].includes(r.status)
                              ).length
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "payments" && (
              <div className="tab-pane fade show active">
                <div className="card">
                  <div className="card-header">
                    <h5 className="mb-0">Manajemen Pembayaran</h5>
                  </div>
                  <div className="card-body">
                    {userPayments.length === 0 ? (
                      <div className="text-center py-5">
                        <div className="display-1 text-muted mb-3">💳</div>
                        <h5>Belum ada data pembayaran</h5>
                        <p className="text-muted mb-4">
                          Setelah mendaftar program, tagihan pembayaran akan
                          muncul di sini.
                        </p>
                        <Link to="/programs" className="btn btn-primary">
                          Lihat Program Tersedia
                        </Link>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover">
                          <thead className="table-light">
                            <tr>
                              <th>Invoice</th>
                              <th>Program</th>
                              <th>Amount</th>
                              <th>Status</th>
                              <th>Due Date</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userPayments.map((payment) => (
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
                                <td>{payment.program_name}</td>
                                <td>
                                  <div>
                                    Rp {payment.amount?.toLocaleString("id-ID")}
                                  </div>
                                  {payment.amount_paid > 0 && (
                                    <small className="text-success">
                                      Paid: Rp{" "}
                                      {payment.amount_paid?.toLocaleString(
                                        "id-ID"
                                      )}
                                    </small>
                                  )}
                                </td>
                                <td>{getPaymentStatusBadge(payment.status)}</td>
                                <td>
                                  {payment.due_date
                                    ? new Date(
                                        payment.due_date
                                      ).toLocaleDateString("id-ID")
                                    : "N/A"}
                                </td>
                                <td>
                                  {payment.status === "pending" && (
                                    <button
                                      className="btn btn-sm btn-primary"
                                      onClick={() => {
                                        setSelectedPaymentForUpload(payment);
                                        setShowPaymentModal(true);
                                      }}
                                    >
                                      Upload Bukti
                                    </button>
                                  )}
                                  {payment.status === "paid" &&
                                    payment.receipt_number && (
                                      <button
                                        className="btn btn-sm btn-outline-secondary"
                                        onClick={() =>
                                          handleGenerateReceipt(payment.id)
                                        }
                                      >
                                        Download Kwitansi
                                      </button>
                                    )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showPaymentModal && selectedPaymentForUpload && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Upload Bukti Pembayaran</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowPaymentModal(false)}
                ></button>
              </div>
              <form onSubmit={handleUploadProof}>
                <div className="modal-body">
                  <div className="mb-3">
                    <p>
                      <strong>Invoice:</strong>{" "}
                      {selectedPaymentForUpload.invoice_number}
                    </p>
                    <p>
                      <strong>Program:</strong>{" "}
                      {selectedPaymentForUpload.program_name}
                    </p>
                    <p>
                      <strong>Amount:</strong> Rp{" "}
                      {selectedPaymentForUpload.amount?.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">
                      Pilih File Bukti Pembayaran *
                    </label>
                    <input
                      type="file"
                      className="form-control"
                      name="proof_image"
                      accept="image/*"
                      required
                    />
                    <div className="form-text">
                      Upload bukti transfer/pembayaran (format: JPG, PNG,
                      maksimal 5MB)
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={uploading}
                  >
                    {uploading ? "Uploading..." : "Upload Bukti"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowPaymentModal(false)}
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">📋 Detail Pendaftaran</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseDetail}
                ></button>
              </div>
              <div className="modal-body">
                {detailLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Memuat detail pendaftaran...</p>
                  </div>
                ) : (
                  <div>
                    {/* Header Info */}
                    <div className="row mb-4">
                      <div className="col-md-6">
                        <h6>Informasi Program</h6>
                        <table className="table table-sm table-borderless">
                          <tbody>
                            <tr>
                              <td>
                                <strong>Program:</strong>
                              </td>
                              <td>{selectedRegistration?.program_name}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Durasi:</strong>
                              </td>
                              <td>{selectedRegistration?.program_duration}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Kode Pendaftaran:</strong>
                              </td>
                              <td>
                                <code>
                                  {selectedRegistration?.registration_code}
                                </code>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Tanggal Daftar:</strong>
                              </td>
                              <td>
                                {new Date(
                                  selectedRegistration?.registration_date
                                ).toLocaleDateString("id-ID")}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="col-md-6">
                        <h6>Status</h6>
                        <div className="d-flex flex-wrap gap-2 mb-3">
                          {getRegistrationStatusBadge(
                            selectedRegistration?.status
                          )}
                          {getPaymentStatusBadge(
                            selectedRegistration?.payment_status
                          )}
                          {getSelectionStatusBadge(
                            selectedRegistration?.selection_status
                          )}
                          {getPlacementStatusBadge(
                            selectedRegistration?.placement_status
                          )}
                        </div>

                        {selectedRegistration?.amount_paid > 0 && (
                          <div className="alert alert-success py-2">
                            <small>
                              <strong>Total Dibayar:</strong> Rp{" "}
                              {selectedRegistration?.amount_paid?.toLocaleString(
                                "id-ID"
                              )}
                            </small>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Application Letter */}
                    {selectedRegistration?.application_letter && (
                      <div className="mb-4">
                        <h6>📝 Surat Lamaran</h6>
                        <div className="border rounded p-3 bg-light">
                          <p
                            className="mb-0"
                            style={{ whiteSpace: "pre-wrap" }}
                          >
                            {selectedRegistration.application_letter}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Placement Preference */}
                    {selectedRegistration?.placement_preference && (
                      <div className="mb-4">
                        <h6>🎯 Preferensi Penempatan</h6>
                        <div className="border rounded p-3 bg-light">
                          <p
                            className="mb-0"
                            style={{ whiteSpace: "pre-wrap" }}
                          >
                            {selectedRegistration.placement_preference}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Selection Details */}
                    <div className="mb-4">
                      <h6>📊 Detail Seleksi</h6>
                      <div className="row">
                        <div className="col-md-4">
                          <div className="card bg-light">
                            <div className="card-body text-center py-2">
                              <small className="text-muted">Nilai Test</small>
                              <div className="h5 mb-0">
                                {selectedRegistration?.test_score || "-"}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="card bg-light">
                            <div className="card-body text-center py-2">
                              <small className="text-muted">
                                Nilai Interview
                              </small>
                              <div className="h5 mb-0">
                                {selectedRegistration?.interview_score || "-"}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="card bg-light">
                            <div className="card-body text-center py-2">
                              <small className="text-muted">Nilai Akhir</small>
                              <div className="h5 mb-0">
                                {selectedRegistration?.final_score || "-"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {selectedRegistration?.selection_notes && (
                        <div className="mt-3">
                          <small className="text-muted">Catatan Seleksi:</small>
                          <div className="border rounded p-2 bg-white mt-1">
                            {selectedRegistration.selection_notes}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Placement Details */}
                    {(selectedRegistration?.company_name ||
                      selectedRegistration?.position) && (
                      <div className="mb-4">
                        <h6>🏢 Detail Penempatan</h6>
                        <div className="row">
                          {selectedRegistration?.company_name && (
                            <div className="col-md-6">
                              <small className="text-muted">Perusahaan:</small>
                              <div className="fw-bold">
                                {selectedRegistration.company_name}
                              </div>
                            </div>
                          )}
                          {selectedRegistration?.position && (
                            <div className="col-md-6">
                              <small className="text-muted">Posisi:</small>
                              <div className="fw-bold">
                                {selectedRegistration.position}
                              </div>
                            </div>
                          )}
                          {selectedRegistration?.department && (
                            <div className="col-md-6">
                              <small className="text-muted">Departemen:</small>
                              <div className="fw-bold">
                                {selectedRegistration.department}
                              </div>
                            </div>
                          )}
                          {selectedRegistration?.placement_date && (
                            <div className="col-md-6">
                              <small className="text-muted">
                                Tanggal Penempatan:
                              </small>
                              <div className="fw-bold">
                                {new Date(
                                  selectedRegistration.placement_date
                                ).toLocaleDateString("id-ID")}
                              </div>
                            </div>
                          )}
                          {selectedRegistration?.supervisor_name && (
                            <div className="col-md-6">
                              <small className="text-muted">Supervisor:</small>
                              <div className="fw-bold">
                                {selectedRegistration.supervisor_name}
                              </div>
                            </div>
                          )}
                          {selectedRegistration?.supervisor_contact && (
                            <div className="col-md-6">
                              <small className="text-muted">
                                Kontak Supervisor:
                              </small>
                              <div className="fw-bold">
                                {selectedRegistration.supervisor_contact}
                              </div>
                            </div>
                          )}
                        </div>

                        {selectedRegistration?.placement_notes && (
                          <div className="mt-3">
                            <small className="text-muted">
                              Catatan Penempatan:
                            </small>
                            <div className="border rounded p-2 bg-white mt-1">
                              {selectedRegistration.placement_notes}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Payment Details */}
                    <div className="mb-4">
                      <h6>💳 Detail Pembayaran</h6>
                      <div className="row">
                        <div className="col-md-4">
                          <small className="text-muted">Total Tagihan:</small>
                          <div className="fw-bold">
                            Rp{" "}
                            {selectedRegistration?.amount?.toLocaleString(
                              "id-ID"
                            ) || "0"}
                          </div>
                        </div>
                        <div className="col-md-4">
                          <small className="text-muted">Dibayar:</small>
                          <div className="fw-bold text-success">
                            Rp{" "}
                            {selectedRegistration?.amount_paid?.toLocaleString(
                              "id-ID"
                            ) || "0"}
                          </div>
                        </div>
                        <div className="col-md-4">
                          <small className="text-muted">Sisa:</small>
                          <div className="fw-bold text-warning">
                            Rp{" "}
                            {(
                              (selectedRegistration?.amount || 0) -
                              (selectedRegistration?.amount_paid || 0)
                            ).toLocaleString("id-ID")}
                          </div>
                        </div>
                      </div>

                      {selectedRegistration?.due_date && (
                        <div className="mt-2">
                          <small className="text-muted">
                            Batas Pembayaran:
                          </small>
                          <div
                            className={`fw-bold ${
                              new Date(selectedRegistration.due_date) <
                              new Date()
                                ? "text-danger"
                                : ""
                            }`}
                          >
                            {new Date(
                              selectedRegistration.due_date
                            ).toLocaleDateString("id-ID")}
                            {new Date(selectedRegistration.due_date) <
                              new Date() && (
                              <span className="badge bg-danger ms-2">
                                Terlambat
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Program Contact Info */}
                    {selectedRegistration?.program_contact && (
                      <div className="alert alert-info">
                        <h6>📞 Kontak Program</h6>
                        <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>
                          {selectedRegistration.program_contact}
                        </p>
                      </div>
                    )}
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
                {selectedRegistration?.payment_status === "pending" && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      handleCloseDetail();
                      setActiveTab("payments");
                    }}
                  >
                    💳 Lanjutkan Pembayaran
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

export default UserDashboard;
