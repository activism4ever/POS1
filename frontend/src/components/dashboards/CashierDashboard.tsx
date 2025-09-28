import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PatientRegistrationWithPayment from '../PatientRegistrationWithPayment';
import PaymentQueue from '../PaymentQueue';
import ReceiptsView from '../ReceiptsView';
import PrescribedServicesPayment from '../PrescribedServicesPayment';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const CashierDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('register');
  const [refreshPatients, setRefreshPatients] = useState(0);
  const [refreshPayments, setRefreshPayments] = useState(0);
  
  // Dashboard stats
  const [stats, setStats] = useState({
    totalPatients: 0,
    pendingRegistration: 0,
    totalPayments: 0,
    totalRevenue: 0,
    pendingPrescriptions: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, [refreshPatients, refreshPayments]);

  const fetchDashboardStats = async () => {
    try {
      setLoadingStats(true);
      const [patientsRes, transactionsRes, revenueRes, prescriptionsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/patients`),
        axios.get(`${API_BASE_URL}/transactions`),
        axios.get(`${API_BASE_URL}/reports/revenue`),
        axios.get(`${API_BASE_URL}/prescriptions/pending-payment`)
      ]);

      const patients = patientsRes.data;
      const transactions = transactionsRes.data;
      const revenue = revenueRes.data;
      const prescriptions = prescriptionsRes.data;

      setStats({
        totalPatients: patients.length,
        pendingRegistration: 0, // This would need to be calculated based on business logic
        totalPayments: transactions.length,
        totalRevenue: revenue.summary?.total_revenue || 0,
        pendingPrescriptions: prescriptions.length
      });
    } catch (err) {
      console.error('Failed to fetch dashboard stats');
    } finally {
      setLoadingStats(false);
    }
  };

  const handlePatientRegistered = () => {
    setRefreshPatients(prev => prev + 1);
    setRefreshPayments(prev => prev + 1);
    // Stay on register tab to allow multiple registrations
  };

  const handlePaymentProcessed = () => {
    setRefreshPayments(prev => prev + 1);
    // Stay on payment tab or go to receipts if needed
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
      navigate('/login', { replace: true });
    }
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString('en-NG')}`;
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 py-3 border-bottom">
        <div className="d-flex align-items-center">
          <div className="bg-primary text-white rounded-3 p-2 me-3">
            <i className="bi bi-hospital" style={{fontSize: '1.5rem'}}></i>
          </div>
          <div>
            <h4 className="mb-0 text-primary fw-bold">Hospital POS</h4>
            <small className="text-muted">Cashier Dashboard</small>
          </div>
        </div>
        <div className="d-flex align-items-center">
          <div className="bg-light rounded-pill px-3 py-2 d-flex align-items-center">
            <div className="bg-secondary rounded-circle me-2" style={{width: '32px', height: '32px'}}></div>
            <div>
              <div className="fw-semibold">{user?.name || 'Cashier'}</div>
              <small className="text-muted text-capitalize">{user?.role || 'Cashier'}</small>
            </div>
          </div>
          <button 
            className="btn btn-outline-secondary ms-3"
            onClick={handleLogout}
          >
            <i className="bi bi-box-arrow-right me-1"></i> Logout
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body d-flex align-items-center">
              <div className="flex-grow-1">
                <h6 className="text-muted mb-1">Total Patients</h6>
                <h3 className="mb-0 fw-bold">{loadingStats ? '-' : stats.totalPatients}</h3>
              </div>
              <div className="text-muted">
                <i className="bi bi-people" style={{fontSize: '2rem'}}></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body d-flex align-items-center">
              <div className="flex-grow-1">
                <h6 className="text-muted mb-1">Pending Registration</h6>
                <h3 className="mb-0 fw-bold">{loadingStats ? '-' : stats.pendingRegistration}</h3>
              </div>
              <div className="text-muted">
                <i className="bi bi-person-plus" style={{fontSize: '2rem'}}></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body d-flex align-items-center">
              <div className="flex-grow-1">
                <h6 className="text-muted mb-1">Pending Prescriptions</h6>
                <h3 className="mb-0 fw-bold text-warning">{loadingStats ? '-' : stats.pendingPrescriptions}</h3>
              </div>
              <div className="text-warning">
                <i className="bi bi-prescription" style={{fontSize: '2rem'}}></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body d-flex align-items-center">
              <div className="flex-grow-1">
                <h6 className="text-muted mb-1">Total Payments</h6>
                <h3 className="mb-0 fw-bold">{loadingStats ? '-' : stats.totalPayments}</h3>
              </div>
              <div className="text-muted">
                <i className="bi bi-receipt" style={{fontSize: '2rem'}}></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body d-flex align-items-center">
              <div className="flex-grow-1">
                <h6 className="text-muted mb-1">Total Revenue</h6>
                <h3 className="mb-0 fw-bold text-success">{loadingStats ? '-' : formatCurrency(stats.totalRevenue)}</h3>
              </div>
              <div className="text-success">
                <i className="bi bi-currency-dollar" style={{fontSize: '2rem'}}></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex gap-2">
            <button 
              className={`btn px-4 py-2 rounded-pill ${
                activeTab === 'register' 
                  ? 'btn-primary' 
                  : 'btn-outline-secondary'
              }`}
              onClick={() => setActiveTab('register')}
            >
              Register & Pay
            </button>
            <button 
              className={`btn px-4 py-2 rounded-pill ${
                activeTab === 'payment' 
                  ? 'btn-primary' 
                  : 'btn-outline-secondary'
              }`}
              onClick={() => setActiveTab('payment')}
            >
              Payment Queue
            </button>
            <button 
              className={`btn px-4 py-2 rounded-pill position-relative ${
                activeTab === 'prescriptions' 
                  ? 'btn-warning' 
                  : 'btn-outline-warning'
              }`}
              onClick={() => setActiveTab('prescriptions')}
            >
              Prescribed Services
              {stats.pendingPrescriptions > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                  {stats.pendingPrescriptions}
                </span>
              )}
            </button>
            <button 
              className={`btn px-4 py-2 rounded-pill ${
                activeTab === 'receipts' 
                  ? 'btn-primary' 
                  : 'btn-outline-secondary'
              }`}
              onClick={() => setActiveTab('receipts')}
            >
              View Receipts
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="row">
        <div className="col-12">
          {activeTab === 'register' && (
            <PatientRegistrationWithPayment 
              onPatientRegisteredAndPaid={handlePatientRegistered}
            />
          )}

          {activeTab === 'payment' && (
            <PaymentQueue onPaymentProcessed={handlePaymentProcessed} />
          )}

          {activeTab === 'prescriptions' && (
            <PrescribedServicesPayment />
          )}

          {activeTab === 'receipts' && (
            <ReceiptsView key={refreshPayments} />
          )}
        </div>
      </div>
    </div>
  );
};

export default CashierDashboard;