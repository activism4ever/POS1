const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { verifyToken, checkRole } = require('../middleware/auth');

const router = express.Router();

// Debug endpoint to check prescription workflow
router.get('/debug/workflow', verifyToken, checkRole(['admin']), (req, res) => {
  const queries = {
    total_transactions: 'SELECT COUNT(*) as count FROM transactions',
    pending_prescriptions: 'SELECT COUNT(*) as count FROM transactions WHERE status = "pending" AND prescribed_by IS NOT NULL',
    paid_prescriptions: 'SELECT COUNT(*) as count FROM transactions WHERE status = "paid" AND prescribed_by IS NOT NULL',
    lab_services: 'SELECT COUNT(*) as count FROM services WHERE category = "Laboratory"',
    pharmacy_services: 'SELECT COUNT(*) as count FROM services WHERE category = "Pharmacy"',
    recent_transactions: `
      SELECT 
        t.id, t.status, t.department, s.name as service, s.category, 
        p.hospital_number, u.name as prescribed_by
      FROM transactions t
      LEFT JOIN services s ON t.service_id = s.id
      LEFT JOIN patients p ON t.patient_id = p.id  
      LEFT JOIN users u ON t.prescribed_by = u.id
      WHERE t.prescribed_by IS NOT NULL
      ORDER BY t.created_at DESC LIMIT 10
    `
  };

  const results = {};
  let completed = 0;
  const total = Object.keys(queries).length;

  Object.entries(queries).forEach(([key, query]) => {
    db.all(query, [], (err, rows) => {
      if (err) {
        results[key] = { error: err.message };
      } else {
        results[key] = rows;
      }
      
      completed++;
      if (completed === total) {
        res.json({
          message: 'Prescription workflow debug info',
          timestamp: new Date().toISOString(),
          data: results
        });
      }
    });
  });
});

// Get prescribed services pending payment (for cashier) - Enhanced with quantity
router.get('/pending-payment', verifyToken, checkRole(['cashier', 'admin']), (req, res) => {
  console.log('Fetching pending prescriptions for cashier...');
  
  const query = `
    SELECT 
      t.id,
      t.patient_id,
      t.service_id,
      t.amount as price,
      t.quantity,
      t.created_at as prescribed_at,
      '' as diagnosis,
      p.hospital_number,
      p.full_name as patient_name,
      s.name as service_name,
      s.category as service_category,
      u.name as prescribed_by,
      t.status,
      t.department
    FROM transactions t
    LEFT JOIN patients p ON t.patient_id = p.id
    LEFT JOIN services s ON t.service_id = s.id
    LEFT JOIN users u ON t.prescribed_by = u.id
    WHERE t.status = 'pending' 
      AND t.prescribed_by IS NOT NULL
      AND (s.category = 'Laboratory' OR s.category = 'Pharmacy' OR s.category = 'Radiology')
    ORDER BY t.created_at ASC
  `;
  
  db.all(query, [], (err, services) => {
    if (err) {
      console.error('Database error fetching pending prescriptions:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    console.log(`Found ${services.length} pending prescriptions`);
    res.json(services);
  });
});

// Process payment for prescribed services
router.post('/process-payment', verifyToken, checkRole(['cashier', 'admin']), [
  body('patient_id').isInt().withMessage('Valid patient ID is required'),
  body('service_ids').isArray({ min: 1 }).withMessage('At least one service is required'),
  body('total_amount').isFloat({ min: 0 }).withMessage('Valid total amount is required'),
  body('cashier_id').isInt().withMessage('Valid cashier ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { patient_id, service_ids, total_amount, cashier_id } = req.body;
    
    // Remove duplicates from service_ids and log them
    const uniqueServiceIds = Array.from(new Set(service_ids));
    let duplicates = [];
    let alreadyProcessed = [];
    
    if (uniqueServiceIds.length !== service_ids.length) {
      duplicates = service_ids.filter((id, index) => service_ids.indexOf(id) !== index);
      console.log('Duplicate service IDs detected:', {
        original: service_ids,
        unique: uniqueServiceIds,
        duplicates: duplicates
      });
    }
    
    console.log('Processing payment with unique service IDs:', { patient_id, service_ids: uniqueServiceIds, total_amount, cashier_id });

    // Debug: Check all transactions for this patient
    const debugQuery = `
      SELECT t.id, t.service_id, t.status, s.name
      FROM transactions t
      LEFT JOIN services s ON t.service_id = s.id
      WHERE t.patient_id = ?
    `;
    
    const allTransactions = await new Promise((resolve, reject) => {
      db.all(debugQuery, [patient_id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log('All transactions for patient:', allTransactions);

    // First, get the service details to understand which departments will receive them
    const serviceQuery = `
      SELECT t.id, s.name, s.category, s.price, t.service_id, t.quantity, t.status
      FROM transactions t
      LEFT JOIN services s ON t.service_id = s.id
      WHERE t.patient_id = ? AND t.service_id IN (${uniqueServiceIds.map(() => '?').join(',')})
    `;
    
    const serviceDetails = await new Promise((resolve, reject) => {
      db.all(serviceQuery, [patient_id, ...uniqueServiceIds], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Separate pending and already processed services
    const pendingServices = serviceDetails.filter(s => s.status === 'pending');
    alreadyProcessed = serviceDetails.filter(s => s.status !== 'pending');
    
    if (alreadyProcessed.length > 0) {
      console.log('Already processed services detected:', alreadyProcessed.map(s => s.name));
    }

    if (pendingServices.length === 0) {
      return res.status(400).json({ 
        error: 'No pending services found to process',
        duplicates: duplicates.length > 0 ? service_ids.filter((id, index) => service_ids.indexOf(id) !== index) : [],
        already_processed: alreadyProcessed.map(s => s.name),
        details: {
          total_requested: service_ids.length,
          duplicates_count: duplicates.length,
          already_processed_count: alreadyProcessed.length,
          pending_count: pendingServices.length
        }
      });
    }

    // Process payment with proper transaction handling
    console.log('Starting payment transaction for patient:', patient_id);
    
    // Begin transaction
    await new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    try {
      // Update all services to paid status (now using unique service IDs)
      const updatePromises = pendingServices.map(service => {
        return new Promise((resolve, reject) => {
          db.run(
            `UPDATE transactions 
             SET status = 'paid', 
                 cashier_id = ?, 
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = ? AND status = 'pending'`,
            [cashier_id, service.id],
            function(err) {
              if (err) {
                console.error(`Error updating service ${service.id}:`, err);
                reject(err);
              } else {
                console.log(`Updated service ${service.id}: ${this.changes} rows affected`);
                if (this.changes === 0) {
                  reject(new Error(`Service ${service.id} not found or already processed`));
                } else {
                  resolve(this.changes);
                }
              }
            }
          );
        });
      });

      // Execute all updates
      await Promise.all(updatePromises);
      
      // Commit transaction
      await new Promise((resolve, reject) => {
        db.run('COMMIT', (err) => {
          if (err) {
            console.error('Error committing transaction:', err);
            reject(err);
          } else {
            console.log('Payment transaction committed successfully');
            resolve();
          }
        });
      });

      // Analyze which departments will receive the services
      const departmentSummary = pendingServices.reduce((acc, service) => {
        const dept = service.category === 'Laboratory' ? 'Lab' : 
                     service.category === 'Pharmacy' ? 'Pharmacy' : 
                     service.category === 'Radiology' ? 'Radiology' : 'Other';
        if (!acc[dept]) acc[dept] = [];
        acc[dept].push({ name: service.name, quantity: service.quantity || 1 });
        return acc;
      }, {});

      console.log(`Payment processed successfully: ${pendingServices.length} services updated`);
      console.log('Services routed to departments:', departmentSummary);
      
      res.json({
        message: 'Payment processed successfully',
        updated_services: pendingServices.length,
        department_routing: departmentSummary,
        services: pendingServices.map(s => ({
          name: s.name,
          category: s.category,
          price: s.price,
          quantity: s.quantity || 1
        })),
        warnings: {
          duplicates: duplicates.length > 0 ? service_ids.filter((id, index) => service_ids.indexOf(id) !== index) : [],
          already_processed: alreadyProcessed.map(s => s.name)
        }
      });
      
    } catch (updateError) {
      console.error('Error during payment processing:', updateError);
      
      // Rollback transaction on error
      try {
        await new Promise((resolve, reject) => {
          db.run('ROLLBACK', (err) => {
            if (err) {
              console.error('Error during rollback:', err);
            }
            resolve();
          });
        });
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
      
      throw updateError;
    }
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get paid services for lab (only non-completed services)
router.get('/paid-services', verifyToken, checkRole(['lab', 'admin']), (req, res) => {
  console.log('Fetching paid lab services...');
  
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
      AND s.category = 'Laboratory'
      AND t.prescribed_by IS NOT NULL
      AND t.status != 'completed'
    ORDER BY 
      CASE WHEN t.status = 'paid' THEN 1 ELSE 2 END,
      t.updated_at ASC
  `;
  
  db.all(query, [], (err, services) => {
    if (err) {
      console.error('Database error fetching lab services:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    console.log(`Found ${services.length} lab services (excluding completed)`);
    res.json(services);
  });
});

// Get paid services for pharmacy (only non-completed services)
router.get('/pharmacy/paid-services', verifyToken, checkRole(['pharmacy', 'admin']), (req, res) => {
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

// Start service (lab/pharmacy)
router.put('/lab/start-service/:id', verifyToken, checkRole(['lab', 'admin']), (req, res) => {
  const { id } = req.params;

  db.run(
    `UPDATE transactions 
     SET status = 'in_progress', 
         updated_at = CURRENT_TIMESTAMP 
     WHERE id = ? AND status = 'paid'`,
    [id],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Error starting service' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Service not found or already started' });
      }

      res.json({ message: 'Service started successfully' });
    }
  );
});

router.put('/pharmacy/start-service/:id', verifyToken, checkRole(['pharmacy', 'admin']), (req, res) => {
  const { id } = req.params;

  db.run(
    `UPDATE transactions 
     SET status = 'in_progress', 
         updated_at = CURRENT_TIMESTAMP 
     WHERE id = ? AND status = 'paid'`,
    [id],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Error starting service' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Service not found or already started' });
      }

      res.json({ message: 'Service started successfully' });
    }
  );
});

// Complete service (lab/pharmacy) - Enhanced to work from both paid and in_progress status
router.put('/lab/complete-service/:id', verifyToken, checkRole(['lab', 'admin']), (req, res) => {
  const { id } = req.params;
  
  console.log(`Lab attempting to complete service: ${id}`);

  db.run(
    `UPDATE transactions 
     SET status = 'completed', 
         updated_at = CURRENT_TIMESTAMP 
     WHERE id = ? AND status IN ('paid', 'in_progress') AND id IN (
       SELECT t.id FROM transactions t 
       LEFT JOIN services s ON t.service_id = s.id 
       WHERE s.category = 'Laboratory'
     )`,
    [id],
    function(err) {
      if (err) {
        console.error('Database error completing lab service:', err);
        return res.status(500).json({ error: 'Error completing service' });
      }

      if (this.changes === 0) {
        console.log(`Lab service ${id} not found or already completed`);
        return res.status(404).json({ error: 'Service not found, already completed, or not a lab service' });
      }

      console.log(`Lab service ${id} marked as completed successfully`);
      res.json({ 
        message: 'Lab service completed successfully',
        service_id: id,
        updated_rows: this.changes
      });
    }
  );
});

router.put('/pharmacy/complete-service/:id', verifyToken, checkRole(['pharmacy', 'admin']), (req, res) => {
  const { id } = req.params;
  
  console.log(`Pharmacy attempting to complete service: ${id}`);

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

      console.log(`Pharmacy service ${id} marked as completed successfully`);
      res.json({ 
        message: 'Pharmacy service completed successfully',
        service_id: id,
        updated_rows: this.changes
      });
    }
  );
});

module.exports = router;