// Simple diagnostic script to check Supabase database state
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://issmshemlkrucmxcvibs.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzc21zaGVtbGtydWNteGN2aWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMzM1MzAsImV4cCI6MjA2NzcwOTUzMH0.xhxwSFCNSsG4Q1xta4L_uLKlnSHZfp7N3wXW0E3fOdg'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkDatabaseHealth() {
  console.log('🔍 Starting database health check...')
  
  try {
    // Test 1: Check if we can connect at all
    console.log('1. Testing basic connection...')
    const { data, error } = await supabase.from('profiles').select('count').limit(1)
    if (error) {
      console.error('❌ Basic connection failed:', error)
      return false
    }
    console.log('✅ Basic connection successful')

    // Test 2: Check authentication
    console.log('2. Testing authentication...')
    const { data: session } = await supabase.auth.getSession()
    console.log('Session:', session.session ? 'Active' : 'None')
    
    if (session.session) {
      console.log('User ID:', session.session.user.id)
      
      // Test 3: Check if profile exists
      console.log('3. Testing profile lookup...')
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.session.user.id)
        .single()
      
      if (profileError) {
        console.error('❌ Profile lookup failed:', profileError)
        
        // Try to create profile
        console.log('4. Attempting to create profile...')
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{
            id: session.session.user.id,
            email: session.session.user.email,
            full_name: session.session.user.user_metadata?.full_name || session.session.user.email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single()
        
        if (createError) {
          console.error('❌ Profile creation failed:', createError)
          return false
        }
        console.log('✅ Profile created successfully:', newProfile)
      } else {
        console.log('✅ Profile exists:', profile)
      }
    }

    // Test 4: Check table structure
    console.log('5. Testing table queries...')
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('count')
      .limit(1)
    
    if (projectError) {
      console.error('❌ Projects table query failed:', projectError)
      return false
    }
    console.log('✅ Projects table accessible')

    return true
  } catch (error) {
    console.error('❌ Database health check failed:', error)
    return false
  }
}

// Run the check
checkDatabaseHealth().then(result => {
  if (result) {
    console.log('🎉 Database health check passed!')
  } else {
    console.log('💥 Database health check failed!')
  }
})
