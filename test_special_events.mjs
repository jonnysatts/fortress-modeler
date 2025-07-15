import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseStructure() {
  console.log('🔍 Checking projects table structure...');
  
  // Check if event_type column exists
  const { data: columns, error: columnsError } = await supabase
    .from('projects')
    .select('*')
    .limit(1);
  
  if (columnsError) {
    console.error('❌ Error checking table structure:', columnsError);
    return;
  }

  console.log('✅ Projects table accessible');
  
  // Get table schema info
  const { data: schemaData, error: schemaError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'projects' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `
  });

  if (schemaError) {
    console.log('Could not get detailed schema, checking sample project...');
    
    // Just check if there are any projects and what fields they have
    const { data: sampleProjects, error: sampleError } = await supabase
      .from('projects')
      .select('id, name, event_type, event_date, event_end_date')
      .limit(3);
    
    if (sampleError) {
      console.error('❌ Error fetching sample projects:', sampleError);
    } else {
      console.log('📄 Sample projects structure:');
      sampleProjects.forEach(project => {
        console.log(`  - ${project.name}: event_type=${project.event_type}, event_date=${project.event_date}`);
      });
    }
  } else {
    console.log('📋 Table schema:');
    schemaData.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
  }
}

async function testProjectCreation() {
  console.log('\n🧪 Testing project creation with special event...');
  
  try {
    // Authenticate test user
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD
    });
    
    if (authError || !user) {
      console.log('❌ No authenticated user. Cannot test project creation.');
      return;
    }

    console.log(`✅ Authenticated as: ${user.email}`);

    const testProject = {
      user_id: user.id,
      name: 'Test Special Event Project',
      description: 'Testing special event creation',
      product_type: 'event',
      target_audience: 'test audience',
      data: {},
      timeline: { startDate: new Date().toISOString() },
      avatar_image: null,
      is_public: false,
      owner_email: user.email,
      share_count: 0,
      event_type: 'special',
      event_date: new Date('2025-08-15').toISOString(),
      event_end_date: null,
    };

    console.log('📤 Inserting test project with data:', {
      name: testProject.name,
      event_type: testProject.event_type,
      event_date: testProject.event_date
    });

    const { data, error } = await supabase
      .from('projects')
      .insert(testProject)
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating test project:', error);
    } else {
      console.log('✅ Test project created successfully!');
      console.log('📄 Created project data:', {
        id: data.id,
        name: data.name,
        event_type: data.event_type,
        event_date: data.event_date,
        event_end_date: data.event_end_date
      });

      // Clean up - delete the test project
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', data.id);

      if (deleteError) {
        console.log('⚠️ Could not delete test project:', deleteError);
      } else {
        console.log('🗑️ Test project cleaned up');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error during test:', error);
  }
}

async function main() {
  try {
    await checkDatabaseStructure();
    await testProjectCreation();
  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

main();
