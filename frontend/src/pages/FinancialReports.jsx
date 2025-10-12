import React, { useState, useEffect } from "react";
import axios from "axios";

const FinancialReports = () => {
  const [summary, setSummary] = useState(null);
  const [detailedReports, setDetailedReports] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    program: "all",
    start_date: "",
    end_date: "",
    status: "all",
    search: "",
  });

  useEffect(() => {
    fetchFinancialSummary();
    fetchDetailedReports();
    fetchPrograms();
  }, [filters]);

  const fetchFinancialSummary = async () => {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (filters[key] !== "all" && filters[key] !== "") {
          params.append(key, filters[key]);
        }
      });

      const response = await axios.get(
        `/api/reports/financial/summary?${params}`
      );
      if (response.data.success) {
        setSummary(response.data.data);
      } else {
        setError("Gagal memuat ringkasan keuangan");
      }
    } catch (error) {
      console.error("Error fetching financial summary:", error);
      setError("Error loading financial summary");
    }
  };

  const fetchDetailedReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (filters[key] !== "all" && filters[key] !== "") {
          params.append(key, filters[key]);
        }
      });

      const response = await axios.get(
        `/api/reports/financial/detailed?${params}`
      );
      if (response.data.success) {
        setDetailedReports(response.data.data);
      } else {
        setError("Gagal memuat detail transaksi");
      }
    } catch (error) {
      console.error("Error fetching detailed reports:", error);
      setError("Error loading detailed reports");
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

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleExportExcel = async () => {
    try {
      setExportLoading(true);
      const params = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (filters[key] !== "all" && filters[key] !== "") {
          params.append(key, filters[key]);
        }
      });

      const response = await axios.get(
        `/api/reports/financial/export/excel?${params}`,
        {
          responseType: "blob",
        }
      );

      // Create blob and download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `laporan-keuangan-${new Date().toISOString().split("T")[0]}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Gagal mengekspor ke Excel");
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExportLoading(true);
      const params = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (filters[key] !== "all" && filters[key] !== "") {
          params.append(key, filters[key]);
        }
      });

      const response = await axios.get(
        `/api/reports/financial/export/pdf?${params}`,
        {
          responseType: "blob",
        }
      );

      // Create blob and download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `laporan-keuangan-${new Date().toISOString().split("T")[0]}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      alert("Gagal mengekspor ke PDF");
    } finally {
      setExportLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value && value !== 0) return "Rp 0";
    const numValue = parseFloat(value);
    return isNaN(numValue) ? "Rp 0" : `Rp ${numValue.toLocaleString("id-ID")}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("id-ID");
    } catch (error) {
      return "-";
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
      const totalAmount = parseFloat(payment.amount) || 0;
      const paidAmount = parseFloat(payment.amount_paid) || 0;
      const progress =
        totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;
      return `Cicilan ${installmentNum} (${progress}%)`;
    }
    return payment.status;
  };

  if (loading && !summary) {
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
      <div className="row">
        <div className="col">
          <h2>Laporan Keuangan</h2>
          <p className="text-muted">
            Monitoring dan analisis data keuangan program magang
          </p>
        </div>
      </div>

      {/* Alert Message */}
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

      {/* Summary Cards */}
      {summary && (
        <div className="row mb-4">
          <div className="col-md-4 mb-3 mb-md-0">
            <div className="card bg-primary text-white text-center h-100">
              <div className="card-body">
                <h4 className="card-title">Total Pemasukan Bersih</h4>
                <p className="card-text h4 text-white">
                  {formatCurrency(summary.summary?.total_revenue)}
                </p>
                <small className="text-white">
                  {summary.summary?.total_transactions} transaksi
                </small>
              </div>
            </div>
          </div>
          <div className="col-md-4 mb-3 mb-md-0">
            <div className="card bg-primary text-white text-center h-100">
              <div className="card-body">
                <h4 className="card-title">Pembayaran Belum Verifikasi</h4>
                <p className="card-text h4">
                  {formatCurrency(summary.summary?.total_pending)}
                </p>
                <small>Menunggu konfirmasi admin</small>
              </div>
            </div>
          </div>
          <div className="col-md-4 mb-3 mb-md-0">
            <div className="card bg-primary text-white text-center h-100">
              <div className="card-body">
                <h4 className="card-title">Estimasi Tunggakan</h4>
                <p className="card-text h4 text-white">
                  {formatCurrency(summary.summary?.total_outstanding)}
                </p>
                <small className="text-white">
                  {formatCurrency(summary.summary?.total_overdue)} overdue
                </small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Section */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Filter & Pencarian</h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-2">
              <div className="mb-3">
                <label className="form-label">Program</label>
                <select
                  className="form-select"
                  value={filters.program}
                  onChange={(e) =>
                    handleFilterChange("program", e.target.value)
                  }
                >
                  <option value="all">Semua Program</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col-md-2">
              <div className="mb-3">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                >
                  <option value="all">Semua Status</option>
                  <option value="pending">Pending</option>
                  <option value="installment_1">Cicilan 1</option>
                  <option value="installment_2">Cicilan 2</option>
                  <option value="installment_3">Cicilan 3</option>
                  <option value="paid">Lunas</option>
                  <option value="overdue">Jatuh Tempo</option>
                </select>
              </div>
            </div>
            <div className="col-md-2">
              <div className="mb-3">
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
            </div>
            <div className="col-md-2">
              <div className="mb-3">
                <label className="form-label">Tanggal Akhir</label>
                <input
                  type="date"
                  className="form-control"
                  value={filters.end_date}
                  onChange={(e) =>
                    handleFilterChange("end_date", e.target.value)
                  }
                />
              </div>
            </div>
            <div className="col-md-4">
              <div className="mb-3">
                <label className="form-label">&nbsp;</label>
                <button
                  className="btn btn-outline-primary w-100"
                  onClick={() =>
                    setFilters({
                      program: "all",
                      start_date: "",
                      end_date: "",
                      status: "all",
                      search: "",
                    })
                  }
                  title="Reset Filter"
                >
                  <i className="bi bi-arrow-clockwise"></i> Reset Filter
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="row mb-4">
        <div className="col">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Ekspor Laporan</h5>
                <div>
                  <button
                    className="btn btn-success me-2"
                    onClick={handleExportExcel}
                    disabled={exportLoading}
                  >
                    {exportLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Exporting...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-file-earmark-excel me-2"></i>
                        Export ke Excel
                      </>
                    )}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={handleExportPDF}
                    disabled={exportLoading}
                  >
                    {exportLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Exporting...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-file-earmark-pdf me-2"></i>
                        Export ke PDF
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Report Table */}
      <div className="row">
        <div className="col">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                Detail Transaksi ({detailedReports.length})
              </h5>
              <div>
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={fetchDetailedReports}
                  disabled={loading}
                >
                  <i className="bi bi-arrow-clockwise me-2"></i>
                  Refresh
                </button>
              </div>
            </div>

            <div className="card-body">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2 text-muted">Memuat data transaksi...</p>
                </div>
              ) : detailedReports.length === 0 ? (
                <div className="text-center py-5">
                  <div className="display-1 text-muted mb-3">💸</div>
                  <h5>Tidak ada data transaksi</h5>
                  <p className="text-muted">
                    Coba ubah filter atau tanggal untuk melihat data
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped table-bordered">
                    <thead className="table-light align-middle">
                      <tr>
                        <th>#</th>
                        <th>Invoice</th>
                        <th>Nama Peserta</th>
                        <th>Program</th>
                        <th>Status</th>
                        <th>Jenis Pembayaran</th>
                        <th>Total Tagihan</th>
                        <th>Sudah Dibayar</th>
                        <th>Metode</th>
                        <th>Tanggal</th>
                      </tr>
                    </thead>
                    <tbody className="align-middle">
                      {detailedReports.map((report, index) => (
                        <tr key={report.id}>
                          <td>{index + 1}</td>
                          <td>
                            <div>
                              <strong>{report.invoice_number}</strong>
                              {report.receipt_number && (
                                <div>
                                  <small className="text-success">
                                    Kwitansi: {report.receipt_number}
                                  </small>
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            <div>
                              <strong>{report.full_name}</strong>
                              <div>
                                <small className="text-muted">
                                  {report.email}
                                </small>
                              </div>
                            </div>
                          </td>
                          <td>{report.program_name}</td>
                          <td>{getStatusBadge(report.status)}</td>
                          <td>{getInstallmentText(report)}</td>
                          <td className="fw-bold">
                            {formatCurrency(report.amount)}
                          </td>
                          <td
                            className={
                              parseFloat(report.amount_paid || 0) >=
                              parseFloat(report.amount || 0)
                                ? "text-success fw-bold"
                                : "text-warning"
                            }
                          >
                            {formatCurrency(report.amount_paid)}
                          </td>
                          <td>
                            {report.payment_method && (
                              <span className="badge bg-light text-dark">
                                {getPaymentMethodText(report.payment_method)}
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="small">
                              {formatDate(
                                report.payment_date || report.created_at
                              )}
                            </div>
                            {report.due_date && (
                              <div className="small text-muted">
                                Jatuh tempo: {formatDate(report.due_date)}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {summary && (
                      <tfoot className="table-light">
                        <tr>
                          <td colSpan="6" className="text-end fw-bold">
                            TOTAL:
                          </td>
                          <td className="fw-bold">
                            {formatCurrency(summary.summary?.total_amount)}
                          </td>
                          <td className="fw-bold">
                            {formatCurrency(summary.summary?.total_amount_paid)}
                          </td>
                          <td colSpan="2">
                            <small>
                              Sisa:{" "}
                              {formatCurrency(
                                parseFloat(summary.summary?.total_amount || 0) -
                                  parseFloat(
                                    summary.summary?.total_amount_paid || 0
                                  )
                              )}
                            </small>
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Distribution */}
      {summary && summary.statusDistribution && (
        <div className="row mt-4">
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">Distribusi Status Pembayaran</h6>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Jumlah</th>
                        <th>Total Amount</th>
                        <th>Total Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.statusDistribution.map((item) => (
                        <tr key={item.status}>
                          <td>{getStatusBadge(item.status)}</td>
                          <td>{item.count}</td>
                          <td>{formatCurrency(item.total_amount)}</td>
                          <td>{formatCurrency(item.total_paid)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">Trend Bulanan</h6>
              </div>
              <div className="card-body">
                {summary.monthlyTrend && summary.monthlyTrend.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Bulan</th>
                          <th>Transaksi</th>
                          <th>Pendapatan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.monthlyTrend.map((item) => (
                          <tr key={item.month}>
                            <td>{item.month}</td>
                            <td>{item.transaction_count}</td>
                            <td>{formatCurrency(item.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted text-center">Tidak ada data trend</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialReports;
