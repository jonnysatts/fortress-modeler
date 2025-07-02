#!/usr/bin/env node

/**
 * Icon Creation Script
 * 
 * This script creates placeholder icons for the Electron app.
 * Replace this with your actual logo/branding.
 */

const fs = require('fs');
const path = require('path');

// Create a simple SVG icon as placeholder
const svgIcon = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background circle -->
  <circle cx="256" cy="256" r="240" fill="url(#grad1)" stroke="#1F2937" stroke-width="8"/>
  
  <!-- Castle/Fortress icon -->
  <g fill="white" stroke="#1F2937" stroke-width="3">
    <!-- Main castle body -->
    <rect x="150" y="200" width="212" height="200" />
    
    <!-- Castle towers -->
    <rect x="120" y="150" width="60" height="250" />
    <rect x="332" y="150" width="60" height="250" />
    
    <!-- Castle gate -->
    <rect x="220" y="300" width="72" height="100" fill="#1F2937" />
    
    <!-- Tower tops -->
    <polygon points="135,150 150,120 165,150" />
    <polygon points="347,150 362,120 377,150" />
    
    <!-- Windows -->
    <rect x="200" y="220" width="20" height="30" fill="#1F2937" />
    <rect x="292" y="220" width="20" height="30" fill="#1F2937" />
    <rect x="140" y="200" width="15" height="20" fill="#1F2937" />
    <rect x="357" y="200" width="15" height="20" fill="#1F2937" />
  </g>
  
  <!-- Text -->
  <text x="256" y="450" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="white">FORTRESS</text>
</svg>`;

const iconsDir = path.join(__dirname, '../electron/assets');

// Ensure directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Write SVG file
fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgIcon);

console.log('📦 Placeholder icons created!');
console.log('📍 Location: electron/assets/');
console.log('');
console.log('ℹ️  These are placeholder icons. For production:');
console.log('   1. Create a 1024x1024 PNG logo');
console.log('   2. Convert to ICO format: https://convertico.com/');
console.log('   3. Replace electron/assets/icon.ico');
console.log('   4. Replace electron/assets/icon.png');
console.log('');

// Create a simple README for icon requirements
const iconReadme = `# App Icons

## Current Status: PLACEHOLDER ICONS

⚠️  **Important**: These are placeholder icons created by the build script.

## For Production Deployment:

1. **Create your logo** (1024x1024 px, transparent background)
2. **Convert to required formats**:
   - icon.png (512x512 for Linux/development)
   - icon.ico (Windows - multiple sizes: 16,32,48,64,128,256px)
   - icon.icns (macOS - if needed)

## Conversion Tools:
- PNG to ICO: https://convertico.com/
- PNG to ICNS: https://cloudconvert.com/png-to-icns

## Icon Requirements:
- **Simple design** that works at small sizes (16x16px)
- **High contrast** for visibility
- **Square aspect ratio**
- **Professional appearance**

Replace these files before building the final installer.
`;

fs.writeFileSync(path.join(iconsDir, 'ICONS_README.md'), iconReadme);