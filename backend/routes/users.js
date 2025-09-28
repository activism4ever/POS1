const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { verifyToken, checkRole } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', verifyToken, checkRole(['admin']), (req, res) => {
  db.all(
    "SELECT id, name, username, role, created_at FROM users ORDER BY created_at DESC",
    [],
    (err, users) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(users);
    }
  );
});

// Create new user (admin only)
router.post('/', verifyToken, checkRole(['admin']), [
  body('name').notEmpty().withMessage('Name is required'),
  body('username').notEmpty().withMessage('Username is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['cashier', 'doctor', 'lab', 'pharmacy']).withMessage('Invalid role')
], async (req, res) => {
  try {
    console.log('User creation request received:', req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, username, password, role } = req.body;

    // Check if username already exists
    db.get(
      "SELECT id FROM users WHERE username = ?",
      [username],
      async (err, existingUser) => {
        if (err) {
          console.error('Database error checking username:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (existingUser) {
          console.log('Username already exists:', username);
          return res.status(400).json({ error: 'Username already exists' });
        }

        try {
          // Hash password
          const hashedPassword = await bcrypt.hash(password, 10);
          console.log('Password hashed successfully');

          // Insert new user
          db.run(
            "INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)",
            [name, username, hashedPassword, role],
            function(err) {
              if (err) {
                console.error('Error inserting user into database:', err);
                return res.status(500).json({ error: 'Error creating user' });
              }

              console.log('User created successfully with ID:', this.lastID);
              res.status(201).json({
                message: 'User created successfully',
                user: {
                  id: this.lastID,
                  name,
                  username,
                  role
                }
              });
            }
          );
        } catch (hashError) {
          console.error('Error hashing password:', hashError);
          return res.status(500).json({ error: 'Error processing password' });
        }
      }
    );
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset user password (admin only)
router.put('/:id/reset-password', verifyToken, checkRole(['admin']), [
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { password } = req.body;

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      "UPDATE users SET password = ? WHERE id = ?",
      [hashedPassword, id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Error updating password' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'Password reset successfully' });
      }
    );
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (admin only)
router.delete('/:id', verifyToken, checkRole(['admin']), (req, res) => {
  const { id } = req.params;

  // Prevent admin from deleting themselves
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  db.run(
    "DELETE FROM users WHERE id = ?",
    [id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error deleting user' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ message: 'User deleted successfully' });
    }
  );
});

module.exports = router;