const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { JWT_SECRET, verifyToken } = require('../middleware/auth');

const router = express.Router();

// Login endpoint
router.post('/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    // Find user in database
    const findUser = () => {
      return new Promise((resolve, reject) => {
        db.get(
          "SELECT * FROM users WHERE username = ?",
          [username],
          (err, user) => {
            if (err) {
              reject(err);
            } else {
              resolve(user);
            }
          }
        );
      });
    };

    try {
      const user = await findUser();
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role,
          name: user.name 
        },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role
        }
      });
    } catch (dbError) {
      console.error('Database error during login:', dbError);
      return res.status(500).json({ error: 'Database error' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Token validation endpoint
router.get('/validate', verifyToken, (req, res) => {
  // If we reach here, token is valid (verifyToken middleware passed)
  res.json({ 
    message: 'Token is valid',
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      name: req.user.name
    }
  });
});

// Logout endpoint (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logout successful' });
});

module.exports = router;