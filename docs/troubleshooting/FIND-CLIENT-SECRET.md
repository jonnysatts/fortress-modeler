# 🔐 How to Find Your Google OAuth Client Secret

## Correct Project URL
✅ **Your correct URL**: https://console.cloud.google.com/apis/credentials?project=product-modeler

## 📍 Finding Your Client Secret (Step-by-Step)

### Step 1: Go to the Credentials Page
1. Open: https://console.cloud.google.com/apis/credentials?project=product-modeler
2. Look for the "OAuth 2.0 Client IDs" section

### Step 2: Find Your OAuth Client
Look for the client with ID: `928130924917-fcu6m854ua2ajutk3eu191okl4f29uqv.apps.googleusercontent.com`
- It might be named something like "Web client" or "Fortress Modeler"
- Click on the NAME (not the ID) to open it

### Step 3: Locate the Client Secret
Once you click on the OAuth client name, you'll see:

```
┌─────────────────────────────────────┐
│ OAuth 2.0 Client ID                 │
├─────────────────────────────────────┤
│ Client ID                           │
│ 928130924917-fcu6m...               │
│                                     │
│ Client Secret                       │
│ [SHOW] ← Click this!                │
│ GOCSPX-xxxxxxxxxxxxx                │
│                                     │
│ Authorized JavaScript origins       │
│ ...                                 │
│                                     │
│ Authorized redirect URIs            │
│ ...                                 │
└─────────────────────────────────────┘
```

### Step 4: Copy the Client Secret
1. Click the "SHOW" button next to Client Secret
2. The secret will appear (starts with `GOCSPX-`)
3. Click the copy icon or select and copy it
4. **IMPORTANT**: Keep this secret secure!

## 🔴 If You Can't Find the Client Secret

Sometimes the secret might be hidden or you might need to regenerate it:

1. In the OAuth client page, look for a "RESET SECRET" button
2. Click it to generate a new secret
3. Copy the new secret immediately (you won't be able to see it again!)

## 📝 What to Do With the Client Secret

### Add it to Supabase:
1. Go to: https://supabase.com/dashboard/project/issmshemlkrucmxcvibs/auth/providers
2. Find "Google" in the list
3. Toggle it ON
4. Paste:
   - **Client ID**: `928130924917-fcu6m854ua2ajutk3eu191okl4f29uqv.apps.googleusercontent.com`
   - **Client Secret**: `GOCSPX-xxxxxxxxxxxxx` (the one you just copied)
5. Click "Save"

## ⚠️ Security Note
Never commit the client secret to Git or share it publicly. It should only be stored in:
- Supabase Dashboard (secure)
- Environment variables on your server (secure)
- Never in your frontend code!
