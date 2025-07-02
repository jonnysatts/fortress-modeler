#!/bin/bash

echo ""
echo "Fortress Financial Modeler - Environment Configuration"
echo "======================================================"
echo ""
echo "This script will create your .env file with the correct credentials."
echo ""

# Check if .env already exists
if [ -f ".env" ]; then
    echo ".env file already exists."
    read -p "Do you want to overwrite it? (y/N): " overwrite
    if [[ ! "$overwrite" =~ ^[Yy]$ ]]; then
        echo "Keeping existing .env file."
        exit 0
    fi
fi

echo ""
echo "Please enter your Supabase credentials:"
echo "(You can find these in your Supabase Dashboard > Settings > API)"
echo ""

# Get Supabase URL
read -p "Supabase URL (e.g., https://xxx.supabase.co): " SUPABASE_URL
if [ -z "$SUPABASE_URL" ]; then
    echo "ERROR: Supabase URL is required"
    exit 1
fi

# Get Supabase Anon Key
read -p "Supabase Anon Key: " SUPABASE_KEY
if [ -z "$SUPABASE_KEY" ]; then
    echo "ERROR: Supabase Anon Key is required"
    exit 1
fi

# Get Google Client ID (optional)
echo ""
read -p "Google Client ID (optional, press Enter to skip): " GOOGLE_CLIENT_ID

# Choose backend mode
echo ""
echo "Backend Mode:"
echo "1. Cloud Mode (recommended) - Use Supabase for data storage"
echo "2. Local Mode - Use browser storage only"
echo ""
read -p "Choose mode (1 or 2): " mode_choice

if [ "$mode_choice" = "2" ]; then
    BACKEND_MODE="false"
    echo "Selected: Local Mode"
else
    BACKEND_MODE="true"
    echo "Selected: Cloud Mode"
fi

# Create .env file
echo ""
echo "Creating .env file..."

cat > .env << EOF
# Fortress Financial Modeler - Environment Configuration
# Generated automatically on $(date)

# Supabase Configuration
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_KEY

# Backend Mode
VITE_USE_SUPABASE_BACKEND=$BACKEND_MODE

# OAuth Configuration (optional)
${GOOGLE_CLIENT_ID:+VITE_GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID}

# Debug Mode (optional)
VITE_DEBUG=false
EOF

echo "SUCCESS: .env file created successfully!"
echo ""
echo "Configuration:"
echo "  Supabase URL: $SUPABASE_URL"
echo "  Backend Mode: $BACKEND_MODE"
if [ -n "$GOOGLE_CLIENT_ID" ]; then
    echo "  Google OAuth: Configured"
fi

echo ""
echo "You can now start the application with: npm run dev"
echo ""