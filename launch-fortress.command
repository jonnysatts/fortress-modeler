#!/bin/bash

# Fortress Modeler - One-Click Launch Script for macOS
# Double-click this file to launch the application

echo "🏰 Starting Fortress Financial Modeler..."
echo "================================================"

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Change to the project directory
cd "$SCRIPT_DIR"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    echo "Press any key to exit..."
    read -n 1
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    echo "Press any key to exit..."
    read -n 1
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo "✅ npm found: $(npm --version)"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "🚀 Launching Fortress Financial Modeler..."
echo "The app will open in your default browser"
echo ""
echo "📍 Local URL: http://localhost:8080"
echo "🔄 Hot reload is enabled for development"
echo ""
echo "❌ To stop the server, press Ctrl+C in this terminal"
echo "================================================"
echo ""

# Start the development server
npm run dev

# Keep terminal open if there's an error
echo ""
echo "Press any key to exit..."
read -n 1