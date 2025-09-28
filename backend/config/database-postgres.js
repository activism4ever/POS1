const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// PostgreSQL connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'hospital_pos',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: parseInt(process.env.DB_POOL_MAX) || 20, // Maximum connections in pool
  min: parseInt(process.env.DB_POOL_MIN) || 2,  // Minimum connections in pool
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000, // 30 seconds
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000, // 2 seconds
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Connection health check
pool.on('connect', (client) => {
  console.log('New PostgreSQL client connected');
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

// Database initialization
async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to PostgreSQL database');
    
    // Enable UUID extension for better ID generation
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    
    // Create ENUM types for better data integrity
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('admin', 'cashier', 'doctor', 'lab', 'pharmacy');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE gender_type AS ENUM ('male', 'female');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE patient_type AS ENUM ('new', 'revisit');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE transaction_status AS ENUM ('pending', 'paid', 'in_progress', 'completed', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    // Users table with optimizations
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
        name VARCHAR(255) NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role user_role NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create index on username for faster login queries
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
    
    // Patients table with optimizations
    await client.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
        hospital_number VARCHAR(50) UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
        gender gender_type NOT NULL,
        contact VARCHAR(20),
        patient_type patient_type NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes for faster patient searches
    await client.query('CREATE INDEX IF NOT EXISTS idx_patients_hospital_number ON patients(hospital_number)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_patients_full_name ON patients(full_name)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_patients_registered_at ON patients(registered_at)');
    
    // Services table with optimizations
    await client.query(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes for service searches
    await client.query('CREATE INDEX IF NOT EXISTS idx_services_category ON services(category)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_services_name ON services(name)');
    
    // Transactions table with optimizations and proper foreign keys
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
        service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
        amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
        status transaction_status DEFAULT 'pending',
        department VARCHAR(50),
        cashier_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        doctor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        prescribed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        diagnosis TEXT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create comprehensive indexes for transaction queries
    await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_patient_id ON transactions(patient_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_department ON transactions(department)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_prescribed_by ON transactions(prescribed_by)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_status_department ON transactions(status, department)');
    
    // Hospital settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS hospital_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Audit log table for tracking changes (production feature)
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        table_name VARCHAR(50) NOT NULL,
        record_id INTEGER NOT NULL,
        action VARCHAR(20) NOT NULL,
        old_values JSONB,
        new_values JSONB,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)');
    
    // Create updated_at trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    // Apply updated_at triggers to all tables
    const tables = ['users', 'patients', 'services', 'transactions', 'hospital_settings'];
    for (const table of tables) {
      await client.query(`
        DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
        CREATE TRIGGER update_${table}_updated_at 
        BEFORE UPDATE ON ${table} 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);
    }
    
    console.log('PostgreSQL database schema initialized successfully');
    
    // Insert default data
    await insertDefaultData(client);
    
  } catch (error) {
    console.error('Error initializing PostgreSQL database:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function insertDefaultData(client) {
  try {
    // Check if admin user exists
    const adminCheck = await client.query("SELECT id FROM users WHERE username = 'admin'");
    
    if (adminCheck.rows.length === 0) {
      const hashedPassword = bcrypt.hashSync('admin123', 12); // Higher cost for production
      await client.query(
        "INSERT INTO users (name, username, password, role) VALUES ($1, $2, $3, $4)",
        ['System Administrator', 'admin', hashedPassword, 'admin']
      );
      console.log('Default admin user created');
    }
    
    // Insert default hospital settings
    const settingsCheck = await client.query(
      "SELECT id FROM hospital_settings WHERE setting_key = 'hospital_number_prefix'"
    );
    
    if (settingsCheck.rows.length === 0) {
      const currentYear = new Date().getFullYear();
      const defaultSettings = [
        ['hospital_number_prefix', 'HOS', 'Hospital number prefix'],
        ['hospital_number_counter', '1', 'Current hospital number counter'],
        ['current_year', currentYear.toString(), 'Current year for number generation'],
        ['system_name', 'Hospital POS System', 'System name'],
        ['currency_symbol', '₦', 'Currency symbol (Nigerian Naira)'],
        ['receipt_footer', 'Thank you for choosing our services', 'Receipt footer message']
      ];
      
      for (const [key, value, description] of defaultSettings) {
        await client.query(
          "INSERT INTO hospital_settings (setting_key, setting_value, description) VALUES ($1, $2, $3)",
          [key, value, description]
        );
      }
      console.log('Default hospital settings created');
    }
    
    // Insert default services
    const servicesCheck = await client.query("SELECT COUNT(*) as count FROM services");
    
    if (parseInt(servicesCheck.rows[0].count) === 0) {
      const defaultServices = [
        ['Consultation', 'Medical', 2000.00],
        ['Revisitation', 'Medical', 1000.00],
        ['Blood Test (Full Blood Count)', 'Laboratory', 3000.00],
        ['Urine Test (Microscopy)', 'Laboratory', 1500.00],
        ['Malaria Test (RDT)', 'Laboratory', 1000.00],
        ['Pregnancy Test', 'Laboratory', 800.00],
        ['Ultrasound Scan', 'Radiology', 5000.00],
        ['X-Ray (Chest)', 'Radiology', 4000.00],
        ['ECG', 'Radiology', 2500.00],
        ['Paracetamol (500mg)', 'Pharmacy', 200.00],
        ['Antibiotics (Amoxicillin)', 'Pharmacy', 1500.00],
        ['Antimalarial (Artemether)', 'Pharmacy', 2000.00],
        ['Multivitamins', 'Pharmacy', 800.00]
      ];
      
      for (const [name, category, price] of defaultServices) {
        await client.query(
          "INSERT INTO services (name, category, price) VALUES ($1, $2, $3)",
          [name, category, price]
        );
      }
      console.log('Default services created');
    }
    
  } catch (error) {
    console.error('Error inserting default data:', error);
    throw error;
  }
}

// Database adapter functions to maintain compatibility with existing code
const db = {
  // Query wrapper for SELECT operations
  all: async (query, params = []) => {
    const client = await pool.connect();
    try {
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  },
  
  // Query wrapper for single row SELECT
  get: async (query, params = []) => {
    const client = await pool.connect();
    try {
      const result = await client.query(query, params);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  },
  
  // Query wrapper for INSERT/UPDATE/DELETE operations
  run: async (query, params = []) => {
    const client = await pool.connect();
    try {
      const result = await client.query(query, params);
      return {
        lastID: result.rows[0]?.id || null,
        changes: result.rowCount,
        stmt: result
      };
    } finally {
      client.release();
    }
  },
  
  // Transaction support
  transaction: async (callback) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
  
  // Prepared statement support
  prepare: (query) => {
    return {
      run: async (params = []) => {
        const client = await pool.connect();
        try {
          const result = await client.query(query, params);
          return {
            lastID: result.rows[0]?.id || null,
            changes: result.rowCount
          };
        } finally {
          client.release();
        }
      },
      all: async (params = []) => {
        const client = await pool.connect();
        try {
          const result = await client.query(query, params);
          return result.rows;
        } finally {
          client.release();
        }
      },
      finalize: () => {
        // No-op for PostgreSQL (no prepared statement cleanup needed)
      }
    };
  },
  
  // Close connection pool
  close: async () => {
    await pool.end();
  },
  
  // Get pool statistics
  getStats: () => {
    return {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    };
  },
  
  // Health check
  healthCheck: async () => {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      return {
        status: 'healthy',
        database: 'postgresql',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        database: 'postgresql',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    } finally {
      client.release();
    }
  }
};

// Initialize database on module load
initializeDatabase().catch(console.error);

module.exports = db;