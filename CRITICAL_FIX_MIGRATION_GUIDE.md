# 🚨 CRITICAL FIX: Special Events Schema Migration Guide

## ⚠️ IMPORTANT: Apply This Migration ASAP

The special events feature is currently **BROKEN** because the enhanced database schema was never applied. Your sophisticated UI components expect 40+ database fields that don't exist yet.

---

## 📋 What This Migration Does

The migration `20250114_enhance_special_events_comprehensive.sql` adds:

### Special Event Forecasts Table (18 new fields):
- ✅ Revenue breakdown: `forecast_ticket_sales`, `forecast_fnb_revenue`, `forecast_merch_revenue`, `forecast_sponsorship_income`, `forecast_other_income`
- ✅ COGS fields: `forecast_fnb_cogs_pct`, `forecast_merch_cogs_pct`
- ✅ Cost breakdown: `forecast_staffing_costs`, `forecast_venue_costs`, `forecast_vendor_costs`, `forecast_marketing_costs`, `forecast_production_costs`, `forecast_other_costs`
- ✅ Marketing budgets: `marketing_email_budget`, `marketing_social_budget`, `marketing_influencer_budget`, `marketing_paid_ads_budget`, `marketing_content_budget`, `marketing_strategy`
- ✅ Event details: `estimated_attendance`, `ticket_price`
- ✅ Notes: `revenue_notes`, `cost_notes`, `marketing_notes`, `general_notes`

### Special Event Actuals Table (27 new fields):
- ✅ Actual revenue: `actual_ticket_sales`, `actual_fnb_revenue`, `actual_merch_revenue`, `actual_sponsorship_income`, `actual_other_income`
- ✅ COGS tracking: `actual_fnb_cogs`, `actual_merch_cogs`
- ✅ Actual costs: `actual_staffing_costs`, `actual_venue_costs`, `actual_vendor_costs`, `actual_marketing_costs`, `actual_production_costs`, `actual_other_costs`
- ✅ Marketing performance: 6 fields for channel-specific tracking
- ✅ Event metrics: `actual_attendance`, `attendance_breakdown`, `average_ticket_price`
- ✅ Success indicators: `success_rating`, `event_success_indicators`, `challenges_faced`, `lessons_learned`, `recommendations_future`
- ✅ Post-event analysis: `customer_feedback_summary`, `team_feedback`, `vendor_feedback`
- ✅ Additional metrics: `social_media_engagement`, `press_coverage`, `brand_impact_assessment`
- ✅ Variance notes: 3 fields

### Plus:
- ✅ Database indexes for performance
- ✅ RLS (Row Level Security) policies
- ✅ Helper function: `calculate_special_event_roi()`
- ✅ Unique constraint: one actuals entry per special event

---

## 🔧 How to Apply the Migration

### Option 1: Using Supabase Dashboard (Easiest)

1. **Go to your Supabase project dashboard**
   - Navigate to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and paste the migration SQL**
   - Open: `supabase/migrations/20250114_enhance_special_events_comprehensive.sql`
   - Copy the entire contents
   - Paste into the SQL Editor

4. **Run the migration**
   - Click "Run" button
   - Wait for completion (should take <5 seconds)
   - Check for any errors in the Results panel

5. **Verify success**
   - Go to "Table Editor" → `special_event_forecasts`
   - You should see all the new columns listed

### Option 2: Using Supabase CLI (If Installed)

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply the specific migration
supabase db push supabase/migrations/20250114_enhance_special_events_comprehensive.sql

# Or apply all pending migrations
supabase db push
```

### Option 3: Manual SQL Execution

```bash
# If you have direct database access via psql
psql "postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres" \
  < supabase/migrations/20250114_enhance_special_events_comprehensive.sql
```

---

## ✅ Post-Migration Steps

### 1. Regenerate TypeScript Types

After applying the migration, regenerate your database types:

```bash
# Using Supabase CLI
supabase gen types typescript --local > src/lib/database.types.ts

# Or from dashboard
# Go to Project Settings → API → Generate Types → Copy TypeScript types
```

### 2. Restart Your Development Server

```bash
# Stop the server (Ctrl+C)
# Then restart
npm run dev
```

### 3. Test Special Events Feature

1. **Create a new special event**
   - Go to Projects → New Project
   - Select "Special Event" type
   - Fill in basic info

2. **Add forecast data**
   - Click on the special event
   - Go to "Forecast" tab
   - Fill in all 5 tabs (Overview, Revenue, Costs, Marketing, Details)
   - Save and verify no errors

3. **Add actuals (after event)**
   - Go to "Actuals" tab
   - Fill in all 6 tabs
   - Save and verify data persists

---

## 🔍 Verification Checklist

After applying the migration, verify:

- [ ] Migration ran without errors
- [ ] `special_event_forecasts` table has new columns
- [ ] `special_event_actuals` table has new columns
- [ ] Indexes were created (`idx_special_event_forecasts_project_id`, `idx_special_event_actuals_project_id`)
- [ ] RLS policies exist (check in Dashboard → Authentication → Policies)
- [ ] Function `calculate_special_event_roi` exists (check in Database → Functions)
- [ ] TypeScript types regenerated
- [ ] No console errors when opening special events
- [ ] Can save forecast data successfully
- [ ] Can save actuals data successfully

---

## 🚨 Troubleshooting

### Error: "relation does not exist"
**Problem:** Base tables `special_event_forecasts` or `special_event_actuals` don't exist

**Solution:**
1. First apply earlier migration: `20250102_add_special_events_support.sql`
2. Then apply this migration

### Error: "column already exists"
**Problem:** Migration was partially applied before

**Solution:** The migration uses `ADD COLUMN IF NOT EXISTS`, so it's safe to re-run

### Error: "permission denied"
**Problem:** RLS policies might be blocking access

**Solution:**
1. Check RLS policies in Supabase dashboard
2. Ensure you're authenticated correctly
3. Check that your user_id matches project ownership

### Still Getting Errors?
**Check:**
1. Browser console for specific error messages
2. Network tab for failed API requests
3. Supabase logs in dashboard
4. Verify environment variables are correct

---

## 📊 Expected Impact

After migration completes:

### ✅ What Will Work:
- Special events 5-tab forecast form (fully functional)
- Special events 6-tab actuals form (fully functional)
- Comprehensive event tracking
- Detailed cost breakdown
- Marketing channel budgeting
- Post-event analysis and feedback
- ROI calculations
- Variance analysis

### ❌ What Was Broken Before:
- Forecast data couldn't be saved (missing columns)
- Actuals data incomplete (only basic fields)
- UI showed errors when trying to save detailed data
- Marketing budgets couldn't be tracked
- Post-event feedback couldn't be recorded

---

## 📝 Migration File Location

**File:** `supabase/migrations/20250114_enhance_special_events_comprehensive.sql`
**Lines:** 293
**Size:** ~14 KB

---

## 🎯 Next Steps After Migration

1. ✅ Apply migration (you are here)
2. ✅ Regenerate TypeScript types
3. ✅ Test special events workflow
4. ✅ Update any service layer code if needed
5. ✅ Deploy to production

---

## ⏱️ Estimated Time

- **Migration application:** 2-5 minutes
- **Type regeneration:** 1 minute
- **Testing:** 10-15 minutes
- **Total:** ~15-20 minutes

---

## 🆘 Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Review Supabase logs in dashboard
3. Check browser console for errors
4. Verify migration ran successfully in SQL Editor

---

**This migration is CRITICAL for special events functionality. Apply it before using the special events feature.**
