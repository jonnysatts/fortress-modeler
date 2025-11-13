#!/usr/bin/env node

/**
 * Fortress Financial Modeler - Requirements Verification Script
 * Checks if all system requirements are met before running the application
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🏰 Fortress Financial Modeler - Requirements Check');
console.log('='.repeat(50));

let hasErrors = false;
let hasWarnings = false;

function checkCommand(command, description, required = true) {
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    console.log(`✅ ${description}: ${output.trim()}`);
    return true;
  } catch (error) {
    if (required) {
      console.log(`❌ ${description}: Not found or not working`);
      hasErrors = true;
    } else {
      console.log(`⚠️  ${description}: Not found (optional)`);
      hasWarnings = true;
    }
    return false;
  }
}

function checkFile(filePath, description, required = true) {
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${description}: Found`);
    return true;
  } else {
    if (required) {
      console.log(`❌ ${description}: Missing`);
      hasErrors = true;
    } else {
      console.log(`⚠️  ${description}: Missing (optional)`);
      hasWarnings = true;
    }
    return false;
  }
}

function checkNodeVersion() {
  try {
    const version = execSync('node --version', { encoding: 'utf8' }).trim();
    const majorVersion = parseInt(version.replace('v', '').split('.')[0]);
    
    if (majorVersion >= 18) {
      console.log(`✅ Node.js version: ${version} (meets requirement: v18+)`);
      return true;
    } else {
      console.log(`❌ Node.js version: ${version} (requires v18+)`);
      hasErrors = true;
      return false;
    }
  } catch (error) {
    console.log(`❌ Node.js: Not found`);
    hasErrors = true;
    return false;
  }
}

function checkPort8081() {
  try {
    // Check if port 8081 is available (basic check)
    const { createServer } = require('net');
    const server = createServer();
    
    return new Promise((resolve) => {
      server.listen(8081, () => {
        console.log('✅ Port 8081: Available');
        server.close();
        resolve(true);
      });
      
      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log('⚠️  Port 8081: In use (may need to stop other services)');
          hasWarnings = true;
        } else {
          console.log('❌ Port 8081: Cannot access');
          hasErrors = true;
        }
        resolve(false);
      });
    });
  } catch (error) {
    console.log('❌ Port 8081: Cannot check');
    hasErrors = true;
    return false;
  }
}

function checkEnvironmentFile() {
  const envExists = fs.existsSync('.env');
  const envExampleExists = fs.existsSync('.env.example');
  
  if (envExists) {
    console.log('✅ Environment file: .env found');
    
    // Check if required variables are set
    const envContent = fs.readFileSync('.env', 'utf8');
    const requiredVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
      'VITE_USE_SUPABASE_BACKEND'
    ];
    
    const missingVars = requiredVars.filter(varName => 
      !envContent.includes(varName) || 
      envContent.includes(`${varName}=your-`) ||
      envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=true`) && !envContent.includes(`${varName}=false`)
    );
    
    if (missingVars.length > 0) {
      console.log(`⚠️  Environment variables: Missing or not configured: ${missingVars.join(', ')}`);
      hasWarnings = true;
    } else {
      console.log('✅ Environment variables: All required variables configured');
    }
    
    return true;
  } else {
    if (envExampleExists) {
      console.log('⚠️  Environment file: .env missing, but .env.example found');
      console.log('   → Copy .env.example to .env and configure your credentials');
      hasWarnings = true;
    } else {
      console.log('❌ Environment file: .env and .env.example both missing');
      hasErrors = true;
    }
    return false;
  }
}

function checkDependencies() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.log('❌ Package.json: Missing');
    hasErrors = true;
    return false;
  }
  
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('❌ Dependencies: node_modules missing - run "npm install"');
    hasErrors = true;
    return false;
  }
  
  // Check for key dependencies
  const keyDeps = [
    'react',
    'vite',
    '@supabase/supabase-js',
    'dexie',
    'recharts',
    '@tanstack/react-query'
  ];
  
  const missingDeps = keyDeps.filter(dep => 
    !fs.existsSync(path.join(nodeModulesPath, dep))
  );
  
  if (missingDeps.length > 0) {
    console.log(`❌ Dependencies: Missing key packages: ${missingDeps.join(', ')}`);
    console.log('   → Run "npm install" to install missing dependencies');
    hasErrors = true;
    return false;
  }
  
  console.log('✅ Dependencies: All key packages installed');
  return true;
}

async function runChecks() {
  console.log('\n📋 System Requirements:');
  console.log('-'.repeat(30));
  
  // Check system requirements
  checkNodeVersion();
  checkCommand('npm --version', 'npm');
  checkCommand('git --version', 'Git');
  
  console.log('\n📦 Project Requirements:');
  console.log('-'.repeat(30));
  
  // Check project files
  checkFile('package.json', 'Package.json');
  checkFile('vite.config.ts', 'Vite configuration');
  checkDependencies();
  checkEnvironmentFile();
  
  console.log('\n🌐 Network Requirements:');
  console.log('-'.repeat(30));
  
  // Check network requirements
  await checkPort8081();
  
  console.log('\n📖 Documentation:');
  console.log('-'.repeat(30));
  
  // Check documentation
  checkFile('README.md', 'README.md', false);
  checkFile('INSTALLATION_GUIDE.md', 'Installation Guide', false);
  checkFile('REQUIREMENTS.md', 'Requirements Document', false);
  
  // Summary
  console.log('\n' + '='.repeat(50));
  
  if (hasErrors) {
    console.log('❌ FAILED: Some requirements are not met');
    console.log('   → Fix the errors above before running the application');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('⚠️  WARNINGS: Some optional requirements missing');
    console.log('   → The application should work, but check warnings above');
    console.log('✅ Ready to run: npm run dev');
  } else {
    console.log('✅ SUCCESS: All requirements met');
    console.log('🚀 Ready to run: npm run dev');
  }
}

// Run the checks
runChecks().catch(error => {
  console.error('Error running requirements check:', error);
  process.exit(1);
});