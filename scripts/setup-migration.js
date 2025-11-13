#!/usr/bin/env node

/**
 * Migration Setup Script
 * Helps configure the legacy data migration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log(`
🔧 Legacy Data Migration Setup

This script will help you configure the migration from your old Supabase database
to the new one.

📋 You'll need:
1. The anonymous key from your OLD Supabase project (vplafscpcsxdxbyoxfhq)
2. Your current .env file should already have the NEW database key

🔍 Where to find your old anonymous key:
1. Go to https://supabase.com/dashboard/project/vplafscpcsxdxbyoxfhq
2. Navigate to Settings > API
3. Copy the "anon public" key

📝 Setup Instructions:
`);

// Check if .env file exists
const envPath = path.join(process.cwd(), '.env');
const envExists = fs.existsSync(envPath);

if (envExists) {
  console.log('✅ Found .env file');
  
  // Read current .env
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  if (envContent.includes('OLD_SUPABASE_ANON_KEY')) {
    console.log('✅ OLD_SUPABASE_ANON_KEY already configured');
  } else {
    console.log('➕ Adding OLD_SUPABASE_ANON_KEY to .env file...');
    
    const newEnvContent = envContent + '\n# Legacy database migration\nOLD_SUPABASE_ANON_KEY=your_old_anonymous_key_here\n';
    
    fs.writeFileSync(envPath, newEnvContent);
    console.log('✅ Added OLD_SUPABASE_ANON_KEY to .env file');
    console.log('📝 Please edit .env and replace "your_old_anonymous_key_here" with your actual old key');
  }
} else {
  console.log('❌ No .env file found');
  console.log('📝 Please create a .env file first with your current Supabase configuration');
}

console.log(`
🚀 Next Steps:

1. Edit your .env file and set OLD_SUPABASE_ANON_KEY to your old database key
2. Test the migration with a dry run:
   npm run migrate-legacy -- --dry-run --verbose

3. Migrate projects only first (safer):
   npm run migrate-legacy -- --projects-only

4. Full migration:
   npm run migrate-legacy -- --verbose

📚 For help:
   npm run migrate-legacy -- --help
`);

// Add npm script to package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }
  
  if (!packageJson.scripts['migrate-legacy']) {
    packageJson.scripts['migrate-legacy'] = 'node scripts/migrate-legacy-data.js';
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Added npm script: npm run migrate-legacy');
  }
}
