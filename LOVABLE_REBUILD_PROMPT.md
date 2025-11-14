# LOVABLE REBUILD PROMPT: Fortress Financial Modeler

**Instructions:** Copy this entire prompt into Lovable to rebuild the Fortress Financial Modeler from scratch.

---

## PROJECT OVERVIEW

Build **Fortress Financial Modeler** - a professional SaaS business planning and financial analytics platform for product managers, business analysts, and strategic planners.

**Core Purpose:** Enable organizations to model complex business scenarios with revenue streams, cost structures, and growth models; assess and manage risks with comprehensive categorization and impact analysis; track actual vs projected performance with variance analysis; collaborate in real-time with cloud-based sharing; generate professional reports (PDF/Excel); schedule special events and milestones; and monitor portfolio health with enterprise-grade analytics dashboards.

---

## PHASE 1: FOUNDATION & INFRASTRUCTURE (Week 1-2)

### 1.1 Project Setup & Supabase Configuration

**Create a new Supabase project and set up the complete database schema:**

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    picture TEXT,
    company_domain TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    product_type TEXT NOT NULL,
    target_audience TEXT,
    data JSONB DEFAULT '{}',
    timeline JSONB DEFAULT '{}',
    avatar_image TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    owner_email TEXT,
    share_count INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    event_type TEXT,
    event_date DATE,
    event_end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Create financial_models table
CREATE TABLE financial_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    assumptions JSONB DEFAULT '{}',
    results_cache JSONB DEFAULT '{}',
    version INTEGER DEFAULT 1,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Create actuals_period_entries table
CREATE TABLE actuals_period_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    period INTEGER NOT NULL,
    period_type TEXT DEFAULT 'Week',
    data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, period)
);

-- Create risks table
CREATE TABLE risks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    likelihood TEXT NOT NULL,
    impact TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    mitigation TEXT,
    notes TEXT,
    owner_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create special_event_forecasts table
CREATE TABLE special_event_forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    forecast_ticket_sales DECIMAL(15,2),
    forecast_fnb_revenue DECIMAL(15,2),
    forecast_fnb_cogs_pct DECIMAL(5,2),
    forecast_merch_revenue DECIMAL(15,2),
    forecast_merch_cogs_pct DECIMAL(5,2),
    forecast_sponsorship_income DECIMAL(15,2),
    forecast_other_income DECIMAL(15,2),
    forecast_staffing_costs DECIMAL(15,2),
    forecast_venue_costs DECIMAL(15,2),
    forecast_vendor_costs DECIMAL(15,2),
    forecast_marketing_costs DECIMAL(15,2),
    forecast_production_costs DECIMAL(15,2),
    forecast_other_costs DECIMAL(15,2),
    estimated_attendance INTEGER,
    ticket_price DECIMAL(10,2),
    revenue_notes TEXT,
    cost_notes TEXT,
    marketing_notes TEXT,
    general_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create special_event_actuals table
CREATE TABLE special_event_actuals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    actual_ticket_sales DECIMAL(15,2),
    actual_fnb_revenue DECIMAL(15,2),
    actual_fnb_cogs DECIMAL(15,2),
    actual_merch_revenue DECIMAL(15,2),
    actual_merch_cogs DECIMAL(15,2),
    actual_sponsorship_income DECIMAL(15,2),
    actual_other_income DECIMAL(15,2),
    actual_staffing_costs DECIMAL(15,2),
    actual_venue_costs DECIMAL(15,2),
    actual_vendor_costs DECIMAL(15,2),
    actual_marketing_costs DECIMAL(15,2),
    actual_production_costs DECIMAL(15,2),
    actual_other_costs DECIMAL(15,2),
    actual_attendance INTEGER,
    success_rating INTEGER CHECK (success_rating >= 1 AND success_rating <= 10),
    event_success_indicators TEXT,
    challenges_faced TEXT,
    lessons_learned TEXT,
    revenue_variance_notes TEXT,
    cost_variance_notes TEXT,
    general_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create special_event_milestones table
CREATE TABLE special_event_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    milestone_label TEXT,
    target_date DATE,
    completed BOOLEAN DEFAULT FALSE,
    assignee TEXT,
    notes TEXT
);

-- Create project_shares table
CREATE TABLE project_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    shared_with_email TEXT NOT NULL,
    shared_with_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    permission TEXT DEFAULT 'view',
    is_active BOOLEAN DEFAULT TRUE,
    last_accessed TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active'
);

-- Create user_settings table
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    revenue_categories JSONB DEFAULT '[]',
    cost_categories JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_deleted_at ON projects(deleted_at);
CREATE INDEX idx_financial_models_project_id ON financial_models(project_id);
CREATE INDEX idx_actuals_period_entries_project_id ON actuals_period_entries(project_id);
CREATE INDEX idx_risks_project_id ON risks(project_id);
CREATE INDEX idx_project_shares_project_id ON project_shares(project_id);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE actuals_period_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_event_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_event_actuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_event_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for projects (users can access their own projects + shared projects)
CREATE POLICY "Users can view own projects" ON projects
    FOR SELECT USING (auth.uid() = user_id OR deleted_at IS NULL);

CREATE POLICY "Users can view shared projects" ON projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM project_shares
            WHERE project_shares.project_id = projects.id
            AND project_shares.shared_with_id = auth.uid()
            AND project_shares.is_active = true
        )
    );

CREATE POLICY "Users can insert own projects" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for financial_models
CREATE POLICY "Users can view models for accessible projects" ON financial_models
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM projects WHERE projects.id = financial_models.project_id AND projects.user_id = auth.uid())
    );

CREATE POLICY "Users can insert models" ON financial_models FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own models" ON financial_models FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own models" ON financial_models FOR DELETE USING (auth.uid() = user_id);

-- Similar RLS policies for other tables (actuals, risks, special events, etc.)
-- Apply same pattern: users can access data for projects they own or have been shared with
```

**Google OAuth Setup:**
- Enable Google OAuth provider in Supabase Authentication settings
- Configure redirect URLs: `http://localhost:8081/auth/callback` (dev), your production URL (prod)

### 1.2 Tech Stack & Dependencies

**Install these core dependencies:**

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.50.5",
    "@tanstack/react-query": "^5.56.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2",
    "zustand": "^4.5.6",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-dropdown-menu": "^2.1.1",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-select": "^2.1.1",
    "react-hook-form": "^7.53.0",
    "zod": "^3.23.8",
    "@hookform/resolvers": "^3.9.0",
    "recharts": "^2.12.7",
    "lucide-react": "^0.462.0",
    "tailwind-merge": "^2.5.2",
    "class-variance-authority": "^0.7.1",
    "sonner": "^1.5.0",
    "jspdf": "^3.0.2",
    "jspdf-autotable": "^5.0.2",
    "xlsx": "npm:@e965/xlsx@^0.20.3",
    "date-fns": "^3.6.0"
  }
}
```

### 1.3 Basic UI Component Library (Shadcn/ui style)

Create these foundational UI components:

1. **Button** - Primary, secondary, outline, ghost variants
2. **Card** - Container with header, content, footer
3. **Input** - Text input with label
4. **Select** - Dropdown select with search
5. **Dialog** - Modal dialogs
6. **Tabs** - Tabbed navigation
7. **Table** - Data table with sorting
8. **Badge** - Status indicators
9. **Avatar** - User profile images
10. **Toast** - Notification system (using sonner)

**Design System:**
- Primary color: Blue (#3b82f6)
- Success: Green (#22c55e)
- Warning: Yellow (#eab308)
- Danger: Red (#ef4444)
- Font: Inter or system font stack
- Responsive breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)

---

## PHASE 2: AUTHENTICATION & USER MANAGEMENT (Week 2)

### 2.1 Authentication Pages

**Create Login Page:**
- Google Sign-in button (primary CTA)
- "Sign in with Google" using Supabase Auth
- Redirect to `/auth/callback` after authentication
- Handle auth errors gracefully

**Create Auth Callback Page:**
- Handle OAuth callback from Google
- Extract session from URL hash
- Store user session in Supabase client
- Create/update user profile in `profiles` table
- Redirect to dashboard on success

### 2.2 User Profile Management

**Profile Service:**
```typescript
// Automatic profile creation after OAuth
const createProfile = async (user) => {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email,
      name: user.user_metadata.full_name,
      picture: user.user_metadata.avatar_url,
      updated_at: new Date().toISOString()
    });
};
```

**Protected Routes:**
- Create `ProtectedRoute` component that checks `supabase.auth.getSession()`
- Redirect to login if no session
- Wrap all app routes except `/login` and `/auth/callback`

### 2.3 Settings Page

**User Settings:**
- Display user name, email, profile picture
- Allow configuring custom revenue categories
- Allow configuring custom cost categories
- Sign out button

---

## PHASE 3: PROJECT MANAGEMENT (Week 3)

### 3.1 Projects List Page

**Display:**
- Grid/list view of all user projects
- Project cards showing: name, description, product type, created date
- Filter by product type (Event, Subscription, One-time, Custom)
- Search by project name
- "New Project" button

**Project Card:**
- Project avatar/image
- Project name and description
- Product type badge
- Created date
- Quick actions: View, Edit, Delete, Share
- Click to open project detail

### 3.2 New Project Page

**Form Fields:**
1. **Project Name** (required)
2. **Description** (optional textarea)
3. **Product Type** (required select): Event, Subscription, One-time, Custom
4. **Target Audience** (optional text)
5. **Event Type** (for Event products): Weekly Event or Special Event
6. **Event Start Date** (for Special Events)
7. **Event End Date** (for Special Events)
8. **Avatar Image** (optional upload)

**Form Validation:**
- Project name required (min 3 chars)
- Product type required
- Event dates required if Event Type = Special Event

**On Submit:**
```typescript
const createProject = async (formData) => {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      name: formData.name,
      description: formData.description,
      product_type: formData.productType,
      target_audience: formData.targetAudience,
      event_type: formData.eventType,
      event_date: formData.eventStartDate,
      event_end_date: formData.eventEndDate,
      owner_email: user.email,
      data: {},
      timeline: {}
    })
    .select()
    .single();

  // Redirect to project detail page
};
```

### 3.3 Project Detail Page

**Layout:**
- Breadcrumb navigation: Dashboard > Projects > [Project Name]
- Project header with name, description, avatar
- Tabs navigation:
  - Overview
  - Financial Model
  - Actuals & Performance
  - Risk Assessment
  - Special Events (for Event projects)
  - Settings

**Overview Tab:**
- Project summary card
- Key metrics: Total revenue, total costs, profit margin
- Quick stats: Number of models, risks, actuals entries
- Recent activity feed

---

## PHASE 4: FINANCIAL MODELING ENGINE (Week 4-5)

### 4.1 Financial Model Form

**Model Creation/Edit Page:**

**Step 1: Basic Model Info**
- Model name (required)
- Model type: Weekly Event, Special Event, Monthly Subscription, One-time, Custom
- Number of weeks/months for projection

**Step 2: Revenue Streams**
Create dynamic form to add multiple revenue streams:

```typescript
interface RevenueStream {
  name: string;          // e.g., "Ticket Sales", "Merchandise"
  value: number;         // Base amount
  type: 'fixed' | 'variable' | 'recurring';
  frequency?: 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'one-time';
}
```

**Example Revenue Stream Inputs:**
- Stream name (text input)
- Base value (number input, currency format)
- Type (select: Fixed, Variable, Recurring)
- Frequency (select: Weekly, Monthly, etc.)
- "Add Revenue Stream" button
- Show list of added streams with Edit/Delete actions

**Step 3: Cost Structure**
Create dynamic form to add multiple costs:

```typescript
interface CostCategory {
  name: string;          // e.g., "Venue Rental", "Staff Wages"
  value: number;
  type: 'fixed' | 'variable' | 'recurring';
  category?: 'staffing' | 'marketing' | 'operations' | 'other';
}
```

**Step 4: Growth Model**
```typescript
interface GrowthModel {
  type: 'linear' | 'exponential' | 'seasonal' | 'custom';
  rate: number;          // Growth rate %
  seasonalFactors?: number[]; // For seasonal growth
  individualRates?: { [key: string]: number }; // Custom rates per stream
}
```

**Growth Model UI:**
- Growth type selector
- Overall growth rate slider (0-100%)
- Option to set individual growth rates per revenue stream
- Visual preview of growth curve

**Step 5: Marketing Budget (Optional)**
```typescript
interface MarketingSetup {
  allocationMode: 'channels' | 'highLevel';
  channels: MarketingChannelItem[];
  totalBudget?: number;
  budgetApplication?: 'upfront' | 'spreadEvenly' | 'spreadCustom';
  spreadDuration?: number;
}

interface MarketingChannelItem {
  id: string;
  channelType: string;   // Facebook, Instagram, Google Ads, etc.
  name: string;
  weeklyBudget: number;
  targetAudience: string;
  description: string;
}
```

**Marketing UI:**
- Toggle: Channel-based allocation vs High-level budget
- For channel-based: Add marketing channels with weekly budgets
- For high-level: Total budget + application method (upfront, spread evenly, custom)

### 4.2 Financial Calculation Engine

**Core Calculations Service:**

```typescript
class FinancialModelService {
  calculateProjections(model, periods) {
    // For each period (week/month):
    // 1. Calculate revenue with growth
    // 2. Calculate costs with growth
    // 3. Apply marketing budget
    // 4. Calculate profit = revenue - costs
    // 5. Calculate cumulative metrics
    // Return: Array of period projections
  }

  calculateMetrics(projections) {
    // Calculate:
    // - Total revenue
    // - Total costs
    // - Profit margin %
    // - Break-even period
    // - ROI
    // - Average profit per period
  }
}
```

**Projection Output Format:**
```typescript
interface PeriodProjection {
  period: number;
  revenue: number;
  costs: number;
  profit: number;
  cumulativeRevenue: number;
  cumulativeCosts: number;
  cumulativeProfit: number;
  revenueBreakdown: { [streamName: string]: number };
  costBreakdown: { [costName: string]: number };
}
```

### 4.3 Financial Model Visualization

**Create Model Detail View:**

**Section 1: Key Metrics Cards**
- Total Projected Revenue (sum across all periods)
- Total Projected Costs
- Net Profit
- Profit Margin %
- Break-even Period

**Section 2: Revenue & Profit Chart**
- Line chart (using Recharts)
- X-axis: Period (Week/Month)
- Y-axis: Amount ($)
- Lines: Revenue, Costs, Profit
- Toggle: Show cumulative vs period-by-period

**Section 3: Revenue Breakdown**
- Stacked bar chart showing revenue by stream per period
- Pie chart showing total revenue composition

**Section 4: Cost Breakdown**
- Stacked bar chart showing costs by category per period
- Pie chart showing total cost composition

**Section 5: Financial Table**
- Tabular view of all projections
- Columns: Period, Revenue, Costs, Profit, Margin %
- Sortable columns
- Export to Excel button

---

## PHASE 5: ACTUALS & PERFORMANCE TRACKING (Week 5-6)

### 5.1 Actuals Input Interface

**Actuals Input Form:**
- Period selector (Week 1, Week 2, etc.)
- For each revenue stream in model: Input actual value
- For each cost category: Input actual value
- Attendance actual (for event models)
- Option to use model's marketing plan or input actual marketing spend
- Option to use model's COGS percentages or input actual COGS
- Notes field for period-specific comments
- Save button

**Data Structure:**
```typescript
interface ActualsPeriodEntry {
  id: string;
  projectId: string;
  period: number;
  periodType: 'Week' | 'Month';
  revenueActuals: Record<string, number>; // { "Ticket Sales": 5000, ... }
  costActuals: Record<string, number>;
  attendanceActual?: number;
  notes?: string;
  useFbCogsPercentage?: boolean;
  useMerchandiseCogsPercentage?: boolean;
  useMarketingPlan?: boolean;
}
```

### 5.2 Variance Analysis

**Variance Calculation Service:**
```typescript
class VarianceAnalysisService {
  calculateVariance(projected, actual) {
    const variance = actual - projected;
    const variancePercent = (variance / projected) * 100;
    const status = variancePercent > 10 ? 'favorable' :
                   variancePercent < -10 ? 'unfavorable' : 'ontrack';
    return { variance, variancePercent, status };
  }

  analyzeProjectPerformance(project) {
    // Compare all actuals vs projections
    // Return: Overall variance, by revenue stream, by cost category
  }
}
```

**Variance Display:**
- Variance cards showing Actual vs Projected for key metrics
- Green (favorable), Yellow (on track), Red (unfavorable) color coding
- Percentage variance indicators
- Drill-down by revenue stream and cost category

**Variance Table:**
- Columns: Metric, Projected, Actual, Variance ($), Variance (%)
- Sortable by variance
- Visual indicators (arrows, colors)

### 5.3 Forecast Accuracy

**Accuracy Metrics:**
- MAPE (Mean Absolute Percentage Error)
- Accuracy score (100 - MAPE)
- Trend: Improving, Stable, Declining

**Accuracy Chart:**
- Line chart showing forecast accuracy over time
- X-axis: Period
- Y-axis: Accuracy %
- Benchmark line at 80%

---

## PHASE 6: RISK MANAGEMENT SYSTEM (Week 6-7)

### 6.1 Risk Assessment Interface

**Add Risk Form:**

```typescript
interface ProjectRisk {
  id: string;
  projectId: string;
  name: string;                  // Risk title
  type: string;                  // Category: Financial, Operational, Strategic, Market, Regulatory
  likelihood: string;            // Low, Medium, High
  impact: string;                // Low, Medium, High
  status: 'active' | 'monitoring' | 'mitigating' | 'closed';
  mitigation: string;            // Mitigation plan
  notes: string;
  ownerEmail: string;            // Assigned owner
}
```

**Form Fields:**
1. Risk name (text input)
2. Risk category (select): Financial, Operational, Strategic, Market, Regulatory
3. Likelihood (select): Low (1), Medium (2), High (3)
4. Impact (select): Low (1), Medium (2), High (3)
5. Risk score (auto-calculated: likelihood × impact, 1-9)
6. Status (select): Active, Monitoring, Mitigating, Closed
7. Mitigation plan (textarea)
8. Assigned owner (email input)
9. Notes (textarea)

### 6.2 Risk Dashboard

**Risk Overview Cards:**
- Total risks count
- Critical risks (score 6-9)
- High risks (score 4-6)
- Medium risks (score 2-4)
- Low risks (score 1)

**Risk Heat Map:**
- 3×3 grid
- X-axis: Impact (Low, Medium, High)
- Y-axis: Likelihood (Low, Medium, High)
- Plot risks as dots/circles on the grid
- Color code by severity
- Click risk to view details

**Risk List Table:**
- Columns: Name, Category, Likelihood, Impact, Score, Status, Owner
- Filters: By category, by status, by severity
- Sort by score (default: highest first)
- Click row to edit

### 6.3 Risk Mitigation Tracking

**Risk Detail View:**
- Risk information summary
- Mitigation plan with edit capability
- Status update dropdown
- Activity log showing status changes
- Delete risk option

---

## PHASE 7: SPECIAL EVENTS SYSTEM (Week 7-8)

### 7.1 Special Event Forecast

**Special Event Forecast Form:**

```typescript
interface SpecialEventForecast {
  projectId: string;

  // Revenue streams
  forecastTicketSales?: number;
  forecastFnbRevenue?: number;
  forecastFnbCogsPct?: number;        // F&B COGS %
  forecastMerchRevenue?: number;
  forecastMerchCogsPct?: number;      // Merch COGS %
  forecastSponsorshipIncome?: number;
  forecastOtherIncome?: number;

  // Cost breakdown
  forecastStaffingCosts?: number;
  forecastVenueCosts?: number;
  forecastVendorCosts?: number;
  forecastMarketingCosts?: number;
  forecastProductionCosts?: number;
  forecastOtherCosts?: number;

  // Event details
  estimatedAttendance?: number;
  ticketPrice?: number;

  // Notes
  revenueNotes?: string;
  costNotes?: string;
  marketingNotes?: string;
  generalNotes?: string;
}
```

**Forecast Form UI:**
- Group by sections: Revenue, Costs, Event Details, Notes
- Number inputs with currency formatting
- Percentage inputs for COGS
- Auto-calculate totals: Total Revenue, Total Costs, Net Profit

### 7.2 Special Event Actuals

**Special Event Actuals Form:**

```typescript
interface SpecialEventActual {
  projectId: string;

  // Actual revenue
  actualTicketSales?: number;
  actualFnbRevenue?: number;
  actualFnbCogs?: number;
  actualMerchRevenue?: number;
  actualMerchCogs?: number;
  actualSponsorshipIncome?: number;
  actualOtherIncome?: number;

  // Actual costs
  actualStaffingCosts?: number;
  actualVenueCosts?: number;
  actualVendorCosts?: number;
  actualMarketingCosts?: number;
  actualProductionCosts?: number;
  actualOtherCosts?: number;

  // Event metrics
  actualAttendance?: number;

  // Success indicators
  successRating?: number;              // 1-10 scale
  eventSuccessIndicators?: string;
  challengesFaced?: string;
  lessonsLearned?: string;

  // Variance notes
  revenueVarianceNotes?: string;
  costVarianceNotes?: string;
  generalNotes?: string;
}
```

**Actuals Form UI:**
- Similar structure to Forecast form
- Success rating slider (1-10)
- Text areas for qualitative feedback
- Side-by-side comparison with forecast (if exists)

### 7.3 Special Event Milestones

**Milestone Tracker:**

```typescript
interface SpecialEventMilestone {
  id: string;
  projectId: string;
  milestoneLabel: string;
  targetDate: Date;
  completed: boolean;
  assignee: string;
  notes: string;
}
```

**Milestone UI:**
- List view of milestones
- Each milestone shows: Label, Target date, Status (completed checkbox), Assignee
- Add milestone button
- Calendar view option showing milestones on timeline
- Filter: Show completed / Show pending / Show all

---

## PHASE 8: ANALYTICS & DASHBOARD (Week 8-9)

### 8.1 Portfolio Dashboard

**Top-Level Metrics (KPI Cards):**
- Total Projects (count)
- Total Projected Revenue (sum across active projects)
- Total Projected Costs
- Total Projected Profit
- Average Profit Margin %
- Active Risks (count)

**Recent Projects Section:**
- Table showing last 5-10 projects
- Columns: Name, Product Type, Created Date, Status
- Click to open project

### 8.2 Portfolio Analytics

**Project Health Cards:**
- For each project, calculate health score based on:
  - Variance (closer to projections = healthier)
  - Risk exposure (fewer/lower risks = healthier)
  - Forecast accuracy (higher = healthier)
- Display health as: Excellent (90-100), Good (70-89), Fair (50-69), Poor (<50)
- Color code: Green, Yellow, Orange, Red

**Revenue & Cost Trends:**
- Line chart showing portfolio-wide revenue and cost trends over time
- Aggregate all projects' projections
- Filter by date range

**Risk Insights:**
- Portfolio-wide risk distribution by category
- Critical risks across all projects
- Risk trend over time

**Forecast Accuracy Dashboard:**
- Average forecast accuracy across portfolio
- Accuracy by project
- Accuracy trend over time

### 8.3 Reporting & Export

**PDF Export:**
- Project summary report with:
  - Project overview
  - Financial model projections (table + charts)
  - Actuals vs projected variance
  - Risk assessment summary
  - Key insights and recommendations
- Use jsPDF + jsPDF-autotable
- Professional formatting with headers, footers, page numbers

**Excel Export:**
- Export financial model projections to Excel
- Multiple sheets: Revenue, Costs, Profit, Variance, Risks
- Use xlsx library
- Preserve formulas where applicable

---

## PHASE 9: COLLABORATION & SHARING (Week 9-10)

### 9.1 Project Sharing

**Share Project Modal:**
- Input: Email address to share with
- Select permission level:
  - **Owner**: Full access, can delete project
  - **Editor**: Can edit models, actuals, risks
  - **Viewer**: Read-only access
- Optional: Set expiration date
- Send button

**Sharing Service:**
```typescript
const shareProject = async (projectId, email, permission) => {
  const { data, error } = await supabase
    .from('project_shares')
    .insert({
      project_id: projectId,
      owner_id: currentUser.id,
      shared_with_email: email,
      permission: permission,
      is_active: true,
      status: 'active'
    });

  // Optionally send email notification
};
```

### 9.2 Shared Projects View

**Shared With Me Page:**
- List of projects shared with current user
- Show: Project name, Owner name, Permission level, Shared date
- Filter by permission level
- Click to open project (read-only or editable based on permission)

### 9.3 Real-time Collaboration (Optional Enhancement)

**Real-time Updates:**
- Use Supabase Realtime subscriptions
- Subscribe to changes on `projects`, `financial_models`, `actuals_period_entries`, `risks` tables
- When another user makes a change, refresh the data automatically
- Show "Updated by [User]" indicator

---

## PHASE 10: ADVANCED FEATURES (Week 10-11)

### 10.1 Scenario Planning

**Scenario Creation:**
- Create multiple scenarios for a single model
- Scenario types: Optimistic, Realistic, Pessimistic, Custom
- Each scenario has different growth rates and assumptions
- Compare scenarios side-by-side

**Scenario Comparison View:**
- Table comparing key metrics across scenarios
- Charts showing revenue/profit projections for each scenario
- Highlight best-case and worst-case scenarios

### 10.2 Sensitivity Analysis

**Sensitivity Analysis Tool:**
- Select a key assumption (e.g., ticket price, attendance growth rate)
- Define range: Min, Max, Step
- Calculate projections for each value in range
- Display results in tornado chart or waterfall chart
- Identify which assumptions have biggest impact on profit

### 10.3 Cash Flow Projections

**Cash Flow Statement:**
- Track cash inflows and outflows
- Account for timing differences (when revenue collected vs when costs paid)
- Calculate: Opening balance, Inflows, Outflows, Closing balance per period
- Identify cash flow gaps
- Visualize with cash flow chart

### 10.4 Break-Even Analysis

**Break-Even Calculator:**
- Calculate break-even point: Period when cumulative profit = 0
- Show break-even chart with revenue, costs, profit lines
- Identify break-even attendance (for events)
- Sensitivity: How break-even changes with different assumptions

---

## PHASE 11: USER EXPERIENCE POLISH (Week 11-12)

### 11.1 Responsive Design

**Mobile Optimization:**
- All pages must work on mobile (320px - 768px)
- Hamburger menu for navigation on mobile
- Touch-friendly buttons and inputs
- Swipeable charts and tables
- Collapsible sections to reduce scrolling

**Tablet Optimization:**
- 768px - 1024px breakpoints
- Side-by-side layouts where appropriate
- Optimized chart sizes

### 11.2 Loading States & Error Handling

**Loading States:**
- Skeleton loaders for data fetching
- Spinner for actions (save, delete, export)
- Progress indicators for long operations

**Error Handling:**
- Try-catch blocks around all Supabase operations
- User-friendly error messages (not raw error codes)
- Toast notifications for success/error feedback
- Retry mechanisms for failed requests
- Offline detection and graceful degradation

### 11.3 Onboarding & Help

**First-Time User Experience:**
- Welcome modal on first login
- Quick tour highlighting key features
- Sample project with pre-filled data

**Help System:**
- Tooltips on key fields (using HelpTooltip component)
- Help icon in header linking to documentation
- Contextual help text on complex forms

### 11.4 Performance Optimization

**Code Splitting:**
- Lazy load routes and large components
- Use React.lazy() and Suspense

**Caching:**
- React Query caching for Supabase data
- Cache financial calculations to avoid re-computing

**Image Optimization:**
- Compress uploaded images
- Use lazy loading for images
- Serve in modern formats (WebP)

---

## PHASE 12: TESTING & DEPLOYMENT (Week 12)

### 12.1 Testing

**Unit Tests:**
- Test calculation functions (financial projections, variance, metrics)
- Test utility functions
- Use Vitest or Jest

**Integration Tests:**
- Test Supabase CRUD operations
- Test authentication flow
- Test form submissions

**E2E Tests:**
- Test critical user flows:
  - Sign up → Create project → Build model → Add actuals → View analytics
  - Create risk → Update risk → View risk dashboard
  - Share project → Shared user accesses project
- Use Playwright or Cypress

### 12.2 Deployment

**Production Checklist:**
1. Set up production Supabase project
2. Apply all database migrations
3. Configure production OAuth redirect URLs
4. Set environment variables (Supabase URL, anon key)
5. Build production bundle: `npm run build`
6. Deploy to hosting platform (Vercel, Netlify, or custom server)
7. Configure custom domain
8. Set up SSL certificate
9. Enable Supabase Row-Level Security policies
10. Test production deployment end-to-end

**Environment Variables:**
```
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_anon_key
```

**Hosting Recommendations:**
- **Vercel**: Best for React/Vite apps, automatic deployments from Git
- **Netlify**: Similar to Vercel, great DX
- **Custom VPS**: For more control (deploy via Docker)

---

## KEY IMPLEMENTATION NOTES

### Data Architecture Principles

1. **Single Source of Truth**: All project data stored in Supabase
2. **Optimistic Updates**: Update UI immediately, then sync to server
3. **Real-time Sync**: Use Supabase subscriptions for multi-user scenarios
4. **Versioning**: Track model versions for audit trail

### Security Best Practices

1. **Row-Level Security**: All tables must have RLS policies
2. **No Direct User ID Exposure**: Use auth.uid() in policies
3. **Input Validation**: Validate all inputs client-side (Zod) and server-side (Postgres constraints)
4. **Secure File Uploads**: If allowing file uploads, validate file types and sizes
5. **Rate Limiting**: Consider Supabase rate limits for auth endpoints

### Performance Considerations

1. **Pagination**: Paginate project lists and actuals tables
2. **Lazy Loading**: Don't fetch all data upfront
3. **Debounced Search**: Debounce search inputs to reduce queries
4. **Memoization**: Use React.memo and useMemo for expensive computations
5. **Database Indexes**: Ensure indexes on foreign keys and frequently queried columns

### User Experience Guidelines

1. **Feedback**: Always provide feedback for user actions (toasts, loading states)
2. **Validation**: Validate forms in real-time, show errors immediately
3. **Discoverability**: Use tooltips and help text liberally
4. **Consistency**: Maintain consistent UI patterns across the app
5. **Accessibility**: Use semantic HTML, ARIA labels, keyboard navigation

### Financial Calculation Edge Cases

1. **Division by Zero**: Handle cases where projected = 0 in variance calculations
2. **Negative Values**: Allow negative values (refunds, credits) but handle in UI
3. **Rounding**: Round currency to 2 decimals, percentages to 1 decimal
4. **Large Numbers**: Format large numbers with commas (e.g., 1,000,000)

---

## CRITICAL SUCCESS FACTORS

### Must-Have Features for MVP

1. ✅ Google OAuth authentication
2. ✅ Project creation and management
3. ✅ Financial model builder with revenue, costs, growth
4. ✅ Actuals input and variance analysis
5. ✅ Risk assessment and tracking
6. ✅ Basic dashboard with key metrics
7. ✅ PDF/Excel export
8. ✅ Project sharing with permissions

### Nice-to-Have Enhancements

1. Special events with forecasts and actuals
2. Milestone tracking
3. Scenario planning and comparison
4. Sensitivity analysis
5. Cash flow projections
6. Real-time collaboration
7. Advanced portfolio analytics
8. Forecast accuracy tracking

### Known Limitations of Original App

1. **Complex dual-storage system** (IndexedDB + Supabase) - **Simplify**: Use only Supabase for MVP
2. **Port configuration issues** - **Fix**: Standard port 8081 or let Vite auto-assign
3. **Overly complex state management** - **Simplify**: Use React Query for server state, minimal Zustand for client state
4. **Inconsistent UI patterns** - **Fix**: Use consistent shadcn/ui components throughout
5. **Incomplete error handling** - **Fix**: Comprehensive try-catch and user-friendly messages
6. **Performance issues with large datasets** - **Fix**: Implement pagination and lazy loading
7. **Confusing navigation** - **Fix**: Clear breadcrumbs and consistent sidebar navigation

---

## RECOMMENDED DEVELOPMENT WORKFLOW

### Iteration Strategy

1. **Start Small**: Build core CRUD operations first (projects, models)
2. **Vertical Slices**: Complete one feature end-to-end before moving to next
3. **Test Early**: Write tests as you build, not after
4. **User Feedback**: Get feedback after each phase, iterate based on feedback
5. **Incremental Complexity**: Start with simple models, add complexity gradually

### Phase Prioritization

**If time is limited, prioritize in this order:**
1. Phase 1-3: Foundation, auth, projects (CRITICAL)
2. Phase 4: Financial modeling (CRITICAL)
3. Phase 5: Actuals & performance (CRITICAL)
4. Phase 6: Risk management (HIGH)
5. Phase 8: Dashboard & analytics (HIGH)
6. Phase 9: Collaboration (MEDIUM)
7. Phase 7: Special events (MEDIUM)
8. Phase 10: Advanced features (LOW - nice to have)

### Code Quality Standards

1. **TypeScript**: Use strict mode, avoid `any` type
2. **Linting**: Set up ESLint with React and TypeScript rules
3. **Formatting**: Use Prettier for consistent code style
4. **Git**: Commit frequently with clear messages
5. **Code Review**: Review your own code before committing
6. **Documentation**: Add JSDoc comments for complex functions

---

## FINAL CHECKLIST

Before considering the rebuild complete, ensure:

- [ ] All database tables created with RLS policies
- [ ] Google OAuth working in dev and prod
- [ ] Can create, read, update, delete projects
- [ ] Can build financial models with revenue, costs, growth
- [ ] Can input actuals and see variance analysis
- [ ] Can add and track risks
- [ ] Dashboard shows portfolio metrics
- [ ] Can export project to PDF and Excel
- [ ] Can share projects with other users
- [ ] Mobile responsive (320px - 1920px)
- [ ] Error handling on all user actions
- [ ] Loading states for all async operations
- [ ] Production deployment successful
- [ ] End-to-end test of critical user flow passes

---

## SUPPORT & QUESTIONS

If you need clarification on any feature or encounter issues during rebuild:

1. Refer to the original codebase for implementation details (available in the repository)
2. Consult Supabase documentation for database/auth questions
3. Review React Query docs for data fetching patterns
4. Check shadcn/ui documentation for component usage

**Key Files to Reference:**
- Database schema: `supabase/migrations/20250101_base_schema_complete.sql`
- Type definitions: `src/types/models.ts`, `src/types/risk.ts`
- User guide: `docs/USER_GUIDE.md`
- Architecture guide: `docs/ARCHITECTURE.md`

---

**Good luck with the rebuild! Build iteratively, test frequently, and prioritize user experience. 🚀**
