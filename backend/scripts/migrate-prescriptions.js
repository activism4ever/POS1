/**
 * Database Migration Script - Enhanced Prescriptions
 * Adds quantity support and prevents duplicate prescriptions
 */

const db = require('../config/database');

async function migrateDatabase() {
  console.log('🔧 Starting prescription enhancement migration...');
  
  try {
    // Check if quantity column exists
    const tableInfo = await new Promise((resolve, reject) => {
      db.all("PRAGMA table_info(transactions)", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    const hasQuantityColumn = tableInfo.some(col => col.name === 'quantity');
    const hasPrescriptionDateColumn = tableInfo.some(col => col.name === 'prescription_date');
    const hasDiagnosisColumn = tableInfo.some(col => col.name === 'diagnosis');
    
    // Add quantity column if it doesn't exist
    if (!hasQuantityColumn) {
      await new Promise((resolve, reject) => {
        db.run("ALTER TABLE transactions ADD COLUMN quantity INTEGER DEFAULT 1", (err) => {
          if (err) reject(err);
          else {
            console.log('✅ Added quantity column to transactions table');
            resolve();
          }
        });
      });
    }
    
    // Add prescription_date column if it doesn't exist
    if (!hasPrescriptionDateColumn) {
      await new Promise((resolve, reject) => {
        db.run("ALTER TABLE transactions ADD COLUMN prescription_date TEXT", (err) => {
          if (err) reject(err);
          else {
            console.log('✅ Added prescription_date column to transactions table');
            resolve();
          }
        });
      });
    }
    
    // Add diagnosis column if it doesn't exist
    if (!hasDiagnosisColumn) {
      await new Promise((resolve, reject) => {
        db.run("ALTER TABLE transactions ADD COLUMN diagnosis TEXT", (err) => {
          if (err) reject(err);
          else {
            console.log('✅ Added diagnosis column to transactions table');
            resolve();
          }
        });
      });
    }
    
    // Update existing records to have quantity = 1 and prescription_date
    await new Promise((resolve, reject) => {
      db.run(`
        UPDATE transactions 
        SET quantity = 1, 
            prescription_date = DATE(created_at)
        WHERE quantity IS NULL OR prescription_date IS NULL
      `, (err) => {
        if (err) reject(err);
        else {
          console.log('✅ Updated existing records with default quantity and prescription date');
          resolve();
        }
      });
    });
    
    // Create unique constraint for preventing duplicate prescriptions
    // Note: SQLite doesn't support adding constraints to existing tables directly
    // So we'll handle this logic in the application layer
    
    // Create enhanced indexes for better performance
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_transactions_patient_service_date ON transactions(patient_id, service_id, prescription_date)",
      "CREATE INDEX IF NOT EXISTS idx_transactions_quantity ON transactions(quantity)",
      "CREATE INDEX IF NOT EXISTS idx_transactions_status_prescribed ON transactions(status, prescribed_by)"
    ];
    
    for (const indexSQL of indexes) {
      await new Promise((resolve, reject) => {
        db.run(indexSQL, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    
    console.log('✅ Enhanced database indexes created');
    
    // Analyze existing duplicates and merge them
    const duplicates = await new Promise((resolve, reject) => {
      db.all(`
        SELECT patient_id, service_id, DATE(created_at) as prescription_date, 
               COUNT(*) as count, GROUP_CONCAT(id) as transaction_ids
        FROM transactions 
        WHERE prescribed_by IS NOT NULL
        GROUP BY patient_id, service_id, DATE(created_at)
        HAVING COUNT(*) > 1
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    if (duplicates.length > 0) {
      console.log(`📊 Found ${duplicates.length} groups of duplicate prescriptions to merge`);
      
      for (const duplicate of duplicates) {
        const transactionIds = duplicate.transaction_ids.split(',').map(id => parseInt(id));
        const primaryId = transactionIds[0];
        const duplicateIds = transactionIds.slice(1);
        
        // Update primary record with total quantity
        await new Promise((resolve, reject) => {
          db.run(`
            UPDATE transactions 
            SET quantity = ?
            WHERE id = ?
          `, [duplicate.count, primaryId], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        
        // Delete duplicate records
        if (duplicateIds.length > 0) {
          await new Promise((resolve, reject) => {
            db.run(`
              DELETE FROM transactions 
              WHERE id IN (${duplicateIds.map(() => '?').join(',')})
            `, duplicateIds, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }
        
        console.log(`✅ Merged ${duplicate.count} duplicate prescriptions for patient ${duplicate.patient_id}, service ${duplicate.service_id}`);
      }
    }
    
    console.log('🎉 Prescription enhancement migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Export for use in other modules
module.exports = migrateDatabase;

// Run migration if called directly
if (require.main === module) {
  migrateDatabase()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration error:', error);
      process.exit(1);
    });
}