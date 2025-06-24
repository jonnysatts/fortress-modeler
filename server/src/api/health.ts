import express from 'express';

export const healthRouter = express.Router();

// Basic health check
healthRouter.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'fortress-modeler-server',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// Detailed health check
healthRouter.get('/detailed', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Check database connection (we'll implement this in Phase 1)
    const dbStatus = await checkDatabase();
    
    // Check environment variables
    const envStatus = checkEnvironment();
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      components: {
        database: dbStatus,
        environment: envStatus,
        server: {
          status: 'healthy',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.version,
        },
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Database health check function
async function checkDatabase(): Promise<{ status: string; latency?: number }> {
  // For now, return a placeholder
  // We'll implement actual database checks once we set up PostgreSQL
  return {
    status: 'not_connected',
    latency: 0,
  };
}

// Environment variables check
function checkEnvironment() {
  const requiredEnvVars = [
    'CLIENT_URL',
    'GOOGLE_CLIENT_ID',
    'JWT_SECRET',
  ];
  
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  return {
    status: missing.length === 0 ? 'ok' : 'warning',
    missing_variables: missing,
    client_url: process.env.CLIENT_URL || 'not_set',
    has_google_auth: !!process.env.GOOGLE_CLIENT_ID,
    has_jwt_secret: !!process.env.JWT_SECRET,
  };
}