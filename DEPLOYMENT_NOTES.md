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
