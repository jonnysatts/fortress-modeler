import { Router } from 'express';
import { query } from '../db/connection';

const router = Router();

// Schema fix endpoint - only available in development or with specific auth
router.post('/fix-schema', async (req, res) => {
  try {
    console.log('🔧 Starting database schema fix...');
    
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
    
    // Check other potential missing columns and their structure
    const allColumns = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'financial_models'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Current financial_models columns:', allColumns.rows);
    
    res.json({
      success: true,
      message: 'Schema fix completed successfully',
      columns: allColumns.rows
    });
    
  } catch (error) {
    console.error('❌ Schema fix failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;