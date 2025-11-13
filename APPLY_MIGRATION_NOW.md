# 🚨 APPLY SPECIAL EVENTS MIGRATION NOW

**Status:** ⚠️ Migration NOT yet applied
**Required:** ✅ CRITICAL - Special events feature is broken without this
**Time:** 5 minutes

---

## ⚡ Quick Start (Easiest Method)

### Step 1: Go to Supabase Dashboard

1. Open your browser and go to: https://supabase.com/dashboard
2. Sign in to your account
3. Select your **fortress-modeler** project

### Step 2: Open SQL Editor

1. In the left sidebar, click **"SQL Editor"**
2. Click **"New query"** button

### Step 3: Copy the Migration SQL

Open this file on your computer:
```
supabase/migrations/20250114_enhance_special_events_comprehensive.sql
```

**Or copy from here:** [See file in your project]

Select ALL the contents (Ctrl+A or Cmd+A) and copy it.

### Step 4: Paste and Run

1. Paste the entire migration SQL into the SQL Editor
2. Click the **"Run"** button (or press Ctrl+Enter / Cmd+Enter)
3. Wait 2-5 seconds for it to complete

### Step 5: Verify Success

You should see a success message like:
```
Success. No rows returned
```

Or you might see messages about columns being added - this is good!

---

## ✅ Verification Checklist

After running the migration, verify:

1. **Check Tables Updated:**
   - Go to **Table Editor** → `special_event_forecasts`
   - Scroll right - you should see NEW columns like:
     - `forecast_ticket_sales`
     - `forecast_fnb_revenue`
     - `forecast_fnb_cogs_pct`
     - `marketing_email_budget`
     - `estimated_attendance`
     - ... and many more!

2. **Check Functions Created:**
   - Go to **Database** → **Functions**
   - Look for: `calculate_special_event_roi`

3. **Check Policies:**
   - Go to **Authentication** → **Policies**
   - Look for new policies on `special_event_forecasts` and `special_event_actuals`

---

## 🔍 What This Migration Adds

### To `special_event_forecasts` table (18 new fields):
- Revenue breakdown (5 fields)
- COGS tracking (2 fields)
- Cost breakdown (6 fields)
- Marketing budgets (5 fields)
- Event details (2 fields)
- Notes (4 fields)

### To `special_event_actuals` table (27 new fields):
- Actual revenue (5 fields)
- COGS tracking (2 fields)
- Actual costs (6 fields)
- Marketing performance (6 fields)
- Event metrics (3 fields)
- Success indicators (5 fields)
- Post-event analysis (3 fields)
- Additional metrics (3 fields)
- Variance notes (3 fields)

### Plus:
- 2 database indexes for performance
- 8 RLS policies for security
- 1 helper function: `calculate_special_event_roi()`
- 1 unique constraint

---

## 🆘 Troubleshooting

### Error: "relation does not exist"

**Problem:** Base tables don't exist yet

**Solution:**
1. First apply: `supabase/migrations/20250102_add_special_events_support.sql`
2. Then apply this migration

### Error: "column already exists"

**Problem:** Migration was partially applied before

**Solution:** The migration uses `IF NOT EXISTS`, so it's safe to re-run. Just click "Run" again.

### Error: "permission denied"

**Problem:** You might not have admin access to the database

**Solution:**
1. Make sure you're logged in to the correct Supabase account
2. Verify you're on the correct project
3. Check you have Owner or Admin role on the project

### Still not working?

Try this alternative:

1. Go to **Project Settings** → **Database**
2. Get your connection string
3. Use a PostgreSQL client (like pgAdmin or DBeaver)
4. Connect and run the migration SQL directly

---

## 🎯 After Migration Success

### Restart Your Dev Server
```bash
# Stop the server (Ctrl+C if running)
npm run dev
```

### Test Special Events

1. **Create a Special Event:**
   - Go to Projects → New Project
   - Select "Special Event" type
   - Fill in basic info (name, venue, dates)

2. **Add Forecast:**
   - Click on your special event
   - Go to "Forecast" tab
   - You should now see 5 tabs:
     - Overview
     - Revenue
     - Costs
     - Marketing
     - Details
   - Fill in data and save
   - ✅ Data should save without errors!

3. **Add Actuals (after event):**
   - Go to "Actuals" tab
   - You should see 6 tabs:
     - Overview
     - Revenue
     - Costs
     - Marketing
     - Success
     - Feedback
   - Fill in data and save
   - ✅ Data should persist correctly!

---

## 🚀 Migration Command Reference

### If you have Supabase CLI installed locally:

```bash
# Login
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Apply this specific migration
supabase db push supabase/migrations/20250114_enhance_special_events_comprehensive.sql

# Or apply all pending migrations
supabase db push
```

### If you don't have CLI (use Dashboard method above instead)

---

## 📊 Expected Results

**Before Migration:**
- ❌ Special events forecast form shows errors
- ❌ Can't save detailed forecast data
- ❌ Actuals form incomplete
- ❌ Marketing budgets can't be tracked
- ❌ Post-event feedback can't be recorded

**After Migration:**
- ✅ 5-tab forecast form fully functional
- ✅ All forecast data saves correctly
- ✅ 6-tab actuals form works perfectly
- ✅ Marketing channel tracking enabled
- ✅ Comprehensive post-event analysis
- ✅ ROI calculations available
- ✅ Variance analysis functional

---

## ⏱️ Time Estimate

- **Migration application:** 2-5 minutes
- **Verification:** 2 minutes
- **Testing:** 5-10 minutes
- **Total:** 10-15 minutes

---

## 📞 Need Help?

1. Check the troubleshooting section above
2. Look at Supabase logs in dashboard
3. Check browser console for errors (F12)
4. Review the migration file for syntax issues
5. Try the manual SQL client method

---

**IMPORTANT:** Don't proceed with using special events until this migration is applied!

**Status Check:** After applying, mark this complete ✅
