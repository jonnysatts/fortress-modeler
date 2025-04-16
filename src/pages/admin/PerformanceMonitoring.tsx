/**
 * Performance Monitoring Page
 *
 * This page displays performance metrics and provides tools for monitoring application performance.
 */

import React from 'react';
import PerformanceDashboard from '@/components/common/PerformanceDashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { clearMetrics, logMetrics } from '@/lib/performanceMonitoring.tsx';
// import { devLog } from '@/lib/logUtils';

/**
 * Performance Monitoring Page
 *
 * @returns React component
 */
const PerformanceMonitoring: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState('dashboard');

  // Handle log metrics button click
  const handleLogMetrics = () => {
    logMetrics();
    // devLog('Metrics logged to console');
  };

  // Handle clear metrics button click
  const handleClearMetrics = () => {
    clearMetrics();
    // devLog('Metrics cleared');
  };

  return (
    <>
      <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Performance Monitoring</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleLogMetrics}>
              Log Metrics
            </Button>
            <Button variant="outline" onClick={handleClearMetrics}>
              Clear Metrics
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="info">System Info</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <PerformanceDashboard autoRefresh={true} refreshInterval={5000} />
          </TabsContent>

          <TabsContent value="info">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Browser Information</CardTitle>
                  <CardDescription>
                    Information about the current browser environment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">User Agent:</span>
                      <span className="text-muted-foreground">{navigator.userAgent}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Platform:</span>
                      <span className="text-muted-foreground">{navigator.platform}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Language:</span>
                      <span className="text-muted-foreground">{navigator.language}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Cookies Enabled:</span>
                      <span className="text-muted-foreground">{navigator.cookieEnabled ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Online:</span>
                      <span className="text-muted-foreground">{navigator.onLine ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Information</CardTitle>
                  <CardDescription>
                    Information about the current performance environment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Memory Usage:</span>
                      <span className="text-muted-foreground">
                        {(performance as any).memory ?
                          `${Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)} MB` :
                          'Not available'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Navigation Type:</span>
                      <span className="text-muted-foreground">
                        {performance.navigation ?
                          ['Navigate', 'Reload', 'Back/Forward', 'Reserved'][performance.navigation.type] :
                          'Not available'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Redirects:</span>
                      <span className="text-muted-foreground">
                        {performance.navigation ?
                          performance.navigation.redirectCount :
                          'Not available'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Service Worker:</span>
                      <span className="text-muted-foreground">
                        {navigator.serviceWorker ?
                          (navigator.serviceWorker.controller ? 'Active' : 'Inactive') :
                          'Not supported'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default PerformanceMonitoring;
