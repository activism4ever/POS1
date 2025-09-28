import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface Transaction {
  id: number;
  patient_id: number;
  hospital_number: string;
  patient_name: string;
  service_name: string;
  amount: number;
  status: string;
  created_at: string;
}

const LabDashboardContent: React.FC = () => {
  const [pendingTests, setPendingTests] = useState<Transaction[]>([]);
  const [completedTests, setCompletedTests] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    fetchLabTests();
  }, []);

  const fetchLabTests = async () => {
    try {
      setLoading(true);
      const [pendingResponse, completedResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/transactions?status=paid&department=lab`),
        axios.get(`${API_BASE_URL}/transactions?status=completed&department=lab`)
      ]);
      
      setPendingTests(pendingResponse.data);
      setCompletedTests(completedResponse.data);
    } catch (err) {
      console.error('Failed to fetch lab tests');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTest = async (transactionId: number) => {
    setProcessingId(transactionId);
    
    try {
      await axios.put(`${API_BASE_URL}/transactions/${transactionId}/status`, {
        status: 'completed'
      });
      
      alert('Test marked as completed!');
      fetchLabTests();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to complete test');
    } finally {
      setProcessingId(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const renderTestTable = (tests: Transaction[], showCompleteButton: boolean = false) => (
    <div className="table-responsive">
      <table className="table table-striped">
        <thead>
          <tr>
            <th>Hospital No.</th>
            <th>Patient Name</th>
            <th>Test</th>
            <th>Amount</th>
            <th>Date</th>
            {showCompleteButton && <th>Action</th>}
          </tr>
        </thead>
        <tbody>
          {tests.map((test) => (
            <tr key={test.id}>
              <td><strong>{test.hospital_number}</strong></td>
              <td>{test.patient_name}</td>
              <td>{test.service_name}</td>
              <td>{formatPrice(test.amount)}</td>
              <td>{formatDate(test.created_at)}</td>
              {showCompleteButton && (
                <td>
                  <button
                    className="btn btn-sm btn-success"
                    onClick={() => handleCompleteTest(test.id)}
                    disabled={processingId === test.id}
                  >
                    {processingId === test.id ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                        Completing...
                      </>
                    ) : (
                      'Mark Complete'
                    )}
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      {/* Statistics Cards */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card text-white bg-warning">
            <div className="card-body">
              <h5 className="card-title">Pending Tests</h5>
              <h2>{pendingTests.length}</h2>
              <p className="card-text">Tests waiting to be processed</p>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card text-white bg-success">
            <div className="card-body">
              <h5 className="card-title">Completed Today</h5>
              <h2>{completedTests.length}</h2>
              <p className="card-text">Tests completed today</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending Tests ({pendingTests.length})
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Completed Tests ({completedTests.length})
          </button>
        </li>
      </ul>

      {/* Tab Content */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5>{activeTab === 'pending' ? 'Pending Lab Tests' : 'Completed Lab Tests'}</h5>
          <button 
            className="btn btn-outline-primary btn-sm"
            onClick={fetchLabTests}
          >
            Refresh
          </button>
        </div>
        <div className="card-body">
          {activeTab === 'pending' ? (
            pendingTests.length === 0 ? (
              <p className="text-muted text-center">No pending lab tests.</p>
            ) : (
              renderTestTable(pendingTests, true)
            )
          ) : (
            completedTests.length === 0 ? (
              <p className="text-muted text-center">No completed tests today.</p>
            ) : (
              renderTestTable(completedTests, false)
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default LabDashboardContent;