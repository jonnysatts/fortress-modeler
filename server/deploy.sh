#!/bin/bash
set -e

echo "🚀 Deploying Fortress Modeler API to Google Cloud"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - can be overridden by environment variables
PROJECT_ID="${GCP_PROJECT_ID:-yield-dashboard}"
SERVICE_NAME="${SERVICE_NAME:-fortress-modeler-backend}"
REGION="${GCP_REGION:-australia-southeast2}"

# Validate required configuration
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ PROJECT_ID not set. Use GCP_PROJECT_ID environment variable or set in script${NC}"
    exit 1
fi

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Google Cloud CLI not found${NC}"
    echo "Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if logged in to gcloud
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}⚠️  Not logged in to gcloud${NC}"
    echo "Please run: gcloud auth login"
    exit 1
fi

# Set the project
echo -e "${BLUE}🔧 Setting project to ${PROJECT_ID}${NC}"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo -e "${BLUE}🔧 Enabling required APIs${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build and deploy using Cloud Build
echo -e "${BLUE}🏗️  Building and deploying with Cloud Build${NC}"
gcloud builds submit --config cloudbuild.yaml .

# Get the deployed service URL
echo -e "${BLUE}📡 Getting service URL${NC}"
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')

if [ -n "$SERVICE_URL" ]; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo ""
    echo -e "${GREEN}🌐 Service URL: ${SERVICE_URL}${NC}"
    echo ""
    echo "📋 Next steps:"
    echo "1. Update Google OAuth with callback URL: ${SERVICE_URL}/api/auth/google/callback"
    echo "2. Test the health endpoint: ${SERVICE_URL}/health"
    echo "3. Update your React app with API URL: ${SERVICE_URL}"
    echo ""
    echo "🧪 Test commands:"
    echo "curl ${SERVICE_URL}/health"
    echo "curl ${SERVICE_URL}/health/detailed"
    echo ""
    
    # Test the health endpoint
    echo -e "${BLUE}🧪 Testing health endpoint${NC}"
    if curl -s "${SERVICE_URL}/health" | grep -q "ok"; then
        echo -e "${GREEN}✅ Health check passed${NC}"
    else
        echo -e "${RED}❌ Health check failed${NC}"
    fi
    
else
    echo -e "${RED}❌ Deployment failed or service URL not found${NC}"
    echo "Check the build logs above for errors"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Fortress Modeler API deployed successfully!${NC}"
echo -e "${BLUE}📚 View logs: gcloud logs read --service=$SERVICE_NAME --region=$REGION${NC}"
echo -e "${BLUE}🔧 Manage service: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME${NC}"