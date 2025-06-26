import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { 
  initializeDatabase, 
  getDatabaseHealth, 
  closeDatabase 
} from './db/connection';
import { handleCorsOptions } from './middleware/auth.middleware';
import authRoutes from './api/auth.routes';
import projectRoutes from './api/projects.routes';
import syncRoutes from './api/sync.routes';
import modelRoutes from './api/models.routes';
import { SecretsService } from './services/secrets.service';

// Load environment variables
dotenv.config();

// Initialize secrets service
SecretsService.initialize();

const app = express();
const PORT = process.env.PORT || 8080;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
const allowedOrigins = [
  'https://fortress-modeler-frontend-pqiu2rcyqq-km.a.run.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8083',
  'https://fortress-modeler-frontend-928130924917.australia-southeast2.run.app',
  'https://fortress-modeler.vercel.app',
  'https://fortress-modeler.netlify.app'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// Handle CORS preflight
app.use(handleCorsOptions);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Initialize database
let dbInitialized = false;
if (process.env.DATABASE_URL || process.env.DB_HOST) {
  try {
    initializeDatabase();
    dbInitialized = true;
    console.log('✅ Database connection initialized');
    if (process.env.DB_HOST) {
      console.log(`🔗 Using Cloud SQL socket: ${process.env.DB_HOST}`);
    }
  } catch (error) {
    console.warn('⚠️  Database not available:', error);
  }
} else {
  console.log('⚠️  No database configuration found - running without database');
}

// Root route - API documentation
app.get('/', (req, res) => {
  res.json({
    name: 'Fortress Modeler API',
    version: '3.0.0',
    phase: 'Phase 3 - Project Sync & Cloud Storage',
    status: 'operational',
    timestamp: new Date().toISOString(),
    documentation: {
      health: '/health',
      detailedHealth: '/health/detailed',
      authentication: '/api/auth/*',
      projects: '/api/projects/*',
      models: '/api/models/*',
      sync: '/api/sync/*'
    },
    frontend: 'Deploy separately - this is an API-only service',
    cors: 'Configured for cross-origin requests'
  });
});

// Basic health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'fortress-modeler-server',
    version: '3.0.0',
    phase: 'Phase 3 - Project Sync & Cloud Storage',
    env: {
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasClientUrl: !!process.env.CLIENT_URL,
      clientUrl: process.env.CLIENT_URL || 'not-set'
    }
  });
});

// Detailed health check with database status
app.get('/health/detailed', async (req, res) => {
  const health = {
    service: {
      name: 'fortress-modeler-server',
      version: '3.0.0',
      phase: 'Phase 3',
      status: 'healthy',
      uptime: process.uptime(),
    },
    environment: {
      node_env: process.env.NODE_ENV || 'development',
      port: PORT,
      client_url: 'from-secrets',
      status: 'configured'
    },
    database: {
      status: 'unknown',
      latency: null as any,
      connections: null as any,
      error: null as any
    },
    auth: {
      google_oauth: 'from-secrets',
      jwt_secret: 'from-secrets',
      status: 'ready'
    },
    components: {
      server: { status: 'healthy' },
      environment: { status: 'configured' },
      database: { status: 'unknown' }
    }
  };
  
  // Check database health if initialized
  if (dbInitialized) {
    try {
      const dbHealth = await getDatabaseHealth();
      health.database.status = dbHealth.status;
      health.database.latency = dbHealth.latency || null;
      health.database.connections = dbHealth.connections || null;
      health.database.error = dbHealth.error || null;
      health.components.database = { status: dbHealth.status };
    } catch (error) {
      health.database.status = 'error';
      health.database.error = error instanceof Error ? error.message : 'Unknown error';
      health.components.database = { status: 'error' };
    }
  } else {
    health.database.status = 'not_initialized';
    health.components.database = { status: 'not_initialized' };
  }
  
  res.json(health);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/models', modelRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    path: req.path,
    method: req.method,
    available_endpoints: [
      'GET /health',
      'GET /health/detailed',
      'GET /api/auth/google',
      'POST /api/auth/google/callback',
      'POST /api/auth/verify',
      'POST /api/auth/refresh',
      'GET /api/auth/me',
      'PATCH /api/auth/me',
      'POST /api/auth/logout',
      'DELETE /api/auth/account',
      'GET /api/projects',
      'POST /api/projects',
      'GET /api/projects/:id',
      'PUT /api/projects/:id',
      'DELETE /api/projects/:id',
      'GET /api/models',
      'POST /api/models',
      'GET /api/models/:id',
      'PUT /api/models/:id',
      'DELETE /api/models/:id',
      'POST /api/sync',
      'GET /api/sync/status',
      'POST /api/sync/full'
    ]
  });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', error);
  
  res.status(error.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : error.message,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  
  if (dbInitialized) {
    await closeDatabase();
  }
  
  console.log('👋 Server shutdown complete');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received, shutting down...');
  
  if (dbInitialized) {
    await closeDatabase();
  }
  
  process.exit(0);
});

// Start server
const server = app.listen(PORT, () => {
  console.log('🚀 Fortress Modeler Server - Phase 3');
  console.log('====================================');
  console.log(`✅ Server running on port ${PORT}`);
  console.log('🌐 Client URL: Loaded from Google Secrets Manager');
  console.log(`💾 Database: ${dbInitialized ? 'Connected' : 'Not connected'}`);
  console.log('🔐 Authentication: Loaded from Google Secrets Manager');
  console.log('');
  console.log('📋 Available endpoints:');
  console.log('  GET  /health           - Basic health check');
  console.log('  GET  /health/detailed  - Detailed system status');
  console.log('');
  console.log('  🔐 Authentication:');
  console.log('  GET  /api/auth/google  - Get Google OAuth URL');
  console.log('  POST /api/auth/google/callback - Handle OAuth callback');
  console.log('  POST /api/auth/verify  - Verify JWT token');
  console.log('  GET  /api/auth/me     - Get user profile');
  console.log('');
  console.log('  📁 Projects:');
  console.log('  GET  /api/projects     - Get all user projects');
  console.log('  POST /api/projects     - Create new project');
  console.log('  GET  /api/projects/:id - Get specific project');
  console.log('  PUT  /api/projects/:id - Update project');
  console.log('  DELETE /api/projects/:id - Delete project');
  console.log('');
  console.log('  🧮 Financial Models:');
  console.log('  GET  /api/models       - Get all user models');
  console.log('  POST /api/models       - Create new model');
  console.log('  GET  /api/models/:id   - Get specific model');
  console.log('  PUT  /api/models/:id   - Update model');
  console.log('  DELETE /api/models/:id - Delete model');
  console.log('');
  console.log('  🔄 Synchronization:');
  console.log('  POST /api/sync         - Sync IndexedDB with cloud');
  console.log('  GET  /api/sync/status  - Get sync status');
  console.log('  POST /api/sync/full    - Force full sync');
  console.log('  GET  /api/sync/events  - Get sync history');
  console.log('');
  console.log('🔧 Configuration:');
  console.log(`  DATABASE_URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`);
  console.log('  GOOGLE_CLIENT_ID: Loaded from Google Secrets Manager');
  console.log('  JWT_SECRET: Loaded from Google Secrets Manager');
  console.log('');
  
  console.log('✅ Google OAuth configured via Google Secrets Manager');
  
  if (!dbInitialized) {
    console.log('⚠️  Database not connected - run "npm run db:setup" and "npm run db:migrate"');
  } else {
    console.log('🎯 Ready for Phase 3 project synchronization!');
  }
  
  console.log('====================================');
});

export default app;