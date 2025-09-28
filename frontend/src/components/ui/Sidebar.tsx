import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userName?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, userName }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const navItems: NavItem[] = [
    { id: 'overview', label: 'Dashboard', icon: 'bi-speedometer2' },
    { id: 'consultations', label: 'Consultations', icon: 'bi-people' },
    { id: 'prescriptions', label: 'Prescriptions', icon: 'bi-prescription2' },
    { id: 'reports', label: 'Reports', icon: 'bi-graph-up' },
    { id: 'settings', label: 'Settings', icon: 'bi-gear' }
  ];

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="d-flex flex-column flex-shrink-0 p-3 bg-white border-end" style={{ width: '280px', minHeight: '100vh' }}>
      {/* Header */}
      <div className="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-decoration-none">
        <div className="bg-primary text-white rounded-3 p-2 me-3">
          <i className="bi bi-hospital" style={{ fontSize: '1.5rem' }}></i>
        </div>
        <div>
          <h5 className="mb-0 text-primary fw-bold">Hospital POS</h5>
          <small className="text-muted">Doctor Portal</small>
        </div>
      </div>
      
      <hr className="my-3" />
      
      {/* User Greeting */}
      {userName && (
        <div className="bg-light rounded-3 p-3 mb-3">
          <div className="d-flex align-items-center">
            <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" 
                 style={{ width: '40px', height: '40px' }}>
              <i className="bi bi-person-circle" style={{ fontSize: '1.5rem' }}></i>
            </div>
            <div>
              <div className="fw-semibold">Welcome, Dr. {userName}</div>
              <small className="text-muted">Have a great day!</small>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <ul className="nav nav-pills flex-column mb-auto">
        {navItems.map((item) => (
          <li className="nav-item mb-1" key={item.id}>
            <button
              className={`nav-link w-100 text-start d-flex align-items-center ${
                activeTab === item.id ? 'active' : 'text-dark'
              }`}
              onClick={() => onTabChange(item.id)}
              style={{
                border: 'none',
                borderRadius: '8px',
                padding: '12px 16px',
                transition: 'all 0.2s ease'
              }}
            >
              <i className={`${item.icon} me-3`} style={{ fontSize: '1.1rem' }}></i>
              <span className="fw-medium">{item.label}</span>
              {item.badge && (
                <span className="badge bg-danger ms-auto">{item.badge}</span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {/* Footer */}
      <hr />
      
      {/* Logout Button */}
      <div className="mb-3">
        <button
          className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center"
          onClick={handleLogout}
          style={{
            borderRadius: '8px',
            padding: '12px 16px',
            transition: 'all 0.2s ease'
          }}
        >
          <i className="bi bi-box-arrow-right me-2" style={{ fontSize: '1.1rem' }}></i>
          <span className="fw-medium">Logout</span>
        </button>
      </div>
      
      <div className="text-center">
        <small className="text-muted">
          <i className="bi bi-shield-check me-1"></i>
          Secure Session
        </small>
      </div>
    </div>
  );
};

export default Sidebar;