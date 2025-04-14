/**
 * Performance Dashboard Component
 *
 * This component displays performance metrics collected by the performance monitoring system.
 */

import React, { useState, useEffect } from 'react';
import { getMetrics, clearMetrics } from '@/lib/performanceMonitoring.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// Import recharts components directly
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PerformanceDashboardProps {
  /** Whether to auto-refresh the metrics */
  autoRefresh?: boolean;
  /** Auto-refresh interval in milliseconds */
  refreshInterval?: number;
}

/**
 * Performance Dashboard Component
 *
 * @param props Component props
 * @returns React component
 */
export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  autoRefresh = true,
  refreshInterval = 5000
}) => {
  const [metrics, setMetrics] = useState(getMetrics());
  const [activeTab, setActiveTab] = useState('table');

  // Auto-refresh metrics
  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(() => {
      setMetrics(getMetrics());
    }, refreshInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [autoRefresh, refreshInterval]);

  // Group metrics by name
  const groupedMetrics = React.useMemo(() => {
    const groups: Record<string, { count: number; totalDuration: number; avgDuration: number; maxDuration: number; minDuration: number }> = {};

    metrics.forEach(metric => {
      if (!metric.duration) return;

      if (!groups[metric.name]) {
        groups[metric.name] = {
          count: 0,
          totalDuration: 0,
          avgDuration: 0,
          maxDuration: 0,
          minDuration: Infinity
        };
      }

      const group = groups[metric.name];
      group.count++;
      group.totalDuration += metric.duration;
      group.avgDuration = group.totalDuration / group.count;
      group.maxDuration = Math.max(group.maxDuration, metric.duration);
      group.minDuration = Math.min(group.minDuration, metric.duration);
    });

    return Object.entries(groups).map(([name, stats]) => ({
      name,
      ...stats,
      minDuration: stats.minDuration === Infinity ? 0 : stats.minDuration
    }));
  }, [metrics]);

  // Prepare chart data
  const chartData = React.useMemo(() => {
    return groupedMetrics.map(group => ({
      name: group.name,
      avg: Math.round(group.avgDuration * 100) / 100,
      min: Math.round(group.minDuration * 100) / 100,
      max: Math.round(group.maxDuration * 100) / 100
    }));
  }, [groupedMetrics]);

  // Handle refresh button click
  const handleRefresh = () => {
    setMetrics(getMetrics());
  };

  // Handle clear button click
  const handleClear = () => {
    clearMetrics();
    setMetrics([]);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Performance Dashboard</CardTitle>
        <CardDescription>
          Metrics collected by the performance monitoring system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="table">Table View</TabsTrigger>
            <TabsTrigger value="chart">Chart View</TabsTrigger>
          </TabsList>

          <TabsContent value="table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operation</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Avg Duration (ms)</TableHead>
                  <TableHead className="text-right">Min Duration (ms)</TableHead>
                  <TableHead className="text-right">Max Duration (ms)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedMetrics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      No metrics collected yet
                    </TableCell>
                  </TableRow>
                ) : (
                  groupedMetrics.map(group => (
                    <TableRow key={group.name}>
                      <TableCell>{group.name}</TableCell>
                      <TableCell className="text-right">{group.count}</TableCell>
                      <TableCell className="text-right">{group.avgDuration.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{group.minDuration.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{group.maxDuration.toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="chart">
            {chartData.length === 0 ? (
              <div className="text-center p-4">
                No metrics collected yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="avg" name="Avg Duration (ms)" fill="#8884d8" />
                  <Bar dataKey="min" name="Min Duration (ms)" fill="#82ca9d" />
                  <Bar dataKey="max" name="Max Duration (ms)" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          {metrics.length} metrics collected
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClear}>
            Clear Metrics
          </Button>
          <Button onClick={handleRefresh}>
            Refresh
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default PerformanceDashboard;
