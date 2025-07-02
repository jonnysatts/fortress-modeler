# AI Migration Execution Guide - Claude Code & Gemini CLI

## Overview

This guide provides specific prompts, commands, and instructions for AI assistants to execute the Fortress Modeler Cloud migration to Supabase. Designed for Claude Code, Gemini CLI, and similar AI development tools.

---

## Pre-Migration Setup

### Human Tasks (5 minutes)
1. Create Supabase account at https://supabase.com
2. Create new project: "fortress-modeler-cloud"
3. Note down project credentials:
   - Project URL
   - Anon key
   - Service role key

### AI Environment Setup
```bash
# AI COMMAND: Install Supabase CLI
npm install -g supabase

# AI COMMAND: Initialize Supabase in project
cd /path/to/fortress-modeler-cloud
npx supabase init

# AI COMMAND: Start local Supabase stack
npx supabase start
```

---

## Session 1: Automated Schema Migration & Setup

### AI Task 1.1: Analyze Existing Schema
**AI PROMPT:**
```
Analyze the PostgreSQL schema file at server/src/db/schema.sql and the Dexie schema in src/lib/db.ts. Create a comprehensive schema analysis that identifies:

1. All table structures with column types
2. Primary and foreign key relationships  
3. Indexes and their purposes
4. JSONB columns and their data patterns
5. UUID usage patterns
6. Required Row Level Security policies

Generate a detailed analysis document explaining the current schema structure and requirements for Supabase migration.
```

### AI Task 1.2: Generate Supabase Migration Script
**AI PROMPT:**
```
Based on the schema analysis, generate a complete Supabase migration script as supabase/migrations/001_initial_schema.sql that:

1. Creates all tables with UUID primary keys using gen_random_uuid()
2. Maintains all foreign key relationships
3. Preserves JSONB column structures
4. Adds comprehensive Row Level Security (RLS) policies for multi-tenancy
5. Creates performance indexes matching current usage patterns
6. Includes updated_at triggers for all tables
7. Adds any missing tables needed for Supabase integration

The migration should be production-ready and maintain full compatibility with existing data structures.
```

### AI Task 1.3: Apply Schema and Generate Types
```bash
# AI COMMAND: Apply migration to local Supabase
npx supabase db push

# AI COMMAND: Generate TypeScript types
npx supabase gen types typescript --local > src/lib/database.types.ts

# AI COMMAND: Verify schema applied correctly
npx supabase db diff
```

### AI Task 1.4: Configure Authentication
**AI PROMPT:**
```
Configure Supabase authentication for this project:

1. Enable Google OAuth provider in the Supabase dashboard
2. Generate the auth configuration code for src/lib/supabase.ts
3. Create environment variable configuration for development and production
4. Set up redirect URLs for OAuth callback handling

Provide step-by-step instructions and all necessary code snippets.
```

---

## Session 2: Service Implementation & Real-time Features

### AI Task 2.1: Generate Supabase Client Configuration
**AI PROMPT:**
```
Create a complete Supabase client configuration file at src/lib/supabase.ts that:

1. Initializes the Supabase client with proper TypeScript types
2. Includes authentication configuration with Google OAuth
3. Sets up proper error handling
4. Exports helper functions for common auth operations
5. Configures real-time subscriptions
6. Includes environment variable validation

Use the database types generated in the previous step and ensure full type safety.
```

### AI Task 2.2: Implement SupabaseStorageService
**AI PROMPT:**
```
Generate a complete SupabaseStorageService class at src/services/implementations/SupabaseStorageService.ts that:

1. Implements the IStorageService interface found in src/services/interfaces/IStorageService.ts
2. Uses the Supabase client for all database operations
3. Includes proper error handling using the existing error types from src/lib/errors.ts
4. Maps Supabase data types to the application's Project and FinancialModel interfaces
5. Implements all CRUD operations with proper TypeScript types
6. Adds RLS-aware queries that respect user permissions
7. Includes comprehensive JSDoc documentation

Reference the existing DexieStorageService implementation to understand method signatures and error handling patterns.
```

### AI Task 2.3: Update Authentication System
**AI PROMPT:**
```
Convert the authentication system to use Supabase Auth by:

1. Updating src/hooks/useAuth.tsx to use Supabase Auth instead of local-only mode
2. Implementing Google OAuth sign-in flow
3. Creating automatic user profile creation in the profiles table
4. Maintaining the same interface for compatibility with existing components
5. Adding proper session management and token handling
6. Creating an auth callback page for OAuth redirects

Ensure the authentication hooks maintain the same API as the current implementation.
```

### AI Task 2.4: Implement Real-time Features
**AI PROMPT:**
```
Create real-time collaboration features by generating:

1. src/hooks/useRealtimeProject.ts - Real-time project updates
2. src/hooks/useRealtimeModels.ts - Real-time model synchronization  
3. src/hooks/useRealtimeCollaboration.ts - Multi-user collaboration
4. Real-time integration with React Query cache updates
5. WebSocket connection management and cleanup
6. Presence indicators for active users

The real-time hooks should integrate seamlessly with the existing React Query setup and provide live updates across multiple browser sessions.
```

### AI Task 2.5: Update Service Container
**AI PROMPT:**
```
Update the service container configuration in src/services/bootstrap.ts to:

1. Add environment-based service selection (Dexie vs Supabase)
2. Register the new SupabaseStorageService
3. Add feature flags for gradual rollout
4. Maintain backward compatibility during migration
5. Add proper service initialization logging

The service container should allow switching between storage services via environment variables.
```

---

## Session 3: Testing & Migration Validation

### AI Task 3.1: Generate Comprehensive Test Suite
**AI PROMPT:**
```
Generate a complete test suite for the SupabaseStorageService:

1. Create src/services/implementations/__tests__/SupabaseStorageService.test.ts with:
   - Unit tests for all CRUD operations
   - Error handling tests
   - Mock Supabase client responses
   - Type safety validation
   - RLS policy testing

2. Create integration tests in src/test/integration/supabase-integration.test.ts:
   - End-to-end database operations
   - Authentication flow testing
   - Real-time subscription testing
   - Data migration validation

3. Update existing tests to work with both storage services

Follow the existing test patterns and use Vitest as the test framework.
```

### AI Task 3.2: Create Data Migration Scripts
**AI PROMPT:**
```
Generate data migration utilities in scripts/migrate-to-supabase.ts that:

1. Connects to both Google Cloud SQL and Supabase
2. Migrates user data from users table to profiles table
3. Migrates all projects, financial_models, and related data
4. Validates data integrity after migration
5. Provides rollback capabilities
6. Logs migration progress and results
7. Handles large datasets with batch processing

Include comprehensive error handling and validation at each step.
```

### AI Task 3.3: Execute Migration Validation
```bash
# AI COMMAND: Run test suite
npm test

# AI COMMAND: Run integration tests
npm run test:integration

# AI COMMAND: Validate TypeScript compilation
npm run typecheck

# AI COMMAND: Run linting
npm run lint

# AI COMMAND: Test migration scripts
npm run migrate:validate
```

### AI Task 3.4: Performance Benchmarking
**AI PROMPT:**
```
Create performance benchmarking utilities in scripts/performance-benchmark.ts that:

1. Compares response times between Dexie and Supabase services
2. Tests all major CRUD operations
3. Measures real-time subscription performance
4. Validates concurrent user scenarios
5. Reports detailed performance metrics
6. Generates performance comparison reports

Run benchmarks and ensure Supabase performance meets or exceeds current baseline.
```

---

## Session 4: Production Deployment & Monitoring

### AI Task 4.1: Environment Configuration
**AI PROMPT:**
```
Create production-ready environment configuration:

1. Generate .env.example with all required Supabase variables
2. Create deployment configuration for Vercel/Netlify
3. Set up environment-specific builds (development/staging/production)
4. Configure proper CORS and security headers
5. Add environment validation and error handling

Ensure the configuration supports both local development and production deployment.
```

### AI Task 4.2: Deployment Scripts
**AI PROMPT:**
```
Generate deployment automation scripts:

1. scripts/deploy-supabase.ts - Deploys schema and functions to production
2. scripts/migrate-production.ts - Executes production data migration
3. scripts/validate-deployment.ts - Validates production deployment
4. Update package.json with deployment commands
5. Create CI/CD configuration for automated deployment

Include proper error handling, rollback procedures, and validation steps.
```

### AI Task 4.3: Monitoring & Alerting
**AI PROMPT:**
```
Implement monitoring and alerting systems:

1. Create src/lib/monitoring.ts for performance tracking
2. Add error tracking and reporting utilities
3. Implement health check endpoints
4. Create real-time dashboard for migration status
5. Set up automated alerts for critical issues
6. Add comprehensive logging throughout the application

The monitoring system should track migration progress, performance metrics, and error rates.
```

### AI Task 4.4: Documentation Generation
**AI PROMPT:**
```
Generate comprehensive documentation:

1. Update README.md with new Supabase setup instructions
2. Create DEPLOYMENT.md with production deployment guide
3. Generate API documentation for new services
4. Create troubleshooting guide for common issues
5. Document real-time features and usage examples
6. Update development setup instructions

Ensure all documentation is accurate and includes code examples.
```

---

## Automated Validation Commands

### Schema Validation
```bash
# AI COMMAND: Validate schema migration
npx supabase db diff

# AI COMMAND: Check RLS policies
npx supabase db check

# AI COMMAND: Validate types
npm run typecheck
```

### Data Validation
```bash
# AI COMMAND: Run data integrity tests
npm run test:data-integrity

# AI COMMAND: Validate migration
npm run migrate:validate

# AI COMMAND: Check performance
npm run benchmark
```

### Deployment Validation
```bash
# AI COMMAND: Build for production
npm run build

# AI COMMAND: Test production build
npm run preview

# AI COMMAND: Validate deployment
npm run validate:deployment
```

---

## AI Success Metrics

### Automated Validation Checklist
- [ ] **Schema Migration**: All tables created with proper types and relationships
- [ ] **RLS Policies**: Security policies applied and tested
- [ ] **Type Generation**: TypeScript types generated and validated
- [ ] **Service Implementation**: SupabaseStorageService implements all interface methods
- [ ] **Authentication**: Google OAuth working with Supabase Auth
- [ ] **Real-time**: WebSocket subscriptions functional
- [ ] **Test Coverage**: All new code has corresponding tests
- [ ] **Performance**: Response times within acceptable range
- [ ] **Data Migration**: All data migrated with integrity validation
- [ ] **Production Ready**: Environment configured for deployment

### Performance Targets
- **Schema Migration**: < 30 seconds
- **Service Generation**: < 60 minutes  
- **Test Suite Generation**: < 30 minutes
- **Data Migration**: < 2 hours (depending on data size)
- **Overall Completion**: < 8 hours total

### Quality Metrics
- **Type Safety**: 100% (enforced by TypeScript)
- **Test Coverage**: > 90%
- **Code Quality**: Passes all linting rules
- **Documentation**: Complete API documentation generated
- **Error Handling**: Comprehensive error coverage

---

## Troubleshooting Guide for AI

### Common Issues & Solutions

#### Issue: Schema Migration Fails
```bash
# AI SOLUTION: Check and fix schema syntax
npx supabase db reset
# Review and fix migration script
npx supabase db push
```

#### Issue: Type Generation Errors
```bash
# AI SOLUTION: Regenerate types after schema fix
npx supabase gen types typescript --local > src/lib/database.types.ts
npm run typecheck
```

#### Issue: Authentication Not Working
```bash
# AI SOLUTION: Verify OAuth configuration
# Check Supabase dashboard for proper Google OAuth setup
# Verify redirect URLs are correctly configured
```

#### Issue: Real-time Subscriptions Failing
```bash
# AI SOLUTION: Check RLS policies and authentication
# Verify WebSocket connections in browser dev tools
# Test with simple subscription first
```

#### Issue: Data Migration Errors
```bash
# AI SOLUTION: Validate source data first
npm run validate:source-data
# Check for data type mismatches
# Run migration in smaller batches
```

---

## AI Prompt Templates

### General Code Generation Template
```
Generate [COMPONENT_TYPE] for Fortress Modeler Cloud Supabase migration:

Context: [PROVIDE_CONTEXT]
Requirements: [LIST_REQUIREMENTS]
Reference Files: [LIST_REFERENCE_FILES]
Integration Points: [LIST_INTEGRATIONS]

The generated code should:
1. Follow TypeScript best practices
2. Maintain compatibility with existing interfaces
3. Include proper error handling
4. Add comprehensive type safety
5. Include JSDoc documentation

Please provide the complete implementation with explanation of key design decisions.
```

### Testing Template
```
Generate comprehensive tests for [COMPONENT_NAME]:

Test the following scenarios:
1. [LIST_SCENARIOS]

Use these testing patterns from existing codebase:
- [REFERENCE_EXISTING_TESTS]

Include:
- Unit tests with mocked dependencies
- Integration tests with real Supabase instance
- Error handling validation
- Type safety verification
```

### Migration Template
```
Create data migration script for [DATA_TYPE]:

Source: [SOURCE_DESCRIPTION]
Target: [TARGET_DESCRIPTION]
Validation: [VALIDATION_REQUIREMENTS]

The script should:
1. Handle large datasets efficiently
2. Provide progress reporting
3. Include rollback capabilities
4. Validate data integrity
5. Log all operations
```

---

## Conclusion

This AI execution guide provides comprehensive instructions for automated migration of Fortress Modeler Cloud to Supabase. The guide is optimized for AI assistants to achieve **95%+ automation** with minimal human intervention.

### Key AI Advantages
- **Rapid Implementation**: Complete migration in 6-8 hours
- **High Quality**: AI-generated code with type validation
- **Comprehensive Testing**: Automated test suite generation
- **Zero Errors**: TypeScript catches issues during generation
- **Complete Documentation**: Auto-generated docs and guides

The migration is ready for immediate AI execution following this guide.