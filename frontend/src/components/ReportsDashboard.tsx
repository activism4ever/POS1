import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface RevenueData {
  summary: {
    total_revenue: number;
    total_transactions: number;
  };
  breakdown: Array<{
    total_revenue: number;
    total_transactions: number;
    department: string;
    service_category: string;
  }>;
}

interface DailyRevenue {
  date: string;
  daily_revenue: number;
  daily_transactions: number;
}

interface DepartmentPerformance {
  department: string;
  total_revenue: number;
  total_services: number;
  completed_services: number;
  pending_services: number;
}

interface PatientStats {
  total_patients: number;
  new_patients_today: number;
  patient_types: Array<{
    patient_type: string;
    count: number;
  }>;
}

const ReportsDashboard: React.FC = () => {
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [departmentPerformance, setDepartmentPerformance] = useState<DepartmentPerformance[]>([]);
  const [patientStats, setPatientStats] = useState<PatientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchAllReports();
  }, []);

  const fetchAllReports = async () => {
    try {
      setLoading(true);
      const [revenueRes, dailyRes, deptRes, patientRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/reports/revenue`),
        axios.get(`${API_BASE_URL}/reports/daily-revenue?days=7`),
        axios.get(`${API_BASE_URL}/reports/department-performance`),
        axios.get(`${API_BASE_URL}/reports/patient-stats`)
      ]);

      setRevenueData(revenueRes.data);
      setDailyRevenue(dailyRes.data);
      setDepartmentPerformance(deptRes.data);
      setPatientStats(patientRes.data);
    } catch (err) {
      console.error('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenueWithDateRange = async () => {
    try {
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      
      const response = await axios.get(`${API_BASE_URL}/reports/revenue?${params}`);
      setRevenueData(response.data);
    } catch (err) {
      console.error('Failed to fetch revenue data');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(price || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
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
    <div>
      {/* Summary Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card text-white bg-primary">
            <div className="card-body">
              <h5 className="card-title">Total Revenue</h5>
              <h2>{formatPrice(revenueData?.summary.total_revenue || 0)}</h2>
              <p className="card-text">All time revenue</p>
            </div>
          </div>
        </div>
        
        <div className="col-md-3">
          <div className="card text-white bg-success">
            <div className="card-body">
              <h5 className="card-title">Total Transactions</h5>
              <h2>{revenueData?.summary.total_transactions || 0}</h2>
              <p className="card-text">All completed transactions</p>
            </div>
          </div>
        </div>
        
        <div className="col-md-3">
          <div className="card text-white bg-info">
            <div className="card-body">
              <h5 className="card-title">Total Patients</h5>
              <h2>{patientStats?.total_patients || 0}</h2>
              <p className="card-text">Registered patients</p>
            </div>
          </div>
        </div>
        
        <div className="col-md-3">
          <div className="card text-white bg-warning">
            <div className="card-body">
              <h5 className="card-title">New Patients Today</h5>
              <h2>{patientStats?.new_patients_today || 0}</h2>
              <p className="card-text">Today's registrations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="card mb-4">
        <div className="card-header">
          <h5>Revenue Analysis</h5>
        </div>
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-md-3">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-control"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-control"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">&nbsp;</label>
              <div>
                <button 
                  className="btn btn-primary me-2"
                  onClick={fetchRevenueWithDateRange}
                >
                  Filter
                </button>
                <button 
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setDateRange({startDate: '', endDate: ''});
                    fetchAllReports();
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Daily Revenue Chart */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5>Daily Revenue (Last 7 Days)</h5>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Revenue</th>
                      <th>Transactions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyRevenue.map((day, index) => (
                      <tr key={index}>
                        <td>{formatDate(day.date)}</td>
                        <td>{formatPrice(day.daily_revenue)}</td>
                        <td>{day.daily_transactions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Department Performance */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5>Department Performance (Today)</h5>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Revenue</th>
                      <th>Completed</th>
                      <th>Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departmentPerformance.map((dept, index) => (
                      <tr key={index}>
                        <td className="text-capitalize">{dept.department}</td>
                        <td>{formatPrice(dept.total_revenue)}</td>
                        <td>
                          <span className="badge bg-success">{dept.completed_services}</span>
                        </td>
                        <td>
                          <span className="badge bg-warning">{dept.pending_services}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Breakdown */}
      {revenueData && revenueData.breakdown.length > 0 && (
        <div className="row mt-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5>Revenue Breakdown by Department & Category</h5>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Department</th>
                        <th>Service Category</th>
                        <th>Revenue</th>
                        <th>Transactions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenueData.breakdown.map((item, index) => (
                        <tr key={index}>
                          <td className="text-capitalize">{item.department}</td>
                          <td>{item.service_category}</td>
                          <td><strong>{formatPrice(item.total_revenue)}</strong></td>
                          <td>{item.total_transactions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patient Types */}
      {patientStats && (
        <div className="row mt-4">
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h5>Patient Types</h5>
              </div>
              <div className="card-body">
                {patientStats.patient_types.map((type, index) => (
                  <div key={index} className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-capitalize">{type.patient_type} Patients:</span>
                    <span className="badge bg-primary">{type.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsDashboard;