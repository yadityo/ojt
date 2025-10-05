import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const AdminDashboard = () => {
  const [registrations, setRegistrations] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    program: "all",
    status: "all",
    payment_status: "all",
    selection_status: "all",
    placement_status: "all",
    search: "",
  });
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [stats, setStats] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchRegistrations();
    fetchPrograms();
    fetchStatistics();
  }, [filters]);

  const fetchRegistrations = async () => {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (filters[key] !== "all" && filters[key] !== "") {
          params.append(key, filters[key]);
        }
      });

      const response = await axios.get(`/api/registrations?${params}`);
      if (response.data.success) {
        setRegistrations(response.data.data);
      } else {
        setError("Failed to fetch registrations");
      }
    } catch (error) {
      console.error("Error fetching registrations:", error);
      setError("Error loading registration data");
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
      const response = await axios.get("/api/registrations/statistics/summary");
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSearchChange = (e) => {
    setFilters((prev) => ({
      ...prev,
      search: e.target.value,
    }));
  };

  const handleViewDetails = (registration) => {
    setSelectedRegistration(registration);
    setShowDetailModal(true);
  };

  const handleUpdateStatus = async (
    type,
    registrationId,
    newStatus,
    additionalData = {}
  ) => {
    try {
      let endpoint = "";
      let data = { status: newStatus, ...additionalData };

      switch (type) {
        case "registration":
          endpoint = `/api/registrations/${registrationId}/status`;
          break;
        case "selection":
          endpoint = `/api/registrations/${registrationId}/selection`;
          break;
        case "placement":
          endpoint = `/api/registrations/${registrationId}/placement`;
          break;
        case "payment":
          endpoint = `/api/registrations/${registrationId}/payment`;
          break;
        default:
          return;
      }

      const response = await axios.put(endpoint, data);
      if (response.data.success) {
        // Refresh data
        fetchRegistrations();
        fetchStatistics();
        alert("Status updated successfully");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Error updating status");
    }
  };

  const handleBulkAction = async (action, selectedIds) => {
    if (!selectedIds.length) {
      alert("Please select at least one registration");
      return;
    }

    if (
      confirm(
        `Are you sure you want to ${action} ${selectedIds.length} registration(s)?`
      )
    ) {
      try {
        // Implement bulk actions here
        // This is a simplified version - you might want to create separate endpoints for bulk actions
        for (const id of selectedIds) {
          await handleUpdateStatus("registration", id, action);
        }
        alert(`Successfully updated ${selectedIds.length} registration(s)`);
      } catch (error) {
        console.error("Error in bulk action:", error);
        alert("Error performing bulk action");
      }
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

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
        <div className="text-center mt-3">
          <p>Loading admin dashboard...</p>
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
            onClick={fetchRegistrations}
          >
            Try Again
          </button>
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
              <h2 className="mb-1">Admin Dashboard</h2>
              <p className="text-muted mb-0">
                Manage program registrations and participants
              </p>
            </div>
            <div className="text-end">
              <p className="mb-0">
                Welcome, <strong>{user?.full_name}</strong>
              </p>
              <small className="text-muted">Administrator</small>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="row mb-4">
          <div className="col-md-2">
            <div className="card bg-primary text-white">
              <div className="card-body text-center">
                <h4 className="mb-0">{stats.statistics.total_registrations}</h4>
                <p className="mb-0">Total</p>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card bg-success text-white">
              <div className="card-body text-center">
                <h4 className="mb-0">
                  {stats.statistics.accepted_registrations}
                </h4>
                <p className="mb-0">Diterima</p>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card bg-warning text-white">
              <div className="card-body text-center">
                <h4 className="mb-0">
                  {stats.statistics.pending_registrations}
                </h4>
                <p className="mb-0">Pending</p>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card bg-info text-white">
              <div className="card-body text-center">
                <h4 className="mb-0">{stats.statistics.pending_payments}</h4>
                <p className="mb-0">Pending Bayar</p>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card bg-secondary text-white">
              <div className="card-body text-center">
                <h4 className="mb-0">{stats.statistics.pending_selections}</h4>
                <p className="mb-0">Pending Seleksi</p>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card bg-dark text-white">
              <div className="card-body text-center">
                <h4 className="mb-0">{stats.statistics.pending_placements}</h4>
                <p className="mb-0">Pending Penyaluran</p>
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
            <div className="col-md-2">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="waiting_list">Waiting List</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Payment</label>
              <select
                className="form-select"
                value={filters.payment_status}
                onChange={(e) =>
                  handleFilterChange("payment_status", e.target.value)
                }
              >
                <option value="all">All Payment</option>
                <option value="pending">Pending</option>
                <option value="down_payment">Down Payment</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Selection</label>
              <select
                className="form-select"
                value={filters.selection_status}
                onChange={(e) =>
                  handleFilterChange("selection_status", e.target.value)
                }
              >
                <option value="all">All Selection</option>
                <option value="menunggu">Menunggu</option>
                <option value="lolos_tahap_1">Lolos Tahap 1</option>
                <option value="lolos_tahap_2">Lolos Tahap 2</option>
                <option value="lolos">Lolos</option>
                <option value="tidak_lolos">Tidak Lolos</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Placement</label>
              <select
                className="form-select"
                value={filters.placement_status}
                onChange={(e) =>
                  handleFilterChange("placement_status", e.target.value)
                }
              >
                <option value="all">All Placement</option>
                <option value="proses">Proses</option>
                <option value="lolos">Lolos</option>
                <option value="ditempatkan">Ditempatkan</option>
                <option value="gagal">Gagal</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Search</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search by name, email, or code..."
                value={filters.search}
                onChange={handleSearchChange}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Registrations Table */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Data Pendaftar ({registrations.length})</h5>
          <div>
            <button
              className="btn btn-sm btn-outline-secondary me-2"
              onClick={fetchRegistrations}
            >
              🔄 Refresh
            </button>
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => window.print()}
            >
              🖨️ Print
            </button>
          </div>
        </div>
        <div className="card-body">
          {registrations.length === 0 ? (
            <div className="text-center py-5">
              <div className="display-1 text-muted mb-3">📋</div>
              <h5>No registrations found</h5>
              <p className="text-muted">
                Try changing your filters or search term
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-striped align-middle">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Pendaftar</th>
                    <th>Program</th>
                    <th>Kode</th>
                    <th>Tanggal</th>
                    <th>Status</th>
                    <th>Pembayaran</th>
                    <th>Seleksi</th>
                    <th>Penyaluran</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((registration, index) => (
                    <tr key={registration.id}>
                      <td>{index + 1}</td>
                      <td>
                        <strong>{registration.full_name}</strong>
                        <br />
                        <small className="text-muted">
                          {registration.email}
                        </small>
                        <br />
                        <small>{registration.phone}</small>
                      </td>
                      <td>
                        <strong>{registration.program_name}</strong>
                        <br />
                        <small className="text-muted">
                          Rp{" "}
                          {registration.program_cost?.toLocaleString("id-ID")}
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
                      <td>{getRegistrationStatusBadge(registration.status)}</td>
                      <td>
                        {getPaymentStatusBadge(registration.payment_status)}
                        {registration.amount_paid > 0 && <br />}
                        {registration.amount_paid > 0 && (
                          <small>
                            Paid: Rp{" "}
                            {registration.amount_paid.toLocaleString("id-ID")}
                          </small>
                        )}
                      </td>
                      <td>
                        {getSelectionStatusBadge(registration.selection_status)}
                        {registration.test_score && <br />}
                        {registration.test_score && (
                          <small>Score: {registration.test_score}</small>
                        )}
                      </td>
                      <td>
                        {getPlacementStatusBadge(registration.placement_status)}
                        {registration.company_name && <br />}
                        {registration.company_name && (
                          <small>{registration.company_name}</small>
                        )}
                      </td>
                      <td>
                        <div className="btn-group">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleViewDetails(registration)}
                            title="View Details"
                          >
                            👁️
                          </button>
                          <button
                            className="btn btn-sm btn-outline-success"
                            onClick={() =>
                              handleUpdateStatus(
                                "registration",
                                registration.id,
                                "accepted"
                              )
                            }
                            title="Accept"
                          >
                            ✅
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() =>
                              handleUpdateStatus(
                                "registration",
                                registration.id,
                                "rejected"
                              )
                            }
                            title="Reject"
                          >
                            ❌
                          </button>
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
      {showDetailModal && selectedRegistration && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Detail Pendaftaran</h5>
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
                      <strong>Nama:</strong> {selectedRegistration.full_name}
                    </p>
                    <p>
                      <strong>Email:</strong> {selectedRegistration.email}
                    </p>
                    <p>
                      <strong>Telepon:</strong> {selectedRegistration.phone}
                    </p>
                    <p>
                      <strong>Alamat:</strong> {selectedRegistration.address}
                    </p>
                  </div>
                  <div className="col-md-6">
                    <h6>Informasi Program</h6>
                    <p>
                      <strong>Program:</strong>{" "}
                      {selectedRegistration.program_name}
                    </p>
                    <p>
                      <strong>Biaya:</strong> Rp{" "}
                      {selectedRegistration.program_cost?.toLocaleString(
                        "id-ID"
                      )}
                    </p>
                    <p>
                      <strong>Durasi:</strong>{" "}
                      {selectedRegistration.program_duration}
                    </p>
                    <p>
                      <strong>Kode Pendaftaran:</strong>{" "}
                      <code>{selectedRegistration.registration_code}</code>
                    </p>
                  </div>
                </div>

                <div className="row mt-3">
                  <div className="col-md-3">
                    <h6>Status Pendaftaran</h6>
                    {getRegistrationStatusBadge(selectedRegistration.status)}
                  </div>
                  <div className="col-md-3">
                    <h6>Status Pembayaran</h6>
                    {getPaymentStatusBadge(selectedRegistration.payment_status)}
                    {selectedRegistration.amount_paid > 0 && (
                      <p className="mb-0 small">
                        Paid: Rp{" "}
                        {selectedRegistration.amount_paid?.toLocaleString(
                          "id-ID"
                        )}
                      </p>
                    )}
                  </div>
                  <div className="col-md-3">
                    <h6>Status Seleksi</h6>
                    {getSelectionStatusBadge(
                      selectedRegistration.selection_status
                    )}
                    {selectedRegistration.test_score && (
                      <p className="mb-0 small">
                        Score: {selectedRegistration.test_score}
                      </p>
                    )}
                  </div>
                  <div className="col-md-3">
                    <h6>Status Penyaluran</h6>
                    {getPlacementStatusBadge(
                      selectedRegistration.placement_status
                    )}
                    {selectedRegistration.company_name && (
                      <p className="mb-0 small">
                        {selectedRegistration.company_name}
                      </p>
                    )}
                  </div>
                </div>

                {selectedRegistration.application_letter && (
                  <div className="mt-3">
                    <h6>Surat Lamaran</h6>
                    <div className="bg-light p-3 rounded">
                      {selectedRegistration.application_letter}
                    </div>
                  </div>
                )}

                {selectedRegistration.placement_preference && (
                  <div className="mt-3">
                    <h6>Preferensi Penempatan</h6>
                    <div className="bg-light p-3 rounded">
                      {selectedRegistration.placement_preference}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <div className="btn-group">
                  <button
                    className="btn btn-success"
                    onClick={() => {
                      handleUpdateStatus(
                        "registration",
                        selectedRegistration.id,
                        "accepted"
                      );
                      setShowDetailModal(false);
                    }}
                  >
                    ✅ Terima
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => {
                      handleUpdateStatus(
                        "registration",
                        selectedRegistration.id,
                        "rejected"
                      );
                      setShowDetailModal(false);
                    }}
                  >
                    ❌ Tolak
                  </button>
                  <button
                    className="btn btn-info"
                    onClick={() => {
                      handleUpdateStatus(
                        "payment",
                        selectedRegistration.id,
                        "paid"
                      );
                      setShowDetailModal(false);
                    }}
                  >
                    💳 Set Lunas
                  </button>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDetailModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
