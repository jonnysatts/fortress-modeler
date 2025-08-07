#!/bin/bash

echo "🚀 Preparing Fortress Modeler for Netlify Deployment"
echo "===================================================="

# Create a new branch for the fixed version
echo -e "\n📌 Creating new branch for deployment..."
git checkout -b production-fix-oauth-rls-$(date +%Y%m%d)

# Add only the necessary files (not test scripts)
echo -e "\n📁 Adding essential files..."
git add .env
git add src/lib/supabase.ts
git add src/services/implementations/SupabaseStorageService.ts
git add src/components/AuthComponent.tsx
git add src/components/AuthGuard.tsx
git add src/lib/env.ts
git add src/lib/health.ts
git add package-lock.json

# Create a deployment README
echo -e "\n📝 Creating deployment documentation..."
cat > DEPLOYMENT_NOTES.md << 'EOF'
# Fortress Modeler - Production Deployment Notes

## Branch: production-fix-oauth-rls-$(date +%Y%m%d)
## Date: $(date)

### ✅ Issues Fixed
1. **OAuth Authentication** - Fixed Google OAuth with correct client credentials
2. **Database Functions** - Added missing get_user_projects() and get_shared_projects()
3. **RLS Policies** - Fixed Row Level Security policies to eliminate 403 errors
4. **Database Schema** - Added missing columns (deleted_at, shared_with_user_id)

### 🔧 Configuration
- **Supabase Project ID**: issmshemlkrucmxcvibs
- **Google OAuth Client ID**: 925312412738-vl8ajbmt6679e4ph5eo42dl4jl1lfjet.apps.googleusercontent.com
- **Environment**: Production-ready

### 📦 Deployment Steps for Netlify
1. Connect this branch to Netlify
2. Set environment variables:
   - VITE_SUPABASE_URL=https://issmshemlkrucmxcvibs.supabase.co
   - VITE_SUPABASE_ANON_KEY=(from .env file)
   - VITE_GOOGLE_CLIENT_ID=925312412738-vl8ajbmt6679e4ph5eo42dl4jl1lfjet.apps.googleusercontent.com
3. Deploy

### ⚠️ Important
- Database migrations have been applied directly to Supabase
- RLS policies are configured and enabled
- All test files excluded from deployment
EOF

git add DEPLOYMENT_NOTES.md

# Add the status report
git add STATUS_REPORT.md

# Commit the changes
echo -e "\n💾 Committing changes..."
git commit -m "fix: OAuth authentication and RLS policies for production deployment

- Fixed Google OAuth configuration with correct client credentials
- Resolved RLS policy errors causing 403 forbidden responses
- Added missing database functions (get_user_projects, get_shared_projects)
- Updated SupabaseStorageService to handle database schema properly
- Ready for Netlify deployment"

echo -e "\n✅ Ready to push! Run the following command:"
echo "git push origin production-fix-oauth-rls-$(date +%Y%m%d)"
