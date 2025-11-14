# Fortress Financial Modeler - Quick Reference Guide

## Application at a Glance

**Name:** Fortress Financial Modeler  
**Type:** Enterprise business planning & financial analytics SaaS  
**Target Users:** Product managers, business analysts, finance teams, executives  
**Deployment:** Web (React), Desktop (Electron), Mobile-responsive  

---

## Technology Stack Summary

| Category | Technology |
|----------|-----------|
| **Frontend Framework** | React 18 + TypeScript |
| **Build Tool** | Vite 7 |
| **Styling** | Tailwind CSS 3 + Radix UI |
| **State Management** | Zustand + React Query v5 |
| **Local Storage** | IndexedDB (Dexie.js) |
| **Cloud Backend** | Supabase (PostgreSQL + Auth) |
| **Authentication** | Google OAuth 2.0 |
| **Charts** | Recharts, Chart.js |
| **Exports** | jsPDF, XLSX |
| **Desktop** | Electron |
| **Code Quality** | TypeScript strict, ESLint, Vitest |

---

## Core Features (Ranked by Importance)

### Tier 1: Essential
1. **Financial Modeling** - Revenue, costs, growth assumptions, projections
2. **Project Management** - Create, organize, manage projects
3. **Authentication** - Google OAuth login
4. **Data Entry** - Actual results tracking (periodic)
5. **Cloud Sync** - Supabase PostgreSQL persistence

### Tier 2: Advanced Analytics
6. **Risk Management** - 6 risk categories, scoring, mitigation tracking
7. **Performance Analytics** - Variance analysis, forecast accuracy (MAPE)
8. **Project Health** - Automated health scoring
9. **Portfolio Dashboard** - Cross-project KPIs

### Tier 3: Specialized
10. **Special Events** - Event forecasting, post-event analysis, milestones
11. **Reporting & Exports** - PDF, Excel, Board-ready formats
12. **Collaboration** - Real-time sharing, permissions
13. **Customizable Categories** - User-configured categories

---

## Key Pages (6 Main Sections)

```
1. Dashboard (/dashboard)
   - Portfolio KPIs, variance trends, forecast accuracy
   
2. Projects (/projects)
   - Project list, creation, detail view
   
3. Models (/projects/:id/models)
   - Financial model creation and editing
   
4. Risks (/risks)
   - Portfolio-wide risk overview
   
5. Settings (/settings)
   - User preferences, exports, category management
   
6. Auth (/login, /auth/callback)
   - Google OAuth login flow
```

---

## Data Structure Overview

### Primary Entities (11 Main Tables)

```
Profiles → Projects → FinancialModels
          → SpecialEventForecasts
          → SpecialEventActuals
          → SpecialEventMilestones
          → ProjectRisks
          → ActualsPeriodEntries
          → Scenarios
          → (Shared with via) ProjectShares
          → UserSettings
          → ConfigurableCategories
```

### Special Events Data Flow

```
Create Special Event Project
    ↓
Enter Forecast (ticket, F&B, merch, sponsorship + costs)
    ↓
Define Milestones
    ↓
Execute Event
    ↓
Enter Actuals (revenue, costs, attendance, feedback)
    ↓
Calculate Variance
    ↓
Export Report
```

---

## Features Deep Dive

### Financial Modeling
- Multiple models per project
- Revenue streams (fixed, variable, recurring)
- Cost categories (staffing, marketing, operations, other)
- Growth models (linear, exponential, seasonal)
- Marketing channel budgeting
- Cash flow projections

### Risk Management
**6 Categories:**
1. Market & Customer
2. Financial Unit Economics
3. Execution & Delivery
4. Strategic & Scaling
5. Operational
6. Regulatory & Compliance

**Per Risk:**
- Probability × Impact scoring (1-25 scale)
- Severity: Low/Medium/High/Critical
- Status: Identified → Monitoring → Mitigating → Closed
- Mitigation actions with ownership & due dates
- Automatic indicators with threshold monitoring
- Historical trend tracking

### Special Events (Specialized)
**Forecasts Include:**
- Revenue: Tickets, F&B, merchandise, sponsorship
- COGS: F&B (30% default), Merchandise (50% default)
- Costs: Staffing, venue, vendor, marketing, production
- Marketing: Email, social, influencer, paid ads, content
- Estimated attendance, ticket price

**Actuals Include:**
- All forecast line items (actual values)
- Attendance metrics (per-attendee calculations)
- Marketing ROI
- Success rating (1-10 scale)
- Post-event feedback (customer, team, vendor)
- Challenges, lessons learned, recommendations
- Variance analysis

**Milestones:**
- Target date, completion status, assignee, notes

### Performance Analytics
- **Variance Analysis:** Actual vs. projected with % variance
- **Forecast Accuracy:** MAPE (Mean Absolute Percentage Error)
- **Project Health:** Automated scoring with indicators
- **Portfolio Analytics:** Aggregate metrics across all projects
- **Trend Visualization:** Charts showing historical performance

### Collaboration & Sharing
- Owner, Editor, Viewer permission levels
- Real-time multi-user editing (Supabase realtime)
- Presence awareness (see who's editing)
- Project-level sharing (no field-level granularity yet)

---

## Authentication & Authorization

### Authentication
- **Provider:** Google OAuth 2.0
- **Session Storage:** localStorage
- **Token Refresh:** Automatic via Supabase

### Authorization
- **Model:** Row-Level Security (RLS) at database level
- **Multi-tenancy:** User ID filters all queries
- **Sharing:** Optional project-level sharing with permission granularity

---

## Deployment Targets

| Target | Command | Output |
|--------|---------|--------|
| Web (Production) | `npm run build` | `/dist` folder |
| Local Dev | `npm run dev` | http://localhost:8081 |
| Desktop (Windows) | `npm run electron:build:win` | .exe installer |
| Desktop (macOS) | `npm run electron:build:mac` | .dmg installer |
| Desktop (Linux) | `npm run electron:build:linux` | .AppImage |

---

## Environment Configuration

### Required Variables
```
VITE_SUPABASE_URL              # Supabase project URL
VITE_SUPABASE_ANON_KEY         # Supabase anon key
VITE_GOOGLE_CLIENT_ID          # Google OAuth client ID
VITE_USE_SUPABASE_BACKEND      # true = cloud, false = local only
```

### Feature Flags
```
VITE_DEBUG                     # Enable debug logging
```

---

## Component Organization

### Structure
```
src/
├── components/
│   ├── dashboard/         (5 files)
│   ├── models/           (20 files)
│   ├── risk/             (6 files)
│   ├── projects/         (3 files)
│   ├── events/           (3 files)
│   ├── layout/           (3 files)
│   ├── financial/        (6 files)
│   ├── navigation/       (1 file)
│   └── ui/               (Radix UI + shadcn/ui)
├── pages/                (19 files)
├── hooks/                (24 custom hooks)
├── services/             (12 business logic services)
├── lib/
│   ├── db.ts            (Dexie + Supabase schemas)
│   ├── supabase.ts      (Supabase client)
│   └── (utilities)
└── types/               (4 type definition files)
```

### Heavy Components (Lazy Loaded)
- PerformanceAnalysis
- ActualsInputForm
- SpecialEventForecastForm
- SpecialEventActualForm

---

## Key Dependencies

### Core
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "typescript": "^5.5.3",
  "react-router-dom": "^6.26.2",
  "zustand": "^4.5.6",
  "@tanstack/react-query": "^5.56.2"
}
```

### UI & Forms
```json
{
  "tailwindcss": "^3.4.17",
  "@radix-ui/*": "latest versions",
  "react-hook-form": "^7.53.0",
  "zod": "^3.23.8"
}
```

### Data & Storage
```json
{
  "@supabase/supabase-js": "^2.50.5",
  "dexie": "^4.0.11"
}
```

### Visualization & Export
```json
{
  "recharts": "^2.12.7",
  "chart.js": "^4.5.0",
  "jspdf": "^3.0.2",
  "xlsx": "^0.20.3"
}
```

---

## Database Migrations (Applied in Order)

1. **20250101_base_schema_complete.sql**
   - Core tables: profiles, projects, financial_models, risks, scenarios
   - Special events: forecasts, actuals, milestones
   - Actuals: period_entries, actual_performance
   - RLS policies setup

2. **20250114_enhance_special_events_comprehensive_FIXED.sql**
   - Enhanced special events tables

3. **20250721055950_add_cogs_standardization_to_special_events.sql**
   - COGS percentage columns (F&B 30%, Merchandise 50%)
   - Automatic COGS calculation flags

4. **20250723_add_configurable_categories.sql**
   - ConfigurableCategories table
   - User-specific category management

5. **20250724_standardize_success_rating_1_to_10.sql**
   - Success rating constraint (1-10 scale)

6. **20250725_create_user_settings.sql**
   - UserSettings table
   - User preferences (dark_mode, backups)

---

## Testing Suite

| Test Type | Command | Framework |
|-----------|---------|-----------|
| Unit | `npm run test` | Vitest |
| UI | `npm run test:ui` | Vitest UI |
| Coverage | `npm run test:coverage` | Vitest + v8 |
| E2E | `npm run test:e2e` | Vitest |
| Integration | `npm run test:integration` | Vitest |

---

## Performance Characteristics

| Metric | Target | Actual |
|--------|--------|--------|
| First Contentful Paint | <1.5s | <1.5s |
| Largest Contentful Paint | <2.5s | <2.5s |
| Bundle Size (uncompressed) | ~1.5MB | ~1.5MB |
| Bundle Size (gzipped) | ~470KB | ~470KB |
| Code Split Ratio | 82% reduction | 82% reduction |

---

## Storage Modes Comparison

| Feature | Cloud Mode | Local Mode |
|---------|-----------|-----------|
| Backend | Supabase | IndexedDB |
| Sharing | Yes | No |
| Real-time | Yes | No |
| Offline | No | Yes |
| Multi-user | Yes | No |
| Internet Required | Yes | No |
| Users Supported | Unlimited | 1 |

---

## Common Development Tasks

### Add New Risk Category
1. Edit `/src/types/risk.ts` - Add to `RiskCategory` enum
2. Edit `/src/services/RiskService.ts` - Add category logic
3. Update database RLS policies
4. Add migration if needed

### Add New Revenue/Cost Type
1. Edit `/src/types/models.ts` - Extend type definitions
2. Update `/src/lib/db.ts` schema
3. Update `/src/pages/models/NewFinancialModel.tsx` form
4. Add Zod validation schema

### Add New Export Format
1. Create export function in `/src/lib/exports/`
2. Add export button in `/src/pages/Settings.tsx`
3. Test with various data sizes

### Add New Dashboard Metric
1. Create service in `/src/services/` if needed
2. Create hook in `/src/hooks/`
3. Add card component in `/src/components/dashboard/`
4. Add to Dashboard page layout

---

## Known Issues & Workarounds

### Issue: Port 8081 Already in Use
**Workaround:** Use alternative port
```bash
npm run dev -- --port 3000
# or
npm run dev:3000
```

### Issue: Supabase Connection Timeout
**Workaround:** Check environment variables, verify internet connection
```bash
# Check credentials
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY
```

### Issue: IndexedDB Quota Exceeded
**Workaround:** Clear browser storage, export data first
```javascript
indexedDB.deleteDatabase('FortressDB');
localStorage.clear();
```

---

## File Sizes & Complexities

| File | Lines | Complexity | Notes |
|------|-------|-----------|-------|
| ProjectDetail.tsx | 800+ | High | Main project page |
| ActualsInputForm.tsx | 900+ | High | Complex form logic |
| SpecialEventActualForm.tsx | 1500+ | Very High | Comprehensive form |
| SpecialEventForecastForm.tsx | 1200+ | Very High | Comprehensive form |
| DashboardAnalyticsService.ts | 600+ | High | Complex calculations |
| RiskService.ts | 650+ | High | Risk logic |

---

## Quick Rebuild Checklist

- [ ] Clone repository
- [ ] `npm install` dependencies
- [ ] Set up `.env` with Supabase credentials
- [ ] Run `npm run dev` to start
- [ ] Verify login works (Google OAuth)
- [ ] Test project creation
- [ ] Test model creation
- [ ] Test special event creation
- [ ] Test actuals entry
- [ ] Test dashboard analytics
- [ ] Test exports (PDF, Excel)
- [ ] Test risk management
- [ ] Test sharing (if cloud enabled)
- [ ] Run tests: `npm run test:run`
- [ ] Check linting: `npm run lint`
- [ ] Run `npm run build` for production

---

## Support Resources

### Documentation Files
- `/docs/USER_GUIDE.md` - User workflows
- `/docs/INSTALLATION_GUIDE.md` - Setup instructions
- `/docs/DATABASE_SCHEMA_AUDIT_2025.md` - Schema details
- `/docs/PROJECT_STRUCTURE.md` - Code organization

### Configuration
- `vite.config.ts` - Vite build configuration
- `tailwind.config.ts` - Tailwind design tokens
- `tsconfig.app.json` - TypeScript settings
- `vitest.config.ts` - Test runner setup

### Environment
- `.env.example` - Template for environment variables
- `/server/` - Optional backend server code
- `/supabase/` - Database migrations and seed data

---

**Last Updated:** November 14, 2025  
**Version:** 1.0  
**Author:** Claude Code Analysis
