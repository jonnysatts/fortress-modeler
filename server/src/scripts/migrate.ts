#!/usr/bin/env ts-node
import dotenv from 'dotenv';
import { runMigrations, initializeDatabase, closeDatabase } from '../db/connection';

// Load environment variables
dotenv.config();

async function migrate() {
  console.log('🚀 Starting database migration...');
  console.log('=====================================');
  
  try {
    // Initialize database connection
    const pool = initializeDatabase();
    console.log('✅ Database connection established');
    
    // Run migrations
    const result = await runMigrations();
    
    if (result.success) {
      console.log('✅ Database migration completed successfully!');
      console.log('');
      console.log('📋 Tables created:');
      console.log('  - users (with Google OAuth support)');
      console.log('  - projects (with sync capabilities)');
      console.log('  - financial_models (linked to projects)');
      console.log('  - sync_status (per-user sync tracking)');
      console.log('  - sync_events (conflict resolution)');
      console.log('  - project_shares (future sharing feature)');
      console.log('');
      console.log('🔒 Security features enabled:');
      console.log('  - Row Level Security (RLS) policies');
      console.log('  - User data isolation');
      console.log('  - Automatic timestamp updates');
      console.log('');
      console.log('🎯 Ready for Phase 2 authentication!');
    } else {
      console.error('❌ Migration failed:', result.error);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
    console.log('👋 Database connection closed');
  }
}

if (require.main === module) {
  migrate().catch(console.error);
}

export { migrate };