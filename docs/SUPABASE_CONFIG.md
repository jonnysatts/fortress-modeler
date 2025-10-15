# Fortress Modeler - Supabase Project Configuration

## Current Configuration (CORRECT)
- **Project ID**: `issmshemlkrucmxcvibs`
- **Project URL**: https://issmshemlkrucmxcvibs.supabase.co
- **Dashboard**: https://supabase.com/dashboard/project/issmshemlkrucmxcvibs

## OAuth Setup Requirements

### 1. Supabase Dashboard Configuration
Go to: https://supabase.com/dashboard/project/issmshemlkrucmxcvibs/auth/providers

Enable Google Provider and add:
- Google Client ID (from Google Cloud Console)
- Google Client Secret (from Google Cloud Console)

### 2. Supabase URL Configuration
Go to: https://supabase.com/dashboard/project/issmshemlkrucmxcvibs/auth/url-configuration

Set these URLs:
- **Site URL**: `https://your-app.netlify.app` (or your production URL)
- **Redirect URLs** (add all of these):
  ```
  http://localhost:8081/login
  http://localhost:8081/auth/callback
  https://your-app.netlify.app/login
  https://your-app.netlify.app/auth/callback
  ```

### 3. Google Cloud Console Setup
Go to: https://console.cloud.google.com/

1. Create or select a project
2. Go to APIs & Services → Credentials
3. Create OAuth 2.0 Client ID (Web application type)
4. Add Authorized JavaScript origins:
   ```
   http://localhost:8081
   https://your-app.netlify.app
   ```
5. Add Authorized redirect URIs:
   ```
   http://localhost:8081/login
   http://localhost:8081/auth/callback
   https://issmshemlkrucmxcvibs.supabase.co/auth/v1/callback
   https://your-app.netlify.app/login
   https://your-app.netlify.app/auth/callback
   ```

### 4. Update Local Configuration
Once you have the Google Client ID, update your `.env` file:
```env
VITE_GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
```

## Testing OAuth

1. Make sure dev server is running: `npm run dev`
2. Open browser: http://localhost:8081
3. Click "Sign in with Google"
4. Check browser console for any errors (F12 → Console tab)

## Troubleshooting

If OAuth doesn't work:
1. Check browser console for specific error messages
2. Verify all URLs are correctly configured in both Google and Supabase
3. Ensure the Google Provider is enabled in Supabase
4. Make sure your Google Client ID is in the .env file
5. Clear browser cache/cookies and try again

## Project Notes
- The other Supabase project (`vplafscpcsxdxbyoxfhq`) was from .env.production but is NOT the active one
- All configurations now point to the correct project: `issmshemlkrucmxcvibs`
- The dev server is configured to run on port 8081
