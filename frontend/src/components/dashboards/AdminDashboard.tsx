import React, { useState } from 'react';
import DashboardLayout from '../DashboardLayout';
import CreateUserForm from '../CreateUserForm';
import UserList from '../UserList';
import CreateServiceForm from '../CreateServiceForm';
import ServiceList from '../ServiceList';
import ReportsDashboard from '../ReportsDashboard';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshUsers, setRefreshUsers] = useState(0);
  const [refreshServices, setRefreshServices] = useState(0);

  const handleUserCreated = () => {
    setRefreshUsers(prev => prev + 1);
    setActiveTab('users');
  };

  const handleServiceCreated = () => {
    setRefreshServices(prev => prev + 1);
    setActiveTab('services');
  };

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="row">
        <div className="col-12">
          {/* Navigation Tabs */}
          <ul className="nav nav-tabs mb-4">
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'create-user' ? 'active' : ''}`}
                onClick={() => setActiveTab('create-user')}
              >
                Create User
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => setActiveTab('users')}
              >
                Manage Users
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'services' ? 'active' : ''}`}
                onClick={() => setActiveTab('services')}
              >
                Manage Services
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'create-service' ? 'active' : ''}`}
                onClick={() => setActiveTab('create-service')}
              >
                Add Service
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'reports' ? 'active' : ''}`}
                onClick={() => setActiveTab('reports')}
              >
                Reports
              </button>
            </li>
          </ul>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <>
              <h1>Welcome to Admin Dashboard</h1>
              <p>This is where you can manage users, services, and view reports.</p>
              
              <div className="row mt-4">
                <div className="col-md-3">
                  <div className="card text-white bg-primary">
                    <div className="card-body">
                      <h5 className="card-title">User Management</h5>
                      <p className="card-text">Create and manage hospital staff accounts</p>
                      <button 
                        className="btn btn-light"
                        onClick={() => setActiveTab('users')}
                      >
                        Manage Users
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="col-md-3">
                  <div className="card text-white bg-success">
                    <div className="card-body">
                      <h5 className="card-title">Service Management</h5>
                      <p className="card-text">Add and edit hospital services</p>
                      <button 
                        className="btn btn-light"
                        onClick={() => setActiveTab('services')}
                      >
                        Manage Services
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="col-md-3">
                  <div className="card text-white bg-info">
                    <div className="card-body">
                      <h5 className="card-title">Reports</h5>
                      <p className="card-text">View revenue and activity reports</p>
                      <button 
                        className="btn btn-light"
                        onClick={() => setActiveTab('reports')}
                      >
                        View Reports
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="col-md-3">
                  <div className="card text-white bg-warning">
                    <div className="card-body">
                      <h5 className="card-title">Create User</h5>
                      <p className="card-text">Add new staff members</p>
                      <button 
                        className="btn btn-light"
                        onClick={() => setActiveTab('create-user')}
                      >
                        Create User
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'create-user' && (
            <CreateUserForm onUserCreated={handleUserCreated} />
          )}

          {activeTab === 'users' && (
            <UserList key={refreshUsers} />
          )}

          {activeTab === 'services' && (
            <div className="row">
              <div className="col-md-6">
                <CreateServiceForm onServiceCreated={handleServiceCreated} />
              </div>
              <div className="col-md-6">
                <ServiceList key={refreshServices} />
              </div>
            </div>
          )}

          {activeTab === 'create-service' && (
            <CreateServiceForm onServiceCreated={handleServiceCreated} />
          )}

          {activeTab === 'reports' && (
            <ReportsDashboard />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;