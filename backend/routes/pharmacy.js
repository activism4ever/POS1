const express = require('express');
const db = require('../config/database');
const { verifyToken, checkRole } = require('../middleware/auth');

const router = express.Router();

// Get paid pharmacy services (only non-completed services)
router.get('/paid-services', verifyToken, checkRole(['pharmacy', 'admin']), (req, res) => {
  console.log('Fetching paid pharmacy services...');
  
  const query = `
    SELECT 
      t.id,
      t.patient_id,
      t.amount as price,
      t.updated_at as paid_at,
      t.status,
      p.hospital_number,
      p.full_name as patient_name,
      s.name as service_name,
      s.category as service_category,
      u.name as prescribed_by,
      '' as diagnosis
    FROM transactions t
    LEFT JOIN patients p ON t.patient_id = p.id
    LEFT JOIN services s ON t.service_id = s.id
    LEFT JOIN users u ON t.prescribed_by = u.id
    WHERE t.status IN ('paid', 'in_progress') 
      AND s.category = 'Pharmacy'
      AND t.prescribed_by IS NOT NULL
      AND t.status != 'completed'
    ORDER BY 
      CASE WHEN t.status = 'paid' THEN 1 ELSE 2 END,
      t.updated_at ASC
  `;
  
  db.all(query, [], (err, services) => {
    if (err) {
      console.error('Database error fetching pharmacy services:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    console.log(`Found ${services.length} pharmacy services (excluding completed)`);
    res.json(services);
  });
});

// Start pharmacy service
router.put('/start-service/:id', verifyToken, checkRole(['pharmacy', 'admin']), (req, res) => {
  const { id } = req.params;
  
  console.log(`Pharmacy starting service: ${id}`);

  db.run(
    `UPDATE transactions 
     SET status = 'in_progress', 
         updated_at = CURRENT_TIMESTAMP 
     WHERE id = ? AND status = 'paid' AND id IN (
       SELECT t.id FROM transactions t 
       LEFT JOIN services s ON t.service_id = s.id 
       WHERE s.category = 'Pharmacy'
     )`,
    [id],
    function(err) {
      if (err) {
        console.error('Database error starting pharmacy service:', err);
        return res.status(500).json({ error: 'Error starting service' });
      }

      if (this.changes === 0) {
        console.log(`Pharmacy service ${id} not found or already started`);
        return res.status(404).json({ error: 'Service not found, already started, or not a pharmacy service' });
      }

      console.log(`Pharmacy service ${id} started successfully`);
      res.json({ 
        message: 'Pharmacy service started successfully',
        service_id: id
      });
    }
  );
});

// Complete pharmacy service
router.put('/complete-service/:id', verifyToken, checkRole(['pharmacy', 'admin']), (req, res) => {
  const { id } = req.params;
  
  console.log(`Pharmacy completing service: ${id}`);

  db.run(
    `UPDATE transactions 
     SET status = 'completed', 
         updated_at = CURRENT_TIMESTAMP 
     WHERE id = ? AND status IN ('paid', 'in_progress') AND id IN (
       SELECT t.id FROM transactions t 
       LEFT JOIN services s ON t.service_id = s.id 
       WHERE s.category = 'Pharmacy'
     )`,
    [id],
    function(err) {
      if (err) {
        console.error('Database error completing pharmacy service:', err);
        return res.status(500).json({ error: 'Error completing service' });
      }

      if (this.changes === 0) {
        console.log(`Pharmacy service ${id} not found or already completed`);
        return res.status(404).json({ error: 'Service not found, already completed, or not a pharmacy service' });
      }

      console.log(`Pharmacy service ${id} completed successfully`);
      res.json({ 
        message: 'Pharmacy service completed successfully',
        service_id: id
      });
    }
  );
});

module.exports = router;