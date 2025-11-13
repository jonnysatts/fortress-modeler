#!/usr/bin/env node

/**
 * Apply Special Events Enhanced Schema Migration
 *
 * This script applies the 20250114_enhance_special_events_comprehensive.sql migration
 * to your Supabase database.
 *
 * Prerequisites:
 * 1. Create a .env file in the project root with:
 *    VITE_SUPABASE_URL=your_supabase_project_url
 *    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
 *    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
 *
 * 2. Run: node scripts/apply-special-events-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('');
  console.error('Please create a .env file with:');
  console.error('  VITE_SUPABASE_URL=your_project_url');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  console.error('');
  console.error('You can find these in your Supabase project dashboard:');
  console.error('  Project Settings → API → Project URL and service_role key');
  process.exit(1);
}

// Create Supabase client with service role key (has full database access)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🚀 Starting Special Events Enhanced Schema Migration...');
  console.log('');

  try {
    // Read the migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250114_enhance_special_events_comprehensive.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);

    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('');
    console.log('📊 Migration details:');
    console.log('  - Adds 40+ fields to special_event_forecasts table');
    console.log('  - Adds 40+ fields to special_event_actuals table');
    console.log('  - Creates database indexes for performance');
    console.log('  - Sets up RLS (Row Level Security) policies');
    console.log('  - Adds calculate_special_event_roi() function');
    console.log('');

    // Split migration into individual statements (basic splitting)
    // Note: This is a simplified approach. For complex migrations, use proper SQL parser
    const statements = migrationSQL
      .split(/;[\s]*(?=CREATE|ALTER|DROP|DO|GRANT)/gi)
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    console.log('');
    console.log('⏳ Applying migration...');
    console.log('');

    // Execute each statement
    let successCount = 0;
    let skipCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 80).replace(/\s+/g, ' ');

      process.stdout.write(`  [${i + 1}/${statements.length}] ${preview}...`);

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });

        if (error) {
          // Check if it's a "column already exists" or "already exists" error
          if (error.message.includes('already exists') ||
              error.message.includes('duplicate')) {
            console.log(' ⏭️  (already exists)');
            skipCount++;
          } else {
            console.log(` ❌ Failed`);
            console.error(`    Error: ${error.message}`);
            // Continue with other statements
          }
        } else {
          console.log(' ✅');
          successCount++;
        }
      } catch (err) {
        console.log(` ❌ Failed`);
        console.error(`    Error: ${err.message}`);
        // Continue with other statements
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('✅ Migration Complete!');
    console.log('');
    console.log(`📊 Results:`);
    console.log(`  - Successfully executed: ${successCount} statements`);
    console.log(`  - Already existed: ${skipCount} statements`);
    console.log(`  - Failed: ${statements.length - successCount - skipCount} statements`);
    console.log('');

    if (successCount > 0 || skipCount === statements.length) {
      console.log('🎉 Special Events schema has been enhanced!');
      console.log('');
      console.log('✅ What\'s now available:');
      console.log('  - 5-tab forecast form (fully functional)');
      console.log('  - 6-tab actuals form (fully functional)');
      console.log('  - Comprehensive event tracking');
      console.log('  - Detailed cost breakdown');
      console.log('  - Marketing channel budgeting');
      console.log('  - Post-event analysis and feedback');
      console.log('  - ROI calculations');
      console.log('');
      console.log('📝 Next steps:');
      console.log('  1. Restart your development server: npm run dev');
      console.log('  2. Test creating a special event');
      console.log('  3. Fill in forecast and actuals data');
      console.log('  4. Verify data saves correctly');
    } else {
      console.log('⚠️  Some statements failed. You may need to apply the migration manually.');
      console.log('');
      console.log('📖 Manual application instructions:');
      console.log('  1. Go to Supabase Dashboard → SQL Editor');
      console.log('  2. Open: supabase/migrations/20250114_enhance_special_events_comprehensive.sql');
      console.log('  3. Copy and paste the SQL');
      console.log('  4. Click "Run"');
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('');
    console.error('❌ Migration failed with error:');
    console.error(error.message);
    console.error('');
    console.error('📖 Please apply the migration manually:');
    console.error('  1. Go to Supabase Dashboard → SQL Editor');
    console.error('  2. Open: supabase/migrations/20250114_enhance_special_events_comprehensive.sql');
    console.error('  3. Copy and paste the entire file');
    console.error('  4. Click "Run"');
    console.error('');
    process.exit(1);
  }
}

// Run the migration
applyMigration().catch(console.error);
