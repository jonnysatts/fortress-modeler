import { useEffect, useState } from 'react';
import { performanceMonitor } from '@/lib/performance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Clock, Database, RefreshCw, Trash2 } from 'lucide-react';

/**
 * Performance Monitor Component
 * Displays real-time performance metrics in development mode
 */
export const PerformanceMonitorWidget = () => {
  const [metrics, setMetrics] = useState<ReturnType<typeof performanceMonitor.getReport>>({
    metrics: [],
    summary: { avgDuration: 0, maxDuration: 0, minDuration: 0, count: 0 }
  });
  const [isVisible, setIsVisible] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    if (isVisible) {
      // Update metrics immediately
      updateMetrics();
      
      // Set up auto-refresh every 2 seconds
      const interval = setInterval(updateMetrics, 2000);
      setRefreshInterval(interval);

      return () => {
        clearInterval(interval);
      };
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [isVisible, refreshInterval]);

  const updateMetrics = () => {
    const report = performanceMonitor.getReport();
    setMetrics(report);
  };

  const handleClear = () => {
    performanceMonitor.clear();
    updateMetrics();
  };

  const getMetricColor = (duration: number): string => {
    if (duration < 50) return 'text-green-600';
    if (duration < 200) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatMetricName = (name: string): { type: string; detail: string } => {
    const [type, ...detail] = name.split(':');
    return { type, detail: detail.join(':') };
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  // Floating button to toggle visibility
  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 bg-primary text-primary-foreground rounded-full p-3 shadow-lg hover:bg-primary/90 transition-colors"
        title="Show Performance Monitor"
      >
        <BarChart3 className="h-5 w-5" />
      </button>
    );
  }

  // Performance monitor panel
  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[600px]">
      <Card className="shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Performance Monitor
            </CardTitle>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={updateMetrics}
                title="Refresh"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={handleClear}
                title="Clear Metrics"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => setIsVisible(false)}
                title="Close"
              >
                ×
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-muted p-2 rounded">
              <div className="text-muted-foreground">Avg Duration</div>
              <div className={`font-medium ${getMetricColor(metrics.summary.avgDuration)}`}>
                {metrics.summary.avgDuration.toFixed(2)}ms
              </div>
            </div>
            <div className="bg-muted p-2 rounded">
              <div className="text-muted-foreground">Max Duration</div>
              <div className={`font-medium ${getMetricColor(metrics.summary.maxDuration)}`}>
                {metrics.summary.maxDuration.toFixed(2)}ms
              </div>
            </div>
          </div>

          {/* Recent Operations */}
          <div>
            <h4 className="text-xs font-medium mb-2">Recent Operations</h4>
            <div className="space-y-1">
              {metrics.metrics.slice(-10).reverse().map((metric, index) => {
                const { type, detail } = formatMetricName(metric.name);
                const typeIcon = type === 'db' ? <Database className="h-3 w-3" /> : <Clock className="h-3 w-3" />;
                const typeColor = type === 'db' ? 'bg-blue-100 text-blue-700' : 
                                type === 'component' ? 'bg-purple-100 text-purple-700' : 
                                'bg-gray-100 text-gray-700';
                
                return (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Badge variant="secondary" className={`${typeColor} px-1 py-0`}>
                        {typeIcon}
                      </Badge>
                      <span className="truncate">{detail}</span>
                    </div>
                    <span className={`font-mono ${getMetricColor(metric.value)}`}>
                      {metric.value.toFixed(1)}ms
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Slowest Operations */}
          {performanceMonitor.getSlowestOperations(5).length > 0 && (
            <div>
              <h4 className="text-xs font-medium mb-2">Slowest Operations</h4>
              <div className="space-y-1">
                {performanceMonitor.getSlowestOperations(5).map((metric, index) => {
                  const { type, detail } = formatMetricName(metric.name);
                  return (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="truncate">{detail}</span>
                      <span className={`font-mono ${getMetricColor(metric.value)}`}>
                        {metric.value.toFixed(1)}ms
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};