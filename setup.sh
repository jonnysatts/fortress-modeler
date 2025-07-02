#!/bin/bash

# Fortress Financial Modeler - Quick Setup Script
# This script helps set up the app on a new machine

echo "🏰 Setting up Fortress Financial Modeler..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18+ from https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js v18+ required. Current version: $(node --version)"
    echo "Please update Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not available"
    exit 1
fi

echo "✅ npm $(npm --version) detected"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo ""
    echo "⚠️  No .env file found. Creating from template..."
    cp .env.example .env
    echo "✅ Created .env file from template"
    echo ""
    echo "🔧 IMPORTANT: Edit the .env file with your actual Supabase credentials:"
    echo "   - VITE_SUPABASE_URL"
    echo "   - VITE_SUPABASE_ANON_KEY"
    echo "   - VITE_GOOGLE_CLIENT_ID (for OAuth)"
    echo ""
    echo "Make sure VITE_USE_SUPABASE_BACKEND=true for cloud mode!"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🚀 Setup complete! To start the development server:"
echo ""
echo "   npm run dev"
echo ""
echo "The app will be available at: http://localhost:8081/"
echo ""
echo "📖 See INSTALLATION_GUIDE.md for detailed setup instructions"