import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const Payment = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (user) {
      fetchPayments();
    }
  }, [user]);

  const fetchPayments = async () => {
    try {
      const response = await axios.get(`/api/payments/user/${user.id}`);
      if (response.data.success) {
        setPayments(response.data.data);
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
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith("image/")) {
        setMessage({
          type: "error",
          text: "Hanya file gambar yang diizinkan",
        });
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        setMessage({
          type: "error",
          text: "Ukuran file maksimal 5MB",
        });
        return;
      }
      setFile(selectedFile);
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
        setMessage({
          type: "success",
          text: "Bukti pembayaran berhasil diupload",
        });
        setShowUploadModal(false);
        setFile(null);
        setSelectedPayment(null);
        fetchPayments();
      }
    } catch (error) {
      console.error("Error uploading proof:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Gagal upload bukti pembayaran",
      });
    } finally {
      setUploading(false);
    }
  };

  // 📥 FUNGSI DOWNLOAD KWITANSI YANG BENAR
  const downloadReceipt = async (payment) => {
    try {
      console.log("Downloading receipt for payment:", payment.id);

      // Method 1: Coba download PDF dari backend
      try {
        const response = await axios.get(
          `/api/payments/${payment.id}/receipt`,
          {
            responseType: "blob",
          }
        );

        // Create blob link to download
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
          text: "Kwitansi berhasil diunduh",
        });
        return;
      } catch (pdfError) {
        console.log("PDF receipt not available, generating HTML receipt...");
      }

      // Method 2: Fallback - Generate HTML Receipt
      const receiptWindow = window.open("", "_blank");
      const receiptDate = payment.payment_date
        ? new Date(payment.payment_date).toLocaleDateString("id-ID")
        : new Date().toLocaleDateString("id-ID");

      receiptWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>KWITANSI - ${
            payment.receipt_number || payment.invoice_number
          }</title>
          <style>
            body { 
              font-family: 'Arial', sans-serif; 
              margin: 20px; 
              line-height: 1.6;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #333;
              padding-bottom: 15px;
            }
            .company-info {
              text-align: center;
              margin-bottom: 20px;
            }
            .receipt-info { 
              margin-bottom: 25px; 
              background: #f8f9fa;
              padding: 15px;
              border-radius: 5px;
            }
            .section { 
              margin-bottom: 20px; 
            }
            .section-title {
              background: #007bff;
              color: white;
              padding: 8px 12px;
              border-radius: 4px;
              margin-bottom: 10px;
            }
            .total { 
              font-size: 18px; 
              font-weight: bold; 
              margin-top: 25px; 
              padding: 15px;
              background: #e9ecef;
              border-radius: 5px;
              text-align: center;
            }
            .footer { 
              margin-top: 40px; 
              text-align: center; 
              font-size: 12px; 
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 15px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 10px 0; 
            }
            td { 
              padding: 10px; 
              border-bottom: 1px solid #ddd; 
              vertical-align: top;
            }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .border-top { border-top: 2px solid #333; }
            .signature-area {
              margin-top: 50px;
              text-align: right;
            }
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
              <tr>
                <td width="30%"><strong>No. Kwitansi</strong></td>
                <td>: ${payment.receipt_number || payment.invoice_number}</td>
              </tr>
              <tr>
                <td><strong>No. Invoice</strong></td>
                <td>: ${payment.invoice_number}</td>
              </tr>
              <tr>
                <td><strong>Tanggal Kwitansi</strong></td>
                <td>: ${receiptDate}</td>
              </tr>
            </table>
          </div>

          <div class="section">
            <div class="section-title">DATA PESERTA</div>
            <table>
              <tr>
                <td width="30%"><strong>Nama Lengkap</strong></td>
                <td>: ${user?.full_name || "N/A"}</td>
              </tr>
              <tr>
                <td><strong>Email</strong></td>
                <td>: ${user?.email || "N/A"}</td>
              </tr>
              <tr>
                <td><strong>Nomor Telepon</strong></td>
                <td>: ${user?.phone || "N/A"}</td>
              </tr>
            </table>
          </div>

          <div class="section">
            <div class="section-title">DETAIL PROGRAM</div>
            <table>
              <tr>
                <td width="30%"><strong>Program Magang</strong></td>
                <td>: ${payment.program_name}</td>
              </tr>
              <tr>
                <td><strong>Biaya Program</strong></td>
                <td>: Rp ${payment.amount?.toLocaleString("id-ID") || "0"}</td>
              </tr>
            </table>
          </div>

          <div class="section">
            <div class="section-title">RINCIAN PEMBAYARAN</div>
            <table>
              <tr>
                <td><strong>Keterangan</strong></td>
                <td class="text-right"><strong>Jumlah</strong></td>
              </tr>
              <tr>
                <td>Biaya Program ${payment.program_name}</td>
                <td class="text-right">Rp ${
                  payment.amount?.toLocaleString("id-ID") || "0"
                }</td>
              </tr>
              <tr class="border-top">
                <td><strong>TOTAL TAGIHAN</strong></td>
                <td class="text-right"><strong>Rp ${
                  payment.amount?.toLocaleString("id-ID") || "0"
                }</strong></td>
              </tr>
              <tr>
                <td><strong>SUDAH DIBAYAR</strong></td>
                <td class="text-right"><strong>Rp ${
                  payment.amount_paid?.toLocaleString("id-ID") || "0"
                }</strong></td>
              </tr>
              ${
                payment.amount_paid < payment.amount
                  ? `
              <tr>
                <td><strong>SISA TAGIHAN</strong></td>
                <td class="text-right"><strong>Rp ${(
                  payment.amount - payment.amount_paid
                ).toLocaleString("id-ID")}</strong></td>
              </tr>
              `
                  : ""
              }
            </table>
          </div>

          <div class="total">
            TOTAL YANG SUDAH DIBAYAR: Rp ${
              payment.amount_paid?.toLocaleString("id-ID") || "0"
            }
          </div>

          ${
            payment.status === "paid"
              ? `
          <div class="section">
            <div class="section-title">KONFIRMASI PEMBAYARAN</div>
            <table>
              <tr>
                <td width="30%"><strong>Status</strong></td>
                <td>: <span style="color: green; font-weight: bold;">LUNAS</span></td>
              </tr>
              <tr>
                <td><strong>Tanggal Pembayaran</strong></td>
                <td>: ${receiptDate}</td>
              </tr>
              <tr>
                <td><strong>Metode Pembayaran</strong></td>
                <td>: ${payment.payment_method || "Transfer Bank"}</td>
              </tr>
              ${
                payment.bank_name
                  ? `
              <tr>
                <td><strong>Bank</strong></td>
                <td>: ${payment.bank_name}</td>
              </tr>
              `
                  : ""
              }
            </table>
          </div>
          `
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

      // Auto print
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

  // 👁️ FUNGSI UNTUK MENAMPILKAN DETAIL PEMBAYARAN
  const handleShowDetail = (payment) => {
    setSelectedPayment(payment);
    setShowDetailModal(true);
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedPayment(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID");
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("id-ID");
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
        <div className="col">
          <h2>Manajemen Pembayaran</h2>
          <p className="text-muted">
            Kelola pembayaran program magang Anda di sini
          </p>
        </div>
      </div>

      {/* Alert Message */}
      {message.text && (
        <div
          className={`alert alert-${
            message.type === "error" ? "danger" : "success"
          } alert-dismissible fade show`}
        >
          {message.text}
          <button
            type="button"
            className="btn-close"
            onClick={() => setMessage({ type: "", text: "" })}
          ></button>
        </div>
      )}

      {/* Payments List */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Daftar Pembayaran</h5>
            </div>
            <div className="card-body">
              {payments.length === 0 ? (
                <div className="text-center py-4">
                  <div className="text-muted mb-3">
                    <i className="bi bi-receipt display-4"></i>
                  </div>
                  <h5>Belum ada pembayaran</h5>
                  <p className="text-muted">
                    Setelah mendaftar program, tagihan pembayaran akan muncul di
                    sini.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th>Invoice</th>
                        <th>Program</th>
                        <th>Jumlah Tagihan</th>
                        <th>Dibayar</th>
                        <th>Status</th>
                        <th>Batas Waktu</th>
                        <th>Kwitansi</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment, index) => (
                        <tr key={payment.id}>
                          <td>{index + 1}</td>
                          <td>
                            <small className="text-muted">
                              {payment.invoice_number}
                            </small>
                            {payment.receipt_number && (
                              <div>
                                <small className="text-success">
                                  Receipt: {payment.receipt_number}
                                </small>
                              </div>
                            )}
                          </td>
                          <td>{payment.program_name}</td>
                          <td>{formatCurrency(payment.amount)}</td>
                          <td>
                            {formatCurrency(payment.amount_paid)}
                            {payment.amount_paid > 0 && (
                              <div>
                                <small
                                  className={
                                    payment.amount_paid >= payment.amount
                                      ? "text-success"
                                      : "text-warning"
                                  }
                                >
                                  {(
                                    (payment.amount_paid / payment.amount) *
                                    100
                                  ).toFixed(0)}
                                  %
                                </small>
                              </div>
                            )}
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                payment.status === "paid"
                                  ? "bg-success"
                                  : payment.status === "pending"
                                  ? "bg-warning"
                                  : payment.status === "down_payment"
                                  ? "bg-info"
                                  : payment.status === "overdue"
                                  ? "bg-danger"
                                  : "bg-secondary"
                              }`}
                            >
                              {payment.status === "paid"
                                ? "Lunas"
                                : payment.status === "pending"
                                ? "Menunggu"
                                : payment.status === "down_payment"
                                ? "DP"
                                : payment.status === "overdue"
                                ? "Terlambat"
                                : payment.status}
                            </span>
                          </td>
                          <td>
                            {payment.due_date ? (
                              <span
                                className={
                                  payment.status === "overdue" ||
                                  (new Date(payment.due_date) < new Date() &&
                                    payment.status !== "paid")
                                    ? "text-danger fw-bold"
                                    : ""
                                }
                              >
                                {formatDate(payment.due_date)}
                                {new Date(payment.due_date) < new Date() &&
                                  payment.status !== "paid" && (
                                    <div>
                                      <small className="text-danger">
                                        ⚠️ Terlambat
                                      </small>
                                    </div>
                                  )}
                              </span>
                            ) : (
                              "-"
                            )}
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
                              {/* Upload Proof Button */}
                              {(payment.status === "pending" ||
                                payment.status === "down_payment") && (
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
                              {payment.status === "paid" &&
                                payment.receipt_number && (
                                  <button
                                    className="btn btn-outline-success"
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
                                <i className="bi bi-eye"></i> Detail
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
        </div>
      </div>

      {/* Payment Instructions */}
      <div className="row mt-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h6 className="mb-0">📋 Instruksi Pembayaran</h6>
            </div>
            <div className="card-body">
              <ol className="mb-0">
                <li>Pilih pembayaran yang ingin dilakukan</li>
                <li>
                  Transfer ke rekening berikut:
                  <ul className="mt-2">
                    <li>
                      <strong>Bank:</strong> BCA
                    </li>
                    <li>
                      <strong>No. Rekening:</strong> 1234 5678 9012
                    </li>
                    <li>
                      <strong>Atas Nama:</strong> PT. Intern Registration
                    </li>
                  </ul>
                </li>
                <li>Upload bukti transfer dengan mengklik tombol upload</li>
                <li>Tunggu konfirmasi dari admin</li>
                <li>Download kwitansi setelah pembayaran lunas</li>
              </ol>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h6 className="mb-0">💡 Cara Download Kwitansi</h6>
            </div>
            <div className="card-body">
              <ol className="mb-0">
                <li>
                  Pastikan status pembayaran <strong>"Lunas"</strong>
                </li>
                <li>
                  Klik tombol <strong>Download</strong> (ikon 📥)
                </li>
                <li>Kwitansi akan terbuka di jendela baru</li>
                <li>
                  Klik <strong>Print</strong> dan pilih{" "}
                  <strong>"Save as PDF"</strong>
                </li>
                <li>Simpan file PDF kwitansi di device Anda</li>
              </ol>
              <div className="mt-3 p-2 bg-light rounded">
                <small>
                  <strong>Note:</strong> Kwitansi juga bisa di-download dari
                  tombol "Detail"
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Proof Modal */}
      {showUploadModal && selectedPayment && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Upload Bukti Pembayaran</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedPayment(null);
                    setFile(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">
                    <strong>Invoice:</strong> {selectedPayment.invoice_number}
                  </label>
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    <strong>Program:</strong> {selectedPayment.program_name}
                  </label>
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    <strong>Jumlah:</strong>{" "}
                    {formatCurrency(selectedPayment.amount)}
                  </label>
                </div>

                <div className="mb-3">
                  <label htmlFor="proofFile" className="form-label">
                    Pilih File Bukti Pembayaran
                  </label>
                  <input
                    type="file"
                    className="form-control"
                    id="proofFile"
                    accept="image/*"
                    onChange={handleFileSelect}
                  />
                  <div className="form-text">
                    Format: JPG, PNG (Maksimal 5MB)
                  </div>
                </div>

                {file && (
                  <div className="alert alert-info">
                    <strong>File terpilih:</strong> {file.name}
                    <br />
                    <small>
                      Size: {(file.size / 1024 / 1024).toFixed(2)} MB
                    </small>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedPayment(null);
                    setFile(null);
                  }}
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
                    "Upload Bukti"
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
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-receipt me-2"></i>
                  Detail Pembayaran
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
                                <strong>Invoice Number:</strong>
                              </td>
                              <td>{selectedPayment.invoice_number}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Receipt Number:</strong>
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
                                <strong>Tanggal Invoice:</strong>
                              </td>
                              <td>{formatDate(selectedPayment.created_at)}</td>
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
                                <span
                                  className={`badge ${
                                    selectedPayment.status === "paid"
                                      ? "bg-success"
                                      : selectedPayment.status === "pending"
                                      ? "bg-warning"
                                      : selectedPayment.status ===
                                        "down_payment"
                                      ? "bg-info"
                                      : selectedPayment.status === "overdue"
                                      ? "bg-danger"
                                      : "bg-secondary"
                                  }`}
                                >
                                  {selectedPayment.status}
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Batas Waktu:</strong>
                              </td>
                              <td>
                                {selectedPayment.due_date ? (
                                  <span
                                    className={
                                      new Date(selectedPayment.due_date) <
                                        new Date() &&
                                      selectedPayment.status !== "paid"
                                        ? "text-danger fw-bold"
                                        : ""
                                    }
                                  >
                                    {formatDate(selectedPayment.due_date)}
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </td>
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
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card mb-3">
                  <div className="card-header bg-primary text-white">
                    <h6 className="mb-0">Rincian Biaya</h6>
                  </div>
                  <div className="card-body">
                    <div className="row text-center">
                      <div className="col-md-4">
                        <div className="border rounded p-3">
                          <h5 className="text-primary">
                            {formatCurrency(selectedPayment.amount)}
                          </h5>
                          <small className="text-muted">Total Tagihan</small>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="border rounded p-3">
                          <h5 className="text-success">
                            {formatCurrency(selectedPayment.amount_paid)}
                          </h5>
                          <small className="text-muted">Sudah Dibayar</small>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="border rounded p-3">
                          <h5 className="text-warning">
                            {formatCurrency(
                              selectedPayment.amount -
                                selectedPayment.amount_paid
                            )}
                          </h5>
                          <small className="text-muted">Sisa Tagihan</small>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="progress" style={{ height: "20px" }}>
                        <div
                          className="progress-bar bg-success"
                          role="progressbar"
                          style={{
                            width: `${
                              (selectedPayment.amount_paid /
                                selectedPayment.amount) *
                              100
                            }%`,
                          }}
                        >
                          {(
                            (selectedPayment.amount_paid /
                              selectedPayment.amount) *
                            100
                          ).toFixed(0)}
                          %
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
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseDetail}
                >
                  Tutup
                </button>
                {selectedPayment.status === "paid" &&
                  selectedPayment.receipt_number && (
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={() => {
                        downloadReceipt(selectedPayment);
                        handleCloseDetail();
                      }}
                    >
                      <i className="bi bi-download me-2"></i>
                      Download Kwitansi
                    </button>
                  )}
                {(selectedPayment.status === "pending" ||
                  selectedPayment.status === "down_payment") && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      handleCloseDetail();
                      setSelectedPayment(selectedPayment);
                      setShowUploadModal(true);
                    }}
                  >
                    <i className="bi bi-upload me-2"></i>
                    Upload Bukti Bayar
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
