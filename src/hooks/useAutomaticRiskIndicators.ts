/**
 * Phase B2: Automatic Risk Indicators Hook
 * 
 * Integrates with Phase A analytics to automatically detect and monitor
 * financial risk indicators in real-time.
 */

import { useQuery } from '@tanstack/react-query';
import { useForecastAccuracy } from '@/hooks/useForecastAccuracy';
import { useVarianceTrends } from '@/hooks/useVarianceTrends';
import { useProjectHealth } from '@/hooks/useProjectHealth';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { 
  AutomaticRiskIndicatorService, 
  IndicatorCalculationResult 
} from '@/services/AutomaticRiskIndicatorService';
import { AutomaticIndicator } from '@/types/risk';

interface AutomaticRiskIndicatorData {
  indicators: AutomaticIndicator[];
  riskDetections: IndicatorCalculationResult[];
  alertCount: number;
  criticalAlertCount: number;
  warningAlertCount: number;
  lastCalculated: Date;
}

/**
 * Hook for calculating automatic risk indicators across the portfolio
 */
export const useAutomaticRiskIndicators = () => {
  const { data: forecastAccuracy } = useForecastAccuracy();
  const { data: varianceTrends } = useVarianceTrends();
  const { data: projectHealth } = useProjectHealth();
  const { user } = useSupabaseAuth();

  return useQuery({
    queryKey: [
      'automatic-risk-indicators',
      forecastAccuracy?.projectsAnalyzed || 0,
      varianceTrends?.varianceTrends.length || 0,
      projectHealth?.healthScores.length || 0
    ],
    queryFn: async (): Promise<AutomaticRiskIndicatorData> => {
      // Collect all unique project IDs from Phase A data
      const projectIds = new Set<string>();
      
      forecastAccuracy?.projectAccuracies.forEach(acc => projectIds.add(acc.projectId));
      varianceTrends?.varianceTrends.forEach(trend => projectIds.add(trend.projectId));
      projectHealth?.healthScores.forEach(health => projectIds.add(health.projectId));

      if (projectIds.size === 0) {
        return {
          indicators: [],
          riskDetections: [],
          alertCount: 0,
          criticalAlertCount: 0,
          warningAlertCount: 0,
          lastCalculated: new Date()
        };
      }

      const allIndicators: AutomaticIndicator[] = [];
      const allRiskDetections: IndicatorCalculationResult[] = [];

      // Process each project
      for (const projectId of projectIds) {
        // Get project-specific data
        const projectForecastAccuracy = forecastAccuracy?.projectAccuracies.filter(
          acc => acc.projectId === projectId
        );
        
        const projectVarianceTrends = varianceTrends?.varianceTrends.filter(
          trend => trend.projectId === projectId
        );
        
        const projectHealthScore = projectHealth?.healthScores.find(
          health => health.projectId === projectId
        );

        // Calculate automatic indicators for this project
        const indicatorResults = AutomaticRiskIndicatorService.calculateAutomaticIndicators(
          projectId,
          projectForecastAccuracy,
          projectVarianceTrends,
          projectHealthScore
        );

        // Collect indicators and detections
        indicatorResults.forEach(result => {
          allIndicators.push(result.indicator);
          allRiskDetections.push(result);
        });
      }

      // Calculate summary statistics
      const alertCount = allIndicators.filter(ind => 
        ind.status === 'warning' || ind.status === 'critical'
      ).length;

      const criticalAlertCount = allIndicators.filter(ind => 
        ind.status === 'critical'
      ).length;

      const warningAlertCount = allIndicators.filter(ind => 
        ind.status === 'warning'
      ).length;

      return {
        indicators: allIndicators,
        riskDetections: allRiskDetections,
        alertCount,
        criticalAlertCount,
        warningAlertCount,
        lastCalculated: new Date()
      };
    },
    enabled: !!(forecastAccuracy || varianceTrends || projectHealth),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
    retry: 1
  });
};

/**
 * Hook for automatic risk indicators for a specific project
 */
export const useProjectAutomaticRiskIndicators = (projectId: string) => {
  const { data: forecastAccuracy } = useForecastAccuracy();
  const { data: varianceTrends } = useVarianceTrends();
  const { data: projectHealth } = useProjectHealth();
  const { user } = useSupabaseAuth();

  return useQuery({
    queryKey: [
      'project-automatic-risk-indicators',
      projectId,
      forecastAccuracy?.projectsAnalyzed || 0,
      varianceTrends?.varianceTrends.length || 0,
      projectHealth?.healthScores.length || 0
    ],
    queryFn: async (): Promise<AutomaticRiskIndicatorData> => {
      if (!projectId) {
        return {
          indicators: [],
          riskDetections: [],
          alertCount: 0,
          criticalAlertCount: 0,
          warningAlertCount: 0,
          lastCalculated: new Date()
        };
      }

      // Get project-specific data from Phase A analytics
      const projectForecastAccuracy = forecastAccuracy?.projectAccuracies.filter(
        acc => acc.projectId === projectId
      );
      
      const projectVarianceTrends = varianceTrends?.varianceTrends.filter(
        trend => trend.projectId === projectId
      );
      
      const projectHealthScore = projectHealth?.healthScores.find(
        health => health.projectId === projectId
      );

      // Calculate automatic indicators for this project
      const indicatorResults = AutomaticRiskIndicatorService.calculateAutomaticIndicators(
        projectId,
        projectForecastAccuracy,
        projectVarianceTrends,
        projectHealthScore
      );

      const indicators = indicatorResults.map(result => result.indicator);

      // Calculate summary statistics
      const alertCount = indicators.filter(ind => 
        ind.status === 'warning' || ind.status === 'critical'
      ).length;

      const criticalAlertCount = indicators.filter(ind => 
        ind.status === 'critical'
      ).length;

      const warningAlertCount = indicators.filter(ind => 
        ind.status === 'warning'
      ).length;

      return {
        indicators,
        riskDetections: indicatorResults,
        alertCount,
        criticalAlertCount,
        warningAlertCount,
        lastCalculated: new Date()
      };
    },
    enabled: !!(projectId && (forecastAccuracy || varianceTrends || projectHealth)),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
    retry: 1
  });
};

/**
 * Hook for detecting new automatic risks based on indicators
 */
export const useAutomaticRiskDetection = (projectId?: string) => {
  const portfolioIndicators = useAutomaticRiskIndicators();
  const projectIndicators = useProjectAutomaticRiskIndicators(projectId || '');
  const { user } = useSupabaseAuth();

  const indicatorData = projectId ? projectIndicators : portfolioIndicators;

  return useQuery({
    queryKey: [
      'automatic-risk-detection',
      projectId || 'portfolio',
      indicatorData.data?.riskDetections.length || 0
    ],
    queryFn: async () => {
      if (!indicatorData.data || !user) {
        return {
          detectedRisks: [],
          recommendedActions: [],
          priorityAlerts: []
        };
      }

      const riskDetections = indicatorData.data.riskDetections.filter(
        detection => detection.riskDetected
      );

      // Generate automatic risks (would be persisted to database in real implementation)
      const detectedRisks = projectId 
        ? AutomaticRiskIndicatorService.createAutomaticRisks(
            projectId,
            riskDetections,
            user.id
          )
        : [];

      // Extract recommendations
      const recommendedActions = riskDetections
        .map(detection => detection.recommendation)
        .filter(Boolean) as string[];

      // Priority alerts (critical indicators)
      const priorityAlerts = riskDetections
        .filter(detection => detection.riskLevel === 'critical')
        .map(detection => ({
          metric: detection.indicator.metric,
          description: detection.indicator.description,
          currentValue: detection.indicator.currentValue,
          recommendation: detection.recommendation
        }));

      return {
        detectedRisks,
        recommendedActions,
        priorityAlerts
      };
    },
    enabled: !!(indicatorData.data && user),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });
};