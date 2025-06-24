#!/bin/bash

echo "🔧 Updating CORS configuration for production deployment"
echo "======================================================="

# This script will be run after getting the Cloud Run URL
# Usage: ./update-cors.sh https://your-cloud-run-url.run.app

if [ -z "$1" ]; then
    echo "Usage: $0 <cloud-run-url>"
    echo "Example: $0 https://fortress-modeler-api-xyz.run.app"
    exit 1
fi

API_URL=$1
FRONTEND_URL="https://fortress-modeler.vercel.app"  # Will be updated with actual Vercel URL

echo "API URL: $API_URL"
echo "Frontend URL: $FRONTEND_URL"

# Update the source code CORS configuration
sed -i.bak "s|CLIENT_URL \|\| 'http://localhost:5173'|process.env.CLIENT_URL \|\| '$FRONTEND_URL'|g" src/index.ts

# Update environment files
echo "CLIENT_URL=$FRONTEND_URL" >> .env.production
echo "API_URL=$API_URL" >> .env.production

echo "✅ CORS configuration updated"
echo ""
echo "📋 Next steps:"
echo "1. Add this to Google OAuth authorized redirect URIs:"
echo "   $FRONTEND_URL/auth/callback"
echo ""
echo "2. Add this to your React app environment:"
echo "   REACT_APP_API_URL=$API_URL"
echo ""
echo "3. Redeploy with updated CORS:"
echo "   ./deploy.sh"