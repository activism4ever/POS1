import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DoctorConsultations from '../DoctorConsultations';
import StatCard from '../ui/StatCard';
import Sidebar from '../ui/Sidebar';
import SearchBar from '../ui/SearchBar';
import NotificationPanel from '../ui/NotificationPanel';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface DashboardStats {
  waitingPatients: number;
  todaysPrescriptions: number;
  pendingConsultations: number;
  completedToday: number;
}

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<DashboardStats>({
    waitingPatients: 0,
    todaysPrescriptions: 0,
    pendingConsultations: 0,
    completedToday: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [notifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'info',
      title: 'New Patient Registered',
      message: 'John Doe has been registered for consultation',
      time: '5 minutes ago',
      read: false
    },
    {
      id: '2',
      type: 'warning',
      title: 'Prescription Pending',
      message: 'Patient #HP000123 waiting for prescription review',
      time: '15 minutes ago',
      read: false
    }
  ]);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoadingStats(true);
      const [consultationsRes, transactionsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/transactions?status=paid&department=doctor`),
        axios.get(`${API_BASE_URL}/transactions`)
      ]);

      const consultations = consultationsRes.data;
      const allTransactions = transactionsRes.data;
      
      // Calculate today's stats
      const today = new Date().toDateString();
      const todayTransactions = allTransactions.filter((t: any) => 
        new Date(t.created_at).toDateString() === today
      );

      setStats({
        waitingPatients: consultations.length,
        todaysPrescriptions: todayTransactions.filter((t: any) => t.status === 'prescribed').length,
        pendingConsultations: consultations.filter((c: any) => c.status === 'paid').length,
        completedToday: todayTransactions.filter((t: any) => t.status === 'completed').length
      });
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSearch = (query: string) => {
    // TODO: Implement search functionality
    console.log('Searching for:', query);
  };

  const handleMarkAsRead = (id: string) => {
    // TODO: Implement mark as read functionality
    console.log('Marking notification as read:', id);
  };

  const handleClearAllNotifications = () => {
    // TODO: Implement clear all notifications
    console.log('Clearing all notifications');
  };

  const renderOverview = () => (
    <div>
      {/* Welcome Section */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="bg-gradient-primary text-white rounded-4 p-4" 
               style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <div className="row align-items-center">
              <div className="col-md-8">
                <h2 className="mb-2">Welcome back, Dr. {user?.name || 'Doctor'}! 👋</h2>
                <p className="mb-0 opacity-75">
                  You have {stats.waitingPatients} patients waiting for consultation today.
                  Keep up the excellent work!
                </p>
              </div>
              <div className="col-md-4 text-end">
                <div className="text-white-50">
                  <i className="bi bi-calendar-check" style={{ fontSize: '3rem' }}></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row g-4 mb-4">
        <div className="col-md-3">
          <StatCard
            title="Patients Waiting"
            value={stats.waitingPatients}
            icon="bi-people"
            color="primary"
            subtitle="For consultation"
            onClick={() => setActiveTab('consultations')}
            loading={loadingStats}
          />
        </div>
        <div className="col-md-3">
          <StatCard
            title="Today's Prescriptions"
            value={stats.todaysPrescriptions}
            icon="bi-prescription2"
            color="success"
            subtitle="Prescribed today"
            onClick={() => setActiveTab('prescriptions')}
            loading={loadingStats}
          />
        </div>
        <div className="col-md-3">
          <StatCard
            title="Pending Consultations"
            value={stats.pendingConsultations}
            icon="bi-clock"
            color="warning"
            subtitle="Awaiting attention"
            onClick={() => setActiveTab('consultations')}
            loading={loadingStats}
          />
        </div>
        <div className="col-md-3">
          <StatCard
            title="Completed Today"
            value={stats.completedToday}
            icon="bi-check-circle"
            color="info"
            subtitle="Successfully treated"
            loading={loadingStats}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="row g-4">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex align-items-center mb-3">
                <div className="bg-primary text-white rounded-3 p-2 me-3">
                  <i className="bi bi-people" style={{ fontSize: '1.5rem' }}></i>
                </div>
                <div>
                  <h5 className="mb-0">Start Consultations</h5>
                  <small className="text-muted">View and attend to paid consultations</small>
                </div>
              </div>
              <p className="text-muted mb-3">
                Review patient information, record diagnoses, and prescribe treatments for patients who have completed payment.
              </p>
              <button 
                className="btn btn-primary"
                onClick={() => setActiveTab('consultations')}
              >
                <i className="bi bi-play-circle me-2"></i>
                Begin Consultations
              </button>
            </div>
          </div>
        </div>
        
        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex align-items-center mb-3">
                <div className="bg-success text-white rounded-3 p-2 me-3">
                  <i className="bi bi-prescription2" style={{ fontSize: '1.5rem' }}></i>
                </div>
                <div>
                  <h5 className="mb-0">Prescription Management</h5>
                  <small className="text-muted">Prescribe lab tests and medications</small>
                </div>
              </div>
              <p className="text-muted mb-3">
                Access prescription tools to order lab tests, medications, and other medical services for your patients.
              </p>
              <button 
                className="btn btn-success"
                onClick={() => setActiveTab('consultations')}
              >
                <i className="bi bi-plus-circle me-2"></i>
                Prescribe Services
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderComingSoon = (feature: string) => (
    <div className="text-center py-5">
      <div className="mb-4">
        <i className="bi bi-tools text-muted" style={{ fontSize: '4rem' }}></i>
      </div>
      <h4 className="text-muted">{feature} Coming Soon</h4>
      <p className="text-muted">
        This feature is under development and will be available in future updates.
      </p>
      <button 
        className="btn btn-outline-primary"
        onClick={() => setActiveTab('overview')}
      >
        <i className="bi bi-arrow-left me-2"></i>
        Back to Dashboard
      </button>
    </div>
  );

  return (
    <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        userName={user?.name}
      />
      
      {/* Main Content */}
      <div className="flex-grow-1">
        {/* Top Header */}
        <div className="bg-white border-bottom px-4 py-3">
          <div className="row align-items-center">
            <div className="col-md-6">
              <h4 className="mb-0">
                {activeTab === 'overview' && 'Dashboard Overview'}
                {activeTab === 'consultations' && 'Patient Consultations'}
                {activeTab === 'prescriptions' && 'Prescription Management'}
                {activeTab === 'reports' && 'Medical Reports'}
                {activeTab === 'settings' && 'Settings & Preferences'}
              </h4>
            </div>
            <div className="col-md-6">
              <div className="d-flex align-items-center justify-content-end gap-3">
                <SearchBar 
                  onSearch={handleSearch}
                  disabled={activeTab !== 'consultations'}
                />
                <NotificationPanel 
                  notifications={notifications}
                  onMarkAsRead={handleMarkAsRead}
                  onClearAll={handleClearAllNotifications}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'consultations' && <DoctorConsultations />}
          {activeTab === 'prescriptions' && renderComingSoon('Prescription Management')}
          {activeTab === 'reports' && renderComingSoon('Medical Reports')}
          {activeTab === 'settings' && renderComingSoon('Settings & Preferences')}
        </div>
      </div>

      {/* Custom CSS for hover effects */}
      <style>{`
        .stat-card-clickable:hover {
          transform: translateY(-2px);
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
        }
        .bg-gradient-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        }
      `}</style>
    </div>
  );
};

export default DoctorDashboard;