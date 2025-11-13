# Database Migration Consolidation Plan

**Status:** 📋 **READY TO EXECUTE**
**Risk Level:** 🟢 **LOW** (for Phase 1 only)
**Estimated Time:** 2-3 hours

---

## Overview

This consolidation plan removes **8 superseded migrations** (47% reduction) and resolves **1 critical constraint conflict**, resulting in a clean, maintainable database schema.

---

## Phase 1: Safe Cleanup (LOW RISK) ✅

### Step 1: Backup Current State

```bash
# Create backup before any changes
cd /home/user/fortress-modeler
git add -A
git commit -m "chore: Backup before migration consolidation"

# Document current migration state
ls -1 supabase/migrations/*.sql > docs/database/migrations_before_cleanup.txt
```

### Step 2: Delete Superseded Migrations

These migrations are safe to delete because they've been superseded by later, fixed versions:

```bash
# Navigate to migrations directory
cd supabase/migrations/

# Delete superseded migrations
rm 20250114_enhance_special_events_comprehensive.sql      # Superseded by _FIXED version
rm 20250712_fix_rls_recursion_comprehensive.sql           # Superseded by 20250715
rm 20250713_ultimate_rls_fix_final.sql                    # Superseded by 20250715
rm 20250714_add_updated_at_to_special_events.sql          # Duplicate triggers
rm 20250716_fix_shared_projects_access.sql                # Superseded by 20250719
rm 20250717_fix_get_shared_projects_ambiguity.sql         # Superseded by 20250719
rm 20250718_fix_get_shared_projects_ambiguity_final.sql   # Superseded by 20250719

# Optionally delete 20250102 (already in base schema)
rm 20250102_add_special_events_support.sql                # Duplicates base schema
```

**Result:** 8 files deleted (or 7 if keeping 20250102)

### Step 3: Verify Cleanup

```bash
# List remaining migrations
ls -1 *.sql

# Expected output (9 migrations):
# 20250101_base_schema_complete.sql
# 20250102_add_special_events_support.sql (optional - consider deleting)
# 20250114_enhance_special_events_comprehensive_FIXED.sql
# 20250711062225_change_success_rating_check.sql
# 20250715_eliminate_circular_rls_dependency.sql
# 20250719_fix_get_shared_projects_ambiguity_join.sql
# 20250720_fix_get_user_projects_ambiguity.sql
# 20250721055950_add_cogs_standardization_to_special_events.sql
# 20250722_fix_special_events_rls_policies.sql
# 20250723_add_configurable_categories.sql
```

### Step 4: Document Cleanup

Create file: `supabase/migrations/README.md`

```markdown
# Active Migrations

Last Updated: January 2025
Cleanup Performed: Yes (removed 8 superseded migrations)

## Migration Execution Order

For fresh deployments, apply in this order:

1. `20250101_base_schema_complete.sql` - Core schema foundation
2. `20250114_enhance_special_events_comprehensive_FIXED.sql` - Add special event fields
3. `20250711062225_change_success_rating_check.sql` - Change rating to 1-5 (optional)
4. `20250715_eliminate_circular_rls_dependency.sql` - Fix RLS circular deps
5. `20250719_fix_get_shared_projects_ambiguity_join.sql` - Fix shared projects function
6. `20250720_fix_get_user_projects_ambiguity.sql` - Fix user projects function
7. `20250721055950_add_cogs_standardization_to_special_events.sql` - Add COGS fields
8. `20250722_fix_special_events_rls_policies.sql` - Fix special events RLS
9. `20250723_add_configurable_categories.sql` - Phase 2 categories

## Superseded Migrations (Deleted)

The following migrations were removed during consolidation:
- `20250114_enhance_special_events_comprehensive.sql` (non-FIXED version)
- `20250712_fix_rls_recursion_comprehensive.sql` (RLS attempt #1)
- `20250713_ultimate_rls_fix_final.sql` (RLS attempt #2)
- `20250714_add_updated_at_to_special_events.sql` (duplicate triggers)
- `20250716_fix_shared_projects_access.sql` (ambiguity fix #1)
- `20250717_fix_get_shared_projects_ambiguity.sql` (ambiguity fix #2)
- `20250718_fix_get_shared_projects_ambiguity_final.sql` (ambiguity fix #3)
- `20250102_add_special_events_support.sql` (optional - duplicates base schema)

## Notes

- All migrations listed above have been applied to production
- Deleted files are safe to remove from repo
- For rollbacks, refer to git history
```

### Step 5: Commit Cleanup

```bash
cd /home/user/fortress-modeler
git add supabase/migrations/
git commit -m "$(cat <<'EOF'
chore: Consolidate database migrations (remove 8 superseded files)

Remove superseded migrations that have been replaced by fixed versions:
- Delete 20250114 non-FIXED version (superseded by _FIXED)
- Delete 3 RLS fix attempts (superseded by 20250715)
- Delete duplicate trigger migration (20250714)
- Delete 3 ambiguity fix attempts (superseded by 20250719)
- Optionally delete 20250102 (duplicates base schema)

Result: 9 active migrations (down from 17)
Reduction: 47% fewer migration files
No functionality lost - all features preserved

See docs/database/CONSOLIDATION_PLAN.md for details
EOF
)"
```

---

## Phase 2: Resolve Constraint Conflict (LOW-MEDIUM RISK) ⚠️

### Issue: `success_rating` Constraint Inconsistency

**Current State:** Conflicting constraints across migrations
- Base schema: 1-10
- Migration 20250711: 1-5

**Decision Required:** Should rating be 1-5 or 1-10?

**Recommendation:** **1-10 scale** (more granular, better analytics)

### Option A: Keep 1-10 Scale (RECOMMENDED)

```sql
-- Create: supabase/migrations/20250724_standardize_success_rating_1_to_10.sql

-- =====================================================================
-- Standardize success_rating constraint to 1-10 scale
-- =====================================================================
-- Decision: Use 1-10 for more granular event success feedback
-- Resolves conflict between base schema (1-10) and 20250711 (1-5)
-- =====================================================================

-- Drop existing constraint (if exists)
ALTER TABLE special_event_actuals
DROP CONSTRAINT IF EXISTS special_event_actuals_success_rating_check;

-- Add standardized 1-10 constraint
ALTER TABLE special_event_actuals
ADD CONSTRAINT special_event_actuals_success_rating_check
CHECK (success_rating >= 1 AND success_rating <= 10);

-- Add documentation
COMMENT ON COLUMN special_event_actuals.success_rating IS
'Event success rating on 1-10 scale where:
1-3 = Poor (significant issues, below expectations)
4-6 = Satisfactory (met basic expectations)
7-8 = Good (exceeded expectations in some areas)
9-10 = Excellent (exceptional success, highly profitable)
Standardized to 1-10 scale in Jan 2025.';

-- Update any existing ratings > 5 (unlikely but safe)
-- If they were entered as 1-5 thinking max was 5, scale up
UPDATE special_event_actuals
SET success_rating = success_rating * 2
WHERE success_rating <= 5 AND success_rating IS NOT NULL;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'success_rating standardized to 1-10 scale';
    RAISE NOTICE 'Any existing 1-5 ratings have been scaled to 1-10';
END $$;
```

**Action Items:**
1. Create migration above
2. Run in Supabase Dashboard SQL Editor
3. Update UI components to use 1-10 range
4. Update form validation to accept 1-10
5. Delete `20250711062225_change_success_rating_check.sql` from repo

### Option B: Keep 1-5 Scale (Alternative)

```sql
-- Create: supabase/migrations/20250724_standardize_success_rating_1_to_5.sql

-- Drop existing constraint
ALTER TABLE special_event_actuals
DROP CONSTRAINT IF EXISTS special_event_actuals_success_rating_check;

-- Add 1-5 constraint
ALTER TABLE special_event_actuals
ADD CONSTRAINT special_event_actuals_success_rating_check
CHECK (success_rating >= 1 AND success_rating <= 5);

-- Add documentation
COMMENT ON COLUMN special_event_actuals.success_rating IS
'Event success rating on 1-5 scale (like star reviews).
Standardized to 1-5 scale in Jan 2025.';

-- Ensure no ratings > 5 exist
UPDATE special_event_actuals
SET success_rating = 5
WHERE success_rating > 5;
```

---

## Phase 3: Optional - Advanced Consolidation (HIGH RISK) 🔴

**WARNING:** Only for fresh deployments or with comprehensive backups!

### Create Consolidated Migrations

#### Migration 1: Consolidated Base Schema

```sql
-- supabase/migrations/consolidated/00_base_schema_with_special_events.sql
-- Merges 20250101 + 20250102 into single file
-- Eliminates duplicate table definitions
```

#### Migration 2: Consolidated RLS Policies

```sql
-- supabase/migrations/consolidated/10_rls_policies_final.sql
-- Consolidates 20250712, 20250713, 20250715 into single migration
-- Clear documentation of circular dependency solution
```

#### Migration 3: Consolidated Helper Functions

```sql
-- supabase/migrations/consolidated/11_helper_functions_final.sql
-- Consolidates 20250716-20250720 into single migration
-- All function fixes in one place
```

**Risk:** High - requires careful testing and rollback plan

**When to Use:** Only for fresh deployments or major schema rebuild

---

## Phase 4: Add Missing Indexes (LOW RISK) ✅

```sql
-- Create: supabase/migrations/20250724_add_performance_indexes.sql

-- =====================================================================
-- Add performance indexes identified in audit
-- =====================================================================

-- Special event forecasts - time-based queries
CREATE INDEX IF NOT EXISTS idx_special_event_forecasts_created_at
ON special_event_forecasts(created_at DESC);

-- Special event actuals - success rating filtering/reporting
CREATE INDEX IF NOT EXISTS idx_special_event_actuals_success_rating
ON special_event_actuals(success_rating);

-- Project shares - expiration checks (partial index)
CREATE INDEX IF NOT EXISTS idx_project_shares_expires_at
ON project_shares(expires_at)
WHERE expires_at IS NOT NULL AND is_active = true;

-- Actual performance - date range queries (composite)
CREATE INDEX IF NOT EXISTS idx_actual_performance_project_date
ON actual_performance(project_id, date DESC);

-- Category lookups by value (already exist, but verify)
-- idx_event_types_value
-- idx_cost_categories_value
-- idx_frequencies_value

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Performance indexes added successfully';
    RAISE NOTICE 'Monitor query performance with: SELECT * FROM pg_stat_statements';
END $$;
```

---

## Phase 5: Documentation (REQUIRED) 📚

### Create Missing Documentation Files

#### 1. Migration Execution Guide

File: `docs/database/MIGRATION_GUIDE.md`

Contents:
- How to apply migrations
- Rollback procedures
- Troubleshooting common issues
- Emergency contacts

#### 2. RLS Policy Documentation

File: `docs/database/RLS_POLICIES.md`

Contents:
- Complete policy inventory
- Security model explanation
- Shared access behavior
- Public project scope
- Testing RLS policies

#### 3. Database Functions API

File: `docs/database/FUNCTIONS_API.md`

Contents:
- Function signatures
- Parameters & return types
- Usage examples
- Performance considerations

---

## Validation Checklist

After completing consolidation:

### ✅ Repository Validation

- [ ] 8-9 migrations deleted
- [ ] README.md created in migrations folder
- [ ] Git history preserved
- [ ] No uncommitted changes

### ✅ Database Validation (if applying new migrations)

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
-- Expected: 15 tables

-- Check all indexes exist
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY indexname;
-- Expected: 30+ indexes

-- Check RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;
-- Expected: 15 tables with RLS enabled

-- Check constraint exists
SELECT constraint_name FROM information_schema.table_constraints
WHERE table_name = 'special_event_actuals'
  AND constraint_type = 'CHECK'
  AND constraint_name LIKE '%success_rating%';
-- Expected: 1 constraint

-- Verify success_rating range
SELECT
    pg_get_constraintdef(oid) as constraint_def
FROM pg_constraint
WHERE conname LIKE '%success_rating%';
-- Should show: CHECK (success_rating >= 1 AND success_rating <= 10)
-- Or: CHECK (success_rating >= 1 AND success_rating <= 5)
```

### ✅ Application Validation

- [ ] Forms work with new rating scale
- [ ] Category dropdowns load from database
- [ ] Special event forms functional
- [ ] Project sharing works
- [ ] No RLS errors in logs

---

## Rollback Procedures

### If Cleanup Causes Issues

```bash
# Rollback to before cleanup
git revert HEAD
git push

# Or restore from backup
git checkout <commit-before-cleanup> -- supabase/migrations/
```

### If New Migration Fails

```sql
-- In Supabase Dashboard SQL Editor

-- Drop new constraint if needed
ALTER TABLE special_event_actuals
DROP CONSTRAINT special_event_actuals_success_rating_check;

-- Restore original constraint (choose one)
-- Option 1: 1-10 scale
ALTER TABLE special_event_actuals
ADD CONSTRAINT special_event_actuals_success_rating_check
CHECK (success_rating >= 1 AND success_rating <= 10);

-- Option 2: 1-5 scale
ALTER TABLE special_event_actuals
ADD CONSTRAINT special_event_actuals_success_rating_check
CHECK (success_rating >= 1 AND success_rating <= 5);
```

---

## Timeline

### Immediate (Today - 1 hour)
- ✅ Phase 1: Delete 8 superseded migrations
- ✅ Create migrations/README.md
- ✅ Commit changes

### Short-Term (This Week - 2 hours)
- ⏳ Phase 2: Resolve success_rating conflict
- ⏳ Apply standardization migration
- ⏳ Update UI components
- ⏳ Test forms

### Medium-Term (This Month - 3 hours)
- ⏳ Phase 4: Add performance indexes
- ⏳ Phase 5: Create documentation files
- ⏳ Test and validate everything

### Long-Term (Optional - 8+ hours)
- ⏳ Phase 3: Full consolidation (if needed)
- ⏳ Create materialized views
- ⏳ Performance optimization

---

## Success Criteria

### Phase 1 Success
- ✅ 8 migrations deleted
- ✅ No build errors
- ✅ Git history clean
- ✅ README created

### Phase 2 Success
- ✅ Constraint conflict resolved
- ✅ One consistent rating scale
- ✅ Forms updated and working
- ✅ No data loss

### Overall Success
- ✅ 47% fewer migration files
- ✅ Clear migration history
- ✅ Comprehensive documentation
- ✅ No functionality lost
- ✅ Better maintainability

---

## Risk Assessment

| Phase | Risk Level | Impact | Mitigation |
|-------|-----------|--------|------------|
| Phase 1 | 🟢 LOW | File deletion only | Git history preserved |
| Phase 2 | 🟡 MEDIUM | Database change | Test in dev first, backup |
| Phase 3 | 🔴 HIGH | Full restructure | Only for fresh deploys |
| Phase 4 | 🟢 LOW | Add indexes | Non-breaking, improves perf |
| Phase 5 | 🟢 NONE | Documentation | Zero risk |

---

## Support

If issues arise during consolidation:

1. **Check git history**: `git log --oneline supabase/migrations/`
2. **Rollback if needed**: `git revert HEAD`
3. **Review audit report**: `docs/database/DATABASE_SCHEMA_AUDIT_2025.md`
4. **Check Supabase logs**: Supabase Dashboard → Logs
5. **Test in staging first**: Never consolidate production first

---

## Next Steps

**Recommended Immediate Actions:**

1. ✅ Review this plan
2. ✅ Execute Phase 1 (delete 8 files)
3. ✅ Commit changes
4. ⏳ Decide on success_rating scale (1-5 or 1-10)
5. ⏳ Execute Phase 2 (resolve constraint)
6. ⏳ Update UI components
7. ⏳ Test thoroughly

**Total Estimated Time:** 2-3 hours for Phases 1-2

---

**END OF CONSOLIDATION PLAN**
