import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface User {
  id: number;
  name: string;
  username: string;
  role: string;
  created_at: string;
}

const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resetPassword, setResetPassword] = useState<{userId: number, newPassword: string} | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/users`);
      setUsers(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleResetPassword = async (userId: number) => {
    const newPassword = prompt('Enter new password (minimum 6 characters):');
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    setResetLoading(true);
    try {
      await axios.put(`${API_BASE_URL}/users/${userId}/reset-password`, {
        password: newPassword
      });
      alert('Password reset successfully!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!window.confirm(`Are you sure you want to delete user: ${username}?`)) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/users/${userId}`);
      alert('User deleted successfully!');
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-danger';
      case 'doctor': return 'bg-primary';
      case 'cashier': return 'bg-success';
      case 'lab': return 'bg-info';
      case 'pharmacy': return 'bg-warning';
      default: return 'bg-secondary';
    }
  };

  if (loading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5>System Users</h5>
        <button 
          className="btn btn-outline-primary btn-sm"
          onClick={fetchUsers}
        >
          Refresh
        </button>
      </div>
      <div className="card-body">
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {users.length === 0 ? (
          <p className="text-muted text-center">No users found.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.username}</td>
                    <td>
                      <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                        {user.role.toUpperCase()}
                      </span>
                    </td>
                    <td>{formatDate(user.created_at)}</td>
                    <td>
                      {user.role !== 'admin' && (
                        <>
                          <button
                            className="btn btn-sm btn-outline-warning me-2"
                            onClick={() => handleResetPassword(user.id)}
                            disabled={resetLoading}
                          >
                            Reset Password
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeleteUser(user.id, user.username)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserList;