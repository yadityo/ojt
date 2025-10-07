import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import AdminLayout from "./components/AdminLayout";
import Home from "./pages/Home";
import Programs from "./pages/Programs";
import ProgramDetail from "./pages/ProgramDetail";
import ProgramRegistration from "./pages/ProgramRegistration";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Payment from "./pages/Payment";
import PaymentManagement from "./pages/PaymentManagement";
import SelectionManagement from "./pages/SelectionManagement";
import PlacementManagement from "./pages/PlacementManagement";
import FinancialReports from "./pages/FinancialReports";
import AboutUs from "./pages/AboutUs";
import Contact from "./pages/Contact";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Admin Route Component
const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return isAuthenticated && isAdmin ? (
    <AdminLayout>{children}</AdminLayout>
  ) : isAuthenticated ? (
    <Navigate to="/dashboard" />
  ) : (
    <Navigate to="/login" />
  );
};

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes DENGAN Layout */}
        <Route
          path="/"
          element={
            <Layout>
              <Home />
            </Layout>
          }
        />
        <Route
          path="/programs"
          element={
            <Layout>
              <Programs />
            </Layout>
          }
        />
        <Route
          path="/program/:id"
          element={
            <Layout>
              <ProgramDetail />
            </Layout>
          }
        />
        <Route
          path="/login"
          element={
            <Layout>
              <Login />
            </Layout>
          }
        />
        <Route
          path="/register"
          element={
            <Layout>
              <Register />
            </Layout>
          }
        />
        <Route
          path="/about-us"
          element={
            <Layout>
              <AboutUs />
            </Layout>
          }
        />
        <Route
          path="/contact"
          element={
            <Layout>
              <Contact />
            </Layout>
          }
        />

        {/* Protected User Routes DENGAN Layout */}
        <Route
          // path="/program-registration"
          path="/registration"
          element={
            <ProtectedRoute>
              <Layout>
                <ProgramRegistration />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <UserDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment"
          element={
            <ProtectedRoute>
              <Layout>
                <Payment />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Admin Routes TANPA Layout (karena sudah ada AdminLayout) */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/payments"
          element={
            <AdminRoute>
              <PaymentManagement />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/selection"
          element={
            <AdminRoute>
              <SelectionManagement />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/placement"
          element={
            <AdminRoute>
              <PlacementManagement />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/financial-reports"
          element={
            <AdminRoute>
              <FinancialReports />
            </AdminRoute>
          }
        />

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
