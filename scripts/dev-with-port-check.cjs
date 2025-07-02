#!/usr/bin/env node

/**
 * Enhanced Dev Script with Port 8081 Checking and Browser Opening
 * 
 * This script ensures port 8081 is available before starting the dev server
 */

const { spawn, exec } = require('child_process');
const net = require('net');
const open = require('open');

async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, (err) => {
      if (err) {
        resolve(false);
      } else {
        server.close(() => {
          resolve(true);
        });
      }
    });
    server.on('error', () => {
      resolve(false);
    });
  });
}

async function killProcessOnPort(port) {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
        if (stdout) {
          const lines = stdout.trim().split('\n');
          const pids = lines.map(line => {
            const parts = line.trim().split(/\s+/);
            return parts[parts.length - 1];
          }).filter(pid => pid && !isNaN(pid));
          
          if (pids.length > 0) {
            exec(`taskkill /F ${pids.map(pid => `/PID ${pid}`).join(' ')}`, (killError) => {
              console.log(`✅ Killed processes on port ${port}:`, pids);
              resolve(true);
            });
          } else {
            resolve(false);
          }
        } else {
          resolve(false);
        }
      });
    } else {
      // macOS/Linux
      exec(`lsof -ti:${port}`, (error, stdout) => {
        if (stdout) {
          const pids = stdout.trim().split('\n').filter(pid => pid);
          if (pids.length > 0) {
            exec(`kill -9 ${pids.join(' ')}`, (killError) => {
              console.log(`✅ Killed processes on port ${port}:`, pids);
              resolve(true);
            });
          } else {
            resolve(false);
          }
        } else {
          resolve(false);
        }
      });
    }
  });
}

async function ensurePort8081() {
  console.log('🔍 Checking if port 8081 is available...');
  
  if (await isPortAvailable(8081)) {
    console.log('✅ Port 8081 is available');
    return true;
  }
  
  console.log('❌ Port 8081 is in use, attempting to free it...');
  console.log('🔧 Killing processes using port 8081...');
  
  const killed = await killProcessOnPort(8081);
  
  // Wait a moment for processes to close
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  if (await isPortAvailable(8081)) {
    console.log('✅ Successfully freed port 8081');
    return true;
  } else {
    console.log('❌ Failed to free port 8081');
    console.log('');
    console.log('💡 Try these solutions:');
    console.log('   1. Run: fix-port-8081.bat');
    console.log('   2. Restart your computer');
    console.log('   3. Check what\'s using port 8081: netstat -ano | findstr :8081');
    console.log('');
    return false;
  }
}

async function startDevServer() {
  console.log('🚀 Starting Fortress Financial Modeler development server...');
  console.log('');
  
  // Ensure port 8081 is available
  const portReady = await ensurePort8081();
  
  if (!portReady) {
    console.log('⚠️  Warning: Port 8081 may not be available');
    console.log('   OAuth authentication may not work correctly');
    console.log('');
  }
  
  console.log('🌐 Starting Vite dev server on port 8081...');
  
  // Start the Vite dev server directly
  const viteProcess = spawn('npx', ['vite', '--port', '8081', '--host', '::'], {
    stdio: 'inherit',
    shell: true
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\\n🛑 Shutting down dev server...');
    viteProcess.kill();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    viteProcess.kill();
    process.exit(0);
  });
  
  viteProcess.on('close', (code) => {
    console.log(`Dev server exited with code ${code}`);
    process.exit(code);
  });
  
  // Wait a moment for the server to start, then try to open browser
  setTimeout(async () => {
    if (await isPortAvailable(8081)) {
      console.log('⚠️  Server may not have started yet, waiting...');
    } else {
      console.log('🌐 Opening browser at http://localhost:8081');
      try {
        await open('http://localhost:8081');
      } catch (error) {
        console.log('❌ Could not open browser automatically');
        console.log('   Please manually open: http://localhost:8081');
      }
    }
  }, 3000);
}

// Run if called directly
if (require.main === module) {
  startDevServer().catch(error => {
    console.error('❌ Error starting dev server:', error);
    process.exit(1);
  });
}

module.exports = { ensurePort8081, startDevServer };