import { query } from '../db/connection';

async function fixSchema() {
  try {
    console.log('🔧 Checking and fixing database schema...');
    
    // Check if the name column exists
    const checkColumn = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'financial_models' 
      AND column_name = 'name'
    `);
    
    if (checkColumn.rows.length === 0) {
      console.log('📝 Adding missing name column to financial_models table...');
      await query(`
        ALTER TABLE financial_models 
        ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT 'Untitled Model'
      `);
      console.log('✅ Name column added successfully');
    } else {
      console.log('✅ Name column already exists');
    }
    
    // Check other potential missing columns
    const allColumns = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'financial_models'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Current financial_models columns:', allColumns.rows.map(r => r.column_name));
    
    console.log('🎉 Schema check completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Schema fix failed:', error);
    process.exit(1);
  }
}

fixSchema();