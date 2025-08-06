#!/bin/bash

# Fortress OAuth Configuration Checker
echo "🔍 Fortress OAuth Configuration Diagnostic"
echo "=========================================="
echo ""

# Check environment files
echo "📁 Environment Files:"
if [ -f ".env" ]; then
    echo "✅ .env exists"
    echo "   Checking for Google Client ID..."
    if grep -q "VITE_GOOGLE_CLIENT_ID=" .env && ! grep -q "VITE_GOOGLE_CLIENT_ID=your-google" .env && ! grep -q "#.*VITE_GOOGLE_CLIENT_ID=" .env; then
        echo "   ✅ Google Client ID is configured"
    else
        echo "   ⚠️  Google Client ID is NOT configured or is commented out"
        echo "   ACTION: Add your Google Client ID to .env file"
    fi
else
    echo "❌ .env file missing"
    echo "   ACTION: Copy .env.example to .env and configure"
fi

echo ""
echo "📦 Supabase Configuration:"
if [ -f ".env" ]; then
    SUPABASE_URL=$(grep "VITE_SUPABASE_URL=" .env | cut -d'=' -f2)
    if [ ! -z "$SUPABASE_URL" ]; then
        echo "✅ Supabase URL: $SUPABASE_URL"
        
        # Extract project ID from URL
        PROJECT_ID=$(echo $SUPABASE_URL | sed 's/https:\/\/\(.*\)\.supabase\.co/\1/')
        echo "   Project ID: $PROJECT_ID"
        echo ""
        echo "🔗 Important URLs to configure in Supabase Dashboard:"
        echo "   1. Go to: https://app.supabase.com/project/$PROJECT_ID/auth/providers"
        echo "   2. Enable Google provider"
        echo "   3. Add these redirect URLs:"
        echo "      - http://localhost:8081/login"
        echo "      - http://localhost:8081/auth/callback"
        echo "      - https://$PROJECT_ID.supabase.co/auth/v1/callback"
        
        if [ -f "netlify.toml" ]; then
            echo "      - https://YOUR-APP.netlify.app/login"
            echo "      - https://YOUR-APP.netlify.app/auth/callback"
        fi
    fi
fi

echo ""
echo "🔍 Code Configuration Check:"
if [ -f "src/config/app.config.ts" ]; then
    CONFIG_URL=$(grep "url:" src/config/app.config.ts | head -1 | sed "s/.*'\(.*\)'.*/\1/")
    ENV_URL=$(grep "VITE_SUPABASE_URL=" .env 2>/dev/null | cut -d'=' -f2)
    
    if [ "$CONFIG_URL" = "$ENV_URL" ]; then
        echo "✅ app.config.ts and .env use the same Supabase project"
    else
        echo "❌ MISMATCH: app.config.ts and .env use different Supabase projects!"
        echo "   app.config.ts: $CONFIG_URL"
        echo "   .env: $ENV_URL"
        echo "   ACTION: Ensure both files use the same Supabase URL"
    fi
fi

echo ""
echo "📋 Next Steps:"
echo "1. Configure Google OAuth in Google Cloud Console:"
echo "   - Go to https://console.cloud.google.com/"
echo "   - Create OAuth 2.0 Client ID"
echo "   - Add authorized redirect URIs listed above"
echo ""
echo "2. Add Google credentials to Supabase:"
echo "   - Copy Client ID and Secret from Google"
echo "   - Paste in Supabase Auth Providers settings"
echo ""
echo "3. Update .env file:"
echo "   - Add VITE_GOOGLE_CLIENT_ID=your-client-id"
echo ""
echo "4. Test locally:"
echo "   - npm run dev"
echo "   - Try Google login at http://localhost:8081"
echo ""
echo "=========================================="
