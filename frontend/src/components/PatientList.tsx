import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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

const PatientList: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/patients`);
      setPatients(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch patients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

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

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5>Registered Patients</h5>
        <button 
          className="btn btn-outline-primary btn-sm"
          onClick={fetchPatients}
        >
          Refresh
        </button>
      </div>
      <div className="card-body">
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {patients.length === 0 ? (
          <p className="text-muted text-center">No patients registered yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Hospital No.</th>
                  <th>Full Name</th>
                  <th>Age</th>
                  <th>Gender</th>
                  <th>Contact</th>
                  <th>Type</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr key={patient.id}>
                    <td><strong>{patient.hospital_number}</strong></td>
                    <td>{patient.full_name}</td>
                    <td>{patient.age}</td>
                    <td className="text-capitalize">{patient.gender}</td>
                    <td>{patient.contact || '-'}</td>
                    <td>
                      <span className={`badge ${patient.patient_type === 'new' ? 'bg-success' : 'bg-info'}`}>
                        {patient.patient_type.toUpperCase()}
                      </span>
                    </td>
                    <td>{formatDate(patient.registered_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientList;