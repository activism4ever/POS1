import React, { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, title }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-vh-100 bg-light">
      {/* Navigation */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container-fluid">
          <span className="navbar-brand">
            Hospital POS - {title}
          </span>
          
          <div className="navbar-nav ms-auto">
            <div className="nav-item dropdown">
              <a 
                className="nav-link dropdown-toggle text-white" 
                href="#" 
                role="button" 
                data-bs-toggle="dropdown"
                aria-expanded="false"
                // eslint-disable-next-line jsx-a11y/anchor-is-valid
              >
                {user?.name} ({user?.role})
              </a>
              <ul className="dropdown-menu">
                <li>
                  <button 
                    className="dropdown-item" 
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container-fluid p-4">
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;