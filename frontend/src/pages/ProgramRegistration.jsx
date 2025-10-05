import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const ProgramRegistration = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    application_letter: "",
    placement_preference: "",
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (state?.program) {
      setProgram(state.program);
    } else {
      // Jika tidak ada program dari state, redirect ke programs
      navigate("/programs");
    }
  }, [state, user, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.application_letter.trim()) {
      newErrors.application_letter = "Surat lamaran wajib diisi";
    } else if (formData.application_letter.trim().length < 50) {
      newErrors.application_letter = "Surat lamaran minimal 50 karakter";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});
    setSuccess("");

    try {
      console.log("Submitting registration for program:", program.id);

      const response = await axios.post("/api/registrations", {
        program_id: program.id,
        application_letter: formData.application_letter,
        placement_preference: formData.placement_preference,
      });

      console.log("Registration response:", response.data);

      if (response.data.success) {
        const { invoice_number, amount } = response.data.data;

        setSuccess(
          `Pendaftaran berhasil! Tagihan sebesar Rp ${amount?.toLocaleString(
            "id-ID"
          )} telah dibuat (Invoice: ${invoice_number}). Silakan lakukan pembayaran.`
        );

        setFormData({
          application_letter: "",
          placement_preference: "",
        });

        // Redirect ke dashboard setelah 3 detik
        setTimeout(() => {
          navigate("/dashboard");
        }, 3000);
      } else {
        setErrors({
          submit: response.data.message || "Terjadi kesalahan saat mendaftar",
        });
      }
    } catch (error) {
      console.error("Registration error:", error);
      const message =
        error.response?.data?.message || "Terjadi kesalahan saat mendaftar";
      setErrors({ submit: message });
    } finally {
      setLoading(false);
    }
  };

  if (!program) {
    return (
      <div className="container mt-5">
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
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <a href="/">Home</a>
          </li>
          <li className="breadcrumb-item">
            <a href="/programs">Programs</a>
          </li>
          <li className="breadcrumb-item">
            <a href={`/program/${program.id}`}>{program.name}</a>
          </li>
          <li className="breadcrumb-item active">Pendaftaran</li>
        </ol>
      </nav>

      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h4 className="mb-0">📝 Form Pendaftaran Program</h4>
            </div>
            <div className="card-body">
              {/* Program Info */}
              <div className="alert alert-info">
                <h5>Program: {program.name}</h5>
                <p className="mb-1">
                  <strong>Biaya:</strong> Rp{" "}
                  {program.cost?.toLocaleString("id-ID")}
                </p>
                <p className="mb-0">
                  <strong>Durasi:</strong> {program.duration}
                </p>
              </div>

              {success && <div className="alert alert-success">{success}</div>}

              {errors.submit && (
                <div className="alert alert-danger">{errors.submit}</div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Application Letter */}
                <div className="mb-3">
                  <label htmlFor="application_letter" className="form-label">
                    <strong>Surat Lamaran *</strong>
                  </label>
                  <textarea
                    id="application_letter"
                    name="application_letter"
                    className={`form-control ${
                      errors.application_letter ? "is-invalid" : ""
                    }`}
                    rows="6"
                    placeholder="Tuliskan alasan mengapa Anda ingin mengikuti program ini, latar belakang pendidikan/pengalaman, dan harapan setelah menyelesaikan program..."
                    value={formData.application_letter}
                    onChange={handleInputChange}
                  />
                  {errors.application_letter && (
                    <div className="invalid-feedback">
                      {errors.application_letter}
                    </div>
                  )}
                  <div className="form-text">
                    Minimal 50 karakter. Jelaskan motivasi dan latar belakang
                    Anda.
                  </div>
                </div>

                {/* Placement Preference */}
                <div className="mb-4">
                  <label htmlFor="placement_preference" className="form-label">
                    <strong>Preferensi Penempatan (Opsional)</strong>
                  </label>
                  <textarea
                    id="placement_preference"
                    name="placement_preference"
                    className="form-control"
                    rows="3"
                    placeholder="Jika ada preferensi khusus untuk penempatan (lokasi, departemen, jenis perusahaan, dll.)..."
                    value={formData.placement_preference}
                    onChange={handleInputChange}
                  />
                  <div className="form-text">
                    Preferensi ini akan dipertimbangkan namun tidak dijamin
                    dapat dipenuhi.
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="mb-4">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="terms"
                      required
                    />
                    <label className="form-check-label" htmlFor="terms">
                      Saya menyetujui syarat dan ketentuan yang berlaku. Saya
                      memahami bahwa:
                      <ul className="small mt-2">
                        <li>Biaya pendaftaran tidak dapat dikembalikan</li>
                        <li>Proses seleksi dilakukan secara objektif</li>
                        <li>
                          Keputusan panitia bersifat mutlak dan tidak dapat
                          diganggu gugat
                        </li>
                      </ul>
                    </label>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                  <button
                    type="button"
                    className="btn btn-outline-secondary me-md-2"
                    onClick={() => navigate(`/program/${program.id}`)}
                  >
                    Kembali
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                        >
                          <span className="visually-hidden">Loading...</span>
                        </span>
                        Memproses...
                      </>
                    ) : (
                      "✅ Daftar Sekarang"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgramRegistration;
