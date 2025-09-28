import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface Transaction {
  id: number;
  patient_id: number;
  hospital_number: string;
  patient_name: string;
  service_name: string;
  service_category: string;
  amount: number;
  status: string;
  department: string;
  prescribed_by_name: string;
  created_at: string;
}

const PendingTransactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    fetchPendingTransactions();
  }, []);

  const fetchPendingTransactions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/transactions?status=pending`);
      setTransactions(response.data);
    } catch (err: any) {
      setError('Failed to fetch pending transactions');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (transactionId: number) => {
    setProcessingId(transactionId);
    
    try {
      // Update status to paid
      await axios.put(`${API_BASE_URL}/transactions/${transactionId}/status`, {
        status: 'paid'
      });
      
      alert('Payment processed successfully!');
      fetchPendingTransactions();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to process payment');
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

  const getDepartmentBadge = (department: string) => {
    switch (department) {
      case 'lab': return 'bg-info';
      case 'pharmacy': return 'bg-success';
      case 'doctor': return 'bg-primary';
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
        <h5>Pending Payments</h5>
        <button 
          className="btn btn-outline-primary btn-sm"
          onClick={fetchPendingTransactions}
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

        {transactions.length === 0 ? (
          <p className="text-muted text-center">No pending payments.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Hospital No.</th>
                  <th>Patient</th>
                  <th>Service</th>
                  <th>Amount</th>
                  <th>Department</th>
                  <th>Prescribed By</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td><strong>{transaction.hospital_number}</strong></td>
                    <td>{transaction.patient_name}</td>
                    <td>
                      <div>
                        {transaction.service_name}
                        <br />
                        <small className="text-muted">{transaction.service_category}</small>
                      </div>
                    </td>
                    <td><strong>{formatPrice(transaction.amount)}</strong></td>
                    <td>
                      <span className={`badge ${getDepartmentBadge(transaction.department)}`}>
                        {transaction.department.toUpperCase()}
                      </span>
                    </td>
                    <td>{transaction.prescribed_by_name || '-'}</td>
                    <td>{formatDate(transaction.created_at)}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handlePayment(transaction.id)}
                        disabled={processingId === transaction.id}
                      >
                        {processingId === transaction.id ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                            Processing...
                          </>
                        ) : (
                          'Collect Payment'
                        )}
                      </button>
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

export default PendingTransactions;