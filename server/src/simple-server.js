const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'fortress-modeler-server',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// Detailed health check
app.get('/health/detailed', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    components: {
      server: {
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
      },
      environment: {
        status: 'ok',
        client_url: process.env.CLIENT_URL || 'not_set',
        has_google_auth: !!process.env.GOOGLE_CLIENT_ID,
        has_jwt_secret: !!process.env.JWT_SECRET,
      },
      database: {
        status: 'not_connected',
        message: 'Database will be implemented in Phase 2'
      }
    },
  });
});

// Placeholder API endpoints
app.get('/api/projects', (req, res) => {
  res.json({
    projects: [],
    total: 0,
    message: 'Projects endpoint ready (Phase 1 - no auth/database yet)',
  });
});

app.post('/api/auth/google', (req, res) => {
  res.json({
    success: false,
    message: 'Google OAuth will be implemented in Phase 1 completion - placeholder for now',
    note: 'Add Google Client ID to .env file when ready'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `${req.method} ${req.originalUrl} is not a valid endpoint`,
    available_endpoints: [
      'GET /health',
      'GET /health/detailed', 
      'GET /api/projects',
      'POST /api/auth/google'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Fortress Modeler Server (Phase 1) running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Status: Phase 1 - Basic API endpoints ready`);
  console.log(`🔐 Auth: Not implemented yet (Phase 1 focuses on infrastructure)`);
  console.log(`💾 Database: Not connected yet (Phase 2)`);
});