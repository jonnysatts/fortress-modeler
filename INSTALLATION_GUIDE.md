# Fortress Financial Modeler - Installation Guide

## Quick Setup for New Machines

This guide helps you install and run the Fortress Financial Modeler on any PC/Mac to access your Supabase cloud projects.

## Prerequisites

1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **Git**
   - Download from: https://git-scm.com/
   - Verify installation: `git --version`

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/jonnysatts/fortress-modeler.git
cd fortress-modeler
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
# Copy the example and edit
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Enable Supabase Backend (CRITICAL for cloud mode)
VITE_USE_SUPABASE_BACKEND=true

# OAuth Configuration (Google)
VITE_GOOGLE_CLIENT_ID=your-google-client-id.googleusercontent.com
```

**🚨 IMPORTANT:** Set `VITE_USE_SUPABASE_BACKEND=true` to access cloud projects!

### 4. Start the Development Server

```bash
npm run dev
```

The app will be available at: `http://localhost:8081/`

**🚨 IMPORTANT:** The app MUST run on port 8081 for OAuth authentication to work! The Google OAuth redirect URI is configured for this specific port.

## Configuration Details

### Supabase Credentials

Your Supabase credentials are:
- **Project URL**: Found in Supabase Dashboard > Settings > API
- **Anon Key**: Found in Supabase Dashboard > Settings > API > Project API keys
- **Google Client ID**: From Google Cloud Console OAuth 2.0 credentials

### OAuth Setup

The app uses Google OAuth for authentication. Make sure your Google OAuth client has these redirect URIs:
- `http://localhost:8081/auth/callback` (**Port 8081 is required!**)
- `https://your-domain.com/auth/callback` (for production)

**Critical:** If you try to run on a different port (like 8080), OAuth will fail with a redirect URI mismatch error.

## Operating Modes

### Cloud Mode (Recommended)
```env
VITE_USE_SUPABASE_BACKEND=true
```
- All data stored in Supabase
- Real-time collaboration
- Access from any device
- Automatic backups

### Local Mode
```env
VITE_USE_SUPABASE_BACKEND=false
```
- Data stored locally in browser
- No internet required after initial load
- Data specific to each machine

## Troubleshooting

### Common Issues

1. **"Projects not loading"**
   - Check `VITE_USE_SUPABASE_BACKEND=true` in `.env`
   - Verify Supabase URL and keys are correct
   - Check browser console for authentication errors

2. **"OAuth callback error"**
   - Verify Google Client ID is correct
   - Check redirect URI in Google Cloud Console
   - Ensure no trailing slashes in URLs

3. **"Network errors"**
   - Check internet connection
   - Verify Supabase project is not paused
   - Check Supabase dashboard for service status

### Debug Mode

Add to `.env` for detailed logging:
```env
VITE_DEBUG=true
```

### Reset Local Data

If switching from local to cloud mode, clear browser data:
1. Open Developer Tools (F12)
2. Go to Application > Storage
3. Click "Clear site data"

## Quick Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test
```

## Production Deployment

For production deployment, you can:

1. **Build and serve locally:**
   ```bash
   npm run build
   npm run preview
   ```

2. **Deploy to Vercel/Netlify:**
   - Connect your GitHub repo
   - Set environment variables in deployment settings
   - Deploy automatically on push

3. **Self-host:**
   - Run `npm run build`
   - Serve the `dist/` folder with any web server

## Security Notes

- Never commit `.env` files to git
- Keep your Supabase keys secure
- Use environment-specific keys for production
- Regularly rotate API keys

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify all environment variables are set correctly
3. Ensure you're using the latest version from the main branch
4. Check Supabase dashboard for service issues

---

**Need help?** Check the troubleshooting section or review the browser console for detailed error messages.