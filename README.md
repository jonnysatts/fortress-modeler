# Fortress Modeler Cloud

A comprehensive financial modeling and business analysis platform built with React, TypeScript, and modern web technologies.

## 🚀 Quick Start

### Option 1: One-Click Setup (Recommended)

**Mac/Linux:**
```bash
git clone https://github.com/jonnysatts/fortress-modeler.git
cd fortress-modeler
./setup.sh
```

**Windows:**
```bash
git clone https://github.com/jonnysatts/fortress-modeler.git
cd fortress-modeler
scripts\setup\setup.bat
```

### 🖥️ Windows Quick Launch

For Windows users, we provide several helper scripts:
- **Launch App**: `scripts\windows\launch-fortress.bat`
- **PowerShell Launch**: Right-click `scripts\windows\Launch-Fortress.ps1` → Run with PowerShell
- **Diagnose Issues**: `scripts\windows\diagnose-pc.bat`
- **Fix Port Issues**: `scripts\windows\fix-port-8081.bat`

### Option 2: Manual Setup

1. **Install Node.js v18+** from https://nodejs.org/
2. **Clone and install:**
   ```bash
   git clone https://github.com/jonnysatts/fortress-modeler.git
   cd fortress-modeler
   npm install
   ```
3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```
4. **Start the app:**
   ```bash
   npm run dev
   ```

🌐 **App runs at:** http://localhost:8081/

📖 **Detailed setup:** See [INSTALLATION_GUIDE.md](./docs/INSTALLATION_GUIDE.md)

## 🏗️ Project Overview

Fortress Modeler Cloud is a sophisticated financial modeling application that enables users to create, analyze, and manage financial projections for various business scenarios. The platform features advanced visualization, real-time calculations, and comprehensive data management capabilities.

### Key Features

- **Financial Model Creation** - Build complex financial models with revenue streams, cost categories, and growth projections
- **Interactive Dashboards** - Real-time charts and visualizations powered by Recharts
- **Performance Tracking** - Compare actual vs. projected performance with detailed analytics
- **Scenario Analysis** - Create and compare multiple financial scenarios
- **Data Export** - Export models and reports to PDF and Excel formats
- **Local-First Architecture** - All data stored locally with IndexedDB for optimal performance

## 🚀 Performance Optimizations

This application has been extensively optimized for production performance:

### Bundle Optimization
- **Intelligent Code Splitting** - Vendor libraries separated into logical chunks
- **Lazy Loading** - Components load only when needed
- **Compression** - Gzip and Brotli compression (up to 82% size reduction)
- **Tree Shaking** - Unused code automatically removed

### Runtime Performance
- **React.memo** - Heavy chart components memoized to prevent unnecessary re-renders
- **Multi-layer Caching** - React Query + in-memory cache for database operations
- **Performance Monitoring** - Real-time performance tracking in development mode
- **Optimized Database Queries** - IndexedDB with proper indexing and caching

### Bundle Analysis
The application generates detailed bundle analysis reports to help monitor bundle size and composition. After building, check `dist/bundle-analysis.html` for insights.

## 🛠️ Tech Stack

### Core Technologies
- **React 18** - Modern React with concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework

### UI & Visualization
- **Radix UI** - Accessible component primitives
- **Shadcn/ui** - Beautiful, customizable components
- **Recharts** - Powerful charting library
- **Lucide React** - Modern icon library

### Data Management
- **React Query** - Server state management and caching
- **Zustand** - Client-side state management
- **Dexie** - IndexedDB wrapper for local data storage
- **Zod** - Schema validation

### Development & Testing
- **Vitest** - Fast unit testing framework
- **Testing Library** - Component testing utilities
- **Puppeteer** - E2E testing
- **ESLint & Prettier** - Code quality and formatting

## 🏃‍♂️ Getting Started

### Prerequisites
- Node.js 18+ and npm (install with [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd fortress-modeler-cloud

# Install dependencies
npm install

# Start development server
npm run dev
```

## 📁 Project Structure

```
fortress-modeler-cloud/
├── src/                    # Source code
│   ├── components/         # React components
│   ├── pages/             # Page components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities and libraries
│   ├── services/          # Business logic and API
│   └── types/             # TypeScript type definitions
├── scripts/               # Utility scripts
│   ├── windows/           # Windows-specific scripts
│   │   ├── launch-fortress.bat
│   │   ├── Launch-Fortress.ps1
│   │   ├── diagnose-pc.bat
│   │   └── fix-port-8081.bat
│   └── setup/             # Setup and installation scripts
│       ├── setup.bat
│       ├── setup-windows.bat
│       └── build-installer.bat
├── docs/                  # Documentation
│   ├── INSTALLATION_GUIDE.md
│   ├── REQUIREMENTS.md
│   ├── WINDOWS_INSTALLER.md
│   └── PORT_TROUBLESHOOTING.md
├── electron/              # Electron desktop app
├── public/                # Static assets
├── dist/                  # Build output
└── tests/                 # Test files
```

### Available Scripts

```bash
# Development
npm run dev          # Start development server on http://localhost:8080
npm run build        # Build for production
npm run preview      # Preview production build

# Testing
npm test            # Run unit tests
npm run test:watch  # Run tests in watch mode
npm run test:ui     # Open Vitest UI
npm run test:e2e    # Run E2E tests with Puppeteer

# Code Quality
npm run lint        # Run ESLint
npm run type-check  # Run TypeScript compiler check
```

## 📱 Application Structure

### Core Modules

- **Projects** - Create and manage business projects
- **Financial Models** - Build comprehensive financial projections
- **Performance Analysis** - Track actual vs. projected performance
- **Data Visualization** - Interactive charts and dashboards

### Project Structure

```
fortress-modeler-cloud/
├── src/                 # Source code
│   ├── components/      # Reusable UI components
│   │   ├── ui/         # Base UI components (shadcn/ui)
│   │   ├── layout/     # Layout components
│   │   └── models/     # Financial modeling components
│   ├── pages/          # Application pages/routes
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility libraries
│   │   ├── db.ts      # Database schema and operations
│   │   ├── cache.ts   # Caching layer
│   │   └── performance.ts # Performance monitoring
│   ├── services/       # Business logic services
│   └── types/          # TypeScript type definitions
├── docs/               # Documentation
│   ├── INSTALLATION_GUIDE.md
│   ├── QUICK_FIXES.md
│   ├── REQUIREMENTS.md
│   ├── PORT_TROUBLESHOOTING.md
│   ├── WHY_PORT_8081.md
│   ├── WINDOWS_INSTALLER.md
│   └── INSTALLER_SUMMARY.md
├── scripts/            # Build and utility scripts
│   ├── windows/        # Windows-specific scripts
│   │   ├── launch-fortress.bat
│   │   ├── launch-fortress-windows.bat
│   │   ├── Launch-Fortress.ps1
│   │   ├── fix-port-8081.bat
│   │   ├── start-app.bat
│   │   ├── start-app-any-port.bat
│   │   └── diagnose-pc.bat
│   ├── setup/          # Setup and installation scripts
│   │   ├── setup.bat
│   │   ├── setup-windows.bat
│   │   ├── setup-electron.bat
│   │   └── build-installer.bat
│   ├── configure-env.bat
│   └── diagnose-port.bat
├── server/             # Backend server code
├── temp-files/         # Temporary and test files
│   ├── tests/          # Test HTML and JS files
│   └── sql/            # SQL scripts
└── public/             # Static assets
```

## 🎯 Key Features Deep Dive

### Financial Modeling
- **Revenue Streams** - Multiple revenue categories with growth rates
- **Cost Management** - Fixed, variable, and recurring cost modeling
- **Growth Projections** - Linear, exponential, and seasonal growth models
- **Scenario Planning** - Compare optimistic, realistic, and pessimistic scenarios

### Visualization & Analytics
- **Interactive Charts** - Revenue trends, cost analysis, and performance tracking
- **Financial Matrix** - Detailed period-by-period breakdowns
- **Category Breakdowns** - Pie charts and bar charts for cost/revenue analysis
- **Performance Metrics** - NPV, IRR, payback period, and ROI calculations

### Data Management
- **Local Storage** - All data stored locally using IndexedDB
- **Import/Export** - Support for CSV, Excel, and PDF formats
- **Data Validation** - Comprehensive validation using Zod schemas
- **Backup & Restore** - Easy data backup and restoration

## 🔧 Development

### Architecture Principles

1. **Local-First** - All data stored locally for optimal performance and privacy
2. **Type Safety** - Comprehensive TypeScript coverage
3. **Component Composition** - Reusable, composable components
4. **Performance First** - Optimized for speed and efficiency
5. **Accessibility** - WCAG compliant components

### Performance Monitoring

In development mode, the application includes a performance monitoring widget that tracks:
- Component render times
- Database query performance
- Bundle loading metrics
- User interaction responsiveness

Access the performance monitor via the floating chart icon in the bottom-right corner.

### Testing Strategy

- **Unit Tests** - Component logic and utility functions
- **Integration Tests** - Component interactions and data flow
- **E2E Tests** - Complete user workflows
- **Performance Tests** - Bundle size and runtime performance

## 📊 Production Deployment

### Build Optimization

The production build includes:
- **Code Splitting** - Optimal chunk sizes for caching
- **Compression** - Gzip and Brotli compression
- **Asset Optimization** - Images and fonts optimized
- **Source Maps** - Available for debugging (dev mode only)

### Performance Metrics

Production builds achieve:
- **First Contentful Paint** - < 1.5s
- **Largest Contentful Paint** - < 2.5s
- **Cumulative Layout Shift** - < 0.1
- **Total Bundle Size** - ~1.5MB (compressed to ~470KB with Brotli)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style and patterns
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting
- Keep commits focused and descriptive

## 📄 License

This project is private and proprietary. All rights reserved.

## 🆘 Support

For issues and questions:
1. Check the existing issues in the repository
2. Create a new issue with detailed description
3. Include steps to reproduce any bugs
4. Provide browser and system information

---

Built with ❤️ using modern web technologies for optimal performance and user experience.