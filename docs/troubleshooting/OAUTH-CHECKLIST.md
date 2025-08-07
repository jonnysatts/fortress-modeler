# Google OAuth Setup Checklist

## 🔴 CRITICAL: The Most Important URL

This EXACT URL must be in your Google Cloud Console redirect URIs:
```
https://issmshemlkrucmxcvibs.supabase.co/auth/v1/callback
```
☝️ **This is THE MOST IMPORTANT one - without it, nothing will work!**

---

## Part 1: Google Cloud Console
Go to: https://console.cloud.google.com/apis/credentials

### Find Your OAuth 2.0 Client ID:
- [ ] Can you see: `928130924917-fcu6m854ua2ajutk3eu191okl4f29uqv.apps.googleusercontent.com`?
  - Yes → Click on it to edit
  - No → Need to create new OAuth credentials

### If Creating New OAuth Client:
1. Click "CREATE CREDENTIALS" → "OAuth client ID"
2. Application type: "Web application"
3. Name: "Fortress Modeler"
4. Continue to redirect URIs below

### Authorized Redirect URIs (ADD ALL OF THESE):
Copy and paste each one exactly:

- [ ] `https://issmshemlkrucmxcvibs.supabase.co/auth/v1/callback` ← **MOST IMPORTANT**
- [ ] `http://localhost:8081/login`
- [ ] `http://localhost:8081/auth/callback`
- [ ] `https://fortress-modeler.netlify.app/login`
- [ ] `https://fortress-modeler.netlify.app/auth/callback`

### Authorized JavaScript Origins:
- [ ] `http://localhost:8081`
- [ ] `https://fortress-modeler.netlify.app`
- [ ] `https://issmshemlkrucmxcvibs.supabase.co`

### Get Your Client Secret:
- [ ] Copy the "Client secret" (looks like: GOCSPX-xxxxxxxxxxxxx)

---

## Part 2: OAuth Consent Screen (if needed)

If you see "OAuth consent screen configuration required":

1. Go to "OAuth consent screen" in sidebar
2. User type: "External" (unless using Google Workspace)
3. Fill in:
   - App name: "Fortress Financial Modeler"
   - User support email: (your email)
   - Developer contact: (your email)
4. Scopes: Add these:
   - `userinfo.email`
   - `userinfo.profile`
5. Test users: Add your email

---

## Part 3: Supabase Dashboard
Go to: https://supabase.com/dashboard/project/issmshemlkrucmxcvibs/auth/providers

### Google Provider Settings:
- [ ] Toggle Google to "ON"
- [ ] Client ID: `928130924917-fcu6m854ua2ajutk3eu191okl4f29uqv.apps.googleusercontent.com`
- [ ] Client Secret: (paste from Google Cloud Console)
- [ ] Click "Save"

### URL Configuration:
Go to: https://supabase.com/dashboard/project/issmshemlkrucmxcvibs/auth/url-configuration

- [ ] Site URL: `https://fortress-modeler.netlify.app`
- [ ] Add these Redirect URLs:
  - `http://localhost:8081/**`
  - `https://fortress-modeler.netlify.app/**`

---

## Part 4: Test It!

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Open: http://localhost:8081

3. Click "Sign in with Google"

4. What happens?
   - [ ] Google login popup appears → Success! 
   - [ ] Error: "redirect_uri_mismatch" → Copy the EXACT URL from error, add to Google Console
   - [ ] Nothing happens → Check browser console (F12)
   - [ ] Error: "Invalid client" → Client ID issue
   - [ ] Error: "Access blocked" → OAuth consent screen needs setup

---

## If You're Stuck:

### Option 1: Create Fresh OAuth Credentials
Sometimes it's easier to start fresh:
1. Create new OAuth 2.0 Client ID in Google Console
2. Update all the redirect URIs
3. Update your .env with new Client ID
4. Update Supabase with new credentials

### Option 2: Use Different Google Project
If current project is messy:
1. Create new Google Cloud Project
2. Enable Google+ API
3. Create OAuth credentials
4. Configure everything fresh

### Tell me what error you're seeing:
Run this command and tell me the output:
```bash
npm run dev
# Try to login
# Open browser console (F12)
# Copy any error messages
```

---

## Your Current Status:
- ✅ Supabase database configured with RLS
- ✅ Publishable key configured
- ✅ Client ID in your app config
- ❓ Google Cloud Console redirect URIs
- ❓ Supabase Google provider enabled
- ❓ OAuth consent screen configured
