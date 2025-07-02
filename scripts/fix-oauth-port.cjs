#!/usr/bin/env node

/**
 * OAuth Port Configuration Fixer
 * 
 * This script updates the OAuth redirect URLs when using a different port than 8081
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('❌ Error: Please specify a port number');
  console.log('Usage: node scripts/fix-oauth-port.js [PORT]');
  console.log('Example: node scripts/fix-oauth-port.js 3000');
  process.exit(1);
}

const newPort = args[0];
const configPath = path.join(__dirname, '../src/config/app.config.ts');

console.log(`🔧 Updating OAuth configuration for port ${newPort}...`);

try {
  // Read the current config
  let configContent = fs.readFileSync(configPath, 'utf8');
  
  // Update the port references in comments
  configContent = configContent.replace(
    /port: 8081/g,
    `port: ${newPort}`
  );
  
  // Write back the updated config
  fs.writeFileSync(configPath, configContent);
  
  console.log('✅ Configuration updated successfully!');
  console.log('');
  console.log('⚠️  IMPORTANT OAuth Note:');
  console.log(`   Your app is now running on port ${newPort}`);
  
  if (newPort !== '8081') {
    console.log('   🔒 OAuth authentication may not work correctly');
    console.log('   📝 To fix OAuth, you need to:');
    console.log(`   1. Update your Google OAuth settings to allow http://localhost:${newPort}`);
    console.log(`   2. Or run the app on port 8081 for OAuth to work`);
    console.log('');
    console.log('   🔄 To revert to port 8081:');
    console.log('   node scripts/fix-oauth-port.js 8081');
  } else {
    console.log('   ✅ OAuth should work correctly on port 8081');
  }
  
} catch (error) {
  console.error('❌ Error updating configuration:', error.message);
  process.exit(1);
}