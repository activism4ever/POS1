const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const patientRoutes = require('./routes/patients');
const serviceRoutes = require('./routes/services');
const transactionRoutes = require('./routes/transactions');
const reportRoutes = require('./routes/reports');
const prescriptionRoutes = require('./routes/prescriptions');
const labRoutes = require('./routes/lab');
const pharmacyRoutes = require('./routes/pharmacy');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/pharmacy', pharmacyRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const db = require('./config/database');
    const health = await db.healthCheck();
    const stats = db.getStats ? db.getStats() : null;
    
    res.json({ 
      message: 'Hospital POS API is running!',
      timestamp: new Date().toISOString(),
      database: health,
      stats: stats,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    res.status(500).json({
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});