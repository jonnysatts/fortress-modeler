# Fortress Financial Modeler - System Requirements

## System Requirements

### Operating System
- **Windows:** Windows 10 or later
- **macOS:** macOS 10.15 (Catalina) or later
- **Linux:** Ubuntu 18.04+, Debian 10+, or equivalent distributions

### Hardware Requirements
- **RAM:** Minimum 4GB, Recommended 8GB+
- **Storage:** 500MB free space (for Node.js + dependencies)
- **CPU:** Any modern processor (x64/ARM64 supported)
- **Network:** Internet connection required for Supabase cloud mode

## Software Prerequisites

### Node.js (Required)
- **Version:** Node.js v18.0.0 or higher
- **Download:** https://nodejs.org/
- **Verification:** Run `node --version` (should show v18+)
- **npm:** Included with Node.js (v9+ required)

### Git (Required)
- **Purpose:** Clone repository and manage code updates
- **Download:** https://git-scm.com/
- **Verification:** Run `git --version`

### Modern Web Browser (Required)
- **Chrome/Chromium:** v90+ (Recommended)
- **Firefox:** v88+
- **Safari:** v14+
- **Edge:** v90+

**Note:** Internet Explorer is not supported.

## Development Dependencies

The following dependencies are automatically installed via `npm install`:

### Core Framework
- **React:** v18.3.1 (UI framework)
- **TypeScript:** v5.5.3 (Type safety)
- **Vite:** v5.4.1 (Build tool and dev server)
- **React Router DOM:** v6.26.2 (Routing)

### UI & Styling
- **Tailwind CSS:** v3.4.17 (Styling framework)
- **Radix UI:** v1.x (Accessible components)
- **Lucide React:** v0.462.0 (Icons)
- **Recharts:** v2.12.7 (Charts and visualization)

### State Management & Data
- **React Query:** v5.56.2 (Server state management)
- **Zustand:** v4.5.6 (Client state management)
- **React Hook Form:** v7.53.0 (Form handling)
- **Zod:** v3.23.8 (Schema validation)

### Database & Backend
- **Supabase JS:** v2.39.0 (Cloud backend)
- **Dexie:** v4.0.11 (IndexedDB wrapper for local storage)

### Utilities
- **Date-fns:** v3.6.0 (Date manipulation)
- **UUID:** v11.1.0 (Unique ID generation)
- **XLSX:** v0.18.5 (Excel export)
- **jsPDF:** v3.0.1 (PDF export)

### Development Tools
- **ESLint:** v9.9.0 (Code linting)
- **Vitest:** v3.2.4 (Testing framework)
- **Rollup Visualizer:** v6.0.3 (Bundle analysis)

## Environment Configuration

### Required Environment Variables
```env
# Supabase Configuration (Required for cloud mode)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Backend Mode Selection (Required)
VITE_USE_SUPABASE_BACKEND=true  # For cloud mode
# VITE_USE_SUPABASE_BACKEND=false  # For local-only mode

# OAuth Configuration (Required for authentication)
VITE_GOOGLE_CLIENT_ID=your-google-client-id.googleusercontent.com
```

### Optional Environment Variables
```env
# Development Tools (Optional)
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key

# Debug Mode (Optional)
VITE_DEBUG=false
```

## Network Requirements

### Cloud Mode (Supabase)
- **Outbound HTTPS (443):** Access to `*.supabase.co`
- **WebSocket:** For real-time features
- **OAuth:** Access to Google OAuth servers

### Local Mode
- **No internet required** after initial download
- **Port 8081:** Must be available for local development server

## Browser Compatibility

### Required Features
- **ES2020 Support:** Modern JavaScript features
- **IndexedDB:** For local data storage
- **WebSocket:** For real-time features (cloud mode)
- **Local Storage:** For user preferences
- **Fetch API:** For HTTP requests

### Tested Browsers
- ✅ Chrome 120+ (Primary development browser)
- ✅ Firefox 120+
- ✅ Safari 16+
- ✅ Edge 120+
- ❌ Internet Explorer (Not supported)

## Installation Verification

After installation, verify all requirements are met:

```bash
# Check Node.js version
node --version  # Should show v18+

# Check npm version  
npm --version   # Should show v9+

# Check Git
git --version   # Should show any recent version

# Install and start app
npm install     # Install all dependencies
npm run dev     # Start development server

# Verify app loads
# Open http://localhost:8081 in browser
```

## Performance Considerations

### Minimum Specs
- **4GB RAM:** Basic functionality
- **Slow network:** Local mode recommended

### Recommended Specs
- **8GB+ RAM:** Smooth performance with large datasets
- **Fast network:** Cloud mode with real-time features
- **SSD storage:** Faster dependency installation

## Troubleshooting Common Issues

### "Node.js not found"
- Install Node.js v18+ from https://nodejs.org/
- Restart terminal after installation
- Verify with `node --version`

### "Port 8081 in use"
- Stop other applications using port 8081
- Port 8081 is required for OAuth to work

### "npm install fails"
- Clear npm cache: `npm cache clean --force`
- Delete node_modules: `rm -rf node_modules`
- Reinstall: `npm install`

### "Supabase connection fails"
- Verify environment variables in `.env`
- Check internet connection
- Confirm Supabase project is active

## Security Considerations

### Environment Variables
- **Never commit `.env` files** to version control
- **Use different keys** for development/production
- **Regularly rotate** API keys

### Network Security
- **HTTPS only** for production deployments
- **Content Security Policy** configured
- **No sensitive data** in client-side code

---

**Need help?** See [INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md) for detailed setup instructions.