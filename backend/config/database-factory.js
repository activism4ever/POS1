/**
 * Database Factory - Optimized for Hospital POS System
 * Supports both SQLite (development) and PostgreSQL (production)
 * 
 * Environment Variables:
 * - DATABASE_TYPE: 'sqlite' or 'postgres' (default: 'sqlite')
 * - DB_HOST: PostgreSQL host (default: 'localhost')
 * - DB_PORT: PostgreSQL port (default: 5432)
 * - DB_NAME: Database name (default: 'hospital_pos')
 * - DB_USER: Database username (default: 'postgres')
 * - DB_PASSWORD: Database password
 * - DB_POOL_MAX: Maximum connections (default: 20)
 * - DB_POOL_MIN: Minimum connections (default: 2)
 */

const DATABASE_TYPE = process.env.DATABASE_TYPE || 'sqlite';

let db;

if (DATABASE_TYPE === 'postgres') {
  console.log('🔄 Initializing PostgreSQL database...');
  db = require('./database-postgres');
} else {
  console.log('🔄 Initializing SQLite database...');
  db = require('./database-sqlite');
}

// Export database with type information
module.exports = {
  ...db,
  DATABASE_TYPE,
  isPostgreSQL: DATABASE_TYPE === 'postgres',
  isSQLite: DATABASE_TYPE === 'sqlite'
};