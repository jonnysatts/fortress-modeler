/**
 * Fortress Financial Modeler - Electron Launcher
 * 
 * This script handles launching the app in the correct mode
 * and manages the built-in server for production builds.
 */

const { app, protocol } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';

// Register custom protocol for production builds
if (!isDev) {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'fortress',
      privileges: {
        secure: true,
        standard: true,
        supportFetchAPI: true
      }
    }
  ]);
}

class AppLauncher {
  constructor() {
    this.viteProcess = null;
    this.serverReady = false;
  }

  async startServer() {
    if (isDev) {
      // In development, assume Vite dev server is already running
      return 'http://localhost:8081';
    } else {
      // In production, start built-in server for the built files
      return this.startProductionServer();
    }
  }

  startProductionServer() {
    return new Promise((resolve, reject) => {
      const express = require('express');
      const serveStatic = require('serve-static');
      const server = express();
      
      // Serve static files from dist directory
      const distPath = path.join(__dirname, '../dist');
      server.use(serveStatic(distPath, {
        index: ['index.html']
      }));
      
      // Fallback to index.html for SPA routing
      server.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
      
      const port = 18081; // Different port to avoid conflicts
      server.listen(port, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`🚀 Production server running on http://localhost:${port}`);
          resolve(`http://localhost:${port}`);
        }
      });
    });
  }

  async launch() {
    try {
      const serverUrl = await this.startServer();
      console.log(`📡 Server ready at: ${serverUrl}`);
      
      // Import and start the main Electron process
      require('./main.js');
      
      return serverUrl;
    } catch (error) {
      console.error('❌ Failed to launch app:', error);
      app.quit();
    }
  }
}

// Auto-launch when this file is run directly
if (require.main === module) {
  const launcher = new AppLauncher();
  launcher.launch();
}

module.exports = AppLauncher;