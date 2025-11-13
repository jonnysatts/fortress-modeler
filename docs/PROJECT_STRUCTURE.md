# Fortress Modeler Cloud - Project Structure

This document provides a comprehensive overview of the project's directory structure and file organization.

## 📁 Directory Structure

```
fortress-modeler-cloud/
│
├── 📂 src/                        # Application source code
│   ├── 📂 components/             # Reusable React components
│   │   ├── auth/                  # Authentication components
│   │   ├── layout/                # Layout components (AppLayout, Sidebar)
│   │   ├── models/                # Financial model components
│   │   └── ui/                    # UI components (shadcn/ui)
│   │
│   ├── 📂 pages/                  # Page components (routes)
│   │   ├── models/                # Financial model pages
│   │   ├── projects/              # Project management pages
│   │   └── actuals/               # Actuals tracking pages
│   │
│   ├── 📂 hooks/                  # Custom React hooks
│   ├── 📂 lib/                    # Utilities and helpers
│   ├── 📂 services/               # Business logic layer
│   │   ├── interfaces/            # Service interfaces
│   │   ├── implementations/       # Service implementations
│   │   └── container/             # Dependency injection
│   │
│   └── 📂 types/                  # TypeScript type definitions
│
├── 📂 scripts/                    # Utility scripts
│   ├── 📂 windows/                # Windows-specific launchers
│   │   ├── launch-fortress.bat    # Main Windows launcher
│   │   ├── Launch-Fortress.ps1    # PowerShell launcher
│   │   ├── diagnose-pc.bat        # System diagnostic tool
│   │   └── fix-port-8081.bat      # Port conflict resolver
│   │
│   └── 📂 setup/                  # Installation scripts
│       ├── setup.bat              # Windows setup
│       ├── build-installer.bat    # Build Windows installer
│       └── setup-electron.bat     # Electron setup
│
├── 📂 docs/                       # Documentation
│   ├── INSTALLATION_GUIDE.md      # Detailed setup instructions
│   ├── REQUIREMENTS.md            # System requirements
│   ├── WINDOWS_INSTALLER.md       # Windows installer guide
│   ├── PORT_TROUBLESHOOTING.md    # Port 8081 troubleshooting
│   └── PROJECT_STRUCTURE.md       # This file
│
├── 📂 electron/                   # Electron desktop app
│   ├── main.js                    # Electron main process
│   ├── preload.js                 # Preload script
│   └── assets/                    # Desktop app assets
│
├── 📂 public/                     # Static assets
│   ├── index.html                 # HTML entry point
│   └── robots.txt                 # SEO configuration
│
├── 📂 dist/                       # Build output (gitignored)
├── 📂 node_modules/               # Dependencies (gitignored)
└── 📂 temp-files/                 # Temporary files (gitignored)

## 📄 Root Configuration Files

- **package.json** - Project dependencies and scripts
- **vite.config.ts** - Vite bundler configuration
- **tsconfig.json** - TypeScript configuration
- **tailwind.config.js** - Tailwind CSS configuration
- **electron-builder.config.js** - Electron builder config
- **.env.example** - Environment variables template
- **README.md** - Project overview and quick start
- **CLAUDE.md** - AI assistant instructions

## 🚀 Key Entry Points

1. **Web App**: `src/main.tsx` → `src/App.tsx`
2. **Electron App**: `electron/main.js`
3. **Development**: `npm run dev` (port 8081)
4. **Windows Launch**: `scripts/windows/launch-fortress.bat`

## 🛠️ Development Workflow

1. **Source Code**: All application code in `/src`
2. **Components**: Reusable UI in `/src/components`
3. **Business Logic**: Services in `/src/services`
4. **Documentation**: All docs in `/docs`
5. **Scripts**: Platform-specific scripts organized in `/scripts`

## 📦 Build Outputs

- **Web Build**: `/dist` - Static files for deployment
- **Electron Build**: `/dist` - Desktop installers (.exe, .dmg)

## 🧹 Clean Architecture

The project follows clean architecture principles:
- **Separation of Concerns**: UI, business logic, and data access are separated
- **Dependency Injection**: Services use interfaces and DI container
- **Platform Organization**: Windows/Mac/Linux scripts are organized separately
- **Documentation**: All docs centralized in `/docs`

This structure ensures maintainability, scalability, and ease of navigation for developers.