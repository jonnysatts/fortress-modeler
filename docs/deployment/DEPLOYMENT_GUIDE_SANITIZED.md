# Deployment Guide - Fortress Modeler

This guide contains the steps to deploy the Fortress Modeler application to Google Cloud.

## Prerequisites

- Google Cloud account with billing enabled
- Google Cloud CLI (`gcloud`) installed
- Docker installed (for local testing)
- Node.js 18+ installed

## Environment Variables

Create `.env` files based on the example files:
- `/server/.env.example` - Backend environment variables
- `/.env` - Frontend environment variables

### Required Environment Variables

**Backend (.env)**:
- `GOOGLE_CLIENT_ID` - Your Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Your Google OAuth client secret
- `JWT_SECRET` - A secure random string for JWT signing
- `DB_HOST` - Cloud SQL connection string
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name
- `CLIENT_URL` - Frontend URL

**Frontend (.env)**:
- `VITE_API_URL` - Backend API URL
- `VITE_GOOGLE_CLIENT_ID` - Same Google OAuth client ID

## Database Setup

1. Create a Cloud SQL PostgreSQL instance
2. Run the schema migration: `server/src/db/schema.sql`
3. Update database connection details in environment variables

## Deployment Steps

### Backend Deployment

1. Navigate to server directory: `cd server`
2. Enable required APIs: `./enable-apis.sh`
3. Set up database: `./setup-database.sh`
4. Deploy: `./deploy.sh`

### Frontend Deployment

1. Build and deploy: `gcloud builds submit --config frontend-cloudbuild.yaml .`

## Google OAuth Setup

1. Go to Google Cloud Console > APIs & Services > Credentials
2. Create OAuth 2.0 Client ID
3. Add authorized redirect URIs:
   - `https://your-backend-url/api/auth/google/callback`
   - `http://localhost:8080/api/auth/google/callback` (for local dev)
4. Update environment variables with client ID and secret

## Post-Deployment

1. Verify health endpoints:
   - Backend: `https://your-backend-url/health`
   - Frontend: Visit the deployed URL

2. Test authentication flow
3. Monitor logs in Cloud Console

## Security Notes

- Never commit `.env` files or secrets to version control
- Use Google Secret Manager for production secrets
- Enable HTTPS for all production deployments
- Regularly rotate JWT secrets and database passwords