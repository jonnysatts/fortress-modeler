# Fortress Modeler Server

Cloud backend for Fortress Modeler - Phase 1 Implementation

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Copy environment file and configure
cp .env.example .env
# Edit .env with your Google OAuth credentials

# Start development server
npm run dev
```

## 📋 Current Status (Phase 1)

✅ **Working:**
- Basic Express server with TypeScript
- Health check endpoints (`/health` and `/health/detailed`)
- Google OAuth authentication (`/api/auth/google`)
- JWT token verification (`/api/auth/verify`)
- Placeholder project endpoints (`/api/projects/*`)
- CORS configuration for React app
- Security middleware (Helmet)
- Request logging (development)
- Error handling

❌ **Not Yet Implemented:**
- Database connection (Phase 2)
- Data persistence (Phase 2)  
- Sync functionality (Phase 2)
- User management (Phase 3)

## 🔧 API Endpoints

### Health Check
- `GET /health` - Basic health status
- `GET /health/detailed` - Detailed system status

### Authentication  
- `POST /api/auth/google` - Login with Google OAuth
- `GET /api/auth/verify` - Verify JWT token
- `POST /api/auth/logout` - Logout

### Projects (Placeholder)
- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get specific project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

## 🔑 Environment Variables

Required:
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `JWT_SECRET` - Secret key for JWT signing

Optional:
- `PORT` - Server port (default: 4000)
- `CLIENT_URL` - React app URL (default: http://localhost:5173)
- `NODE_ENV` - Environment (development/production)

## 🧪 Testing

```bash
# Test health endpoint
curl http://localhost:4000/health

# Test detailed health
curl http://localhost:4000/health/detailed

# Test CORS
curl -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://localhost:4000/api/projects
```

## 📁 Project Structure

```
server/
├── src/
│   ├── api/           # API route handlers
│   │   ├── auth.ts    # Authentication routes
│   │   ├── health.ts  # Health check routes
│   │   └── projects.ts # Project routes (placeholder)
│   ├── auth/          # Authentication utilities (future)
│   ├── db/            # Database layer (future)
│   ├── middleware/    # Custom middleware (future)
│   ├── sync/          # Sync engine (future)
│   ├── types/         # TypeScript types (future)
│   └── index.ts       # Main server file
├── .env.example       # Environment template
├── package.json       # Dependencies
└── tsconfig.json      # TypeScript config
```

## 🔒 Security Features

- **Helmet.js** - Security headers
- **CORS** - Cross-origin resource sharing
- **JWT** - Stateless authentication
- **Google OAuth** - Secure authentication provider
- **Input validation** - Request validation
- **Error handling** - Secure error responses

## 📈 Next Steps (Phase 2)

1. Set up PostgreSQL database
2. Implement database models and queries
3. Add data persistence for projects/models
4. Build sync engine foundation
5. Add proper logging and monitoring

## 🚨 Important Notes

- This is Phase 1 - NO DATABASE YET
- All data is placeholder/temporary
- React app is completely unaffected
- Safe to test and develop without breaking anything