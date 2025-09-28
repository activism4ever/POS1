import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface PatientRegistrationProps {
  onPatientRegistered: () => void;
  onNavigateToPayments?: () => void;
}

const PatientRegistration: React.FC<PatientRegistrationProps> = ({ onPatientRegistered, onNavigateToPayments }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    age: '',
    gender: '',
    contact: '',
    patient_type: 'new'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${API_BASE_URL}/patients`, {
        ...formData,
        age: parseInt(formData.age)
      });

      const newPatient = response.data.patient;
      setSuccess(`Patient registered successfully! Hospital Number: ${newPatient.hospital_number}. Redirecting to payment processing...`);
      
      setFormData({
        full_name: '',
        age: '',
        gender: '',
        contact: '',
        patient_type: 'new'
      });
      
      onPatientRegistered();
      
      // Navigate to payments after a brief delay to show success message
      setTimeout(() => {
        if (onNavigateToPayments) {
          onNavigateToPayments();
        }
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="card">
      <div className="card-header">
        <h5>Register New Patient</h5>
        <div className="alert alert-warning mb-0 mt-2" role="alert">
          <strong>Note:</strong> This component is deprecated. Use the integrated registration with payment instead.
        </div>
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
            {onNavigateToPayments && (
              <div className="mt-2">
                <button 
                  className="btn btn-sm btn-success"
                  onClick={() => onNavigateToPayments()}
                >
                  Process Payment Now
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="full_name" className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-control"
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
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
                  value={formData.age}
                  onChange={handleChange}
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
                  value={formData.gender}
                  onChange={handleChange}
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
                  value={formData.patient_type}
                  onChange={handleChange}
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
              value={formData.contact}
              onChange={handleChange}
              placeholder="e.g., +234 123 456 7890"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Registering...
              </>
            ) : (
              'Register Patient'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PatientRegistration;