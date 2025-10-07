import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout, isAuthenticated, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/" ? "active" : "";
    }
    return location.pathname.startsWith(path) ? "active" : "";
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Loading state
  if (loading) {
    return (
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <div
            className="spinner-border spinner-border-sm text-light"
            role="status"
          >
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary sticky-top">
      <div className="container">
        {/* Logo di Kiri */}
        <Link className="navbar-brand fw-bold d-flex align-items-center" to="/">
          <img
            src="/images/logo.png"
            alt="FITALENTA Logo"
            height="40"
            className="me-2"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "block";
            }}
          />
          <span style={{ display: "none" }}>FITALENTA</span>
        </Link>

        {/* Toggler untuk Mobile */}
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav mx-auto">
            {/* Menu Public HANYA untuk user yang belum login */}
            {!isAuthenticated ? (
              <>
                <li className="nav-item">
                  <Link className={`nav-link ${isActive("/")}`} to="/">
                    Home
                  </Link>
                </li>
                <li className="nav-item border-end border-light border-opacity-25 mx-2"></li>

                <li className="nav-item">
                  <Link
                    className={`nav-link ${isActive("/programs")}`}
                    to="/programs"
                  >
                    Programs
                  </Link>
                </li>
                <li className="nav-item border-end border-light border-opacity-25 mx-2"></li>

                <li className="nav-item">
                  <Link
                    className={`nav-link ${isActive("/about-us")}`}
                    to="/about-us"
                  >
                    About Us
                  </Link>
                </li>
                <li className="nav-item border-end border-light border-opacity-25 mx-2"></li>

                <li className="nav-item">
                  <Link
                    className={`nav-link ${isActive("/contact")}`}
                    to="/contact"
                  >
                    Contact
                  </Link>
                </li>
              </>
            ) : (
              /* Menu untuk User yang SUDAH Login */
              <>
                {/* Menu untuk User Biasa */}
                {!isAdmin && (
                  <>
                    <li className="nav-item">
                      <Link
                        className={`nav-link ${isActive("/dashboard")}`}
                        to="/dashboard"
                      >
                        Overview
                      </Link>
                    </li>
                    <li className="nav-item border-end border-light border-opacity-25 mx-2"></li>

                    <li className="nav-item">
                      <Link
                        className={`nav-link ${isActive("/registration")}`}
                        to="/registration"
                      >
                        Registration
                      </Link>
                    </li>
                    <li className="nav-item border-end border-light border-opacity-25 mx-2"></li>

                    <li className="nav-item">
                      <Link
                        className={`nav-link ${isActive("/payment")}`}
                        to="/payment"
                      >
                        Payment
                      </Link>
                    </li>
                  </>
                )}

                {/* Menu untuk Admin */}
                {isAdmin && (
                  <>
                    <li className="nav-item">
                      <Link
                        className={`nav-link ${isActive("/admin")}`}
                        to="/admin"
                      >
                        Dashboard
                      </Link>
                    </li>
                    <li className="nav-item border-end border-light border-opacity-25 mx-2"></li>

                    <li className="nav-item dropdown">
                      <a
                        className={`nav-link dropdown-toggle ${
                          location.pathname.startsWith("/admin") ? "active" : ""
                        }`}
                        href="#"
                        role="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                      >
                        Management
                      </a>
                      <ul className="dropdown-menu">
                        <li>
                          <Link
                            className={`dropdown-item ${isActive(
                              "/admin/payments"
                            )}`}
                            to="/admin/payments"
                          >
                            <i className="bi bi-credit-card me-2"></i>
                            Manajemen Pembayaran
                          </Link>
                        </li>
                        <li>
                          <Link
                            className={`dropdown-item ${isActive(
                              "/admin/selection"
                            )}`}
                            to="/admin/selection"
                          >
                            <i className="bi bi-clipboard-check me-2"></i>
                            Manajemen Seleksi
                          </Link>
                        </li>
                        <li>
                          <Link
                            className={`dropdown-item ${isActive(
                              "/admin/placement"
                            )}`}
                            to="/admin/placement"
                          >
                            <i className="bi bi-briefcase me-2"></i>
                            Manajemen Penyaluran
                          </Link>
                        </li>
                        <li>
                          <hr className="dropdown-divider" />
                        </li>
                        <li>
                          <Link
                            className={`dropdown-item ${isActive(
                              "/admin/financial-reports"
                            )}`}
                            to="/admin/financial-reports"
                          >
                            <i className="bi bi-graph-up me-2"></i>
                            Laporan Keuangan
                          </Link>
                        </li>
                      </ul>
                    </li>
                  </>
                )}
              </>
            )}
          </ul>

          {/* Menu Kanan - Login/Register atau User Dropdown */}
          <ul className="navbar-nav">
            {!isAuthenticated ? (
              <div className="d-flex align-items-center">
                <li className="nav-item">
                  <Link
                    className={`nav-link ${isActive("/login")}`}
                    to="/login"
                  >
                    Login
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    className={`nav-link ${isActive("/register")}`}
                    to="/register"
                  >
                    Register
                  </Link>
                </li>
              </div>
            ) : (
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle d-flex align-items-center"
                  href="#"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <span className="d-none d-md-inline">👋 </span>
                  <span className="ms-1">{user?.full_name || user?.email}</span>
                  {isAdmin && (
                    <span className="badge bg-warning ms-2">Admin</span>
                  )}
                </a>
                <ul className="dropdown-menu dropdown-menu-end">
                  {/* <li>
                    <Link className="dropdown-item" to="/dashboard">
                      <i className="bi bi-speedometer2 me-2"></i>
                      My Dashboard
                    </Link>
                  </li>
                  {!isAdmin && (
                    <>
                      <li>
                        <Link className="dropdown-item" to="/programs">
                          <i className="bi bi-list-ul me-2"></i>
                          Programs
                        </Link>
                      </li>
                      <li>
                        <Link className="dropdown-item" to="/payment">
                          <i className="bi bi-credit-card me-2"></i>
                          Payment
                        </Link>
                      </li>
                    </>
                  )}
                  <li>
                    <hr className="dropdown-divider" />
                  </li> */}
                  <li>
                    <button
                      className="dropdown-item text-danger"
                      onClick={handleLogout}
                    >
                      <i className="bi bi-box-arrow-right me-2"></i>
                      Logout
                    </button>
                  </li>
                </ul>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
