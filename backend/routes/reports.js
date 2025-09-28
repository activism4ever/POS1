const express = require('express');
const db = require('../config/database');
const { verifyToken, checkRole } = require('../middleware/auth');

const router = express.Router();

// Get revenue summary
router.get('/revenue', verifyToken, (req, res) => {
  const { startDate, endDate, department } = req.query;
  
  let query = `
    SELECT 
      SUM(t.amount) as total_revenue,
      COUNT(t.id) as total_transactions,
      t.department,
      s.category as service_category
    FROM transactions t
    LEFT JOIN services s ON t.service_id = s.id
    WHERE t.status IN ('paid', 'completed')
  `;
  
  const params = [];
  
  if (startDate) {
    query += ' AND DATE(t.created_at) >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    query += ' AND DATE(t.created_at) <= ?';
    params.push(endDate);
  }
  
  if (department) {
    query += ' AND t.department = ?';
    params.push(department);
  }
  
  query += ' GROUP BY t.department, s.category ORDER BY total_revenue DESC';
  
  db.all(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Calculate totals
    const totalRevenue = results.reduce((sum, row) => sum + (row.total_revenue || 0), 0);
    const totalTransactions = results.reduce((sum, row) => sum + (row.total_transactions || 0), 0);
    
    res.json({
      summary: {
        total_revenue: totalRevenue,
        total_transactions: totalTransactions
      },
      breakdown: results
    });
  });
});

// Get daily revenue
router.get('/daily-revenue', verifyToken, (req, res) => {
  const { days = 7 } = req.query;
  
  const query = `
    SELECT 
      DATE(t.created_at) as date,
      SUM(t.amount) as daily_revenue,
      COUNT(t.id) as daily_transactions
    FROM transactions t
    WHERE t.status IN ('paid', 'completed')
      AND DATE(t.created_at) >= DATE('now', '-${parseInt(days)} days')
    GROUP BY DATE(t.created_at)
    ORDER BY date DESC
  `;
  
  db.all(query, [], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// Get department performance
router.get('/department-performance', verifyToken, (req, res) => {
  const query = `
    SELECT 
      t.department,
      SUM(t.amount) as total_revenue,
      COUNT(t.id) as total_services,
      COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_services,
      COUNT(CASE WHEN t.status = 'paid' THEN 1 END) as pending_services
    FROM transactions t
    WHERE t.status IN ('paid', 'completed')
      AND DATE(t.created_at) = DATE('now')
    GROUP BY t.department
    ORDER BY total_revenue DESC
  `;
  
  db.all(query, [], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// Get completed services
router.get('/completed-services', verifyToken, (req, res) => {
  const { limit = 50, department } = req.query;
  
  let query = `
    SELECT 
      t.*,
      p.hospital_number,
      p.full_name as patient_name,
      s.name as service_name,
      s.category as service_category,
      u1.name as cashier_name,
      u2.name as completed_by
    FROM transactions t
    LEFT JOIN patients p ON t.patient_id = p.id
    LEFT JOIN services s ON t.service_id = s.id
    LEFT JOIN users u1 ON t.cashier_id = u1.id
    LEFT JOIN users u2 ON t.doctor_id = u2.id
    WHERE t.status = 'completed'
  `;
  
  const params = [];
  
  if (department) {
    query += ' AND t.department = ?';
    params.push(department);
  }
  
  query += ' ORDER BY t.updated_at DESC LIMIT ?';
  params.push(parseInt(limit));
  
  db.all(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// Get patient statistics
router.get('/patient-stats', verifyToken, (req, res) => {
  const queries = [
    // Total patients
    'SELECT COUNT(*) as total_patients FROM patients',
    // New patients today
    'SELECT COUNT(*) as new_patients_today FROM patients WHERE DATE(registered_at) = DATE("now")',
    // Patients by type
    'SELECT patient_type, COUNT(*) as count FROM patients GROUP BY patient_type'
  ];
  
  Promise.all(queries.map(query => 
    new Promise((resolve, reject) => {
      db.all(query, [], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    })
  )).then(results => {
    res.json({
      total_patients: results[0][0].total_patients,
      new_patients_today: results[1][0].new_patients_today,
      patient_types: results[2]
    });
  }).catch(err => {
    res.status(500).json({ error: 'Database error' });
  });
});

module.exports = router;