#!/usr/bin/env node

/**
 * Old Database Connection Test
 * Diagnoses connectivity issues with the legacy Supabase database
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const OLD_DB_URL = 'https://issmshemlkrucmxcvibs.supabase.co';
const OLD_ANON_KEY = process.env.OLD_SUPABASE_ANON_KEY;
const OLD_SERVICE_KEY = process.env.OLD_SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing Old Database Connection...\n');

// Test basic connectivity
const testConnectivity = async () => {
  console.log('1. Testing basic connectivity...');
  
  try {
    const response = await fetch(`${OLD_DB_URL}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': OLD_ANON_KEY,
        'Authorization': `Bearer ${OLD_ANON_KEY}`
      }
    });
    
    console.log(`✅ HTTP Status: ${response.status}`);
    console.log(`✅ Database is accessible\n`);
    return true;
  } catch (error) {
    console.log(`❌ Connection failed: ${error.message}`);
    console.log(`❌ Database may be paused, deleted, or unreachable\n`);
    return false;
  }
};

// Test authentication with anon key
const testAnonAuth = async () => {
  console.log('2. Testing anonymous key authentication...');
  
  if (!OLD_ANON_KEY) {
    console.log('❌ OLD_SUPABASE_ANON_KEY not found in .env');
    return false;
  }
  
  try {
    const client = createClient(OLD_DB_URL, OLD_ANON_KEY);
    
    // Try to access a basic endpoint
    const { data, error } = await client.from('projects').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.log(`❌ Auth error: ${error.message}`);
      return false;
    }
    
    console.log(`✅ Anonymous authentication successful`);
    console.log(`✅ Projects table accessible\n`);
    return true;
  } catch (error) {
    console.log(`❌ Authentication failed: ${error.message}\n`);
    return false;
  }
};

// Test service role key authentication
const testServiceAuth = async () => {
  console.log('3. Testing service role key authentication...');
  
  if (!OLD_SERVICE_KEY) {
    console.log('❌ OLD_SUPABASE_SERVICE_ROLE_KEY not found in .env');
    return false;
  }
  
  try {
    const client = createClient(OLD_DB_URL, OLD_SERVICE_KEY);
    
    // Try to access projects table
    const { data, error } = await client.from('projects').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.log(`❌ Service auth error: ${error.message}`);
      return false;
    }
    
    console.log(`✅ Service role authentication successful`);
    console.log(`✅ Projects table accessible with service key\n`);
    return true;
  } catch (error) {
    console.log(`❌ Service authentication failed: ${error.message}\n`);
    return false;
  }
};

// Test data retrieval
const testDataRetrieval = async () => {
  console.log('4. Testing data retrieval...');
  
  try {
    const client = createClient(OLD_DB_URL, OLD_SERVICE_KEY || OLD_ANON_KEY);
    
    // Try to fetch a few projects
    const { data: projects, error } = await client
      .from('projects')
      .select('id, name, created_at')
      .limit(5);
    
    if (error) {
      console.log(`❌ Data retrieval error: ${error.message}`);
      return false;
    }
    
    console.log(`✅ Successfully retrieved ${projects?.length || 0} projects`);
    
    if (projects && projects.length > 0) {
      console.log('\n📋 Sample Projects:');
      projects.forEach(project => {
        console.log(`   - ${project.name} (${project.id})`);
      });
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Data retrieval failed: ${error.message}`);
    return false;
  }
};

// Run all tests
const runDiagnostics = async () => {
  console.log(`🔧 Database URL: ${OLD_DB_URL}`);
  console.log(`🔑 Anon Key: ${OLD_ANON_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`🔑 Service Key: ${OLD_SERVICE_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log('\n' + '='.repeat(50) + '\n');
  
  const results = {
    connectivity: await testConnectivity(),
    anonAuth: await testAnonAuth(),
    serviceAuth: await testServiceAuth(),
    dataRetrieval: false
  };
  
  if (results.connectivity && (results.anonAuth || results.serviceAuth)) {
    results.dataRetrieval = await testDataRetrieval();
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 DIAGNOSTIC SUMMARY:');
  console.log('='.repeat(50));
  console.log(`Connectivity: ${results.connectivity ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Anonymous Auth: ${results.anonAuth ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Service Auth: ${results.serviceAuth ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Data Retrieval: ${results.dataRetrieval ? '✅ PASS' : '❌ FAIL'}`);
  
  console.log('\n🔍 RECOMMENDATIONS:');
  
  if (!results.connectivity) {
    console.log('❌ The old database appears to be inaccessible');
    console.log('   - Check if the database is paused in Supabase Dashboard');
    console.log('   - Verify the database URL is correct');
    console.log('   - Check your internet connection');
    console.log('   - Visit https://supabase.com/dashboard/project/vplafscpcsxdxbyoxfhq');
  } else if (!results.anonAuth && !results.serviceAuth) {
    console.log('❌ Authentication is failing');
    console.log('   - Verify your keys are correct in .env file');
    console.log('   - Check if keys have expired');
    console.log('   - Ensure RLS policies allow access');
  } else if (!results.dataRetrieval) {
    console.log('❌ Data retrieval is failing');
    console.log('   - Check RLS policies on the projects table');
    console.log('   - Verify the table structure matches expectations');
  } else {
    console.log('✅ All tests passed! Migration should work.');
    console.log('   - Try running the migration again');
    console.log('   - Use: node scripts/migrate-legacy-data.js --dry-run --verbose');
  }
};

// Execute diagnostics
runDiagnostics().catch(error => {
  console.error('💥 Diagnostic failed:', error.message);
  process.exit(1);
});
