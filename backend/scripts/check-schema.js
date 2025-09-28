const db = require('../config/database');

console.log('Checking database schema...');

db.all("PRAGMA table_info(transactions)", (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Transactions table columns:');
    rows.forEach(col => {
      console.log(`- ${col.name} (${col.type})`);
    });
    
    const hasDiagnosis = rows.some(col => col.name === 'diagnosis');
    console.log(`\nDiagnosis column exists: ${hasDiagnosis}`);
  }
  
  process.exit(0);
});