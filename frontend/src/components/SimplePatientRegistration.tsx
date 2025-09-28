import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface SimplePatientRegistrationProps {
  onPatientRegistered: (patient: any) => void;
}

const SimplePatientRegistration: React.FC<SimplePatientRegistrationProps> = ({ 
  onPatientRegistered 
}) => {
  const [formData, setFormData] = useState({
    full_name: '',
    age: '',
    gender: '',
    contact: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.full_name || !formData.age || !formData.gender) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/patients`, {
        ...formData,
        age: parseInt(formData.age),
        patient_type: 'new'
      });

      const newPatient = response.data.patient;
      onPatientRegistered(newPatient);

      // Reset form
      setFormData({
        full_name: '',
        age: '',
        gender: '',
        contact: ''
      });

    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h5 className="mb-0">Register New Patient</h5>
      </div>
      <div className="card-body">
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
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
            </div>
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

export default SimplePatientRegistration;