# Fortress Modeler Cloud - Project Summary

## Project Overview
A cloud-based fortress modeling application built with React, TypeScript, and Vite.

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Node.js server
- **Database**: Supabase
- **Testing**: Vitest
- **Deployment**: Docker, Netlify

## Project Structure
```
fortress-modeler-cloud/
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── pages/             # Page components
│   ├── services/          # API services
│   ├── store/             # State management
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility libraries
│   └── types/             # TypeScript type definitions
├── server/                # Backend server
│   ├── src/               # Server source code
│   └── server/            # Server utilities
├── docs/                  # Documentation
├── scripts/               # Build and utility scripts
├── supabase/              # Database migrations and config
├── claude-code-subagents/ # AI agent configurations
└── public/                # Static assets
```

## Key Configuration Files

### package.json (Frontend)
- Main dependencies: React, TypeScript, Vite, Tailwind
- Scripts for development, build, test

### server/package.json (Backend)
- Node.js server dependencies
- API and database handling

### vite.config.ts
- Vite configuration for frontend build

### tailwind.config.ts
- Tailwind CSS configuration

### supabase/config.toml
- Supabase database configuration

## Current Context
- Working on: ForecastAccuracyCard.tsx component
- Branch: production-fix-oauth-rls-20250807
- Repository: jonnysatts/fortress-modeler

## Recent Features/Issues
Based on the branch name, currently working on:
- Production fixes
- OAuth authentication
- Row Level Security (RLS) improvements

## Documentation Available
- Installation Guide
- User Guide
- Architecture documentation
- Deployment guides
- Troubleshooting documentation

To share specific files or get detailed code, please specify which components or files you'd like to include.
