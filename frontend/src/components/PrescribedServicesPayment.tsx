import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import Receipt from './Receipt';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface PrescribedService {
  id: number;
  patient_id: number;
  patient_name: string;
  hospital_number: string;
  service_id: number;
  service_name: string;
  service_category: string;
  price: number;
  quantity?: number;
  prescribed_by: string;
  prescribed_at: string;
  diagnosis?: string;
  status: 'prescribed' | 'paid' | 'completed';
}

interface ProcessedService {
  name: string;
  category: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface GroupedService {
  service_id: number;
  service_name: string;
  service_category: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

interface PaymentError {
  duplicates?: string[];
  already_processed?: string[];
  details?: {
    total_requested: number;
    duplicates_count: number;
    already_processed_count: number;
    pending_count: number;
  };
}

interface PatientPrescription {
  patient_id: number;
  patient_name: string;
  hospital_number: string;
  prescribed_by: string;
  prescribed_at: string;
  diagnosis: string;
  services: PrescribedService[];
  total_amount: number;
}

const PrescribedServicesPayment: React.FC = () => {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<PatientPrescription[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<PatientPrescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [receiptData, setReceiptData] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'pos' | 'transfer'>('cash');
  const [discount, setDiscount] = useState(0);
  const [paymentErrors, setPaymentErrors] = useState<PaymentError | null>(null);

  useEffect(() => {
    fetchPrescribedServices();
    
    // Set up auto-refresh every 60 seconds per memory requirement
    const refreshInterval = setInterval(() => {
      fetchPrescribedServices();
    }, 60000);

    return () => clearInterval(refreshInterval);
  }, []);

  const fetchPrescribedServices = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/prescriptions/pending-payment`);
      
      // Group services by patient
      const groupedPrescriptions = groupServicesByPatient(response.data);
      setPrescriptions(groupedPrescriptions);
    } catch (err) {
      console.error('Failed to fetch prescribed services:', err);
      setError('Failed to load prescribed services');
    } finally {
      setLoading(false);
    }
  };

  const groupServicesByPatient = (services: PrescribedService[]): PatientPrescription[] => {
    const grouped: { [key: number]: PatientPrescription } = {};

    services.forEach(service => {
      if (!grouped[service.patient_id]) {
        grouped[service.patient_id] = {
          patient_id: service.patient_id,
          patient_name: service.patient_name,
          hospital_number: service.hospital_number,
          prescribed_by: service.prescribed_by,
          prescribed_at: service.prescribed_at,
          diagnosis: service.diagnosis || '',
          services: [],
          total_amount: 0
        };
      }

      grouped[service.patient_id].services.push(service);
      grouped[service.patient_id].total_amount += (service.price * (service.quantity || 1));
    });

    return Object.values(grouped);
  };

  const mergeAndGroupServices = (services: PrescribedService[]): GroupedService[] => {
    const serviceMap: { [key: number]: GroupedService } = {};
    
    services.forEach(service => {
      const key = service.service_id;
      if (serviceMap[key]) {
        serviceMap[key].quantity += (service.quantity || 1);
        serviceMap[key].subtotal = serviceMap[key].quantity * serviceMap[key].unit_price;
      } else {
        serviceMap[key] = {
          service_id: service.service_id,
          service_name: service.service_name,
          service_category: service.service_category,
          unit_price: service.price,
          quantity: service.quantity || 1,
          subtotal: service.price * (service.quantity || 1)
        };
      }
    });
    
    return Object.values(serviceMap);
  };

  const generateReceiptNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6);
    return `RCP${year}${month}${day}${timestamp}`;
  };

  const handleProcessPayment = async (prescription: PatientPrescription) => {
    setProcessing(true);
    setError('');
    setSuccess('');
    setPaymentErrors(null);

    try {
      // Process payment for all services in the prescription
      const finalAmount = prescription.total_amount - discount;
      const paymentResponse = await axios.post(`${API_BASE_URL}/prescriptions/process-payment`, {
        patient_id: prescription.patient_id,
        service_ids: prescription.services.map(s => s.service_id),
        total_amount: finalAmount,
        cashier_id: user?.id,
        payment_method: paymentMethod
      });

      // Check for warnings in response
      if (paymentResponse.data.warnings) {
        setPaymentErrors(paymentResponse.data.warnings);
      }

      // Prepare receipt data
      const receiptInfo = {
        receiptNumber: generateReceiptNumber(),
        patientName: prescription.patient_name,
        hospitalNumber: prescription.hospital_number,
        serviceName: prescription.services.map(s => s.service_name).join(', '),
        amount: finalAmount,
        paymentDate: new Date(),
        cashierName: user?.name || 'Cashier',
        paymentMethod: paymentMethod,
        services: prescription.services.map(s => ({
          name: s.service_name,
          category: s.service_category,
          price: s.price,
          quantity: s.quantity || 1
        })),
        discount: discount,
        subtotal: prescription.total_amount
      };

      setReceiptData(receiptInfo);
      
      const departmentList = prescription.services
        .map(s => s.service_category)
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(' and ');
      
      setSuccess(`Payment processed successfully! Services sent to ${departmentList} departments.`);
      setShowReceipt(true);
      
      // Auto-print receipt after 1 second
      setTimeout(() => {
        if (window.print) {
          window.print();
        }
      }, 1000);
      
      // Refresh the list
      fetchPrescribedServices();
    } catch (err: any) {
      if (err.response?.data?.duplicates || err.response?.data?.already_processed) {
        setPaymentErrors({
          duplicates: err.response.data.duplicates,
          already_processed: err.response.data.already_processed,
          details: err.response.data.details
        });
        setError('Payment processing failed due to duplicate or already processed services.');
      } else {
        setError(err.response?.data?.error || 'Payment processing failed');
      }
    } finally {
      setProcessing(false);
    }
  };

  const getDepartmentColor = (category: string) => {
    switch (category) {
      case 'Laboratory': return 'primary'; // Blue
      case 'Pharmacy': return 'success'; // Green  
      case 'Radiology': return 'warning'; // Orange
      default: return 'secondary';
    }
  };

  const getDepartmentIcon = (category: string) => {
    switch (category) {
      case 'Laboratory': return '🧪';
      case 'Pharmacy': return '💊';
      case 'Radiology': return '🩻';
      default: return '📋';
    }
  };

  const renderErrorBreakdown = () => {
    if (!paymentErrors) return null;
    
    return (
      <div className="mb-3">
        {paymentErrors.duplicates && paymentErrors.duplicates.length > 0 && (
          <div className="alert alert-warning d-flex align-items-center" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            <div>
              <strong>⚠️ Duplicate Service Detected:</strong> {paymentErrors.duplicates.join(', ')}
            </div>
          </div>
        )}
        
        {paymentErrors.already_processed && paymentErrors.already_processed.length > 0 && (
          <div className="alert alert-danger d-flex align-items-center" role="alert">
            <i className="bi bi-x-circle-fill me-2"></i>
            <div>
              <strong>❌ Already Processed:</strong> {paymentErrors.already_processed.join(', ')}
            </div>
          </div>
        )}
      </div>
    );
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

  const handleReceiptPrint = () => {
    setShowReceipt(false);
    setReceiptData(null);
    setSuccess('');
    setSelectedPrescription(null);
  };

  const handleReceiptClose = () => {
    setShowReceipt(false);
    setReceiptData(null);
    setSuccess('');
    setSelectedPrescription(null);
  };

  if (loading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading prescribed services...</p>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5>Prescribed Services - Pending Payment</h5>
          <div className="d-flex align-items-center gap-2">
            <small className="text-muted">
              <i className="bi bi-arrow-clockwise me-1"></i>
              Auto-refresh: 60s
            </small>
            <button 
              className="btn btn-outline-primary btn-sm"
              onClick={fetchPrescribedServices}
              disabled={loading}
              title="Manual refresh"
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              ) : (
                <i className="bi bi-arrow-clockwise"></i>
              )}
            </button>
          </div>
        </div>
        <div className="card-body">
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          
          {renderErrorBreakdown()}

          {success && (
            <div className="alert alert-success" role="alert">
              {success}
            </div>
          )}

          {prescriptions.length === 0 ? (
            <div className="text-center py-4">
              <i className="bi bi-prescription text-muted" style={{ fontSize: '3rem' }}></i>
              <p className="text-muted mt-2">No prescribed services pending payment</p>
            </div>
          ) : (
            <div className="row g-4">
              {prescriptions.map((prescription) => {
                const groupedServices = mergeAndGroupServices(prescription.services);
                const subtotal = groupedServices.reduce((sum, service) => sum + service.subtotal, 0);
                const finalTotal = subtotal - discount;
                
                return (
                  <div key={prescription.patient_id} className="col-12">
                    <div className="card border-primary shadow-sm">
                      <div className="card-header bg-primary bg-opacity-10">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h5 className="mb-1">
                              <strong>{prescription.hospital_number}</strong> - {prescription.patient_name}
                            </h5>
                            <div className="text-muted small">
                              <span>Prescribed by: Dr. {prescription.prescribed_by}</span>
                              <span className="mx-2">|</span>
                              <span>{formatDate(prescription.prescribed_at)}</span>
                            </div>
                          </div>
                          <span className="badge bg-primary">
                            {groupedServices.length} service{groupedServices.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      
                      <div className="card-body">
                        {/* Diagnosis Section */}
                        <div className="mb-4">
                          <div className="bg-light p-3 rounded">
                            <h6 className="text-muted mb-2">
                              <i className="bi bi-clipboard-pulse me-2"></i>
                              Diagnosis/Notes:
                            </h6>
                            <p className={`mb-0 ${!prescription.diagnosis ? 'text-muted fst-italic' : ''}`}>
                              {prescription.diagnosis || 'No diagnosis provided'}
                            </p>
                          </div>
                        </div>

                        {/* Services Table */}
                        <div className="mb-4">
                          <h6 className="mb-3">
                            <i className="bi bi-list-task me-2"></i>
                            Services Breakdown:
                          </h6>
                          <div className="table-responsive">
                            <table className="table table-striped table-hover">
                              <thead className="table-primary">
                                <tr>
                                  <th scope="col">Service</th>
                                  <th scope="col">Department</th>
                                  <th scope="col" className="text-center">Qty</th>
                                  <th scope="col" className="text-end">Unit Price</th>
                                  <th scope="col" className="text-end">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {groupedServices.map((service) => (
                                  <tr key={service.service_id}>
                                    <td>
                                      <div className="d-flex align-items-center">
                                        <span className="me-2">{getDepartmentIcon(service.service_category)}</span>
                                        <span>{service.service_name}</span>
                                      </div>
                                    </td>
                                    <td>
                                      <span className={`badge bg-${getDepartmentColor(service.service_category)}`}>
                                        {service.service_category}
                                      </span>
                                    </td>
                                    <td className="text-center">
                                      <span className="badge bg-secondary">{service.quantity}</span>
                                    </td>
                                    <td className="text-end">{formatCurrency(service.unit_price)}</td>
                                    <td className="text-end">
                                      <strong>{formatCurrency(service.subtotal)}</strong>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Payment Summary */}
                        <div className="mb-4">
                          <div className="card bg-light">
                            <div className="card-body">
                              <h6 className="card-title">
                                <i className="bi bi-calculator me-2"></i>
                                Payment Summary
                              </h6>
                              <div className="row">
                                <div className="col-md-6">
                                  <div className="mb-3">
                                    <label className="form-label">Payment Method</label>
                                    <select 
                                      className="form-select" 
                                      value={paymentMethod}
                                      onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'pos' | 'transfer')}
                                    >
                                      <option value="cash">Cash</option>
                                      <option value="pos">POS</option>
                                      <option value="transfer">Bank Transfer</option>
                                    </select>
                                  </div>
                                  <div className="mb-3">
                                    <label className="form-label">Discount (₦)</label>
                                    <input 
                                      type="number" 
                                      className="form-control" 
                                      value={discount}
                                      onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                                      min="0"
                                      max={subtotal}
                                    />
                                  </div>
                                </div>
                                <div className="col-md-6">
                                  <div className="d-flex justify-content-between mb-2">
                                    <span>Subtotal:</span>
                                    <span>{formatCurrency(subtotal)}</span>
                                  </div>
                                  {discount > 0 && (
                                    <div className="d-flex justify-content-between mb-2 text-success">
                                      <span>Discount:</span>
                                      <span>-{formatCurrency(discount)}</span>
                                    </div>
                                  )}
                                  <hr />
                                  <div className="d-flex justify-content-between">
                                    <strong>Final Total:</strong>
                                    <h5 className="mb-0 text-primary">{formatCurrency(finalTotal)}</h5>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="d-grid">
                          <button
                            className="btn btn-success btn-lg"
                            onClick={() => handleProcessPayment(prescription)}
                            disabled={processing || finalTotal <= 0}
                          >
                            {processing ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Processing Payment...
                              </>
                            ) : (
                              <>
                                <i className="bi bi-credit-card me-2"></i>
                                Process Payment - {formatCurrency(finalTotal)}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

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

export default PrescribedServicesPayment;