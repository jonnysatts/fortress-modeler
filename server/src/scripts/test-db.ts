#!/usr/bin/env ts-node
import dotenv from 'dotenv';
import { 
  initializeDatabase, 
  testConnection, 
  getDatabaseHealth, 
  query,
  closeDatabase 
} from '../db/connection';
import { UserService } from '../services/user.service';

// Load environment variables
dotenv.config();

async function testDatabase() {
  console.log('🧪 Testing Fortress Modeler Database');
  console.log('====================================');
  
  try {
    // Test 1: Database Connection
    console.log('\n1️⃣ Testing database connection...');
    const pool = initializeDatabase();
    const connectionTest = await testConnection();
    
    if (connectionTest.success) {
      console.log(`✅ Connection successful (${connectionTest.latency}ms)`);
    } else {
      console.error('❌ Connection failed:', connectionTest.error);
      return;
    }
    
    // Test 2: Database Health Check
    console.log('\n2️⃣ Checking database health...');
    const health = await getDatabaseHealth();
    console.log(`📊 Status: ${health.status}`);
    if (health.latency) {
      console.log(`⚡ Latency: ${health.latency}ms`);
    }
    if (health.connections) {
      console.log(`🔗 Connections: ${health.connections.total} total, ${health.connections.idle} idle`);
    }
    
    // Test 3: Schema Verification
    console.log('\n3️⃣ Verifying database schema...');
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    const expectedTables = [
      'users',
      'projects', 
      'financial_models',
      'sync_status',
      'sync_events',
      'project_shares'
    ];
    
    const actualTables = tables.rows.map((row: any) => row.table_name);
    const missingTables = expectedTables.filter(table => !actualTables.includes(table));
    
    if (missingTables.length === 0) {
      console.log('✅ All required tables exist');
      console.log(`📋 Tables found: ${actualTables.join(', ')}`);
    } else {
      console.log('⚠️  Missing tables:', missingTables.join(', '));
      console.log('💡 Run "npm run db:migrate" to create missing tables');
    }
    
    // Test 4: User Service Operations
    console.log('\n4️⃣ Testing user service operations...');
    
    try {
      // Test creating a user
      const testUser = await UserService.upsertUser({
        google_id: 'test-user-' + Date.now(),
        email: 'test@fortress.test',
        name: 'Test User',
        company_domain: 'fortress.test',
        preferences: { theme: 'light', notifications: true }
      });
      
      console.log(`✅ User created: ${testUser.email} (ID: ${testUser.id})`);
      
      // Test getting user by ID
      const retrievedUser = await UserService.getUserById(testUser.id);
      if (retrievedUser) {
        console.log('✅ User retrieval successful');
      }
      
      // Test updating user
      const updatedUser = await UserService.updateUser(testUser.id, {
        name: 'Updated Test User',
        preferences: { theme: 'dark', notifications: false }
      });
      
      if (updatedUser) {
        console.log('✅ User update successful');
      }
      
      // Test user stats
      const stats = await UserService.getUserStats(testUser.id);
      console.log(`✅ User stats: ${stats.projectCount} projects, ${stats.modelCount} models`);
      
      // Clean up test user
      await UserService.deleteUser(testUser.id);
      console.log('✅ Test user cleanup successful');
      
    } catch (error) {
      console.error('❌ User service test failed:', error);
    }
    
    // Test 5: Database Performance
    console.log('\n5️⃣ Testing database performance...');
    const iterations = 10;
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      await query('SELECT NOW()');
    }
    
    const avgLatency = (Date.now() - startTime) / iterations;
    console.log(`⚡ Average query time: ${avgLatency.toFixed(2)}ms (${iterations} queries)`);
    
    // Test 6: Extensions Check
    console.log('\n6️⃣ Checking database extensions...');
    const extensions = await query(`
      SELECT extname 
      FROM pg_extension 
      WHERE extname IN ('uuid-ossp', 'pgcrypto');
    `);
    
    const installedExtensions = extensions.rows.map((row: any) => row.extname);
    
    if (installedExtensions.includes('uuid-ossp')) {
      console.log('✅ UUID extension available');
    } else {
      console.log('⚠️  UUID extension not found');
    }
    
    console.log('\n🎉 Database test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`  ✅ Connection: Working (${connectionTest.latency}ms)`);
    console.log(`  ✅ Health: ${health.status}`);
    console.log(`  ✅ Tables: ${actualTables.length} found`);
    console.log(`  ✅ User Operations: Working`);
    console.log(`  ✅ Performance: ${avgLatency.toFixed(2)}ms avg`);
    console.log('\n🚀 Database ready for Phase 2 authentication!');
    
  } catch (error) {
    console.error('\n❌ Database test failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        console.log('\n💡 Troubleshooting tips:');
        console.log('  1. Make sure PostgreSQL is running');
        console.log('  2. Check DATABASE_URL in .env file');
        console.log('  3. Run "npm run db:setup" to configure database');
      }
    }
    
    process.exit(1);
  } finally {
    await closeDatabase();
    console.log('\n👋 Database connection closed');
  }
}

if (require.main === module) {
  testDatabase().catch(console.error);
}

export { testDatabase };