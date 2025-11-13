import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_ANON_KEY; // Using anon key for now

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAuthFix() {
  try {
    // Check the specific user we were tracking
    const targetUserId = '6a122021-efae-46d1-b8d1-73b622fa9659';
    
    console.log('🔍 Checking auth/profile synchronization...');
    
    // Check if profile exists for our target user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Error checking profile:', profileError);
      return;
    }
    
    if (profile) {
      console.log('✅ SUCCESS! Profile found for user:', targetUserId);
      console.log('📋 Profile details:', {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        created_at: profile.created_at,
        updated_at: profile.updated_at
      });
    } else {
      console.log('❌ Profile still missing for user:', targetUserId);
    }
    
    // Check overall auth/profile sync status
    const { data: profiles, error: allProfilesError } = await supabase
      .from('profiles')
      .select('id, email, created_at');
    
    if (allProfilesError) {
      console.error('❌ Error checking all profiles:', allProfilesError);
      return;
    }
    
    console.log('\n📊 Profile Summary:');
    console.log(`Total profiles: ${profiles?.length || 0}`);
    
    if (profiles && profiles.length > 0) {
      console.log('Recent profiles:');
      profiles.slice(-3).forEach(p => {
        console.log(`  - ${p.email} (${p.id}) - Created: ${p.created_at}`);
      });
    }
    
    console.log('\n✅ Auth fix verification completed!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkAuthFix();
