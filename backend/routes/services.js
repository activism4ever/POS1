const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { verifyToken, checkRole } = require('../middleware/auth');

const router = express.Router();

// Get all services
router.get('/', verifyToken, (req, res) => {
  db.all(
    "SELECT * FROM services ORDER BY category, name",
    [],
    (err, services) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(services);
    }
  );
});

// Create new service (admin only)
router.post('/', verifyToken, checkRole(['admin']), [
  body('name').notEmpty().withMessage('Service name is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('price').isFloat({ min: 0 }).withMessage('Valid price is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, category, price } = req.body;

    db.run(
      "INSERT INTO services (name, category, price) VALUES (?, ?, ?)",
      [name, category, price],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Error creating service' });
        }

        res.status(201).json({
          message: 'Service created successfully',
          service: {
            id: this.lastID,
            name,
            category,
            price
          }
        });
      }
    );
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update service (admin only)
router.put('/:id', verifyToken, checkRole(['admin']), [
  body('name').notEmpty().withMessage('Service name is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('price').isFloat({ min: 0 }).withMessage('Valid price is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, category, price } = req.body;

    db.run(
      "UPDATE services SET name = ?, category = ?, price = ? WHERE id = ?",
      [name, category, price, id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Error updating service' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Service not found' });
        }

        res.json({ message: 'Service updated successfully' });
      }
    );
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete service (admin only)
router.delete('/:id', verifyToken, checkRole(['admin']), (req, res) => {
  const { id } = req.params;

  db.run(
    "DELETE FROM services WHERE id = ?",
    [id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error deleting service' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Service not found' });
      }

      res.json({ message: 'Service deleted successfully' });
    }
  );
});

module.exports = router;