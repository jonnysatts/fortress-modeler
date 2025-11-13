# Database Schema ERD - Fortress Financial Modeler

## Entity Relationship Diagram

```
┌──────────────────┐
│   auth.users     │ (Supabase Auth)
│                  │
│ - id (UUID, PK)  │
│ - email          │
└────────┬─────────┘
         │
         │ 1:1
         ▼
┌──────────────────────────────┐
│       profiles               │
│ ────────────────────────────│
│ • id (UUID, PK, FK)          │◄───────────┐
│   email (UNIQUE)             │            │
│   name                       │            │ owns
│   picture                    │            │
│   company_domain             │            │
│   preferences (JSONB)        │            │
│   created_at, updated_at     │            │
└──────────────────────────────┘            │
                                            │
                                            │ 1:N
                                            │
┌──────────────────────────────────────────┴────────────┐
│                    projects                           │
│ ──────────────────────────────────────────────────   │
│ • id (UUID, PK)                                       │
│   user_id (UUID, FK → profiles) ───────────────────┐  │
│   name                                             │  │
│   description                                      │  │
│   product_type                                     │  │
│   target_audience                                  │  │
│   data (JSONB)                                     │  │
│   timeline (JSONB)                                 │  │
│   avatar_image                                     │  │
│   is_public                                        │  │
│   event_type, event_date, event_end_date           │  │
│   created_at, updated_at, deleted_at               │  │
└────┬──────┬──────┬──────┬──────┬──────┬────────────┬┘
     │      │      │      │      │      │            │
     │      │      │      │      │      │            │
     │ 1:N  │ 1:N  │ 1:N  │ 1:N  │ 1:N  │ 1:N        │ 1:N
     │      │      │      │      │      │            │
     ▼      ▼      ▼      ▼      ▼      ▼            ▼
┌─────────┐│      │      │      │      │      ┌──────────────┐
│financial││      │      │      │      │      │project_shares│
│_models  ││      │      │      │      │      │──────────────│
│─────────││      │      │      │      │      │• id          │
│• id     ││      │      │      │      │      │  project_id ─┘
│  project││      │      │      │      │      │  owner_id (FK → profiles)
│  _id ───┘│      │      │      │      │      │  shared_with_email
│  user_id │      │      │      │      │      │  shared_with_id (FK → profiles)
│  name    │      │      │      │      │      │  permission
│  assumpt.│      │      │      │      │      │  is_active
│  results │      │      │      │      │      │  created_at, expires_at
│  is_prim │      │      │      │      │      └──────────────┘
│  created │      │      │      │      │
│  deleted │      │      │      │      │
└────┬─────┘      │      │      │      │
     │            │      │      │      │
     │ 1:N        │      │      │      │
     ▼            ▼      ▼      ▼      ▼
┌──────────┐ ┌─────────┐│      │ ┌──────────────┐
│scenarios │ │special_ ││      │ │special_event_│
│──────────│ │event_   ││      │ │actuals       │
│• id      │ │forecasts││      │ │──────────────│
│  project │ │─────────││      │ │• id          │
│  _id ────┘ │• id     ││      │ │  project_id  │
│  model_id─►│  project││      │ │  actual_*    │
│  user_id  │ │  _id ───┘│      │ │  marketing_* │
│  name     │ │  forecas││      │ │  attendance  │
│  descript.│ │  t_*    ││      │ │  success_rat.│
│  assumpt. │ │  marketn││      │ │  feedback_*  │
│  results  │ │  g_*    ││      │ │  variance_*  │
│  created  │ │  estim_a││      │ │  created_at  │
└───────────┘ │  ttend. ││      │ │  updated_at  │
              │  notes  ││      │ └──────────────┘
              │  created││      │ UNIQUE: (project_id)
              └─────────┘│      │
                         │      │
                         ▼      ▼
                    ┌──────────────┐
                    │special_event_│
                    │milestones    │
                    │──────────────│
                    │• id          │
                    │  project_id ─┘
                    │  milestone_  │
                    │    label     │
                    │  target_date │
                    │  completed   │
                    │  assignee    │
                    │  notes       │
                    └──────────────┘

┌───────────────┐  ┌──────────────┐  ┌──────────────┐
│actual_        │  │actuals_      │  │risks         │
│performance    │  │period_entries│  │──────────────│
│───────────────│  │──────────────│  │• id          │
│• id           │  │• id          │  │  project_id ─┘
│  project_id ──┘  │  project_id ─┘  │  user_id (FK)
│  user_id (FK) │  │  user_id (FK)│  │  name        │
│  date         │  │  period      │  │  type        │
│  metrics      │  │  data (JSONB)│  │  likelihood  │
│  notes        │  │  created_at  │  │  impact      │
│  created_at   │  │  updated_at  │  │  status      │
│  updated_at   │  └──────────────┘  │  mitigation  │
└───────────────┘  UNIQUE:           │  notes       │
                   (project_id,      │  owner_email │
                    period)           │  created_at  │
                                      │  updated_at  │
                                      └──────────────┘

┌──────────────────┐
│presence          │
│──────────────────│
│• id              │
│  user_id (FK)    │
│  project_id (FK) │
│  model_id (FK)   │
│  status          │
│  current_page    │
│  cursor_position │
│  last_seen       │
│  created_at      │
└──────────────────┘

═══════════════════════════════════════════════════════════
PHASE 2: CONFIGURABLE CATEGORIES (NEW)
═══════════════════════════════════════════════════════════

┌──────────────────┐  ┌───────────────────┐  ┌──────────────┐
│event_types       │  │cost_categories    │  │frequencies   │
│──────────────────│  │───────────────────│  │──────────────│
│• id              │  │• id               │  │• id          │
│  value (UNIQUE)  │  │  value (UNIQUE)   │  │  value (U.)  │
│  label           │  │  label            │  │  label       │
│  description     │  │  description      │  │  description │
│  is_recurring    │  │  category_type    │  │  interval_ty.│
│  requires_       │  │  is_cogs          │  │  interval_ct.│
│    forecast      │  │  is_active        │  │  is_recurring│
│  requires_       │  │  is_system        │  │  is_active   │
│    actuals       │  │  icon_name        │  │  is_system   │
│  is_active       │  │  color_scheme     │  │  icon_name   │
│  is_system       │  │  sort_order       │  │  color_sch.  │
│  icon_name       │  │  created_at       │  │  sort_order  │
│  color_scheme    │  │  updated_at       │  │  created_at  │
│  sort_order      │  │  created_by (FK)  │  │  updated_at  │
│  created_at      │  │  updated_by (FK)  │  │  created_by  │
│  updated_at      │  └───────────────────┘  │  updated_by  │
│  created_by (FK) │                          └──────────────┘
│  updated_by (FK) │
└──────────────────┘

SEED DATA:
• event_types: weekly, special
• cost_categories: staffing, marketing, operations, other
• frequencies: weekly, monthly, quarterly, annually, one-time
```

---

## Relationship Summary

### Core Relationships

| Parent | Child | Type | Notes |
|--------|-------|------|-------|
| auth.users | profiles | 1:1 | User identity |
| profiles | projects | 1:N | User owns projects |
| projects | financial_models | 1:N | Project can have multiple models |
| financial_models | scenarios | 1:N | Model can have variations |
| projects | special_event_* | 1:N | Event planning & results |
| projects | project_shares | 1:N | Sharing/collaboration |
| projects | risks | 1:N | Risk management |
| projects | actual_performance | 1:N | Performance tracking |
| projects | actuals_period_entries | 1:N | Period-based actuals |
| profiles | project_shares | 1:N | User can share projects |
| profiles | project_shares | 1:N | User can receive shares |

### Phase 2 Relationships

| Table | Usage | Referenced By |
|-------|-------|---------------|
| event_types | Defines project.event_type | projects.event_type (string) |
| cost_categories | Defines cost categorization | financial_models (JSONB) |
| frequencies | Defines revenue frequency | financial_models (JSONB) |

**Note:** Phase 2 tables are referenced by string `value` field, not foreign keys.

---

## Indexes Overview

### Performance Indexes

```sql
-- Projects
idx_projects_user_id (user_id)
idx_projects_is_public (is_public)
idx_projects_created_at (created_at)
idx_projects_deleted_at (deleted_at)

-- Financial Models
idx_financial_models_project_id (project_id)
idx_financial_models_user_id (user_id)
idx_financial_models_is_primary (is_primary)
unique_primary_model_per_project (project_id WHERE is_primary = TRUE)

-- Special Events
idx_special_event_forecasts_project_id (project_id)
idx_special_event_actuals_project_id (project_id)

-- Project Shares
idx_project_shares_project_id (project_id)
idx_project_shares_shared_with_email (shared_with_email)
idx_project_shares_is_active (is_active)

-- Actuals
idx_actual_performance_project_id (project_id)
idx_actual_performance_date (date)
idx_actuals_period_entries_project_id (project_id)
idx_actuals_period_entries_period (period)

-- Risks & Scenarios
idx_risks_project_id (project_id)
idx_risks_status (status)
idx_scenarios_project_id (project_id)
idx_scenarios_model_id (model_id)

-- Presence
idx_presence_user_id (user_id)
idx_presence_project_id (project_id)

-- Categories (Phase 2)
idx_event_types_active (is_active)
idx_event_types_sort (sort_order)
idx_event_types_value (value)
idx_cost_categories_active (is_active)
idx_cost_categories_sort (sort_order)
idx_cost_categories_value (value)
idx_cost_categories_type (category_type)
idx_frequencies_active (is_active)
idx_frequencies_sort (sort_order)
idx_frequencies_value (value)
```

### Unique Constraints

```sql
-- Profiles
UNIQUE (email)

-- Projects
-- (None - allows duplicate names)

-- Financial Models
UNIQUE INDEX unique_primary_model_per_project ON financial_models (project_id) WHERE is_primary = TRUE

-- Special Event Actuals
UNIQUE (project_id) -- One actuals record per event

-- Actuals Period Entries
UNIQUE (project_id, period) -- One entry per period per project

-- Categories
UNIQUE (value) -- On event_types, cost_categories, frequencies
```

---

## Data Flow Diagrams

### Project Creation Flow

```
User Creates Project
        │
        ▼
┌───────────────┐
│   projects    │
└───────┬───────┘
        │
        ├─────► Financial Model (optional)
        │            └─► Scenarios
        │
        ├─────► Special Event Forecast (if event_type = 'special')
        │            └─► Special Event Actuals (after event)
        │
        ├─────► Risks
        │
        └─────► Project Shares (if sharing)
```

### Special Event Workflow

```
1. Create Project (event_type = 'special')
   └─► projects table

2. Create Forecast
   └─► special_event_forecasts
       ├─► Revenue projections
       ├─► Cost breakdown
       └─► Marketing budget

3. Track Milestones
   └─► special_event_milestones
       └─► Pre-event tasks

4. Event Occurs

5. Record Actuals
   └─► special_event_actuals
       ├─► Actual revenue
       ├─► Actual costs
       ├─► Marketing performance
       ├─► Success metrics
       └─► Variance analysis

6. Calculate ROI
   └─► calculate_special_event_roi() function
       └─► Returns variance & ROI metrics
```

### Weekly Event Workflow

```
1. Create Project (event_type = 'weekly')
   └─► projects table

2. Create Financial Model
   └─► financial_models
       └─► Week-by-week projections

3. Track Weekly Actuals
   └─► actuals_period_entries
       └─► Period-based tracking

4. Monitor Performance
   └─► actual_performance
       └─► Metrics over time
```

---

## RLS Security Model

### Access Levels

```
┌────────────────────────────────────┐
│         RLS Access Matrix          │
├────────────────┬───────────────────┤
│ Resource       │ Access Rules      │
├────────────────┼───────────────────┤
│ Own Projects   │ Full CRUD         │
│ Shared Projects│ Read-only*        │
│ Public Projects│ Read metadata only│
│ Own Models     │ Full CRUD         │
│ Shared Models  │ None**            │
│ Special Events │ Via project access│
│ Categories     │ Read (all users)  │
│                │ CRUD (auth users) │
└────────────────┴───────────────────┘

* Permission level defined in project_shares
** Gap: Shared users can't access models (see audit)
```

### RLS Policy Hierarchy

```
Level 1: Direct Ownership
├─► auth.uid() = user_id
└─► All owned resources

Level 2: Shared Access
├─► Checked via project_shares table
└─► Uses get_user_projects() function (SECURITY DEFINER)

Level 3: Public Access
├─► is_public = true
└─► Metadata only (not financial data)

Level 4: Admin Access
├─► Categories system
└─► All authenticated users can manage
```

---

## Key Constraints & Business Rules

### Project Rules
- ✅ One owner per project
- ✅ Multiple shares allowed
- ✅ Can be public or private
- ✅ Soft delete (deleted_at)
- ✅ Event-specific fields (event_type, event_date)

### Financial Model Rules
- ✅ One primary model per project (unique index)
- ✅ Multiple scenarios per model
- ✅ Soft delete (deleted_at)
- ✅ Owner-only access (no shared access currently)

### Special Event Rules
- ✅ One forecast per project
- ✅ One actuals record per project (unique constraint)
- ✅ Multiple milestones allowed
- ⚠️ success_rating: 1-10 scale (pending standardization)

### Category Rules (Phase 2)
- ✅ System categories cannot be deleted (is_system = true)
- ✅ Soft delete via is_active flag
- ✅ Ordered by sort_order field
- ✅ Unique value per category type

---

## Performance Considerations

### Optimized Queries

```sql
-- ✅ GOOD: Uses indexes
SELECT * FROM projects WHERE user_id = auth.uid();
SELECT * FROM projects WHERE is_public = true;
SELECT * FROM financial_models WHERE is_primary = true AND project_id = $1;

-- ✅ GOOD: Uses date index
SELECT * FROM actual_performance
WHERE project_id = $1 AND date BETWEEN $2 AND $3;

-- ❌ NEEDS INDEX: Full table scan
SELECT * FROM special_event_actuals WHERE success_rating >= 8;
-- Fix: Add idx_special_event_actuals_success_rating
```

### N+1 Query Risks

```sql
-- ❌ BAD: N+1 query pattern
-- For each project, separately query models
SELECT * FROM projects WHERE user_id = auth.uid();
-- Then for each project:
SELECT * FROM financial_models WHERE project_id = ?;

-- ✅ GOOD: Use views or JOINs
SELECT * FROM project_summaries WHERE user_id = auth.uid();
-- Returns projects with aggregated model counts
```

### Heavy Queries

```sql
-- ⚠️ EXPENSIVE: calculate_special_event_roi()
-- Contains many COALESCE calls and calculations
-- Consider: Materialized view or cached results
```

---

## Migration Strategy

### For Fresh Deployments

Use consolidated migration set (see audit report)

### For Existing Deployments

1. No action needed (migrations already applied)
2. Delete superseded files from repo only
3. Document active migrations

### For Schema Changes

```sql
-- Template for new migrations
-- migrations/YYYYMMDD_description.sql

-- 1. Describe purpose
COMMENT ON TABLE ... IS '...';

-- 2. Make changes
ALTER TABLE ...;
CREATE INDEX ...;

-- 3. Update RLS if needed
DROP POLICY IF EXISTS ...;
CREATE POLICY ...;

-- 4. Grant permissions
GRANT ... ON ... TO authenticated;

-- 5. Log completion
RAISE NOTICE '...';
```

---

## Monitoring & Maintenance

### Key Metrics to Monitor

```sql
-- Active projects
SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL;

-- Projects with models
SELECT COUNT(DISTINCT project_id) FROM financial_models WHERE deleted_at IS NULL;

-- Shared projects
SELECT COUNT(*) FROM project_shares WHERE is_active = true;

-- Special events completed
SELECT COUNT(*) FROM special_event_actuals;

-- Custom categories added
SELECT COUNT(*) FROM cost_categories WHERE is_system = false;

-- RLS policy performance
SELECT * FROM pg_stat_statements
WHERE query LIKE '%projects%'
ORDER BY total_time DESC LIMIT 10;
```

### Health Checks

```sql
-- Orphaned records (should be 0)
SELECT COUNT(*) FROM financial_models fm
WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = fm.project_id);

-- Expired shares (cleanup candidates)
SELECT COUNT(*) FROM project_shares
WHERE expires_at < NOW() AND is_active = true;

-- Missing primary models (projects without primary model)
SELECT COUNT(*) FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM financial_models fm
  WHERE fm.project_id = p.id AND fm.is_primary = true
) AND p.deleted_at IS NULL;
```

---

**END OF ERD DOCUMENTATION**
