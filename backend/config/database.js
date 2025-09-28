/**
 * Optimized Database Configuration for Hospital POS System
 * 
 * Production-Ready Features:
 * - PostgreSQL support with connection pooling
 * - SQLite optimization for development
 * - Automatic database switching based on environment
 * - Enhanced indexing for better performance
 * - Connection health monitoring
 * - Audit logging capabilities
 * 
 * Environment Variables:
 * - DATABASE_TYPE: 'sqlite' | 'postgres' (default: 'sqlite')
 * - DB_HOST: PostgreSQL host
 * - DB_PORT: PostgreSQL port
 * - DB_NAME: Database name
 * - DB_USER: Database username
 * - DB_PASSWORD: Database password
 * - DB_POOL_MAX: Maximum connections in pool
 * - DB_POOL_MIN: Minimum connections in pool
 */

const DATABASE_TYPE = process.env.DATABASE_TYPE || 'sqlite';

let db;

if (DATABASE_TYPE === 'postgres') {
  console.log('🚀 Initializing PostgreSQL database for production...');
  try {
    db = require('./database-postgres');
    console.log('✅ PostgreSQL database initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize PostgreSQL:', error.message);
    console.log('🔄 Falling back to SQLite...');
    db = require('./database-sqlite');
  }
} else {
  console.log('🔧 Initializing SQLite database for development...');
  db = require('./database-sqlite');
}

// Enhanced database interface with monitoring
const enhancedDb = {
  // Expose the core database instance for backward compatibility
  db,
  
  // Pass through all SQLite/PostgreSQL methods
  get: db.get ? db.get.bind(db) : undefined,
  run: db.run ? db.run.bind(db) : undefined,
  all: db.all ? db.all.bind(db) : undefined,
  each: db.each ? db.each.bind(db) : undefined,
  prepare: db.prepare ? db.prepare.bind(db) : undefined,
  close: db.close ? db.close.bind(db) : undefined,
  serialize: db.serialize ? db.serialize.bind(db) : undefined,
  parallelize: db.parallelize ? db.parallelize.bind(db) : undefined,
  
  // Database type information
  DATABASE_TYPE,
  isPostgreSQL: DATABASE_TYPE === 'postgres',
  isSQLite: DATABASE_TYPE === 'sqlite',
  
  // Performance monitoring
  getStats: () => {
    if (db.getStats) {
      return {
        type: DATABASE_TYPE,
        ...db.getStats()
      };
    }
    return { type: DATABASE_TYPE };
  },
  
  // Health check
  healthCheck: async () => {
    try {
      if (DATABASE_TYPE === 'postgres') {
        await db.get('SELECT 1 as health');
      } else {
        await new Promise((resolve, reject) => {
          db.get('SELECT 1 as health', (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
      }
      return { status: 'healthy', database: DATABASE_TYPE };
    } catch (error) {
      return { status: 'unhealthy', database: DATABASE_TYPE, error: error.message };
    }
  },
  
  // Graceful shutdown
  shutdown: async () => {
    console.log('🔄 Shutting down database connections...');
    if (db.close) {
      await db.close();
    }
    console.log('✅ Database connections closed');
  }
};

// Handle process termination gracefully
process.on('SIGINT', async () => {
  await enhancedDb.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await enhancedDb.shutdown();
  process.exit(0);
});

module.exports = enhancedDb;