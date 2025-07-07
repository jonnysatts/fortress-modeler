import React from 'react';
import { SimpleErrorBoundary } from '@/components/SimpleErrorBoundary';
import EnhancedDashboard from './EnhancedDashboard';
import Dashboard from './Dashboard';
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

function DashboardErrorFallback({error, retry}: {error?: Error, retry: () => void}) {
  console.error('Dashboard Error Boundary caught:', error);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-fortress-blue">Dashboard</h1>
      </div>
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-red-800">Enhanced Dashboard Error</h4>
              <p className="text-sm text-red-700 mt-1">
                The new dashboard encountered an error. You can try refreshing or use the basic dashboard below.
              </p>
              <div className="flex gap-2 mt-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={retry}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
              {process.env.NODE_ENV === 'development' && error && (
                <details className="mt-3">
                  <summary className="text-xs text-red-600 cursor-pointer">Error Details (Dev)</summary>
                  <pre className="text-xs text-red-600 mt-1 overflow-auto max-h-32">
                    {error.message}
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Fallback to basic dashboard */}
      <div className="border-t pt-6">
        <h2 className="text-xl font-semibold mb-4">Basic Dashboard (Fallback)</h2>
        <Dashboard />
      </div>
    </div>
  );
}

const SafeDashboard = () => {
  return (
    <SimpleErrorBoundary fallback={DashboardErrorFallback}>
      <EnhancedDashboard />
    </SimpleErrorBoundary>
  );
};

export default SafeDashboard;