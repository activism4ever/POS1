import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface CreateServiceFormProps {
  onServiceCreated: () => void;
}

const CreateServiceForm: React.FC<CreateServiceFormProps> = ({ onServiceCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const categories = [
    'Medical',
    'Laboratory',
    'Radiology',
    'Pharmacy',
    'Surgery',
    'Emergency',
    'Other'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.post(`${API_BASE_URL}/services`, {
        ...formData,
        price: parseFloat(formData.price)
      });
      setSuccess('Service created successfully!');
      setFormData({
        name: '',
        category: '',
        price: ''
      });
      onServiceCreated();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create service');
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
        <h5>Add New Service</h5>
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
                <label htmlFor="name" className="form-label">Service Name *</label>
                <input
                  type="text"
                  className="form-control"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Blood Test, Consultation"
                  required
                />
              </div>
            </div>
            
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="category" className="form-label">Category *</label>
                <select
                  className="form-select"
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="price" className="form-label">Price (NGN) *</label>
            <div className="input-group">
              <span className="input-group-text">₦</span>
              <input
                type="number"
                className="form-control"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="0.00"
                required
              />
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
                Creating...
              </>
            ) : (
              'Add Service'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateServiceForm;