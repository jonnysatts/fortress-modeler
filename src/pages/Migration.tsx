import React from 'react';
import { MigrationWizard } from '@/components/migration/MigrationWizard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, ArrowRight, Shield, Zap } from 'lucide-react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

export default function Migration() {
  const { isAuthenticated, isLoading, login } = useSupabaseAuth();

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2 text-3xl font-bold">
          <Database className="h-8 w-8 text-blue-600" />
          <span>Fortress Modeler Migration</span>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Seamlessly migrate your local data to Supabase cloud storage with enhanced features and real-time collaboration.
        </p>
      </div>

      {/* Benefits */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Cloud Backup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your data is automatically backed up and synced across devices. Never lose your work again.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-600" />
              Real-time Collaboration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Work together with your team in real-time. See live presence and changes as they happen.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-blue-600" />
              Enhanced Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Cloud-optimized storage with advanced querying and analytics capabilities.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sign In Section - Always show if not authenticated */}
      {!isAuthenticated && (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Sign In Required</CardTitle>
            <CardDescription className="text-center">
              Please sign in with Google to access the migration wizard
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <button
              onClick={login}
              disabled={isLoading}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : '🔑 Sign in with Google'}
            </button>
          </CardContent>
        </Card>
      )}
      
      {/* Migration Wizard - Temporarily disabled due to service dependencies */}
      {isAuthenticated && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Migration Wizard</CardTitle>
            <CardDescription className="text-center">
              Migration functionality is temporarily under maintenance
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              The migration wizard is being updated to work with the new architecture. 
              Please check back soon.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}