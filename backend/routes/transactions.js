const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { verifyToken, checkRole } = require('../middleware/auth');

const router = express.Router();

// Get patients with pending payments (queue view)
router.get('/payment-queue', verifyToken, checkRole(['cashier', 'admin']), (req, res) => {
  const { search, service_type } = req.query;
  
  let query = `
    SELECT 
      p.id as patient_id,
      p.hospital_number,
      p.full_name as patient_name,
      p.age,
      p.gender,
      p.contact,
      GROUP_CONCAT(s.name, ', ') as services,
      GROUP_CONCAT(s.category, ', ') as service_categories,
      GROUP_CONCAT(t.service_id) as service_ids,
      SUM(t.amount) as total_amount,
      COUNT(t.id) as service_count,
      MIN(t.created_at) as earliest_pending,
      MAX(t.created_at) as latest_pending,
      'pending' as status
    FROM transactions t
    LEFT JOIN patients p ON t.patient_id = p.id
    LEFT JOIN services s ON t.service_id = s.id
    WHERE t.status = 'pending'
  `;
  
  const params = [];
  const conditions = [];
  
  if (search) {
    conditions.push('(p.full_name LIKE ? OR p.hospital_number LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  
  if (service_type) {
    conditions.push('s.category = ?');
    params.push(service_type);
  }
  
  if (conditions.length > 0) {
    query += ' AND ' + conditions.join(' AND ');
  }
  
  query += `
    GROUP BY p.id, p.hospital_number, p.full_name, p.age, p.gender, p.contact
    ORDER BY earliest_pending ASC
  `;
  
  db.all(query, params, (err, patients) => {
    if (err) {
      console.error('Database error in payment queue:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Process the results to clean up service data
    const processedPatients = patients.map(patient => ({
      ...patient,
      service_ids: patient.service_ids ? patient.service_ids.split(',').map(id => parseInt(id)) : [],
      services: patient.services || '',
      service_categories: patient.service_categories || ''
    }));
    
    res.json(processedPatients);
  });
});

// Get all transactions
router.get('/', verifyToken, (req, res) => {
  const { status, department } = req.query;
  
  let query = `
    SELECT 
      t.*,
      p.hospital_number,
      p.full_name as patient_name,
      s.name as service_name,
      s.category as service_category,
      u1.name as cashier_name,
      u2.name as doctor_name,
      u3.name as prescribed_by_name
    FROM transactions t
    LEFT JOIN patients p ON t.patient_id = p.id
    LEFT JOIN services s ON t.service_id = s.id
    LEFT JOIN users u1 ON t.cashier_id = u1.id
    LEFT JOIN users u2 ON t.doctor_id = u2.id
    LEFT JOIN users u3 ON t.prescribed_by = u3.id
  `;
  
  const params = [];
  const conditions = [];
  
  if (status) {
    conditions.push('t.status = ?');
    params.push(status);
  }
  
  if (department) {
    conditions.push('t.department = ?');
    params.push(department);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY t.created_at DESC';
  
  db.all(query, params, (err, transactions) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(transactions);
  });
});

// Create new transaction (patient payment)
router.post('/', verifyToken, checkRole(['cashier', 'admin']), [
  body('patient_id').isInt().withMessage('Valid patient ID is required'),
  body('service_id').isInt().withMessage('Valid service ID is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Valid amount is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { patient_id, service_id, amount, department } = req.body;
    const cashier_id = req.user.id;

    // Get service details
    db.get('SELECT * FROM services WHERE id = ?', [service_id], (err, service) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!service) {
        return res.status(404).json({ error: 'Service not found' });
      }

      // Determine department and status based on service category
      let transactionDepartment = department;
      let status = 'paid';
      
      if (!transactionDepartment) {
        switch (service.category.toLowerCase()) {
          case 'laboratory':
            transactionDepartment = 'lab';
            break;
          case 'pharmacy':
            transactionDepartment = 'pharmacy';
            break;
          case 'medical':
            transactionDepartment = 'doctor';
            break;
          default:
            transactionDepartment = 'completed';
        }
      }

      db.run(
        `INSERT INTO transactions 
         (patient_id, service_id, amount, status, department, cashier_id) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [patient_id, service_id, amount, status, transactionDepartment, cashier_id],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Error creating transaction' });
          }

          res.status(201).json({
            message: 'Transaction created successfully',
            transaction: {
              id: this.lastID,
              patient_id,
              service_id,
              amount,
              status,
              department: transactionDepartment,
              cashier_id
            }
          });
        }
      );
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update transaction status
router.put('/:id/status', verifyToken, [
  body('status').isIn(['pending', 'paid', 'completed', 'cancelled']).withMessage('Valid status is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;
    const updated_by = req.user.id;

    db.run(
      `UPDATE transactions 
       SET status = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [status, id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Error updating transaction' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Transaction not found' });
        }

        res.json({ message: 'Transaction status updated successfully' });
      }
    );
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Prescribe services (doctor)
router.post('/prescribe', verifyToken, checkRole(['doctor', 'admin']), [
  body('patient_id').isInt().withMessage('Valid patient ID is required'),
  body('services').isArray({ min: 1 }).withMessage('At least one service is required'),
  body('services.*.service_id').isInt().withMessage('Valid service ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { patient_id, services, diagnosis } = req.body;
    const doctor_id = req.user.id;

    console.log('Prescribing services:', { patient_id, services: services.length, doctor_id });

    const createdTransactions = [];

    // Process each service with duplicate prevention and quantity handling
    for (const service of services) {
      try {
        // Get service details
        const serviceDetails = await new Promise((resolve, reject) => {
          db.get('SELECT * FROM services WHERE id = ?', [service.service_id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });

        if (!serviceDetails) {
          console.error(`Service not found: ${service.service_id}`);
          continue;
        }

        // Determine department based on service category
        let department;
        switch (serviceDetails.category.toLowerCase()) {
          case 'laboratory':
            department = 'lab';
            break;
          case 'pharmacy':
            department = 'pharmacy';
            break;
          case 'radiology':
            department = 'radiology';
            break;
          default:
            department = 'cashier';
        }

        // Check if prescription already exists for today
        const currentDate = new Date().toISOString().split('T')[0];
        const existingPrescription = await new Promise((resolve, reject) => {
          db.get(
            `SELECT id, quantity FROM transactions 
             WHERE patient_id = ? AND service_id = ? AND DATE(prescription_date) = ? AND status = 'pending'`,
            [patient_id, service.service_id, currentDate],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });

        let transactionId;
        
        if (existingPrescription) {
          // Update existing prescription quantity
          transactionId = existingPrescription.id;
          const newQuantity = (existingPrescription.quantity || 1) + 1;
          
          await new Promise((resolve, reject) => {
            db.run(
              `UPDATE transactions 
               SET quantity = ?, updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`,
              [newQuantity, transactionId],
              function(err) {
                if (err) {
                  console.error('Error updating prescription quantity:', err);
                  reject(err);
                } else {
                  console.log(`Updated prescription quantity for service ${serviceDetails.name}: ${newQuantity}`);
                  resolve();
                }
              }
            );
          });
        } else {
          // Insert new prescription
          transactionId = await new Promise((resolve, reject) => {
            db.run(
              `INSERT INTO transactions 
               (patient_id, service_id, amount, status, department, prescribed_by, quantity, prescription_date) 
               VALUES (?, ?, ?, 'pending', ?, ?, 1, ?)`,
              [patient_id, service.service_id, serviceDetails.price, department, doctor_id, currentDate],
              function(err) {
                if (err) {
                  console.error('Error inserting transaction:', err);
                  reject(err);
                } else {
                  console.log(`New prescription created: ID ${this.lastID} for service ${serviceDetails.name}`);
                  resolve(this.lastID);
                }
              }
            );
          });
        }

        createdTransactions.push({
          id: transactionId,
          service_name: serviceDetails.name,
          service_category: serviceDetails.category,
          amount: serviceDetails.price,
          department
        });

      } catch (serviceError) {
        console.error(`Error processing service ${service.service_id}:`, serviceError);
      }
    }

    console.log(`Successfully created ${createdTransactions.length} prescription transactions`);

    res.status(201).json({
      message: 'Services prescribed successfully',
      transactions: createdTransactions,
      total_services: createdTransactions.length
    });
  } catch (error) {
    console.error('Prescribe services error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;