#!/bin/bash

# Fortress Modeler - One-Click Launch Script for Linux/Unix
# Make executable with: chmod +x launch-fortress.sh
# Then double-click or run: ./launch-fortress.sh

echo "🏰 Starting Fortress Financial Modeler..."
echo "================================================"

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Change to the project directory (parent of scripts directory)
cd "$SCRIPT_DIR/.."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    echo "Or install via package manager:"
    echo "  Ubuntu/Debian: sudo apt install nodejs npm"
    echo "  CentOS/RHEL: sudo yum install nodejs npm"
    echo "  Arch: sudo pacman -S nodejs npm"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    echo ""
    read -p "Press Enter to exit..."
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

# Try to open browser automatically
if command -v xdg-open &> /dev/null; then
    # Linux
    sleep 3 && xdg-open http://localhost:8080 &
elif command -v open &> /dev/null; then
    # macOS (backup)
    sleep 3 && open http://localhost:8080 &
fi

# Start the development server
npm run dev

# Keep terminal open if there's an error
echo ""
read -p "Press Enter to exit..."