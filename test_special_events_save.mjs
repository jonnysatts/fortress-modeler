// Test script to verify special event forecast creation is working
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jjearfzmvmpohbebcnju.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqZWFyZnptdm1wb2hiZWJjbmp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxOTY1NzksImV4cCI6MjA2Nzc3MjU3OX0.GVpM2scX6hCJYgrvMv2v6kJERnwiZ-it51Fqt4xJ400';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSpecialEventForecastSave() {
  console.log('🧪 Testing Special Event Forecast Save...');
  
  try {
    // Test 1: Check if tables exist and are accessible
    console.log('\n📋 Test 1: Checking table access...');
    
    const { data: forecastData, error: forecastError } = await supabase
      .from('special_event_forecasts')
      .select('count');
    
    if (forecastError) {
      console.error('❌ Forecast table access failed:', forecastError);
      return;
    }
    
    console.log('✅ special_event_forecasts table accessible');
    
    // Test 2: Try to insert a test forecast
    console.log('\n📋 Test 2: Attempting to insert test forecast...');
    
    const testForecast = {
      project_id: '2d6b92ce-b92c-41d6-9056-0164bc400cc0', // From the logs
      forecast_ticket_sales: 5000,
      forecast_fnb_revenue: 2000,
      forecast_staffing_costs: 1500,
      forecast_venue_costs: 1000,
      estimated_attendance: 100,
      ticket_price: 50,
      general_notes: 'Test forecast from debug script'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('special_event_forecasts')
      .insert(testForecast)
      .select()
      .single();
      
    if (insertError) {
      console.error('❌ Insert failed:', insertError);
      return;
    }
    
    console.log('✅ Test forecast inserted successfully:', insertData.id);
    
    // Test 3: Try to fetch the inserted forecast
    console.log('\n📋 Test 3: Fetching inserted forecast...');
    
    const { data: fetchData, error: fetchError } = await supabase
      .from('special_event_forecasts')
      .select('*')
      .eq('id', insertData.id)
      .single();
      
    if (fetchError) {
      console.error('❌ Fetch failed:', fetchError);
      return;
    }
    
    console.log('✅ Forecast fetched successfully:', {
      id: fetchData.id,
      project_id: fetchData.project_id,
      ticket_sales: fetchData.forecast_ticket_sales,
      general_notes: fetchData.general_notes
    });
    
    // Test 4: Clean up - delete the test forecast
    console.log('\n📋 Test 4: Cleaning up test data...');
    
    const { error: deleteError } = await supabase
      .from('special_event_forecasts')
      .delete()
      .eq('id', insertData.id);
      
    if (deleteError) {
      console.error('❌ Delete failed:', deleteError);
      return;
    }
    
    console.log('✅ Test forecast deleted successfully');
    
    console.log('\n🎉 ALL TESTS PASSED! Special Events functionality is working correctly.');
    console.log('\n💡 If the form save button still doesn\'t work, the issue is in the frontend JavaScript, not the database.');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testSpecialEventForecastSave();
