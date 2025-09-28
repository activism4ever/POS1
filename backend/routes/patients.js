const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { verifyToken, checkRole } = require('../middleware/auth');

const router = express.Router();

// Get all patients
router.get('/', verifyToken, (req, res) => {
  db.all(
    "SELECT * FROM patients ORDER BY registered_at DESC",
    [],
    (err, patients) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(patients);
    }
  );
});

// Register new patient (cashier only)
router.post('/', verifyToken, checkRole(['cashier', 'admin']), [
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('age').isInt({ min: 1 }).withMessage('Valid age is required'),
  body('gender').isIn(['male', 'female']).withMessage('Gender must be male or female'),
  body('patient_type').isIn(['new', 'revisit']).withMessage('Patient type must be new or revisit')
], (req, res) => {
  try {
    console.log('Patient registration request received:', req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { full_name, age, gender, contact, patient_type } = req.body;

    // Generate hospital number
    console.log('Generating hospital number...');
    generateHospitalNumber((err, hospital_number) => {
      if (err) {
        console.error('Error generating hospital number:', err);
        return res.status(500).json({ error: 'Error generating hospital number' });
      }

      console.log('Generated hospital number:', hospital_number);
      db.run(
        "INSERT INTO patients (hospital_number, full_name, age, gender, contact, patient_type) VALUES (?, ?, ?, ?, ?, ?)",
        [hospital_number, full_name, age, gender, contact, patient_type],
        function(err) {
          if (err) {
            console.error('Error inserting patient into database:', err);
            return res.status(500).json({ error: 'Error registering patient' });
          }

          console.log('Patient registered successfully with ID:', this.lastID);

          res.status(201).json({
            message: 'Patient registered successfully',
            patient: {
              id: this.lastID,
              hospital_number,
              full_name,
              age,
              gender,
              contact,
              patient_type
            }
          });
        }
      );
    });
  } catch (error) {
    console.error('Register patient error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate hospital number
function generateHospitalNumber(callback) {
  const currentYear = new Date().getFullYear();

  // Get hospital settings
  db.all(
    "SELECT setting_key, setting_value FROM hospital_settings WHERE setting_key IN ('hospital_number_prefix', 'hospital_number_counter', 'current_year')",
    [],
    (err, settings) => {
      if (err) {
        return callback(err);
      }

      const settingsMap = {};
      settings.forEach(setting => {
        settingsMap[setting.setting_key] = setting.setting_value;
      });

      let { hospital_number_prefix, hospital_number_counter, current_year } = settingsMap;

      // Reset counter if year changed
      if (parseInt(current_year) !== currentYear) {
        hospital_number_counter = '1';
        db.run("UPDATE hospital_settings SET setting_value = ? WHERE setting_key = 'current_year'", [currentYear.toString()]);
        db.run("UPDATE hospital_settings SET setting_value = ? WHERE setting_key = 'hospital_number_counter'", ['1']);
      }

      const paddedCounter = hospital_number_counter.padStart(4, '0');
      const hospital_number = `${hospital_number_prefix}${currentYear}${paddedCounter}`;

      // Increment counter for next patient
      const nextCounter = (parseInt(hospital_number_counter) + 1).toString();
      db.run(
        "UPDATE hospital_settings SET setting_value = ? WHERE setting_key = 'hospital_number_counter'",
        [nextCounter],
        (err) => {
          if (err) {
            return callback(err);
          }
          callback(null, hospital_number);
        }
      );
    }
  );
}

module.exports = router;