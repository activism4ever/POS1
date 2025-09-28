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

const PharmacyDashboardContent: React.FC = () => {
  const [pendingPrescriptions, setPendingPrescriptions] = useState<Transaction[]>([]);
  const [dispensedPrescriptions, setDispensedPrescriptions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const [pendingResponse, dispensedResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/transactions?status=paid&department=pharmacy`),
        axios.get(`${API_BASE_URL}/transactions?status=completed&department=pharmacy`)
      ]);
      
      setPendingPrescriptions(pendingResponse.data);
      setDispensedPrescriptions(dispensedResponse.data);
    } catch (err) {
      console.error('Failed to fetch prescriptions');
    } finally {
      setLoading(false);
    }
  };

  const handleDispenseMedication = async (transactionId: number) => {
    setProcessingId(transactionId);
    
    try {
      await axios.put(`${API_BASE_URL}/transactions/${transactionId}/status`, {
        status: 'completed'
      });
      
      alert('Medication dispensed successfully!');
      fetchPrescriptions();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to dispense medication');
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

  const renderPrescriptionTable = (prescriptions: Transaction[], showDispenseButton: boolean = false) => (
    <div className="table-responsive">
      <table className="table table-striped">
        <thead>
          <tr>
            <th>Hospital No.</th>
            <th>Patient Name</th>
            <th>Medication</th>
            <th>Amount</th>
            <th>Date</th>
            {showDispenseButton && <th>Action</th>}
          </tr>
        </thead>
        <tbody>
          {prescriptions.map((prescription) => (
            <tr key={prescription.id}>
              <td><strong>{prescription.hospital_number}</strong></td>
              <td>{prescription.patient_name}</td>
              <td>{prescription.service_name}</td>
              <td>{formatPrice(prescription.amount)}</td>
              <td>{formatDate(prescription.created_at)}</td>
              {showDispenseButton && (
                <td>
                  <button
                    className="btn btn-sm btn-success"
                    onClick={() => handleDispenseMedication(prescription.id)}
                    disabled={processingId === prescription.id}
                  >
                    {processingId === prescription.id ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                        Dispensing...
                      </>
                    ) : (
                      'Dispense'
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
              <h5 className="card-title">Pending Prescriptions</h5>
              <h2>{pendingPrescriptions.length}</h2>
              <p className="card-text">Prescriptions waiting to be dispensed</p>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card text-white bg-success">
            <div className="card-body">
              <h5 className="card-title">Dispensed Today</h5>
              <h2>{dispensedPrescriptions.length}</h2>
              <p className="card-text">Medications dispensed today</p>
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
            Pending Prescriptions ({pendingPrescriptions.length})
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'dispensed' ? 'active' : ''}`}
            onClick={() => setActiveTab('dispensed')}
          >
            Dispensed Medications ({dispensedPrescriptions.length})
          </button>
        </li>
      </ul>

      {/* Tab Content */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5>{activeTab === 'pending' ? 'Pending Prescriptions' : 'Dispensed Medications'}</h5>
          <button 
            className="btn btn-outline-primary btn-sm"
            onClick={fetchPrescriptions}
          >
            Refresh
          </button>
        </div>
        <div className="card-body">
          {activeTab === 'pending' ? (
            pendingPrescriptions.length === 0 ? (
              <p className="text-muted text-center">No pending prescriptions.</p>
            ) : (
              renderPrescriptionTable(pendingPrescriptions, true)
            )
          ) : (
            dispensedPrescriptions.length === 0 ? (
              <p className="text-muted text-center">No medications dispensed today.</p>
            ) : (
              renderPrescriptionTable(dispensedPrescriptions, false)
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default PharmacyDashboardContent;