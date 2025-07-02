#!/usr/bin/env node

/**
 * Port Finder Script
 * 
 * This script finds an available port and sets it as an environment variable
 */

const net = require('net');

const PREFERRED_PORTS = [8081, 3000, 5173, 8080, 4000, 9000, 9999];

function isPortAvailable(port) {
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

async function findAvailablePort() {
  console.log('🔍 Searching for available port...');
  
  for (const port of PREFERRED_PORTS) {
    console.log(`   Testing port ${port}...`);
    
    if (await isPortAvailable(port)) {
      console.log(`✅ Found available port: ${port}`);
      
      if (port !== 8081) {
        console.log('⚠️  Note: OAuth authentication requires port 8081');
        console.log(`   Your app will run on port ${port} but OAuth may not work`);
      }
      
      // Set environment variable for the dev script
      process.env.PORT = port;
      return port;
    } else {
      console.log(`❌ Port ${port} is busy`);
    }
  }
  
  console.log('❌ No available ports found in the preferred range');
  console.log('💡 Try running: taskkill /F /IM node.exe');
  process.exit(1);
}

// Run if called directly
if (require.main === module) {
  findAvailablePort().then(port => {
    console.log(`🚀 Ready to start on port ${port}`);
  }).catch(error => {
    console.error('❌ Error finding available port:', error);
    process.exit(1);
  });
}

module.exports = { findAvailablePort, isPortAvailable };