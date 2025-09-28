/**
 * Database Migration Script
 * Handles migrations from SQLite to PostgreSQL
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');

// SQLite connection
const sqliteDb = new sqlite3.Database(path.join(__dirname, '../config/hospital_pos.db'));

// PostgreSQL connection
const pgPool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function migrateSQLiteToPostgreSQL() {
  console.log('🔄 Starting migration from SQLite to PostgreSQL...');
  
  try {
    const client = await pgPool.connect();
    
    // Tables to migrate
    const tables = ['users', 'patients', 'services', 'transactions', 'hospital_settings'];
    
    for (const table of tables) {
      console.log(`📦 Migrating ${table}...`);
      
      // Get data from SQLite
      const sqliteData = await new Promise((resolve, reject) => {
        sqliteDb.all(`SELECT * FROM ${table}`, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      if (sqliteData.length > 0) {
        // Clear existing data in PostgreSQL
        await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
        
        // Insert data into PostgreSQL
        for (const row of sqliteData) {
          const columns = Object.keys(row).filter(key => key !== 'id'); // Exclude auto-increment ID
          const values = columns.map(col => row[col]);
          const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
          
          await client.query(
            `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
            values
          );
        }
        
        console.log(`✅ Migrated ${sqliteData.length} records from ${table}`);
      } else {
        console.log(`⚠️  No data found in ${table}`);
      }
    }
    
    // Reset sequences
    for (const table of tables) {
      await client.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE(MAX(id), 1)) FROM ${table}`);
    }
    
    client.release();
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    sqliteDb.close();
    await pgPool.end();
    process.exit(0);
  }
}

if (require.main === module) {
  migrateSQLiteToPostgreSQL();
}

module.exports = { migrateSQLiteToPostgreSQL };