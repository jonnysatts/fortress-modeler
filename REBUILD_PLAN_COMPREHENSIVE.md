# Fortress Financial Modeler - Comprehensive Rebuild Plan

**Generated:** November 14, 2025  
**Purpose:** Complete technical analysis for application rebuild/migration planning

---

## 1. APPLICATION OVERVIEW

### What is Fortress Modeler?

**Fortress Financial Modeler** is a professional business planning and financial analytics platform designed for:
- **Product Managers** - Planning product launches and business models
- **Business Analysts** - Creating financial projections and performance reports
- **Strategic Planners** - Modeling different business scenarios
- **Finance Teams** - Tracking actual vs. projected performance
- **Executive Teams** - Monitoring portfolio health and risk exposure

**Core Purpose:** A comprehensive business planning ecosystem that enables organizations to model complex business scenarios, assess and manage risks, track performance, collaborate in real-time, generate professional reports, schedule special events with milestones, and monitor portfolio health with enterprise-grade analytics dashboards.

---

## 2. OVERALL ARCHITECTURE

### Technology Stack

#### Frontend
- **Framework:** React 18 with TypeScript (strict mode)
- **Build Tool:** Vite 7 (with SWC compiler for fast builds)
- **Styling:** Tailwind CSS 3 + Radix UI components + shadcn/ui
- **State Management:** 
  - Zustand (client-side state)
  - React Query v5 (server state, caching, synchronization)
- **Forms:** React Hook Form + Zod (validation)
- **Routing:** React Router DOM v6

#### Data Management
- **Dual Storage Architecture:**
  - **Local:** IndexedDB via Dexie.js (for offline-first capability)
  - **Cloud:** Supabase (PostgreSQL + real-time collaboration)
- **Data Validation:** Zod schemas throughout
- **Realtime:** Supabase realtime subscriptions for collaborative editing

#### Data Visualization
- **Charts:** Recharts, Chart.js
- **PDF/Excel Export:** jsPDF, jsPDF-autotable, XLSX (@e965/xlsx)
- **Canvas Rendering:** html-to-image, html2canvas

#### Backend Services
- **Optional Node.js/Express server** in `/server` directory (for admin tasks)
- **Primary communication:** Direct Supabase integration via JavaScript client
- **Optional real-time sync service** for cloud-local synchronization

#### Authentication & Security
- **OAuth 2.0:** Google Sign-in via Supabase Auth
- **Session Management:** Supabase session persistence with localStorage
- **RLS (Row-Level Security):** Supabase database policies enforce multi-tenancy
- **CORS & Security:** Supabase handles CORS for production

#### Desktop & Mobile
- **Desktop App:** Electron (with electron-builder for packaging)
- **Mobile:** Responsive web design (Tailwind CSS media queries)
- **Build Targets:** Windows, macOS, Linux

### Architecture Diagram (High-Level)

```
User Browser/Desktop App
  ├─ React Component Tree (React 18)
  ├─ Zustand Store (client state)
  ├─ React Query (server state & cache)
  │
  └─ Data Layer
      ├─ Dexie.js (IndexedDB) - Local offline-first storage
      └─ Supabase Client JavaScript SDK
          ├─ PostgreSQL (Supabase hosted)
          ├─ Auth (Google OAuth)
          ├─ Realtime Subscriptions
          └─ RLS Policies (multi-tenant security)

[Optional] Node.js Backend Server
  ├─ Express routes
  ├─ Admin operations
  ├─ Data migration tasks
  └─ Sync service
```

---

## 3. ALL MAIN FEATURES & FUNCTIONALITY

### 3.1 Financial Modeling Engine

#### Project Setup
- Create projects with metadata (name, description, product type, target audience, timeline)
- Support for two event types: **Weekly Events** and **Special Events**
- Project avatars/images
- Project visibility settings (public/private)

#### Financial Models
- Create multiple financial models per project
- Define model assumptions:
  - **Revenue Streams** (fixed, variable, recurring with custom frequencies)
  - **Cost Categories** (staffing, marketing, operations, other)
  - **Growth Models** (linear, exponential, seasonal)
  - **Marketing Setup** (channel-based budgeting)
- Dynamic growth calculations
- Customer acquisition, retention, expansion modeling
- Cash flow projections (monthly/weekly)

#### Special Events Feature (Event-Specific)
- **Special Event Forecasts:**
  - Revenue: Tickets, F&B, merchandise, sponsorship, other income
  - COGS Standardization: F&B (30% default), Merchandise (50% default)
  - Costs: Staffing, venue, vendor, marketing, production, other
  - Marketing channel breakdown (email, social, influencer, paid ads, content)
  - Estimated attendance, ticket price, notes
  
- **Special Event Actuals:**
  - Actual revenue and cost tracking
  - Actual attendance, per-attendee metrics
  - Marketing performance tracking
  - Success rating (1-10 scale)
  - Comprehensive post-event analysis (feedback, challenges, lessons learned)
  - Variance analysis

- **Milestones:**
  - Define event milestones with target dates
  - Track completion status
  - Assign to team members

### 3.2 Performance Analytics

#### Variance Analysis
- Real-time actual vs. projected performance tracking
- Variance calculations (amount and percentage)
- Trend visualization over time
- Cost and revenue variance breakdown

#### Forecast Accuracy
- MAPE (Mean Absolute Percentage Error) calculations
- Historical accuracy metrics
- Trend identification
- Accuracy by category

#### Project Health Monitoring
- Automated health scoring based on multiple metrics
- Early warning indicators
- Portfolio-wide health visualization
- KPI cards for key metrics

#### Portfolio Dashboard Analytics
- Aggregate performance across all projects
- Event type filtering (all/weekly/special)
- Data completeness indicators
- Project-by-project performance breakdown
- Cross-project KPIs

### 3.3 Risk Management System

#### Comprehensive Risk Assessment
- **6 Risk Categories:**
  1. Market & Customer
  2. Financial Unit Economics
  3. Execution & Delivery
  4. Strategic & Scaling
  5. Operational
  6. Regulatory & Compliance

- **Risk Scoring:**
  - Probability: 1-5 scale
  - Impact: 1-5 scale
  - Risk Score: Probability × Impact (1-25)
  - Severity mapping: Low/Medium/High/Critical

- **Risk Status Tracking:**
  - Identified → Monitoring → Mitigating → Closed
  - Assigned ownership
  - Target and actual resolution dates

#### Automatic Risk Indicators
- Monitor specific metrics (e.g., forecast vs. actual variance)
- Automatic threshold alerts
- Trend tracking (improving/stable/worsening)
- Data source attribution
- Alert severity levels

#### Mitigation Planning
- Detailed action plans per risk
- Individual mitigation actions with:
  - Status (planned/in_progress/completed/cancelled)
  - Priority levels
  - Effort estimation
  - Assignee tracking
  - Due date monitoring

#### Risk Analytics
- **Risk Heat Map:** Likelihood vs. Impact visualization
- **Risk Trends:** Historical risk score changes
- **Portfolio Risk Aggregation:** Enterprise-wide risk exposure
- **Risk Insights:** Top risks, recently updated risks, overdue actions
- **Category Analysis:** Risk distribution by category

### 3.4 Data Entry & Actuals Tracking

#### Actuals Input
- **Period-based entry:** By week or month
- **Revenue Actuals:** By line item (matches model revenue streams)
- **Cost Actuals:** By line item (matches model cost categories)
- **Flexible Input Modes:**
  - Manual data entry
  - Use model percentages (F&B COGS, Merchandise COGS)
  - Use planned marketing spend
  - Override with actual values
- **Attendance Tracking:** Actual attendance vs. projected

### 3.5 Reporting & Exports

#### Export Formats
- **Excel Exports:**
  - Standard export (formulas + data)
  - Enhanced export (formatted, styled)
  - Simple export (values only)
- **PDF Exports:**
  - Standard report format
  - Rich PDF export (charts, tables, formatted)
  - Board-ready PDF (executive summary format)

### 3.6 Collaboration & Sharing

#### Project Sharing
- Share projects with others
- Permission levels: Owner, Editor, Viewer
- Real-time collaborative editing (Supabase)
- Presence awareness

### 3.7 Customizable Categories

#### Category Management
- Cost Categories, Revenue Frequencies, Product Types, Event Types
- User Settings: Dark mode, backup preferences
- Enable/disable specific categories
- Custom naming and reordering

---

## 4. KEY USER FLOWS & PAGES

### Main Pages & Routes

```
/login                                    - Google OAuth login
/auth/callback                            - OAuth callback
/dashboard                                - Portfolio analytics
/projects                                 - Projects list
/projects/new                             - Create project
/projects/:projectId                      - Project detail
/projects/:projectId/models/new           - Create model
/projects/:projectId/models/:modelId      - Model detail
/risks                                    - Risk overview
/settings                                 - User settings
/categories                               - Category management
```

### Primary Workflows

1. **Project Creation & Financial Modeling**
2. **Special Event Planning** (forecast → event → actual → analysis)
3. **Performance Tracking** (enter actuals → variance analysis → reporting)
4. **Risk Management** (identify → score → mitigate → track)
5. **Collaboration** (create → share → real-time editing)

---

## 5. EXTERNAL SERVICES & INTEGRATIONS

### 5.1 Supabase
- PostgreSQL database with RLS policies
- Google OAuth authentication
- Real-time subscriptions
- Storage (for avatars)

### 5.2 Google OAuth
- OAuth 2.0 provider
- Email, profile, openid scopes

### 5.3 Optional Backend Server
- Express.js for admin tasks
- Data migrations
- Sync service

---

## 6. AUTHENTICATION & AUTHORIZATION

### Authentication Flow
1. User visits app → Redirected to `/login`
2. Clicks "Continue with Google"
3. Google OAuth dialog
4. Redirect to `/auth/callback`
5. Create user profile
6. Store session in localStorage
7. Redirect to dashboard

### Authorization Model

**Multi-Tenancy via RLS:**
- All queries filtered by `auth.uid()` at database level
- Projects owned by authenticated user

**Permission Levels:**
- **Owner:** Full CRUD + share permissions
- **Editor:** Modify project data (no delete/share)
- **Viewer:** Read-only access

---

## 7. DATA ENTITIES & RELATIONSHIPS

### Core Tables

**Profiles** (auth users)
- id, email, name, picture, company_domain, preferences

**Projects** (user's projects)
- id, user_id, name, description, product_type, timeline, avatar_image
- event_type (weekly|special), event_date, event_end_date
- is_public, owner_email, share_count

**FinancialModels** (project models)
- id, project_id, user_id, name, assumptions (JSONB), results_cache
- is_primary (which model for dashboard projections)

**SpecialEventForecasts** (event forecasts)
- forecast_ticket_sales, forecast_fnb_revenue, forecast_merch_revenue
- forecast_fnb_cogs_pct, forecast_merch_cogs_pct
- Costs: staffing, venue, vendor, marketing, production, other
- Marketing breakdown: email, social, influencer, paid_ads, content
- estimated_attendance, ticket_price

**SpecialEventActuals** (post-event data)
- actual_ticket_sales, actual_fnb_revenue, actual_merch_revenue
- actual_fnb_cogs, actual_merch_cogs
- actual_staffing_costs, actual_venue_costs, etc.
- actual_attendance, marketing_roi, success_rating (1-10)
- comprehensive feedback: customer_feedback, team_feedback, vendor_feedback
- post-event analysis: challenges_faced, lessons_learned, recommendations

**SpecialEventMilestones** (event milestones)
- id, project_id, milestone_label, target_date, completed, assignee

**ActualsPeriodEntries** (weekly/monthly actuals)
- id, project_id, period, data (JSONB with revenue/cost actuals)

**ProjectRisks** (comprehensive risk management)
- category (6 types), subcategory, title, description
- probability (1-5), impact (1-5), risk_score, severity
- status, mitigation_plan, mitigation_actions
- automatic_indicators, risk_history
- assigned_to, reviewed_by

**UserSettings** (user preferences)
- dark_mode, backup_reminders, backup_frequency

**ConfigurableCategories** (customizable categories)
- category_type, value, display_name, is_active

**ProjectShares** (project permissions)
- project_id, shared_with_user_id, permission level

---

## 8. DEVELOPMENT & DEPLOYMENT

### Local Development

```bash
npm install
npm run dev  # http://localhost:8081
```

### Build & Deployment

```bash
npm run build           # Production build
npm run electron:build  # Desktop app
```

### Environment Variables

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_USE_SUPABASE_BACKEND=true
VITE_DEBUG=false
```

### Database Migrations

Located in `/supabase/migrations/`:
- `20250101_base_schema_complete.sql` - Core tables
- `20250721055950_add_cogs_standardization_to_special_events.sql` - COGS
- `20250723_add_configurable_categories.sql` - Categories
- `20250724_standardize_success_rating_1_to_10.sql` - Success rating

---

## 9. CRITICAL IMPLEMENTATION NOTES

### Cloud vs. Local Storage

**Cloud Mode (VITE_USE_SUPABASE_BACKEND=true):**
- Supabase as primary storage
- Real-time collaboration
- Project sharing enabled
- Requires internet

**Local Mode (VITE_USE_SUPABASE_BACKEND=false):**
- IndexedDB as primary storage
- Works offline
- No collaboration
- Single-user only

### Special Events vs. Weekly Events

**Weekly Events (event_type='weekly'):**
- Recurring events with multiple periods
- Financial model with revenue/cost streams
- Period-by-period actuals

**Special Events (event_type='special'):**
- One-off events with date range
- Comprehensive forecast form
- Post-event actual results
- Milestone tracking
- Success metrics
- Variance analysis

### COGS Standardization

**Defaults:**
- F&B COGS: 30% of revenue
- Merchandise COGS: 50% of revenue

**Features:**
- Toggle automatic calculation
- Manual override capability
- Tracked separately in forecast vs. actual

---

## 10. KNOWN LIMITATIONS

### Browser Compatibility
- Modern browsers only (ES2020+)
- No IE11 support

### Offline Capabilities
- Only in local mode (IndexedDB)
- Cloud mode requires internet

### Scalability
- Designed for 5-50+ users per project
- Supabase provides enterprise scalability

---

## SUMMARY

Fortress Financial Modeler is a comprehensive, modern web application built with React 18 and TypeScript, backed by Supabase. It supports both local and cloud-based deployments with advanced financial modeling, risk management, performance analytics, and special event tracking. The application is production-ready with proper authentication, multi-tenancy, responsive design, and enterprise-grade features including project sharing, real-time collaboration, and comprehensive reporting.

The codebase is well-organized with clear separation of concerns (components, services, hooks, pages), comprehensive type safety, and modern development practices.
