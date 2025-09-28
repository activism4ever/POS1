import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import AdminDashboard from './components/dashboards/AdminDashboard';
import CashierDashboard from './components/dashboards/CashierDashboard';
import DoctorDashboard from './components/dashboards/DoctorDashboard';
import LabDashboard from './components/dashboards/LabDashboard';
import PharmacyDashboard from './components/dashboards/PharmacyDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/cashier" 
              element={
                <ProtectedRoute allowedRoles={['cashier']}>
                  <CashierDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/doctor" 
              element={
                <ProtectedRoute allowedRoles={['doctor']}>
                  <DoctorDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/lab" 
              element={
                <ProtectedRoute allowedRoles={['lab']}>
                  <LabDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/pharmacy" 
              element={
                <ProtectedRoute allowedRoles={['pharmacy']}>
                  <PharmacyDashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
