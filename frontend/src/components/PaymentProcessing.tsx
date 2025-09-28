import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import Receipt from './Receipt';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface Patient {
  id: number;
  hospital_number: string;
  full_name: string;
  age: number;
  gender: string;
  contact: string;
}

interface Service {
  id: number;
  name: string;
  category: string;
  price: number;
}

interface PaymentProcessingProps {
  onPaymentProcessed: () => void;
}

const PaymentProcessing: React.FC<PaymentProcessingProps> = ({ onPaymentProcessed }) => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<number | ''>('');
  const [selectedService, setSelectedService] = useState<number | ''>('');
  const [amount, setAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  const generateReceiptNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6);
    return `RCP${year}${month}${day}${timestamp}`;
  };

  useEffect(() => {
    fetchPatients();
    fetchServices();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/patients`);
      setPatients(response.data);
    } catch (err) {
      console.error('Failed to fetch patients');
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

  const handleServiceChange = (serviceId: string) => {
    const serviceIdNum = serviceId === '' ? '' : parseInt(serviceId);
    setSelectedService(serviceIdNum);
    if (serviceId) {
      const service = services.find(s => s.id === parseInt(serviceId));
      if (service) {
        setAmount(service.price);
      }
    } else {
      setAmount(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !selectedService) {
      setError('Please select both patient and service');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const paymentResponse = await axios.post(`${API_BASE_URL}/transactions`, {
        patient_id: selectedPatient,
        service_id: selectedService,
        amount
      });

      // Prepare receipt data
      const selectedPatientData = patients.find(p => p.id === selectedPatient);
      const selectedServiceData = services.find(s => s.id === selectedService);
      
      const receiptInfo = {
        receiptNumber: generateReceiptNumber(),
        patientName: selectedPatientData?.full_name || 'Patient',
        hospitalNumber: selectedPatientData?.hospital_number || 'N/A',
        serviceName: selectedServiceData?.name || 'Service',
        amount: amount,
        paymentDate: new Date(),
        cashierName: user?.name || 'Cashier'
      };

      setReceiptData(receiptInfo);
      setSuccess(`Payment processed successfully! Receipt #${receiptInfo.receiptNumber}`);
      setShowReceipt(true);
      
      onPaymentProcessed();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(price);
  };

  const handleReceiptPrint = () => {
    setSelectedPatient('');
    setSelectedService('');
    setAmount(0);
    setShowReceipt(false);
    setReceiptData(null);
    setSuccess('');
  };

  const handleReceiptClose = () => {
    setSelectedPatient('');
    setSelectedService('');
    setAmount(0);
    setShowReceipt(false);
    setReceiptData(null);
    setSuccess('');
  };

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h5>Process Additional Payments</h5>
          <small className="text-muted">For existing patients requiring additional services</small>
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

        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="patient" className="form-label">Select Patient *</label>
                <select
                  className="form-select"
                  id="patient"
                  value={selectedPatient}
                  onChange={(e) => setSelectedPatient(e.target.value === '' ? '' : parseInt(e.target.value))}
                  required
                >
                  <option value="">Choose Patient</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.hospital_number} - {patient.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="service" className="form-label">Select Service *</label>
                <select
                  className="form-select"
                  id="service"
                  value={selectedService}
                  onChange={(e) => handleServiceChange(e.target.value)}
                  required
                >
                  <option value="">Choose Service</option>
                  {services.map(service => (
                    <option key={service.id} value={service.id}>
                      {service.name} - {formatPrice(service.price)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="amount" className="form-label">Amount (NGN) *</label>
            <div className="input-group">
              <span className="input-group-text">₦</span>
              <input
                type="number"
                className="form-control"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-success"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Processing...
              </>
            ) : (
              'Process Payment'
            )}
          </button>
        </form>
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

export default PaymentProcessing;