import React, { useState, useEffect } from 'react';
import DashboardLayout from '../DashboardLayout';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface PaidService {
  id: number;
  patient_id: number;
  patient_name: string;
  hospital_number: string;
  service_name: string;
  service_category: string;
  price: number;
  prescribed_by: string;
  paid_at: string;
  status: 'paid' | 'in_progress' | 'completed';
  diagnosis: string;
}

const LabDashboard: React.FC = () => {
  const [services, setServices] = useState<PaidService[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<{ [key: number]: boolean }>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchPaidServices();
  }, []);

  const fetchPaidServices = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/lab/paid-services`);
      setServices(response.data);
    } catch (err) {
      console.error('Failed to fetch paid lab services:', err);
      setError('Failed to load paid services');
    } finally {
      setLoading(false);
    }
  };

  const handleStartService = async (serviceId: number) => {
    setProcessing(prev => ({ ...prev, [serviceId]: true }));
    setError('');

    try {
      await axios.put(`${API_BASE_URL}/lab/start-service/${serviceId}`);
      setSuccess('Service started successfully');
      fetchPaidServices();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start service');
    } finally {
      setProcessing(prev => ({ ...prev, [serviceId]: false }));
    }
  };

  const handleCompleteService = async (serviceId: number) => {
    setProcessing(prev => ({ ...prev, [serviceId]: true }));
    setError('');

    try {
      await axios.put(`${API_BASE_URL}/lab/complete-service/${serviceId}`);
      setSuccess('Lab test completed and removed from queue');
      fetchPaidServices();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to complete service');
    } finally {
      setProcessing(prev => ({ ...prev, [serviceId]: false }));
    }
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="badge bg-warning">Awaiting Processing</span>;
      case 'in_progress':
        return <span className="badge bg-info">In Progress</span>;
      case 'completed':
        return <span className="badge bg-success">Completed</span>;
      default:
        return <span className="badge bg-secondary">{status}</span>;
    }
  };

  const getActionButton = (service: PaidService) => {
    if (service.status === 'paid') {
      return (
        <>
          <button
            className="btn btn-sm btn-primary me-2"
            onClick={() => handleStartService(service.id)}
            disabled={processing[service.id]}
          >
            {processing[service.id] ? 'Starting...' : 'Start Test'}
          </button>
          <button
            className="btn btn-sm btn-success"
            onClick={() => handleCompleteService(service.id)}
            disabled={processing[service.id]}
          >
            {processing[service.id] ? 'Completing...' : 'Mark Complete'}
          </button>
        </>
      );
    } else if (service.status === 'in_progress') {
      return (
        <button
          className="btn btn-sm btn-success"
          onClick={() => handleCompleteService(service.id)}
          disabled={processing[service.id]}
        >
          {processing[service.id] ? 'Completing...' : 'Mark Complete'}
        </button>
      );
    } else {
      return (
        <span className="text-success">
          <i className="bi bi-check-circle me-1"></i>
          Completed
        </span>
      );
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Laboratory Dashboard">
        <div className="text-center p-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading lab services...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Laboratory Dashboard">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5>Laboratory Services Queue</h5>
              <button 
                className="btn btn-outline-primary btn-sm"
                onClick={fetchPaidServices}
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

              {success && (
                <div className="alert alert-success" role="alert">
                  {success}
                </div>
              )}

              {services.length === 0 ? (
                <div className="text-center py-4">
                  <i className="bi bi-clipboard-pulse text-muted" style={{ fontSize: '3rem' }}></i>
                  <p className="text-muted mt-2">No lab services in queue</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Hospital No.</th>
                        <th>Patient Name</th>
                        <th>Test/Service</th>
                        <th>Amount</th>
                        <th>Prescribed By</th>
                        <th>Paid At</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.map((service) => (
                        <tr key={service.id}>
                          <td><strong>{service.hospital_number}</strong></td>
                          <td>
                            {service.patient_name}
                            {service.diagnosis && (
                              <>
                                <br />
                                <small className="text-muted">Diagnosis: {service.diagnosis}</small>
                              </>
                            )}
                          </td>
                          <td>{service.service_name}</td>
                          <td>{formatCurrency(service.price)}</td>
                          <td>Dr. {service.prescribed_by}</td>
                          <td>{formatDate(service.paid_at)}</td>
                          <td>{getStatusBadge(service.status)}</td>
                          <td>{getActionButton(service)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LabDashboard;