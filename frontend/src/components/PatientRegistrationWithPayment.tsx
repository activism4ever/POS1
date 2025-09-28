import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import Receipt from './Receipt';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface Service {
  id: number;
  name: string;
  category: string;
  price: number;
}

interface PatientRegistrationWithPaymentProps {
  onPatientRegisteredAndPaid: () => void;
}

const PatientRegistrationWithPayment: React.FC<PatientRegistrationWithPaymentProps> = ({ 
  onPatientRegisteredAndPaid 
}) => {
  // Patient form data
  const [patientData, setPatientData] = useState({
    full_name: '',
    age: '',
    gender: '',
    contact: '',
    patient_type: 'new'
  });

  // Payment data
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<number | ''>('');
  const [amount, setAmount] = useState<number>(0);

  // Form states
  const [step, setStep] = useState<'patient' | 'payment' | 'receipt'>('patient');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [receiptData, setReceiptData] = useState<any>(null);

  // Get current user for cashier name
  const { user } = useAuth();

  const generateReceiptNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6);
    return `RCP${year}${month}${day}${timestamp}`;
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/services`);
      setServices(response.data);
      
      // Auto-select consultation service for new patients
      const consultationService = response.data.find((s: Service) => 
        s.name.toLowerCase().includes('consultation')
      );
      if (consultationService) {
        setSelectedService(consultationService.id);
        setAmount(consultationService.price);
      }
    } catch (err) {
      console.error('Failed to fetch services');
    }
  };

  const handlePatientDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setPatientData({
      ...patientData,
      [e.target.name]: e.target.value
    });
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

  const handlePatientFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate patient data
    if (!patientData.full_name || !patientData.age || !patientData.gender) {
      setError('Please fill in all required patient fields');
      return;
    }

    // Move to payment step
    setStep('payment');
  };

  const handleCompleteRegistrationAndPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedService) {
      setError('Please select a service for payment');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Step 1: Register the patient first
      const patientResponse = await axios.post(`${API_BASE_URL}/patients`, {
        ...patientData,
        age: parseInt(patientData.age)
      });

      const newPatient = patientResponse.data.patient;

      // Step 2: Process the payment immediately
      await axios.post(`${API_BASE_URL}/transactions`, {
        patient_id: newPatient.id,
        service_id: selectedService,
        amount
      });

      // Step 3: Prepare receipt data
      const selectedServiceData = services.find(s => s.id === selectedService);
      const receiptInfo = {
        receiptNumber: generateReceiptNumber(),
        patientName: newPatient.full_name,
        hospitalNumber: newPatient.hospital_number,
        serviceName: selectedServiceData?.name || 'Service',
        amount: amount,
        paymentDate: new Date(),
        cashierName: user?.name || 'Cashier'
      };

      setReceiptData(receiptInfo);
      setSuccess(`Payment processed successfully! Receipt #${receiptInfo.receiptNumber}`);
      setStep('receipt');

    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration or payment failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToPatientData = () => {
    setStep('patient');
    setError('');
  };

  const handleReceiptPrint = () => {
    // Reset form after printing
    setPatientData({
      full_name: '',
      age: '',
      gender: '',
      contact: '',
      patient_type: 'new'
    });
    setSelectedService('');
    setAmount(0);
    setStep('patient');
    setReceiptData(null);
    setSuccess('');
    
    onPatientRegisteredAndPaid();
  };

  const handleReceiptClose = () => {
    // Reset form when closing receipt
    setPatientData({
      full_name: '',
      age: '',
      gender: '',
      contact: '',
      patient_type: 'new'
    });
    setSelectedService('');
    setAmount(0);
    setStep('patient');
    setReceiptData(null);
    setSuccess('');
    
    onPatientRegisteredAndPaid();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(price);
  };

  return (
    <div className="card">
      <div className="card-header">
        <h5>
          {step === 'patient' ? 'Patient Registration' : step === 'payment' ? 'Payment Processing' : 'Receipt Ready'}
          <span className="badge bg-secondary ms-2">
            Step {step === 'patient' ? '1' : step === 'payment' ? '2' : '3'} of 3
          </span>
        </h5>
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

        {step === 'patient' && (
          <form onSubmit={handlePatientFormSubmit}>
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="full_name" className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="full_name"
                    name="full_name"
                    value={patientData.full_name}
                    onChange={handlePatientDataChange}
                    required
                  />
                </div>
              </div>
              
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="age" className="form-label">Age *</label>
                  <input
                    type="number"
                    className="form-control"
                    id="age"
                    name="age"
                    value={patientData.age}
                    onChange={handlePatientDataChange}
                    min="1"
                    max="120"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="gender" className="form-label">Gender *</label>
                  <select
                    className="form-select"
                    id="gender"
                    name="gender"
                    value={patientData.gender}
                    onChange={handlePatientDataChange}
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>
              
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="patient_type" className="form-label">Patient Type *</label>
                  <select
                    className="form-select"
                    id="patient_type"
                    name="patient_type"
                    value={patientData.patient_type}
                    onChange={handlePatientDataChange}
                    required
                  >
                    <option value="new">New Patient</option>
                    <option value="revisit">Revisit</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <label htmlFor="contact" className="form-label">Contact Number</label>
              <input
                type="tel"
                className="form-control"
                id="contact"
                name="contact"
                value={patientData.contact}
                onChange={handlePatientDataChange}
                placeholder="e.g., +234 123 456 7890"
              />
            </div>

            <button type="submit" className="btn btn-primary">
              Continue to Payment →
            </button>
          </form>
        )}

        {step === 'payment' && (
          <>
            <div className="alert alert-info" role="alert">
              <h6>Patient Details:</h6>
              <strong>{patientData.full_name}</strong> - {patientData.age} years old - {patientData.gender} - {patientData.patient_type} patient
            </div>

            <form onSubmit={handleCompleteRegistrationAndPayment}>
              <div className="row">
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
                
                <div className="col-md-6">
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
                </div>
              </div>

              <div className="d-flex gap-2">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={handleBackToPatientData}
                >
                  ← Back to Patient Data
                </button>
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
                    'Complete Registration & Payment'
                  )}
                </button>
              </div>
            </form>
          </>
        )}

        {step === 'receipt' && receiptData && (
          <Receipt 
            receiptData={receiptData}
            onPrint={handleReceiptPrint}
            onClose={handleReceiptClose}
          />
        )}
      </div>
    </div>
  );
};

export default PatientRegistrationWithPayment;