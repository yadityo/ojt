import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import helpers from "../utils/helpers";

const ProgramDetail = () => {
  const { id } = useParams();
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProgram();
  }, [id]);

  const fetchProgram = async () => {
    try {
      const response = await axios.get(`/api/programs/${id}`);
      if (response.data.success) {
        setProgram(response.data.data);
      } else {
        setError("Program tidak ditemukan");
      }
    } catch (error) {
      console.error("Error fetching program:", error);
      setError("Error loading program details");
    } finally {
      setLoading(false);
    }
  };

  // const formatRupiah = (value) => {
  //   if (value === null || value === undefined || value === "") return "-";
  //   const normalized =
  //     typeof value === "number"
  //       ? value
  //       : parseFloat(String(value).replace(/,/g, ""));
  //   if (isNaN(normalized)) return "-";
  //   return normalized.toLocaleString("id-ID", {
  //     minimumFractionDigits: 0,
  //     maximumFractionDigits: 0,
  //   });
  // };

  // Fungsi helper untuk handle data JSON - TIDAK PERLU PARSE LAGI
  const getCurriculum = () => {
    if (!program.curriculum_json) return [];
    // Jika sudah object, langsung return
    if (typeof program.curriculum_json === "object") {
      return program.curriculum_json;
    }
    // Jika masih string, parse (fallback)
    try {
      return JSON.parse(program.curriculum_json);
    } catch (error) {
      console.error("Error parsing curriculum:", error);
      return [];
    }
  };

  const getFacilities = () => {
    if (!program.facilities_json) return { education: [], dormitory: [] };
    if (typeof program.facilities_json === "object") {
      return program.facilities_json;
    }
    try {
      return JSON.parse(program.facilities_json);
    } catch (error) {
      console.error("Error parsing facilities:", error);
      return { education: [], dormitory: [] };
    }
  };

  const getTimeline = () => {
    if (!program.timeline_json) return [];
    if (typeof program.timeline_json === "object") {
      return program.timeline_json;
    }
    try {
      return JSON.parse(program.timeline_json);
    } catch (error) {
      console.error("Error parsing timeline:", error);
      return [];
    }
  };

  const getFeeDetails = () => {
    if (!program.fee_details_json)
      return { training_fee_items: [], departure_fee_items: [] };
    if (typeof program.fee_details_json === "object") {
      return program.fee_details_json;
    }
    try {
      return JSON.parse(program.fee_details_json);
    } catch (error) {
      console.error("Error parsing fee details:", error);
      return { training_fee_items: [], departure_fee_items: [] };
    }
  };

  const getRequirements = () => {
    if (!program.requirements_list) return [];
    if (typeof program.requirements_list === "object") {
      return program.requirements_list;
    }
    try {
      return JSON.parse(program.requirements_list);
    } catch (error) {
      console.error("Error parsing requirements:", error);
      return [];
    }
  };

  if (loading) {
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

  if (error || !program) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger" role="alert">
          <h5>Error</h5>
          <p className="mb-0">{error || "Program tidak ditemukan"}</p>
          <Link to="/programs" className="btn btn-outline-danger mt-2">
            Kembali ke Daftar Program
          </Link>
        </div>
      </div>
    );
  }

  // Debug: Cek tipe data
  console.log("Curriculum type:", typeof program.curriculum_json);
  console.log("Curriculum data:", program.curriculum_json);

  const curriculum = getCurriculum();
  const facilities = getFacilities();
  const timeline = getTimeline();
  const feeDetails = getFeeDetails();
  const requirements = getRequirements();

  return (
    <>
      {/* Hero Section */}
      <section
        className="hero-section position-relative d-flex align-items-center"
        style={{
          minHeight: "60vh",
          background: "rgba(0,0,0,0.45)",
        }}
        aria-label={`Program ${program.name}`}
      >
        <div className="container position-relative text-center text-light">
          <div className="row justify-content-center">
            <div className="col-12 col-lg-8">
              <h1 className="fw-bold mb-3 display-4">{program.name}</h1>
              <p className="lead mb-4 fs-5">{program.description}</p>
              <div className="d-flex gap-3 flex-column flex-sm-row justify-content-center">
                <Link
                  to="/register"
                  className="btn btn-lg btn-light text-primary px-4 fw-semibold"
                >
                  Register Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mt-5">
        {/* Overview Program */}
        <section className="mb-5">
          <h2 className="text-center mb-4 text-uppercase fw-bold text-primary">
            Overview Program
          </h2>
          <div className="row g-4">
            <div className="col-md-3">
              <div className="card h-100 border-0 shadow-sm hover-shadow">
                <div className="card-body text-center p-4">
                  <div className="mb-3">
                    <i className="bi bi-calendar3 text-primary fs-1"></i>
                  </div>
                  <h5 className="card-title text-uppercase fw-bold">Jadwal</h5>
                  <p className="card-text text-muted">{program.schedule}</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card h-100 border-0 shadow-sm hover-shadow">
                <div className="card-body text-center p-4">
                  <div className="mb-3">
                    <i className="bi bi-clock text-primary fs-1"></i>
                  </div>
                  <h5 className="card-title text-uppercase fw-bold">Durasi</h5>
                  <p className="card-text text-muted">{program.duration}</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card h-100 border-0 shadow-sm hover-shadow">
                <div className="card-body text-center p-4">
                  <div className="mb-3">
                    <i className="bi bi-geo-alt text-primary fs-1"></i>
                  </div>
                  <h5 className="card-title text-uppercase fw-bold">Lokasi</h5>
                  <p className="card-text text-muted">{program.location}</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card h-100 border-0 shadow-sm hover-shadow">
                <div className="card-body text-center p-4">
                  <div className="mb-3">
                    <i className="bi bi-people text-primary fs-1"></i>
                  </div>
                  <h5 className="card-title text-uppercase fw-bold">Kuota</h5>
                  <p className="card-text text-muted">
                    {program.current_participants || 0} / {program.capacity}{" "}
                    Peserta
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Course Curriculum */}
        {curriculum && curriculum.length > 0 && (
          <section className="mb-5">
            <h2 className="text-center mb-4 text-uppercase fw-bold text-primary">
              Kurikulum Program
            </h2>
            <div className="row g-4">
              {curriculum.map((phase, index) => (
                <div key={index} className="col-lg-6">
                  <div className="card h-100 border-0 shadow-sm">
                    <div className="card-header bg-primary text-white text-center">
                      <h5 className="card-title mb-0 text-uppercase fw-bold">
                        {phase.phase}
                      </h5>
                    </div>
                    <div className="card-body">
                      <ul className="list-unstyled">
                        {phase.weeks &&
                          phase.weeks.map((week, weekIndex) => (
                            <li
                              key={weekIndex}
                              className="mb-2 d-flex align-items-center"
                            >
                              <i className="bi bi-check-circle text-success me-2"></i>
                              <span>{week}</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Facilities */}
        {facilities && (
          <section className="mb-5">
            <h2 className="text-center mb-4 text-uppercase fw-bold text-primary">
              Fasilitas Pendidikan & Asrama
            </h2>
            <div className="row g-4">
              {facilities.education && facilities.education.length > 0 && (
                <div className="col-lg-6">
                  <div className="card h-100 border-0 shadow-sm">
                    <div className="card-header bg-primary text-white text-center">
                      <h5 className="card-title mb-0 text-uppercase fw-bold">
                        <i className="bi bi-book me-2"></i>
                        Fasilitas Pendidikan
                      </h5>
                    </div>
                    <div className="card-body">
                      <ul className="list-unstyled">
                        {facilities.education.map((item, index) => (
                          <li
                            key={index}
                            className="mb-2 d-flex align-items-center"
                          >
                            <i className="bi bi-check-circle text-success me-2"></i>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              {facilities.dormitory && facilities.dormitory.length > 0 && (
                <div className="col-lg-6">
                  <div className="card h-100 border-0 shadow-sm">
                    <div className="card-header bg-primary text-white text-center">
                      <h5 className="card-title mb-0 text-uppercase fw-bold">
                        <i className="bi bi-house-door me-2"></i>
                        Fasilitas Asrama
                      </h5>
                    </div>
                    <div className="card-body">
                      <ul className="list-unstyled">
                        {facilities.dormitory.map((item, index) => (
                          <li
                            key={index}
                            className="mb-2 d-flex align-items-center"
                          >
                            <i className="bi bi-check-circle text-success me-2"></i>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Timeline */}
        {timeline && timeline.length > 0 && (
          <section className="mb-5">
            <h2 className="text-center mb-4 text-uppercase fw-bold text-primary">
              Timeline Program
            </h2>
            <div className="row g-4">
              {timeline.map((item, index) => (
                <div key={index} className="col-md-6 col-lg-3">
                  <div className="card h-100 border-0 shadow-sm text-center hover-shadow">
                    <div className="card-body p-4">
                      <div className="mb-3">
                        <div
                          className="bg-primary rounded-circle d-inline-flex align-items-center justify-content-center text-white fw-bold fs-4"
                          style={{ width: "60px", height: "60px" }}
                        >
                          {index + 1}
                        </div>
                      </div>
                      <h5 className="card-title text-uppercase fw-bold text-primary">
                        {item.month}
                      </h5>
                      <p className="card-text text-muted">{item.title}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Program Fees & Details */}
        <section className="mb-5">
          <h2 className="text-center mb-4 text-uppercase fw-bold text-primary">
            Biaya & Detail Program
          </h2>
          <div className="row g-4">
            {/* Biaya Pelatihan */}
            <div className="col-lg-6">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-header bg-primary text-white text-center">
                  <h5 className="card-title mb-0 text-uppercase fw-bold">
                    Biaya Pelatihan
                  </h5>
                  <h4 className="mb-0 fw-bold mt-2">
                    {helpers.formatCurrency(program.training_cost)}
                  </h4>
                </div>
                <div className="card-body">
                  <ul className="list-unstyled">
                    {feeDetails.training_fee_items &&
                      feeDetails.training_fee_items.map((item, index) => (
                        <li
                          key={index}
                          className="mb-2 d-flex align-items-center"
                        >
                          <i className="bi bi-check-circle text-success me-2"></i>
                          <span>{item}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Biaya Keberangkatan */}
            <div className="col-lg-6">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-header bg-primary text-white text-center">
                  <h5 className="card-title mb-0 text-uppercase fw-bold">
                    Biaya Keberangkatan
                  </h5>
                  <h4 className="mb-0 fw-bold mt-2">
                    {helpers.formatCurrency(program.departure_cost)}
                  </h4>
                </div>
                <div className="card-body">
                  <ul className="list-unstyled">
                    {feeDetails.departure_fee_items &&
                      feeDetails.departure_fee_items.map((item, index) => (
                        <li
                          key={index}
                          className="mb-2 d-flex align-items-center"
                        >
                          <i className="bi bi-check-circle text-success me-2"></i>
                          <span>{item}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Persyaratan Peserta */}
            {requirements && requirements.length > 0 && (
              <div className="col-12">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-primary text-white text-center">
                    <h5 className="card-title mb-0 text-uppercase fw-bold">
                      Persyaratan Peserta
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      {requirements.map((requirement, index) => (
                        <div key={index} className="col-md-6 mb-2">
                          <div className="d-flex align-items-center">
                            <i className="bi bi-check-circle text-success me-2"></i>
                            <span>{requirement}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
};

export default ProgramDetail;
