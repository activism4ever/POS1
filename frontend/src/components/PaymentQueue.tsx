import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import Receipt from './Receipt';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface PatientPaymentQueue {
  patient_id: number;
  hospital_number: string;
  patient_name: string;
  age: number;
  gender: string;
  contact: string;
  services: string;
  service_categories: string;
  service_ids: number[];
  total_amount: number;
  service_count: number;
  earliest_pending: string;
  latest_pending: string;
  status: 'pending' | 'paid';
}

interface Service {
  id: number;
  name: string;
  category: string;
  price: number;
}

interface PaymentQueueProps {
  onPaymentProcessed: () => void;
}

const PaymentQueue: React.FC<PaymentQueueProps> = ({ onPaymentProcessed }) => {
  const { user } = useAuth();
  const [paymentQueue, setPaymentQueue] = useState<PatientPaymentQueue[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [processingPatient, setProcessingPatient] = useState<number | null>(null);
  
  // Modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientPaymentQueue | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  
  // Receipt state
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchPaymentQueue();
    fetchServices();
  }, [searchTerm, serviceFilter]);

  const fetchPaymentQueue = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (serviceFilter) params.append('service_type', serviceFilter);
      
      const response = await axios.get(`${API_BASE_URL}/transactions/payment-queue?${params}`);
      setPaymentQueue(response.data);
    } catch (err: any) {
      setError('Failed to fetch payment queue');
      console.error('Payment queue error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/services`);
      setServices(response.data);
    } catch (err) {
      console.error('Failed to fetch services');
    }
  };

  const handleCollectFee = (patient: PatientPaymentQueue) => {
    setSelectedPatient(patient);
    setPaymentAmount(patient.total_amount);
    setShowPaymentModal(true);
  };

  const handleProcessPayment = async () => {
    if (!selectedPatient) return;

    setProcessingPatient(selectedPatient.patient_id);

    try {
      // Process payment for all pending services of this patient
      const response = await axios.post(`${API_BASE_URL}/prescriptions/process-payment`, {
        patient_id: selectedPatient.patient_id,
        service_ids: selectedPatient.service_ids,
        total_amount: paymentAmount,
        cashier_id: user?.id
      });

      // Generate receipt
      const receiptInfo = {
        receiptNumber: generateReceiptNumber(),
        patientName: selectedPatient.patient_name,
        hospitalNumber: selectedPatient.hospital_number,
        services: selectedPatient.services,
        amount: paymentAmount,
        paymentDate: new Date(),
        cashierName: user?.name || 'Cashier',
        serviceCount: selectedPatient.service_count
      };

      setReceiptData(receiptInfo);
      setShowReceipt(true);
      setShowPaymentModal(false);
      
      // Refresh the queue
      await fetchPaymentQueue();
      onPaymentProcessed();
      
    } catch (err: any) {
      setError(err.response?.data?.error || 'Payment processing failed');
      console.error('Payment error:', err);
    } finally {
      setProcessingPatient(null);
    }
  };

  const generateReceiptNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6);
    return `RCP${year}${month}${day}${timestamp}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  const getServiceCategories = () => {
    const categories = Array.from(new Set(services.map(s => s.category)));
    return categories;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="badge bg-warning text-dark">Pending</span>;
      case 'paid':
        return <span className="badge bg-success">Paid</span>;
      default:
        return <span className="badge bg-secondary">{status}</span>;
    }
  };

  const handleReceiptPrint = () => {
    setShowReceipt(false);
    setReceiptData(null);
    setSelectedPatient(null);
  };

  const handleReceiptClose = () => {
    setShowReceipt(false);
    setReceiptData(null);
    setSelectedPatient(null);
  };

  // Filter and paginate
  const filteredQueue = paymentQueue.filter(patient => {
    const matchesSearch = searchTerm === '' || 
      patient.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.hospital_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = serviceFilter === '' ||
      patient.service_categories.toLowerCase().includes(serviceFilter.toLowerCase());
    
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredQueue.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedQueue = filteredQueue.slice(startIndex, startIndex + itemsPerPage);

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Payment Queue</h5>
            <button 
              className="btn btn-outline-primary btn-sm"
              onClick={fetchPaymentQueue}
              disabled={loading}
            >
              <i className="bi bi-arrow-clockwise me-1"></i>
              Refresh
            </button>
          </div>
        </div>

        <div className="card-body">
          {/* Queue Summary Cards */}
          <div className="row mb-4">
            <div className="col-md-3">
              <div className="card border-0 bg-primary text-white">
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="mb-0">Total Patients</h6>
                      <h4 className="mb-0">{filteredQueue.length}</h4>
                    </div>
                    <i className="bi bi-people" style={{fontSize: '2rem'}}></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 bg-warning text-white">
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="mb-0">Pending Amount</h6>
                      <h5 className="mb-0">{formatCurrency(filteredQueue.reduce((sum, p) => sum + p.total_amount, 0))}</h5>
                    </div>
                    <i className="bi bi-cash-stack" style={{fontSize: '2rem'}}></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 bg-info text-white">
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="mb-0">Total Services</h6>
                      <h4 className="mb-0">{filteredQueue.reduce((sum, p) => sum + p.service_count, 0)}</h4>
                    </div>
                    <i className="bi bi-list-check" style={{fontSize: '2rem'}}></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 bg-success text-white">
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="mb-0">Avg. Amount</h6>
                      <h5 className="mb-0">
                        {filteredQueue.length > 0 
                          ? formatCurrency(filteredQueue.reduce((sum, p) => sum + p.total_amount, 0) / filteredQueue.length)
                          : formatCurrency(0)
                        }
                      </h5>
                    </div>
                    <i className="bi bi-calculator" style={{fontSize: '2rem'}}></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="row mb-3">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by patient name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-4">
              <select
                className="form-select"
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
              >
                <option value="">All Service Types</option>
                {getServiceCategories().map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <div className="text-muted small">
                {filteredQueue.length} patient{filteredQueue.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center p-4">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading payment queue...</p>
            </div>
          ) : filteredQueue.length === 0 ? (
            <div className="text-center p-4">
              <i className="bi bi-inbox text-muted" style={{fontSize: '3rem'}}></i>
              <p className="text-muted mt-2">No pending payments found</p>
            </div>
          ) : (
            <>
              {/* Payment Queue Table */}
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Patient ID</th>
                      <th>Full Name</th>
                      <th>Service(s)</th>
                      <th>Amount (₦)</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedQueue.map((patient) => (
                      <tr key={patient.patient_id}>
                        <td>
                          <strong>{patient.hospital_number}</strong>
                          <br />
                          <small className="text-muted">
                            {patient.service_count} service{patient.service_count !== 1 ? 's' : ''}
                          </small>
                        </td>
                        <td>
                          <div>
                            <strong>{patient.patient_name}</strong>
                            <br />
                            <small className="text-muted">
                              {patient.age}y, {patient.gender}
                            </small>
                          </div>
                        </td>
                        <td>
                          <div className="service-list" style={{maxHeight: '100px', overflowY: 'auto'}}>
                            {patient.services.split(', ').map((service, index) => (
                              <div key={index} className="d-flex align-items-center justify-content-between mb-1 p-1 bg-light rounded">
                                <span className="small">{service}</span>
                                <small className="badge bg-secondary">
                                  {patient.service_categories.split(', ')[index]}
                                </small>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td>
                          <strong className="text-success">
                            {formatCurrency(patient.total_amount)}
                          </strong>
                        </td>
                        <td>
                          {getStatusBadge(patient.status)}
                        </td>
                        <td>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleCollectFee(patient)}
                            disabled={processingPatient === patient.patient_id}
                          >
                            {processingPatient === patient.patient_id ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                Processing...
                              </>
                            ) : (
                              <>
                                <i className="bi bi-cash-coin me-1"></i>
                                Collect Fee
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <span className="text-muted">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredQueue.length)} of {filteredQueue.length} patients
                  </span>
                  <nav>
                    <ul className="pagination pagination-sm mb-0">
                      <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button 
                          className="page-link"
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </button>
                      </li>
                      {[...Array(totalPages)].map((_, index) => (
                        <li key={index + 1} className={`page-item ${currentPage === index + 1 ? 'active' : ''}`}>
                          <button 
                            className="page-link"
                            onClick={() => setCurrentPage(index + 1)}
                          >
                            {index + 1}
                          </button>
                        </li>
                      ))}
                      <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                        <button 
                          className="page-link"
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedPatient && (
        <div className="modal show d-block" tabIndex={-1} style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Process Payment</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowPaymentModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>Patient Information</h6>
                    <table className="table table-sm">
                      <tr>
                        <td><strong>Hospital Number:</strong></td>
                        <td>{selectedPatient.hospital_number}</td>
                      </tr>
                      <tr>
                        <td><strong>Name:</strong></td>
                        <td>{selectedPatient.patient_name}</td>
                      </tr>
                      <tr>
                        <td><strong>Age:</strong></td>
                        <td>{selectedPatient.age} years</td>
                      </tr>
                      <tr>
                        <td><strong>Gender:</strong></td>
                        <td className="text-capitalize">{selectedPatient.gender}</td>
                      </tr>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6>Services to Pay</h6>
                    <div className="border rounded p-3" style={{maxHeight: '200px', overflowY: 'auto'}}>
                      {selectedPatient.services.split(', ').map((service, index) => (
                        <div key={index} className="d-flex justify-content-between align-items-center mb-2">
                          <div>
                            <div>{service}</div>
                            <small className="text-muted">
                              {selectedPatient.service_categories.split(', ')[index]}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="row mt-3">
                  <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                      <h6 className="mb-0">Total Amount:</h6>
                      <h4 className="mb-0 text-success">{formatCurrency(paymentAmount)}</h4>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-success"
                  onClick={handleProcessPayment}
                  disabled={processingPatient === selectedPatient.patient_id}
                >
                  {processingPatient === selectedPatient.patient_id ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle me-2"></i>
                      Confirm Payment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && receiptData && (
        <Receipt 
          receiptData={receiptData}
          onPrint={handleReceiptPrint}
          onClose={handleReceiptClose}
        />
      )}
    </>
  );
};

export default PaymentQueue;