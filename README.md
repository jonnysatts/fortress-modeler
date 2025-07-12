# Fortress Modeler Cloud

**Enterprise Business Planning & Financial Analytics Platform**

Fortress Modeler Cloud is a comprehensive business planning and financial analytics platform designed for product managers, business analysts, and strategic planners. Built with modern web technologies, it provides sophisticated financial modeling, risk management, performance analytics, and collaborative planning capabilities.

## 🎯 What Fortress Modeler Cloud Is

**Not just a financial calculator** - Fortress Modeler Cloud is a complete business planning ecosystem that enables organizations to:

- **Model Complex Business Scenarios** with revenue streams, cost structures, growth models, and marketing budgets
- **Assess and Manage Risks** with comprehensive risk categorization, impact analysis, and mitigation tracking
- **Track Performance** by inputting forecasts and actual results for each period, with variance analysis and forecast accuracy metrics
- **Collaborate in Real-Time** with cloud-based sharing and multi-user project access
- **Generate Professional Reports** with PDF and Excel export capabilities
- **Schedule Special Events** with milestone management and calendar filters
- **Monitor Portfolio Health** with enterprise-grade analytics dashboards

## � Key Capabilities

### 📊 Advanced Financial Modeling
- **Multi-Stream Revenue Models**: Fixed, variable, and recurring revenue with custom frequencies
- **Comprehensive Cost Management**: Staffing, marketing, operations with category-based tracking
- **Growth Model Engine**: Linear, exponential, seasonal, and custom growth patterns
- **Marketing Budget Allocation**: Channel-based budgeting with audience targeting
- **Scenario Planning**: Compare optimistic, realistic, and pessimistic projections

### 🛡️ Risk Management System
- **Risk Assessment Framework**: Likelihood vs. Impact scoring with visual heat maps
- **Risk Categorization**: Financial, operational, strategic, regulatory risk types
- **Mitigation Tracking**: Owner assignment, status monitoring, and action planning
- **Risk Insights Dashboard**: Portfolio-wide risk visibility and trend analysis

### � Performance Analytics
- **Variance Analysis**: Real-time actual vs. projected performance tracking
- **Forecast Accuracy Metrics**: MAPE (Mean Absolute Percentage Error) calculations
- **Project Health Monitoring**: Automated health scoring with early warning indicators
- **Portfolio Dashboard**: Enterprise-grade KPIs with drill-down capabilities

### 👥 Collaboration Features
- **Real-Time Sharing**: Cloud-based project sharing with permission controls
- **Multi-User Access**: Owner, editor, and viewer permission levels
- **Supabase Integration**: Real-time updates and collaborative editing
- **Export & Reporting**: Professional PDF reports and Excel data exports

## 🏗️ Architecture Overview

### Frontend Stack
- **React 18** with TypeScript for type-safe development
- **Vite** for fast development and optimized production builds
- **Tailwind CSS** with Radix UI components for enterprise-grade design
- **Recharts** for sophisticated data visualization
- **React Query** for intelligent data caching and synchronization

### Data Management
- **Dual Storage Mode**: Local-first (IndexedDB) and cloud (Supabase) options
- **Dexie.js** for robust local database management
- **Supabase** for cloud storage, real-time collaboration, and authentication
- **Zod** for comprehensive data validation and type safety

### State Management
- **Zustand** for client-side state management
- **React Query** for server state and caching
- **Custom Hooks** for business logic encapsulation

## 📱 User Experience

### Target Users
- **Product Managers** planning new product launches and business models
- **Business Analysts** creating financial projections and performance reports
- **Strategic Planners** modeling different business scenarios and outcomes
- **Finance Teams** tracking actual vs. projected performance
- **Executive Teams** monitoring portfolio health and risk exposure

### Core Workflows
1. **Project Creation**: Define business context, product type, and target audience
2. **Special Events & Milestones**: Schedule events and milestones on the project calendar
3. **Financial Modeling**: Build comprehensive revenue and cost models and enter forecasts
4. **Risk Assessment**: Identify, categorize, and plan risk mitigation
5. **Performance Tracking**: Input actual results and monitor milestone progress
6. **Analytics Review**: Analyze trends, accuracy, and portfolio health
7. **Reporting & Filters**: Generate reports and use calendar filters to focus on specific periods

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Optional: Supabase account for cloud features

### Quick Start

```bash
# Clone the repository
git clone https://github.com/jonnysatts/fortress-modeler.git
cd fortress-modeler-cloud

# Install dependencies
npm install

# Start development server
npm run dev
```

**Application runs at:** http://localhost:8081/

### Platform-Specific Setup

**Windows Users:**
```bash
# Quick setup script
scripts\setup\setup.bat

# Or use PowerShell launcher
scripts\windows\Launch-Fortress.ps1
```

**Mac/Linux Users:**
```bash
# One-click setup
./setup.sh
```

### Cloud Configuration (Optional)

For collaboration features, you can connect the application to a Supabase project.

1.  **Set up Supabase:** Create a project on [Supabase](https://supabase.com/).
2.  **Configure Environment:** Copy `.env.example` to `.env` and add your Supabase URL and anon key.
    ```
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```
3.  **Run Database Migrations:** To set up the required database schema, follow the [Database Migration Guide](docs/guides/DATABASE_MIGRATIONS.md).

## 📁 Project Structure

```
fortress-modeler-cloud/
├── src/
│   ├── components/           # React components
│   │   ├── dashboard/       # Dashboard analytics components
│   │   ├── models/          # Financial modeling components
│   │   ├── risk/            # Risk management components
│   │   ├── layout/          # Application layout
│   │   └── ui/              # Base UI components
│   ├── hooks/               # Custom React hooks
│   │   ├── usePortfolioAnalytics.ts
│   │   ├── useRisks.ts
│   │   ├── useForecastAccuracy.ts
│   │   └── useVarianceTrends.ts
│   ├── services/            # Business logic services
│   │   ├── RiskService.ts
│   │   ├── DashboardAnalyticsService.ts
│   │   └── FinancialModelService.ts
│   ├── lib/                 # Utilities and libraries
│   │   ├── db.ts           # Database operations
│   │   ├── security.ts     # Security utilities
│   │   └── board-ready-export.ts
│   ├── types/               # TypeScript definitions
│   │   ├── models.ts       # Financial model types
│   │   ├── risk.ts         # Risk management types
│   │   └── analytics.ts    # Analytics types
│   └── pages/               # Application pages
├── server/                  # Optional backend for admin tasks
├── supabase/               # Database migrations
├── docs/                   # Documentation
├── scripts/                # Build and utility scripts
└── electron/               # Desktop app configuration
```

## 🎯 Features Deep Dive

### Financial Modeling Engine
- **Product-Specific Templates**: Event-based, subscription, one-time purchase models
- **Dynamic Growth Calculations**: Customer acquisition, retention, and expansion modeling
- **Marketing ROI Tracking**: Channel attribution and budget optimization
- **Cash Flow Projections**: Monthly and weekly cash flow modeling

### Risk Management Framework
- **Risk Heat Maps**: Visual representation of likelihood vs. impact
- **Automated Risk Indicators**: System-generated risk alerts based on performance data
- **Mitigation Progress Tracking**: Action item management with owner assignment
- **Portfolio Risk Aggregation**: Enterprise-wide risk exposure analysis

### Performance Analytics Suite
- **Variance Dashboard**: Real-time actual vs. projected comparisons
- **Forecast Accuracy Scoring**: Historical accuracy analysis with trend identification
- **Project Health Indicators**: Automated scoring based on multiple metrics
- **Portfolio Analytics**: Cross-project insights and comparative analysis

### Event Scheduling & Calendar Filters
- **Special Events**: Define one-off events with unique assumptions
- **Milestones**: Track key dates across the project timeline
- **Calendar Filtering**: Focus analytics and reports on specific periods

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Production build
npm run preview         # Preview production build

# Testing
npm test                # Run unit tests
npm run test:e2e        # Run end-to-end tests
npm run test:coverage   # Generate coverage report

# Code Quality
npm run lint            # ESLint analysis
npm run typecheck       # TypeScript validation

# Desktop App
npm run electron:dev    # Development with Electron
npm run electron:build  # Build desktop application
```

### Technology Stack

**Core Technologies:**
- React 18, TypeScript, Vite
- Tailwind CSS, Radix UI, Shadcn/ui
- React Query, Zustand, React Hook Form

**Data & Analytics:**
- Dexie (IndexedDB), Supabase
- Recharts, Chart.js
- jsPDF, xlsx (exports)

**Development Tools:**
- Vitest, Testing Library
- ESLint, Prettier
- Electron, Puppeteer

## 🌟 Performance Optimizations

### Production Features
- **Intelligent Code Splitting**: Vendor chunks and lazy loading
- **Advanced Caching**: Multi-layer caching with React Query
- **Bundle Optimization**: Tree shaking, compression (82% size reduction)
- **Performance Monitoring**: Real-time metrics in development mode

### Performance Metrics
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Total Bundle Size**: ~1.5MB (compressed to ~470KB)
- **Runtime Performance**: Optimized for 60fps interactions

## 📚 Documentation

### Core Documentation
- [User Guide](docs/USER_GUIDE.md) - Complete workflows for product managers
- [Architecture Guide](docs/ARCHITECTURE.md) - Technical architecture and data flow
- [API Reference](docs/API_REFERENCE.md) - Data models and service documentation

### Feature Documentation
- [Risk Management](docs/RISK_MANAGEMENT.md) - Risk assessment methodology
- [Analytics Guide](docs/ANALYTICS_GUIDE.md) - Performance analytics features
- [Collaboration](docs/COLLABORATION.md) - Team sharing and real-time features

### Setup & Deployment
- [Installation Guide](docs/INSTALLATION_GUIDE.md) - Detailed setup instructions
- [Database Migration Guide](docs/guides/DATABASE_MIGRATIONS.md) - Setting up the Supabase schema
- [Backup & Restore Guide](docs/guides/BACKUP_STRATEGY.md) - How to backup and restore the database

## � Production Deployment

### Deployment Options

**Local Deployment:**
- Self-hosted with IndexedDB storage
- No external dependencies
- Full offline capability

**Cloud Deployment:**
- Supabase backend integration
- Real-time collaboration
- Scalable multi-user support

### Build for Production

```bash
# Build optimized production bundle
npm run build

# Build desktop application
npm run electron:build

# Build with specific environment
npm run build -- --mode production
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the existing code patterns and TypeScript conventions
4. Add tests for new features
5. Update documentation as needed
6. Commit with descriptive messages
7. Push to the branch and open a Pull Request

### Development Guidelines
- Maintain TypeScript strict mode compliance
- Follow component composition patterns
- Add comprehensive error handling
- Include performance considerations
- Update relevant documentation

## 📄 License

This project is proprietary. All rights reserved.

## 🆘 Support & Troubleshooting

**Common Issues:**
- [Port Troubleshooting](docs/PORT_TROUBLESHOOTING.md)
- [Windows Installation](docs/WINDOWS_INSTALLER.md)
- [Requirements](docs/REQUIREMENTS.md)

**For Support:**
1. Check existing documentation
2. Review GitHub issues
3. Create detailed bug reports with reproduction steps
4. Include system information and error logs

---

**Built with modern web technologies for enterprise-grade business planning and financial analytics.**

*Fortress Modeler Cloud - Empowering informed business decisions through sophisticated modeling and analytics.*
