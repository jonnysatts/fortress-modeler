/**
 * Performance Monitoring Utilities
 *
 * This module provides utilities for monitoring and profiling application performance.
 */

import { perfLog, devLog } from './logUtils';
import { useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';

// Store for performance metrics
interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

// Performance metrics store
const metrics: PerformanceMetric[] = [];

// Maximum number of metrics to store
const MAX_METRICS = 100;

/**
 * Start measuring a performance metric
 *
 * @param name The name of the metric
 * @param metadata Additional metadata about the operation
 * @returns A unique identifier for the metric
 */
export function startMeasure(name: string, metadata?: Record<string, any>): number {
  const startTime = performance.now();

  // Add to metrics store
  const metricId = metrics.length;
  metrics.push({
    name,
    startTime,
    metadata
  });

  // Trim metrics if needed
  if (metrics.length > MAX_METRICS) {
    metrics.shift();
  }

  return metricId;
}

/**
 * End measuring a performance metric
 *
 * @param metricId The identifier returned by startMeasure
 * @param additionalMetadata Additional metadata to add to the metric
 * @returns The duration of the operation in milliseconds
 */
export function endMeasure(metricId: number, additionalMetadata?: Record<string, any>): number | undefined {
  const metric = metrics[metricId];
  if (!metric) return undefined;

  const endTime = performance.now();
  const duration = endTime - metric.startTime;

  // Update metric
  metric.endTime = endTime;
  metric.duration = duration;

  if (additionalMetadata) {
    metric.metadata = {
      ...metric.metadata,
      ...additionalMetadata
    };
  }

  return duration;
}

/**
 * Measure the execution time of a function
 *
 * @param name The name of the metric
 * @param fn The function to measure
 * @param metadata Additional metadata about the operation
 * @returns The result of the function
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const metricId = startMeasure(name, metadata);

  try {
    const result = await fn();
    endMeasure(metricId);
    return result;
  } catch (error) {
    endMeasure(metricId, { error: true });
    throw error;
  }
}

/**
 * Measure the execution time of a synchronous function
 *
 * @param name The name of the metric
 * @param fn The function to measure
 * @param metadata Additional metadata about the operation
 * @returns The result of the function
 */
export function measure<T>(
  name: string,
  fn: () => T,
  metadata?: Record<string, any>
): T {
  const metricId = startMeasure(name, metadata);

  try {
    const result = fn();
    endMeasure(metricId);
    return result;
  } catch (error) {
    endMeasure(metricId, { error: true });
    throw error;
  }
}

/**
 * Get all performance metrics
 *
 * @returns A copy of all metrics
 */
export function getMetrics(): PerformanceMetric[] {
  return [...metrics];
}

/**
 * Clear all performance metrics
 */
export function clearMetrics(): void {
  metrics.length = 0;
}

/**
 * Log all performance metrics
 */
export function logMetrics(): void {
  devLog('Performance Metrics:', metrics);
}

/**
 * Create a higher-order component that measures the render time of a component
 *
 * @param Component The component to measure
 * @param name The name of the metric (defaults to component display name)
 * @returns A wrapped component that measures render time
 */
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  name?: string
): React.FC<P> {
  const displayName = name || Component.displayName || Component.name || 'UnknownComponent';

  const WrappedComponent: React.FC<P> = (props) => {
    const metricId = startMeasure(`Render:${displayName}`);

    // Use React's useEffect to measure when the component has rendered
    React.useEffect(() => {
      endMeasure(metricId);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `WithPerformanceTracking(${displayName})`;

  return WrappedComponent;
}

/**
 * Hook to measure component render time
 *
 * @param componentName The name of the component
 * @returns Nothing
 */
export function useRenderPerformance(componentName: string): void {
  const metricIdRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (metricIdRef.current !== null) {
      endMeasure(metricIdRef.current);
      metricIdRef.current = null;
    }
  });

  React.useLayoutEffect(() => {
    metricIdRef.current = startMeasure(`Render:${componentName}`);

    return () => {
      if (metricIdRef.current !== null) {
        endMeasure(metricIdRef.current);
        metricIdRef.current = null;
      }
    };
  }, [componentName]);
}

/**
 * Hook to measure the execution time of a function that depends on certain inputs
 *
 * @param name The name of the metric
 * @param fn The function to measure
 * @param deps The dependencies of the function
 * @returns The result of the function
 */
export function useMeasuredMemo<T>(
  name: string,
  fn: () => T,
  deps: React.DependencyList
): T {
  return React.useMemo(() => {
    return measure(name, fn);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Hook to measure the execution time of a callback function
 *
 * @param name The name of the metric
 * @param fn The function to measure
 * @param deps The dependencies of the function
 * @returns The measured callback function
 */
export function useMeasuredCallback<T extends (...args: any[]) => any>(
  name: string,
  fn: T,
  deps: React.DependencyList
): T {
  return React.useCallback((...args: any[]) => {
    return measure(name, () => fn(...args));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// Export React hooks
export const React = {
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  useCallback
};
