# 🚨 CRITICAL: Supabase Project Alignment Required

## Current Situation
You have **THREE different Supabase projects** configured in different places:

1. **`vplafscpcsxdxbyoxfhq`** - Old production (was asleep, now awake)
2. **`issmshemlkrucmxcvibs`** - The one you said is correct (configured locally now)
3. **`jjearfzmvmpohbebcnju`** - What Netlify WAS using (appears to be down/non-existent)

## What We've Fixed
✅ Updated `netlify.toml` to use: `issmshemlkrucmxcvibs`
✅ Updated local `.env` to use: `issmshemlkrucmxcvibs`
✅ Updated `app.config.ts` to use: `issmshemlkrucmxcvibs`
✅ Added Google Client ID to local `.env`: `928130924917-fcu6m854ua2ajutk3eu191okl4f29uqv.apps.googleusercontent.com`

## Next Steps

### 1. Deploy to Netlify
```bash
git add -A
git commit -m "fix: align all configurations to use correct Supabase project"
git push origin main
```

Netlify will automatically rebuild with the new configuration.

### 2. Update Google OAuth Redirect URIs
Go to: https://console.cloud.google.com/apis/credentials

For OAuth Client ID: `928130924917-fcu6m854ua2ajutk3eu191okl4f29uqv.apps.googleusercontent.com`

Add these Authorized redirect URIs:
```
https://issmshemlkrucmxcvibs.supabase.co/auth/v1/callback
http://localhost:8081/login
http://localhost:8081/auth/callback
https://fortress-modeler.netlify.app/login
https://fortress-modeler.netlify.app/auth/callback
```

### 3. Configure Supabase Dashboard
Go to: https://supabase.com/dashboard/project/issmshemlkrucmxcvibs/auth/providers

1. Enable Google Provider
2. Add:
   - Client ID: `928130924917-fcu6m854ua2ajutk3eu191okl4f29uqv.apps.googleusercontent.com`
   - Client Secret: (get from Google Cloud Console)

### 4. Configure Supabase URLs
Go to: https://supabase.com/dashboard/project/issmshemlkrucmxcvibs/auth/url-configuration

Set:
- Site URL: `https://fortress-modeler.netlify.app`
- Redirect URLs:
  ```
  http://localhost:8081/login
  http://localhost:8081/auth/callback
  https://fortress-modeler.netlify.app/login
  https://fortress-modeler.netlify.app/auth/callback
  ```

## Testing
1. **Local**: Stop current dev server, restart with `npm run dev`, test OAuth
2. **Production**: After Netlify deploys, test OAuth at https://fortress-modeler.netlify.app

## Important Notes
- The dead project `jjearfzmvmpohbebcnju` might have had data - check if you need to migrate anything
- All environments now point to `issmshemlkrucmxcvibs`
- Google OAuth changes can take 5-10 minutes to propagate
