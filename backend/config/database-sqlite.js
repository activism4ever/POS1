/**
 * SQLite Database Configuration - Optimized for Development
 * This file maintains backward compatibility while adding optimizations
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'hospital_pos.db');

// Create database connection with optimizations
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err);
  } else {
    console.log('Connected to SQLite database');
    
    // Enable foreign keys for data integrity
    db.run('PRAGMA foreign_keys = ON');
    
    // Performance optimizations
    db.run('PRAGMA journal_mode = WAL'); // Write-Ahead Logging for better concurrency
    db.run('PRAGMA synchronous = NORMAL'); // Balance between safety and performance
    db.run('PRAGMA cache_size = 10000'); // Increase cache size for better performance
    db.run('PRAGMA temp_store = MEMORY'); // Store temporary data in memory
    
    initializeDatabase();
  }
});

// Initialize database tables with optimizations
function initializeDatabase() {
  // Users table with indexes
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'cashier', 'doctor', 'lab', 'pharmacy')) NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create indexes for users table
  db.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
  db.run('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');

  // Patients table with indexes
  db.run(`
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hospital_number TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
      gender TEXT CHECK(gender IN ('male', 'female')) NOT NULL,
      contact TEXT,
      patient_type TEXT CHECK(patient_type IN ('new', 'revisit')) NOT NULL,
      is_active INTEGER DEFAULT 1,
      registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create indexes for patients table
  db.run('CREATE INDEX IF NOT EXISTS idx_patients_hospital_number ON patients(hospital_number)');
  db.run('CREATE INDEX IF NOT EXISTS idx_patients_full_name ON patients(full_name)');
  db.run('CREATE INDEX IF NOT EXISTS idx_patients_registered_at ON patients(registered_at)');

  // Services table with indexes
  db.run(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL CHECK (price >= 0),
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create indexes for services table
  db.run('CREATE INDEX IF NOT EXISTS idx_services_category ON services(category)');
  db.run('CREATE INDEX IF NOT EXISTS idx_services_name ON services(name)');

  // Transactions table with comprehensive indexes
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      amount REAL NOT NULL CHECK (amount >= 0),
      status TEXT CHECK(status IN ('pending', 'paid', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
      department TEXT,
      cashier_id INTEGER,
      doctor_id INTEGER,
      prescribed_by INTEGER,
      diagnosis TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients (id),
      FOREIGN KEY (service_id) REFERENCES services (id),
      FOREIGN KEY (cashier_id) REFERENCES users (id),
      FOREIGN KEY (doctor_id) REFERENCES users (id),
      FOREIGN KEY (prescribed_by) REFERENCES users (id)
    )
  `);
  
  // Create comprehensive indexes for transactions table
  db.run('CREATE INDEX IF NOT EXISTS idx_transactions_patient_id ON transactions(patient_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_transactions_department ON transactions(department)');
  db.run('CREATE INDEX IF NOT EXISTS idx_transactions_prescribed_by ON transactions(prescribed_by)');
  db.run('CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)');
  db.run('CREATE INDEX IF NOT EXISTS idx_transactions_status_department ON transactions(status, department)');

  // Hospital settings table
  db.run(`
    CREATE TABLE IF NOT EXISTS hospital_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create triggers for updated_at columns
  const tables = ['users', 'patients', 'services', 'transactions', 'hospital_settings'];
  tables.forEach(table => {
    db.run(`
      CREATE TRIGGER IF NOT EXISTS update_${table}_updated_at 
      AFTER UPDATE ON ${table}
      BEGIN
        UPDATE ${table} SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `);
  });

  console.log('SQLite database schema initialized with optimizations');
  
  // Insert default admin user and settings
  insertDefaultData();
}

function insertDefaultData() {
  // Check if admin user exists
  db.get("SELECT id FROM users WHERE username = 'admin'", (err, row) => {
    if (!row) {
      const hashedPassword = bcrypt.hashSync('admin123', 12); // Higher cost for better security
      db.run(
        "INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)",
        ['System Administrator', 'admin', hashedPassword, 'admin'],
        function(err) {
          if (err) {
            console.error('Error creating admin user:', err);
          } else {
            console.log('Default admin user created');
          }
        }
      );
    }
  });

  // Insert default hospital settings with descriptions
  db.get("SELECT id FROM hospital_settings WHERE setting_key = 'hospital_number_prefix'", (err, row) => {
    if (!row) {
      const currentYear = new Date().getFullYear();
      const defaultSettings = [
        ['hospital_number_prefix', 'HOS', 'Hospital number prefix'],
        ['hospital_number_counter', '1', 'Current hospital number counter'],
        ['current_year', currentYear.toString(), 'Current year for number generation'],
        ['system_name', 'Hospital POS System', 'System name'],
        ['currency_symbol', '₦', 'Currency symbol (Nigerian Naira)'],
        ['receipt_footer', 'Thank you for choosing our services', 'Receipt footer message']
      ];
      
      defaultSettings.forEach(([key, value, description]) => {
        db.run("INSERT INTO hospital_settings (setting_key, setting_value, description) VALUES (?, ?, ?)", 
          [key, value, description], (err) => {
            if (err) console.error(`Error setting ${key}:`, err);
          });
      });
      
      console.log('Default hospital settings created');
    }
  });

  // Insert enhanced default services
  db.get("SELECT COUNT(*) as count FROM services", (err, row) => {
    if (!err && row.count === 0) {
      const defaultServices = [
        { name: 'Consultation', category: 'Medical', price: 2000 },
        { name: 'Revisitation', category: 'Medical', price: 1000 },
        { name: 'Blood Test (Full Blood Count)', category: 'Laboratory', price: 3000 },
        { name: 'Urine Test (Microscopy)', category: 'Laboratory', price: 1500 },
        { name: 'Malaria Test (RDT)', category: 'Laboratory', price: 1000 },
        { name: 'Pregnancy Test', category: 'Laboratory', price: 800 },
        { name: 'Ultrasound Scan', category: 'Radiology', price: 5000 },
        { name: 'X-Ray (Chest)', category: 'Radiology', price: 4000 },
        { name: 'ECG', category: 'Radiology', price: 2500 },
        { name: 'Paracetamol (500mg)', category: 'Pharmacy', price: 200 },
        { name: 'Antibiotics (Amoxicillin)', category: 'Pharmacy', price: 1500 },
        { name: 'Antimalarial (Artemether)', category: 'Pharmacy', price: 2000 },
        { name: 'Multivitamins', category: 'Pharmacy', price: 800 }
      ];
      
      const stmt = db.prepare("INSERT INTO services (name, category, price) VALUES (?, ?, ?)");
      defaultServices.forEach(service => {
        stmt.run([service.name, service.category, service.price]);
      });
      stmt.finalize();
      console.log('Enhanced default services created');
    }
  });
}

module.exports = db;