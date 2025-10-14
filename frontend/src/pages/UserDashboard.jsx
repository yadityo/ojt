import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import helpers from "../utils/helpers";

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

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: "warning", text: "Menunggu" },
      installment_1: { class: "info", text: "Cicilan 1" },
      installment_2: { class: "info", text: "Cicilan 2" },
      installment_3: { class: "info", text: "Cicilan 3" },
      installment_4: { class: "info", text: "Cicilan 4" },
      installment_5: { class: "info", text: "Cicilan 5" },
      installment_6: { class: "info", text: "Cicilan 6" },
      paid: { class: "success", text: "Lunas" },
      overdue: { class: "danger", text: "Jatuh Tempo" },
      cancelled: { class: "secondary", text: "Dibatalkan" },

      // Status seleksi
      menunggu: { class: "warning", text: "Menunggu" },
      lolos: { class: "success", text: "Lolos" },
      tidak_lolos: { class: "danger", text: "Tidak Lolos" },

      // Status penempatan
      proses: { class: "warning", text: "Proses" },
      ditempatkan: { class: "success", text: "Ditempatkan" },
    };

    const config = statusConfig[status] || {
      class: "secondary",
      text: status || "-",
    };

    // Return JSX langsung, bukan string dengan HTML
    return <span className={`badge bg-${config.class}`}>{config.text}</span>;
  };

  const getCardStatusData = (registrations) => {
    if (!registrations || registrations.length === 0) {
      return {
        paymentStatus: { status: "-" },
        selectionStatus: { status: "-" },
        placementStatus: { status: "-" },
        programName: "-",
        companyName: "-",
      };
    }

    const latestRegistration = registrations[0];

    // Fungsi untuk menentukan class status pembayaran
    const getPaymentStatusClass = (paymentStatus) => {
      if (paymentStatus === "paid") return "success";
      if (paymentStatus && paymentStatus.startsWith("installment_"))
        return "info";
      if (paymentStatus === "overdue") return "danger";
      if (paymentStatus === "pending") return "warning";
      if (paymentStatus === "cancelled") return "secondary";
      return "secondary";
    };

    // Fungsi untuk menentukan teks status pembayaran
    const getPaymentStatusText = (paymentStatus) => {
      if (paymentStatus === "paid") return "Lunas";
      if (paymentStatus === "installment_1") return "Cicilan 1";
      if (paymentStatus === "installment_2") return "Cicilan 2";
      if (paymentStatus === "installment_3") return "Cicilan 3";
      if (paymentStatus === "installment_4") return "Cicilan 4";
      if (paymentStatus === "installment_5") return "Cicilan 5";
      if (paymentStatus === "installment_6") return "Cicilan 6";
      if (paymentStatus === "overdue") return "Jatuh Tempo";
      if (paymentStatus === "pending") return "Menunggu";
      if (paymentStatus === "cancelled") return "Dibatalkan";
      return paymentStatus || "-";
    };

    return {
      paymentStatus: {
        status: getPaymentStatusText(latestRegistration.payment_status),
        class: getPaymentStatusClass(latestRegistration.payment_status),
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
            : "secondary",
      },
      programName: latestRegistration.program_name || "-",
      companyName: latestRegistration.company_name || "-",
    };
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
        <div className="col-md-4 mb-3">
          <div className={`card bg-primary text-white h-100`}>
            <div className="card-body">
              <div className="text-center">
                <h3 className="card-title fw-bold">Status Seleksi</h3>
                <div className="fs-5">{cardData.selectionStatus.status}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4 mb-3">
          <div className={`card bg-primary text-white h-100`}>
            <div className="card-body">
              <div className="text-center">
                <h3 className="card-title fw-bold">Penempatan Kerja</h3>
                <div className="fs-5">{cardData.placementStatus.status}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4 mb-3">
          <div className="card bg-primary text-white h-100">
            <div className="card-body">
              <div className="text-center">
                <h3 className="card-title fw-bold">Program Saya</h3>
                <div className="fs-5">{cardData.programName}</div>
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
                  <table className="table table-hover text-center">
                    <thead className="table-light align-middle">
                      <tr>
                        <th>Nama Program</th>
                        <th>Kode Pendaftaran</th>
                        <th>Tanggal Pendaftaran</th>
                        <th>Status Seleksi</th>
                        <th>Status Penyaluran</th>
                        <th>Batas Pembayaran</th>
                        <th>Nama Perusahaan</th>
                      </tr>
                    </thead>
                    <tbody className="align-middle">
                      {registrations.map((registration, index) => (
                        <tr
                          key={`${registration.id}-${index}-${registration.registration_code}`}
                        >
                          <td>
                            <strong>{registration.program_name || "-"}</strong>
                          </td>
                          <td>
                            <code>{registration.registration_code || "-"}</code>
                          </td>
                          <td>
                            {helpers.formatDate(registration.registration_date)}
                          </td>
                          <td>
                            {getStatusBadge(registration.selection_status)}
                          </td>
                          <td>
                            {getStatusBadge(registration.placement_status)}
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
                                {helpers.formatDate(registration.due_date)}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td>
                            {registration.company_name ? (
                              <span className="badge bg-success">
                                {registration.company_name}
                              </span>
                            ) : (
                              <span className="text-muted">
                                Belum ditentukan
                              </span>
                            )}
                          </td>
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
                  <Link to="/registration" className="btn btn-primary">
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
                <li>
                  Nama perusahaan akan ditentukan setelah proses seleksi selesai
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
