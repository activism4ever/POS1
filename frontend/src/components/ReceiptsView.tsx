import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Receipt from './Receipt';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface Transaction {
  id: number;
  patient_id: number;
  service_id: number;
  amount: number;
  payment_date: string;
  patient_name?: string;
  service_name?: string;
}

const ReceiptsView: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/transactions`);
      setTransactions(response.data);
    } catch (err) {
      setError('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const generateReceiptNumber = (transactionId: number, date: string) => {
    const paymentDate = new Date(date);
    const year = paymentDate.getFullYear().toString().slice(-2);
    const month = (paymentDate.getMonth() + 1).toString().padStart(2, '0');
    const day = paymentDate.getDate().toString().padStart(2, '0');
    return `RCP${year}${month}${day}${transactionId.toString().padStart(3, '0')}`;
  };

  const handleViewReceipt = (transaction: Transaction) => {
    const receiptData = {
      receiptNumber: generateReceiptNumber(transaction.id, transaction.payment_date),
      patientName: transaction.patient_name || 'Unknown Patient',
      hospitalNumber: `HP${transaction.patient_id.toString().padStart(6, '0')}`,
      serviceName: transaction.service_name || 'Service',
      amount: transaction.amount,
      paymentDate: new Date(transaction.payment_date),
      cashierName: 'Cashier'
    };
    
    setSelectedReceipt(receiptData);
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString('en-NG')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-body text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading receipts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Payment Receipts</h5>
        <button 
          className="btn btn-outline-primary btn-sm"
          onClick={fetchTransactions}
        >
          <i className="bi bi-arrow-clockwise me-1"></i>
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
          <div className="text-center py-4">
            <i className="bi bi-receipt text-muted" style={{ fontSize: '3rem' }}></i>
            <p className="text-muted mt-2">No receipts found</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Patient</th>
                  <th>Service</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>
                      <code>{generateReceiptNumber(transaction.id, transaction.payment_date)}</code>
                    </td>
                    <td>{transaction.patient_name || 'Unknown'}</td>
                    <td>{transaction.service_name || 'Service'}</td>
                    <td className="fw-bold">{formatCurrency(transaction.amount)}</td>
                    <td>{formatDate(transaction.payment_date)}</td>
                    <td>
                      <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => handleViewReceipt(transaction)}
                      >
                        <i className="bi bi-printer me-1"></i>
                        View Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedReceipt && (
        <Receipt
          receiptData={selectedReceipt}
          onPrint={() => setSelectedReceipt(null)}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
};

export default ReceiptsView;