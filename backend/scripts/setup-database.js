/**
 * Database Setup Script
 * Creates initial database schema and inserts default data
 */

require('dotenv').config();
const db = require('../config/database');

async function setupDatabase() {
  console.log('🚀 Setting up Hospital POS Database...');
  console.log(`Database Type: ${db.DATABASE_TYPE}`);
  
  try {
    // Wait for database initialization
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Perform health check
    const health = await db.healthCheck();
    console.log('Database Health:', health);
    
    if (health.status === 'healthy') {
      console.log('✅ Database setup completed successfully!');
      
      if (db.getStats) {
        const stats = db.getStats();
        console.log('Database Statistics:', stats);
      }
    } else {
      console.error('❌ Database setup failed:', health.error);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Database setup error:', error);
    process.exit(1);
  } finally {
    if (db.shutdown) {
      await db.shutdown();
    }
    process.exit(0);
  }
}

setupDatabase();