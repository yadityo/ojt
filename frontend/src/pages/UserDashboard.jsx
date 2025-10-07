import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const UserDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setError("");
      setLoading(true);
      const response = await axios.get(`/api/user-dashboard/${user.id}`);

      if (response.data.success) {
        setDashboardData(response.data.data);
      } else {
        setError("Gagal memuat data dashboard");
      }
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      setError(
        error.response?.data?.message || "Terjadi kesalahan saat memuat data"
      );
    } finally {
      setLoading(false);
    }
  };

  // Helper functions untuk formatting
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      // Payment Status
      pending: { class: "warning", text: "Menunggu" },
      down_payment: { class: "info", text: "DP" },
      paid: { class: "success", text: "Lunas" },
      overdue: { class: "danger", text: "Jatuh Tempo" },
      cancelled: { class: "secondary", text: "Dibatalkan" },

      // Selection Status
      menunggu: { class: "warning", text: "Menunggu" },
      lolos_tahap_1: { class: "info", text: "Lolos Tahap 1" },
      lolos_tahap_2: { class: "primary", text: "Lolos Tahap 2" },
      tidak_lolos: { class: "danger", text: "Tidak Lolos" },
      lolos: { class: "success", text: "Lolos" },

      // Placement Status
      proses: { class: "warning", text: "Proses" },
      ditempatkan: { class: "success", text: "Ditempatkan" },
      gagal: { class: "danger", text: "Gagal" },

      // Registration Status - HAPUS 'pending' YANG DUPLIKAT
      accepted: { class: "success", text: "Diterima" },
      rejected: { class: "danger", text: "Ditolak" },
      under_review: { class: "warning", text: "Review" },
      waiting_list: { class: "info", text: "Waiting List" },
      // 'pending' sudah didefinisikan di Payment Status, jadi hapus yang di sini
    };

    const config = statusConfig[status] || {
      class: "secondary",
      text: status || "-",
    };
    return `<span class="badge bg-${config.class}">${config.text}</span>`;
  };

  const getCardStatusData = (registrations) => {
    if (!registrations || registrations.length === 0) {
      return {
        paymentStatus: { status: "-" },
        selectionStatus: { status: "-" },
        placementStatus: { status: "-" },
        programName: "-",
      };
    }

    const latestRegistration = registrations[0];

    return {
      paymentStatus: {
        status: latestRegistration.payment_status || "-",
        class:
          latestRegistration.payment_status === "paid"
            ? "success"
            : latestRegistration.payment_status === "down_payment"
            ? "info"
            : latestRegistration.payment_status === "overdue"
            ? "danger"
            : "secondary",
      },
      selectionStatus: {
        status: latestRegistration.selection_status || "-",
        class:
          latestRegistration.selection_status === "lolos"
            ? "success"
            : latestRegistration.selection_status === "tidak_lolos"
            ? "danger"
            : "secondary",
      },
      placementStatus: {
        status: latestRegistration.placement_status || "-",
        class:
          latestRegistration.placement_status === "ditempatkan"
            ? "success"
            : latestRegistration.placement_status === "gagal"
            ? "danger"
            : "secondary",
      },
      programName: latestRegistration.program_name || "-",
    };
  };

  const formatCurrency = (amount) => {
    if (!amount) return "-";
    return `Rp ${amount.toLocaleString("id-ID")}`;
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
          <p>Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          <h5>Error Memuat Dashboard</h5>
          <p className="mb-0">{error}</p>
          <button
            className="btn btn-sm btn-outline-danger mt-2"
            onClick={fetchDashboardData}
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const registrations = dashboardData?.registrations || [];
  const cardData = getCardStatusData(registrations);

  return (
    <div className="container mt-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">Dashboard Status Program</h2>
              <p className="text-muted mb-0">
                Selamat Datang, <strong>{user?.full_name}</strong>
              </p>
              <p className="text-muted">
                {registrations.length > 0
                  ? "Berikut status program Anda."
                  : "Anda belum memiliki program yang terdaftar."}
              </p>
            </div>
            <button
              className="btn btn-outline-primary"
              onClick={fetchDashboardData}
              title="Refresh Data"
              disabled={loading}
            >
              <i className="bi bi-arrow-repeat"></i> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards - Dinamis */}
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div className={`card bg-primary text-white h-100`}>
            <div className="card-body">
              <div className="text-center">
                <h3 className="card-title fw-bold">Status Pembayaran</h3>
                <div className="fs-5">
                  {cardData.paymentStatus.status === "paid"
                    ? "Lunas"
                    : cardData.paymentStatus.status === "down_payment"
                    ? "DP"
                    : cardData.paymentStatus.status === "pending"
                    ? "Menunggu"
                    : cardData.paymentStatus.status}
                </div>
                {/* {registrations.length > 0 &&
                  registrations[0].amount_paid > 0 && (
                    <small>
                      Terbayar: {formatCurrency(registrations[0].amount_paid)}
                    </small>
                  )} */}
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className={`card bg-primary text-white h-100`}>
            <div className="card-body">
              <div className="text-center">
                <h3 className="card-title fw-bold">Status Seleksi</h3>
                <div className="fs-5">
                  {cardData.selectionStatus.status === "lolos"
                    ? "Lolos"
                    : cardData.selectionStatus.status === "menunggu"
                    ? "Menunggu"
                    : cardData.selectionStatus.status === "tidak_lolos"
                    ? "Tidak Lolos"
                    : cardData.selectionStatus.status}
                </div>
                {/* {registrations.length > 0 && registrations[0].final_score && (
                  <small>Nilai: {registrations[0].final_score}</small>
                )} */}
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className={`card bg-primary text-white h-100`}>
            <div className="card-body">
              <div className="text-center">
                <h3 className="card-title fw-bold">Penempatan Kerja</h3>
                <div className="fs-5">
                  {cardData.placementStatus.status === "proses"
                    ? "Proses"
                    : cardData.placementStatus.status === "ditempatkan"
                    ? "Ditempatkan"
                    : cardData.placementStatus.status === "gagal"
                    ? "Gagal"
                    : cardData.placementStatus.status}
                </div>
                {/* {registrations.length > 0 && registrations[0].company_name && (
                  <small>{registrations[0].company_name}</small>
                )} */}
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="card bg-primary text-white h-100">
            <div className="card-body">
              <div className="text-center">
                <h3 className="card-title fw-bold">Program Saya</h3>
                <div className="fs-5">{cardData.programName}</div>
                {/* {registrations.length > 0 &&
                  registrations[0].program_duration && (
                    <small>Durasi: {registrations[0].program_duration}</small>
                  )} */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Program Table - Dinamis */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h4 className="card-title mb-0">Detail Program Anda</h4>
            </div>
            <div className="card-body">
              {registrations.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Nama Program</th>
                        <th>Kode Pendaftaran</th>
                        <th>Tanggal Pendaftaran</th>
                        <th>Status Pembayaran</th>
                        <th>Status Seleksi</th>
                        <th>Status Penyaluran</th>
                        <th>Batas Pembayaran</th>
                        <th>Nama Perusahaan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrations.map((registration) => (
                        <tr key={registration.id}>
                          <td>
                            <strong>{registration.program_name || "-"}</strong>
                          </td>
                          <td>
                            <code>{registration.registration_code || "-"}</code>
                          </td>
                          <td>{formatDate(registration.registration_date)}</td>
                          <td>
                            <span
                              className={`badge bg-${
                                getStatusBadge(registration.payment_status)
                                  .split("bg-")[1]
                                  .split('"')[0]
                              }`}
                              dangerouslySetInnerHTML={{
                                __html: getStatusBadge(
                                  registration.payment_status
                                ),
                              }}
                            />
                            {registration.amount_paid > 0 && (
                              <div>
                                <small className="text-muted">
                                  {formatCurrency(registration.amount_paid)}
                                </small>
                              </div>
                            )}
                          </td>
                          <td>
                            <span
                              className={`badge bg-${
                                getStatusBadge(registration.selection_status)
                                  .split("bg-")[1]
                                  .split('"')[0]
                              }`}
                              dangerouslySetInnerHTML={{
                                __html: getStatusBadge(
                                  registration.selection_status
                                ),
                              }}
                            />
                            {registration.final_score && (
                              <div>
                                <small className="text-muted">
                                  Nilai: {registration.final_score}
                                </small>
                              </div>
                            )}
                          </td>
                          <td>
                            <span
                              className={`badge bg-${
                                getStatusBadge(registration.placement_status)
                                  .split("bg-")[1]
                                  .split('"')[0]
                              }`}
                              dangerouslySetInnerHTML={{
                                __html: getStatusBadge(
                                  registration.placement_status
                                ),
                              }}
                            />
                            {registration.company_name && (
                              <div>
                                <small className="text-muted">
                                  {registration.company_name}
                                </small>
                              </div>
                            )}
                          </td>
                          <td>
                            {registration.due_date ? (
                              <span
                                className={
                                  new Date(registration.due_date) < new Date()
                                    ? "text-danger"
                                    : "text-muted"
                                }
                              >
                                {formatDate(registration.due_date)}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td>-</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-5">
                  <div className="mb-3">
                    <i className="bi bi-inbox display-1 text-muted"></i>
                  </div>
                  <h5 className="text-muted">Data tidak tersedia</h5>
                  <p className="text-muted mb-4">
                    Anda belum terdaftar dalam program magang.
                  </p>
                  <Link to="/programs" className="btn btn-primary">
                    Daftar Program Magang
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      {registrations.length > 0 && (
        <div className="row mt-4">
          <div className="col-12">
            <div className="alert alert-info">
              <h6>Informasi Penting:</h6>
              <ul className="mb-0">
                <li>Status akan diperbarui secara real-time oleh admin</li>
                <li>Untuk pertanyaan mengenai pembayaran, hubungi admin</li>
                <li>Proses seleksi membutuhkan waktu 1-2 minggu</li>
                <li>Pastikan data yang ditampilkan sudah sesuai</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
