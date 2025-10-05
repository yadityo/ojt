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
        <Link className="navbar-brand fw-bold" to="/">
          FITALENTA
        </Link>

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
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className={`nav-link ${isActive("/")}`} to="/">
                Home
              </Link>
            </li>
            <li className="nav-item">
              <Link
                className={`nav-link ${isActive("/programs")}`}
                to="/programs"
              >
                Program
              </Link>
            </li>

            {isAuthenticated && !isAdmin && (
              <>
                <li className="nav-item">
                  <Link
                    className={`nav-link ${isActive("/dashboard")}`}
                    to="/dashboard"
                  >
                    Dashboard
                  </Link>
                </li>
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

            {isAdmin && (
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
                  Admin
                </a>
                <ul className="dropdown-menu">
                  <li>
                    <Link
                      className={`dropdown-item ${isActive("/admin")}`}
                      to="/admin"
                    >
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link
                      className={`dropdown-item ${isActive("/admin/payments")}`}
                      to="/admin/payments"
                    >
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
                      Manajemen Penyaluran
                    </Link>
                  </li>
                  <li>
                    <Link
                      className={`dropdown-item ${isActive(
                        "/admin/financial-reports"
                      )}`}
                      to="/admin/financial-reports"
                    >
                      Laporan Keuangan
                    </Link>
                  </li>
                </ul>
              </li>
            )}
          </ul>

          <ul className="navbar-nav">
            {!isAuthenticated ? (
              <>
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
              </>
            ) : (
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle d-flex align-items-center"
                  href="#"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  👋
                  <span className="ms-1">{user?.full_name || user?.email}</span>
                </a>
                <ul className="dropdown-menu dropdown-menu-end">
                  <li>
                    <Link className="dropdown-item" to="/dashboard">
                      <i className="bi bi-speedometer2 me-2"></i>
                      My Dashboard
                    </Link>
                  </li>
                  {!isAdmin && (
                    <li>
                      <Link className="dropdown-item" to="/payment">
                        <i className="bi bi-credit-card me-2"></i>
                        Payment
                      </Link>
                    </li>
                  )}
                  <li>
                    <hr className="dropdown-divider" />
                  </li>
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
