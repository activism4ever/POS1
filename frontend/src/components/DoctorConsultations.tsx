import React, { useState, useEffect, useRef } from 'react';
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

interface Patient {
  id: number;
  hospital_number: string;
  full_name: string;
  age: number;
  gender: string;
  contact: string;
  patient_type: string;
  registered_at: string;
}

interface Service {
  id: number;
  name: string;
  category: string;
  price: number;
}

interface GroupedPatient {
  hospital_number: string;
  patient_name: string;
  patient_id: number;
  consultations: Transaction[];
  total_amount: number;
  latest_payment_time: string;
  status: 'waiting' | 'in_consultation' | 'completed';
}

const EnhancedDoctorConsultations: React.FC = () => {
  const [consultations, setConsultations] = useState<Transaction[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [groupedPatients, setGroupedPatients] = useState<GroupedPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<GroupedPatient | null>(null);
  const [selectedPatientDetails, setSelectedPatientDetails] = useState<Patient | null>(null);
  const [prescribedServices, setPrescribedServices] = useState<number[]>([]);
  const [diagnosis, setDiagnosis] = useState('');
  const [loading, setLoading] = useState(true);
  const [prescribing, setPrescribing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(new Set());
  const [activeServiceCategory, setActiveServiceCategory] = useState<string>('all');
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);

  // Diagnosis templates
  const diagnosisTemplates = [
    { id: '1', name: 'General Consultation', text: 'Patient presented with chief complaint of...' },
    { id: '2', name: 'Follow-up Visit', text: 'Follow-up visit for previous condition. Patient reports...' },
    { id: '3', name: 'Routine Check-up', text: 'Routine health check-up. Patient appears well. Vital signs stable...' },
    { id: '4', name: 'Medication Review', text: 'Medication review and adjustment. Current medications reviewed...' }
  ];

  // Common service bundles
  const serviceBundles = [
    {
      id: 'basic_lab',
      name: 'Basic Lab Tests 🧪',
      services: [] as number[],
      description: 'Complete Blood Count, Urinalysis, Blood Sugar'
    },
    {
      id: 'cardiac_workup',
      name: 'Cardiac Workup ❤️',
      services: [] as number[],
      description: 'ECG, Echocardiogram, Cardiac Enzymes'
    }
  ];

  useEffect(() => {
    fetchConsultations();
    fetchServices();
    fetchPatients();
    
    // Set up auto-refresh every 60 seconds
    refreshInterval.current = setInterval(() => {
      fetchConsultations();
    }, 60000);

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    groupPatientsByHospitalNumber();
  }, [consultations]);

  const fetchConsultations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/transactions?status=paid&department=doctor`);
      setConsultations(response.data);
    } catch (err: any) {
      setError('Failed to fetch consultations');
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/services`);
      setServices(response.data.filter((s: Service) => s.category !== 'Medical'));
    } catch (err) {
      console.error('Failed to fetch services');
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/patients`);
      setPatients(response.data);
    } catch (err) {
      console.error('Failed to fetch patients');
    }
  };

  const groupPatientsByHospitalNumber = () => {
    const grouped = consultations.reduce((acc: { [key: string]: GroupedPatient }, consultation) => {
      const key = consultation.hospital_number;
      
      if (!acc[key]) {
        acc[key] = {
          hospital_number: consultation.hospital_number,
          patient_name: consultation.patient_name,
          patient_id: consultation.patient_id,
          consultations: [],
          total_amount: 0,
          latest_payment_time: consultation.created_at,
          status: 'waiting'
        };
      }
      
      acc[key].consultations.push(consultation);
      acc[key].total_amount += consultation.amount;
      
      // Update latest payment time
      if (new Date(consultation.created_at) > new Date(acc[key].latest_payment_time)) {
        acc[key].latest_payment_time = consultation.created_at;
      }
      
      return acc;
    }, {});
    
    setGroupedPatients(Object.values(grouped));
  };

  const handleAttendPatient = async (patient: GroupedPatient) => {
    setSelectedPatient(patient);
    
    // Fetch detailed patient information
    const patientDetails = patients.find(p => p.id === patient.patient_id);
    setSelectedPatientDetails(patientDetails || null);
    setShowConsultationModal(true);
    
    // Update status to in_consultation
    patient.status = 'in_consultation';
  };

  const handlePrescribe = async () => {
    if (!selectedPatient || prescribedServices.length === 0) {
      setError('Please select services to prescribe');
      return;
    }

    setPrescribing(true);
    setError('');
    setSuccess('');

    try {
      // Deduplicate services to prevent duplicate processing error
      const uniqueServices = Array.from(new Set(prescribedServices));
      const servicesToPrescribe = uniqueServices.map(serviceId => ({
        service_id: serviceId
      }));

      await axios.post(`${API_BASE_URL}/transactions/prescribe`, {
        patient_id: selectedPatient.patient_id,
        services: servicesToPrescribe,
        diagnosis
      });

      setSuccess('Services prescribed successfully!');
      
      // Mark all consultations as completed
      for (const consultation of selectedPatient.consultations) {
        await axios.put(`${API_BASE_URL}/transactions/${consultation.id}/status`, {
          status: 'completed'
        });
      }
      
      handleCloseConsultation();
      fetchConsultations();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to prescribe services');
    } finally {
      setPrescribing(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!selectedPatient) return;

    try {
      // Mark all consultations as completed
      for (const consultation of selectedPatient.consultations) {
        await axios.put(`${API_BASE_URL}/transactions/${consultation.id}/status`, {
          status: 'completed'
        });
      }
      
      setSuccess('Consultation marked as completed!');
      handleCloseConsultation();
      fetchConsultations();
    } catch (err: any) {
      setError('Failed to complete consultation');
    }
  };

  const handleCloseConsultation = () => {
    setSelectedPatient(null);
    setSelectedPatientDetails(null);
    setPrescribedServices([]);
    setDiagnosis('');
    setError('');
    setSuccess('');
    setShowConsultationModal(false);
  };

  const handleServiceToggle = (serviceId: number) => {
    setPrescribedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleBundleSelect = (bundle: any) => {
    const bundleServices = services
      .filter(s => bundle.description.toLowerCase().includes(s.name.toLowerCase().split(' ')[0]))
      .map(s => s.id)
      .slice(0, 3); // Limit to 3 services per bundle
    
    setPrescribedServices(prev => Array.from(new Set([...prev, ...bundleServices])));
  };

  const handleTemplateSelect = (template: any) => {
    setDiagnosis(template.text);
  };

  const togglePatientExpansion = (hospitalNumber: string) => {
    const newExpanded = new Set(expandedPatients);
    if (newExpanded.has(hospitalNumber)) {
      newExpanded.delete(hospitalNumber);
    } else {
      newExpanded.add(hospitalNumber);
    }
    setExpandedPatients(newExpanded);
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

  const getStatusBadge = (status: string) => {
    const badges = {
      waiting: 'badge bg-warning',
      in_consultation: 'badge bg-info',
      completed: 'badge bg-success'
    };
    return badges[status as keyof typeof badges] || 'badge bg-secondary';
  };

  const getServicesByCategory = () => {
    const categories = ['Laboratory', 'Pharmacy', 'Radiology', 'Procedures'];
    return categories.reduce((acc, category) => {
      acc[category] = services.filter(s => s.category === category);
      return acc;
    }, {} as { [key: string]: Service[] });
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      Laboratory: '🧪',
      Pharmacy: '💊',
      Radiology: '🩻',
      Procedures: '🏥'
    };
    return icons[category as keyof typeof icons] || '📋';
  };

  const filteredPatients = groupedPatients.filter(patient => {
    const matchesSearch = patient.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.hospital_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || patient.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const calculateTotal = () => {
    return prescribedServices.reduce((total, serviceId) => {
      const service = services.find(s => s.id === serviceId);
      return total + (service?.price || 0);
    }, 0);
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
    <div className="container-fluid">
      <div className="row">
        {/* Patient Queue Section */}
        <div className="col-lg-4">
          <div className="card h-100">
            <div className="card-header bg-primary text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-people me-2"></i>
                  Patient Queue ({filteredPatients.length})
                </h5>
                <button 
                  className="btn btn-outline-light btn-sm auto-refresh-indicator"
                  onClick={fetchConsultations}
                  title="Auto-refresh every 60s"
                >
                  <i className="bi bi-arrow-clockwise"></i>
                </button>
              </div>
            </div>
            
            {/* Search and Filters */}
            <div className="card-body pb-2">
              <div className="row g-2 mb-3">
                <div className="col-8">
                  <div className="input-group input-group-sm">
                    <span className="input-group-text">
                      <i className="bi bi-search"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search patients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-4">
                  <select
                    className="form-select form-select-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="waiting">Waiting</option>
                    <option value="in_consultation">In Consultation</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Patient List */}
            <div className="card-body pt-0" style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {error && (
                <div className="alert alert-danger alert-sm" role="alert">
                  {error}
                </div>
              )}

              {filteredPatients.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <i className="bi bi-inbox" style={{ fontSize: '2rem' }}></i>
                  <p className="mt-2">No patients in queue</p>
                </div>
              ) : (
                filteredPatients.map((patient) => (
                  <div key={patient.hospital_number} className={`card mb-2 patient-queue-card status-${patient.status}`}>
                    <div className="card-body p-3">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <h6 className="mb-1">
                            <strong>{patient.hospital_number}</strong>
                            {patient.consultations.length > 1 && (
                              <button
                                className="btn btn-link btn-sm p-0 ms-2"
                                onClick={() => togglePatientExpansion(patient.hospital_number)}
                              >
                                <i className={`bi bi-chevron-${expandedPatients.has(patient.hospital_number) ? 'up' : 'down'}`}></i>
                              </button>
                            )}
                          </h6>
                          <p className="mb-1">{patient.patient_name}</p>
                          <div className="small text-muted">
                            <div>Service: {patient.consultations[0].service_name}</div>
                            <div>Amount: {formatPrice(patient.total_amount)}</div>
                            <div>Time: {formatDate(patient.latest_payment_time)}</div>
                          </div>
                          
                          {/* Expanded consultations */}
                          {expandedPatients.has(patient.hospital_number) && patient.consultations.length > 1 && (
                            <div className="mt-2 ps-3 border-start">
                              {patient.consultations.slice(1).map((consultation, idx) => (
                                <div key={idx} className="small text-muted mb-1">
                                  • {consultation.service_name} - {formatPrice(consultation.amount)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="text-end">
                          <div className="mb-2">
                            <span className={getStatusBadge(patient.status)}>
                              {patient.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleAttendPatient(patient)}
                            disabled={patient.status === 'completed'}
                          >
                            <i className="bi bi-person-check me-1"></i>
                            Attend
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Consultation Panel */}
        <div className="col-lg-8">
          {selectedPatient ? (
            <div className="row">
              {/* Patient Profile */}
              <div className="col-12 mb-3">
                <div className="card">
                  <div className="card-header bg-info text-white">
                    <h5 className="mb-0">
                      <i className="bi bi-person-circle me-2"></i>
                      Patient Profile - {selectedPatient.patient_name}
                    </h5>
                  </div>
                  <div className="card-body">
                    {selectedPatientDetails ? (
                      <div className="row">
                        <div className="col-md-6">
                          <p><strong>Hospital No:</strong> {selectedPatientDetails.hospital_number}</p>
                          <p><strong>Name:</strong> {selectedPatientDetails.full_name}</p>
                          <p><strong>Age:</strong> {selectedPatientDetails.age} years</p>
                        </div>
                        <div className="col-md-6">
                          <p><strong>Gender:</strong> {selectedPatientDetails.gender}</p>
                          <p><strong>Contact:</strong> {selectedPatientDetails.contact}</p>
                          <p><strong>Type:</strong> {selectedPatientDetails.patient_type}</p>
                        </div>
                      </div>
                    ) : (
                      <p>Loading patient details...</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Diagnosis Section */}
              <div className="col-md-6">
                <div className="card h-100">
                  <div className="card-header">
                    <h5 className="mb-0">
                      <i className="bi bi-clipboard-pulse me-2"></i>
                      Diagnosis & Notes
                    </h5>
                  </div>
                  <div className="card-body">
                    {success && (
                      <div className="alert alert-success" role="alert">
                        {success}
                      </div>
                    )}

                    {/* Quick Templates */}
                    <div className="mb-3">
                      <label className="form-label small">Quick Templates:</label>
                      <div className="d-flex flex-wrap gap-1">
                        {diagnosisTemplates.map(template => (
                          <button
                            key={template.id}
                            className="btn btn-outline-secondary btn-sm diagnosis-template-btn"
                            onClick={() => handleTemplateSelect(template)}
                          >
                            {template.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Diagnosis/Notes</label>
                      <textarea
                        className="form-control"
                        rows={8}
                        value={diagnosis}
                        onChange={(e) => setDiagnosis(e.target.value)}
                        placeholder="Enter diagnosis, observations, and treatment notes..."
                      />
                    </div>

                    <div className="d-grid gap-2">
                      <button
                        className="btn btn-success"
                        onClick={handlePrescribe}
                        disabled={prescribing || prescribedServices.length === 0}
                      >
                        {prescribing ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Prescribing...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-prescription2 me-2"></i>
                            Prescribe Services & Send to Cashier
                          </>
                        )}
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={handleMarkCompleted}
                      >
                        <i className="bi bi-check-circle me-2"></i>
                        Mark as Completed
                      </button>
                      <button
                        className="btn btn-outline-secondary"
                        onClick={handleCloseConsultation}
                      >
                        <i className="bi bi-x-circle me-2"></i>
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Prescribe Services Sidebar */}
              <div className="col-md-6">
                <div className="card h-100">
                  <div className="card-header">
                    <h5 className="mb-0">
                      <i className="bi bi-prescription2 me-2"></i>
                      Prescribe Services
                    </h5>
                  </div>
                  <div className="card-body">
                    {/* Common Bundles */}
                    <div className="mb-3">
                      <label className="form-label small">Common Bundles:</label>
                      <div className="d-flex flex-wrap gap-1">
                        {serviceBundles.map(bundle => (
                          <button
                            key={bundle.id}
                            className="btn btn-outline-info btn-sm service-bundle-btn"
                            onClick={() => handleBundleSelect(bundle)}
                            title={bundle.description}
                          >
                            {bundle.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Service Categories */}
                    <div className="accordion" id="servicesAccordion" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      {Object.entries(getServicesByCategory()).map(([category, categoryServices]) => (
                        <div key={category} className="accordion-item">
                          <h2 className="accordion-header">
                            <button
                              className="accordion-button collapsed"
                              type="button"
                              data-bs-toggle="collapse"
                              data-bs-target={`#collapse${category}`}
                            >
                              {getCategoryIcon(category)} {category} ({categoryServices.length})
                            </button>
                          </h2>
                          <div id={`collapse${category}`} className="accordion-collapse collapse">
                            <div className="accordion-body p-2">
                              {categoryServices.map(service => (
                                <div key={service.id} className="form-check mb-1">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`service-${service.id}`}
                                    checked={prescribedServices.includes(service.id)}
                                    onChange={() => handleServiceToggle(service.id)}
                                  />
                                  <label className="form-check-label small" htmlFor={`service-${service.id}`}>
                                    <div>
                                      <strong>{service.name}</strong>
                                      <br />
                                      <span className="text-muted">{formatPrice(service.price)}</span>
                                    </div>
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Running Total */}
                    {prescribedServices.length > 0 && (
                      <div className="mt-3 p-2 running-total rounded">
                        <div className="d-flex justify-content-between">
                          <strong>Total Services: {prescribedServices.length}</strong>
                          <strong>Total: {formatPrice(calculateTotal())}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card h-100">
              <div className="card-body d-flex align-items-center justify-content-center text-center">
                <div>
                  <i className="bi bi-person-plus" style={{ fontSize: '4rem', color: '#6c757d' }}></i>
                  <h4 className="text-muted mt-3">Select a Patient to Begin Consultation</h4>
                  <p className="text-muted">Choose a patient from the queue to start the consultation process</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedDoctorConsultations;