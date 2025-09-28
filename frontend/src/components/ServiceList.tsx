import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface Service {
  id: number;
  name: string;
  category: string;
  price: number;
  created_at: string;
}

const ServiceList: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    category: '',
    price: ''
  });

  const categories = [
    'Medical',
    'Laboratory',
    'Radiology',
    'Pharmacy',
    'Surgery',
    'Emergency',
    'Other'
  ];

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/services`);
      setServices(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setEditFormData({
      name: service.name,
      category: service.category,
      price: service.price.toString()
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    try {
      await axios.put(`${API_BASE_URL}/services/${editingService.id}`, {
        ...editFormData,
        price: parseFloat(editFormData.price)
      });
      setEditingService(null);
      fetchServices();
      alert('Service updated successfully!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update service');
    }
  };

  const handleDelete = async (serviceId: number, serviceName: string) => {
    if (!window.confirm(`Are you sure you want to delete service: ${serviceName}?`)) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/services/${serviceId}`);
      alert('Service deleted successfully!');
      fetchServices();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete service');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(price);
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category.toLowerCase()) {
      case 'medical': return 'bg-primary';
      case 'laboratory': return 'bg-info';
      case 'radiology': return 'bg-warning';
      case 'pharmacy': return 'bg-success';
      case 'surgery': return 'bg-danger';
      case 'emergency': return 'bg-dark';
      default: return 'bg-secondary';
    }
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
        <h5>Hospital Services</h5>
        <button 
          className="btn btn-outline-primary btn-sm"
          onClick={fetchServices}
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

        {services.length === 0 ? (
          <p className="text-muted text-center">No services found.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Service Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id}>
                    <td>{service.name}</td>
                    <td>
                      <span className={`badge ${getCategoryBadgeClass(service.category)}`}>
                        {service.category}
                      </span>
                    </td>
                    <td><strong>{formatPrice(service.price)}</strong></td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={() => handleEdit(service)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(service.id, service.name)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingService && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Service</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setEditingService(null)}
                ></button>
              </div>
              <form onSubmit={handleUpdate}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Service Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      value={editFormData.category}
                      onChange={(e) => setEditFormData({...editFormData, category: e.target.value})}
                      required
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Price (NGN)</label>
                    <div className="input-group">
                      <span className="input-group-text">₦</span>
                      <input
                        type="number"
                        className="form-control"
                        value={editFormData.price}
                        onChange={(e) => setEditFormData({...editFormData, price: e.target.value})}
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setEditingService(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Update Service
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceList;