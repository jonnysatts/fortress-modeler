#!/bin/bash

echo "🔧 Enabling required Google Cloud APIs"
echo "====================================="

# Enable all required APIs
echo "Enabling Cloud Build API..."
gcloud services enable cloudbuild.googleapis.com --project=yield-dashboard

echo "Enabling Cloud Run API..."
gcloud services enable run.googleapis.com --project=yield-dashboard

echo "Enabling Container Registry API..."
gcloud services enable containerregistry.googleapis.com --project=yield-dashboard

echo "Enabling Cloud SQL API..."
gcloud services enable sqladmin.googleapis.com --project=yield-dashboard

echo ""
echo "✅ All APIs enabled!"

# Get project number and set up Cloud Build permissions
echo "Setting up Cloud Build permissions..."
PROJECT_NUMBER=$(gcloud projects describe yield-dashboard --format="value(projectNumber)")

echo "Granting Cloud Run admin role to Cloud Build..."
gcloud projects add-iam-policy-binding yield-dashboard \
    --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
    --role="roles/run.admin"

echo "Granting service account user role to Cloud Build..."
gcloud projects add-iam-policy-binding yield-dashboard \
    --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"

echo ""
echo "✅ Cloud Build permissions configured!"
echo ""
echo "Now you can run: ./deploy.sh"