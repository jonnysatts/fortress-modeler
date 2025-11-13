import { useQuery } from '@tanstack/react-query';
import { useMyProjects } from '@/hooks/useProjects';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { ActualsPeriodEntry, FinancialModel } from '@/types/models';
import { VarianceTrendService, VarianceTrend, VarianceInsight } from '@/services/VarianceTrendService';
import { getSupabaseStorageService } from '@/services/singleton';
import { getActualsForProject, getModelsForProject } from '@/lib/db';
import { isCloudModeEnabled } from '@/config/app.config';

interface VarianceTrendData {
  varianceTrends: VarianceTrend[];
  insights: VarianceInsight[];
  summary: {
    totalTrends: number;
    worseningTrends: number;
    totalAnomalies: number;
    avgVolatility: number;
    trendsWithSeasonality: number;
  };
}

/**
 * Hook for calculating variance trends across the portfolio
 */
export const useVarianceTrends = () => {
  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useMyProjects();
  const { isAuthenticated, isLoading: authLoading } = useSupabaseAuth();

  return useQuery({
    queryKey: ['variance-trends', projects.map(p => p?.id).filter(Boolean)],
    queryFn: async (): Promise<VarianceTrendData> => {
      if (projects.length === 0) {
        return {
          varianceTrends: [],
          insights: [],
          summary: {
            totalTrends: 0,
            worseningTrends: 0,
            totalAnomalies: 0,
            avgVolatility: 0,
            trendsWithSeasonality: 0
          }
        };
      }

      // Fetch both actuals and financial models for all projects
      const allProjectDataPromises = projects.map(async (project) => {
        let actuals: ActualsPeriodEntry[] = [];
        let financialModels: FinancialModel[] = [];
        
        try {
          if (isCloudModeEnabled()) {
            const supabaseStorage = getSupabaseStorageService();
            actuals = await supabaseStorage.getActualsForProject(project.id);
            financialModels = await supabaseStorage.getModelsForProject(project.id);
          } else {
            actuals = await getActualsForProject(project.id);
            financialModels = await getModelsForProject(project.id);
          }
        } catch (error) {
          console.warn(`Failed to fetch data for project ${project.id}:`, error);
          actuals = [];
          financialModels = [];
        }

        // Get the primary model or first model
        const primaryModel = financialModels.find(m => m.isPrimary) || financialModels[0];

        return { 
          projectId: project.id,
          projectName: project.name,
          actuals,
          primaryModel
        };
      });

      const projectDataResults = await Promise.all(allProjectDataPromises);
      
      // Calculate variance trends for each project with sufficient data
      const varianceTrends: VarianceTrend[] = [];
      
      for (const { projectId, projectName, actuals, primaryModel } of projectDataResults) {
        if (!primaryModel || actuals.length < 3) continue; // Need at least 3 periods for trend analysis

        // Calculate trends for each metric (revenue, costs, profit)
        const metrics: Array<'revenue' | 'costs' | 'profit'> = ['revenue', 'costs', 'profit'];
        
        for (const metric of metrics) {
          // Check if we have data for this metric
          const hasMetricData = actuals.some(actual => {
            const projectedPeriod = primaryModel.periods.find(p => p.period === actual.period);
            if (!projectedPeriod) return false;
            
            switch (metric) {
              case 'revenue':
                return actual.revenue !== undefined && projectedPeriod.revenue !== undefined;
              case 'costs':
                return actual.costs !== undefined && projectedPeriod.costs !== undefined;
              case 'profit':
                return (actual.revenue !== undefined && actual.costs !== undefined) &&
                       (projectedPeriod.revenue !== undefined && projectedPeriod.costs !== undefined);
            }
          });

          if (hasMetricData) {
            const varianceTrend = VarianceTrendService.calculateVarianceTrend(
              projectId,
              metric,
              actuals,
              primaryModel
            );
            
            if (varianceTrend.timeSeriesData.length >= 3) {
              varianceTrends.push(varianceTrend);
            }
          }
        }
      }

      // Generate insights from all trends
      const insights = VarianceTrendService.generateVarianceInsights(varianceTrends);

      // Calculate summary statistics
      const summary = {
        totalTrends: varianceTrends.length,
        worseningTrends: varianceTrends.filter(trend => trend.trendDirection === 'worsening').length,
        totalAnomalies: varianceTrends.reduce((sum, trend) => sum + trend.anomalies.length, 0),
        avgVolatility: varianceTrends.length > 0 
          ? varianceTrends.reduce((sum, trend) => sum + trend.volatility, 0) / varianceTrends.length 
          : 0,
        trendsWithSeasonality: varianceTrends.filter(trend => trend.seasonalPattern?.detected).length
      };

      return {
        varianceTrends,
        insights,
        summary
      };
    },
    enabled: !authLoading && isAuthenticated && !projectsLoading && !projectsError && projects.length >= 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    onError: (error) => {
      console.error('Variance trends calculation error:', error);
    },
  });
};

/**
 * Hook for calculating variance trends for a specific project
 */
export const useProjectVarianceTrends = (
  projectId: string,
  financialModels: FinancialModel[],
  actualsData: ActualsPeriodEntry[]
) => {
  return useQuery({
    queryKey: ['project-variance-trends', projectId, financialModels.length, actualsData.length],
    queryFn: (): VarianceTrendData => {
      const primaryModel = financialModels.find(m => m.isPrimary) || financialModels[0];
      
      if (!primaryModel || actualsData.length < 3) {
        return {
          varianceTrends: [],
          insights: [],
          summary: {
            totalTrends: 0,
            worseningTrends: 0,
            totalAnomalies: 0,
            avgVolatility: 0,
            trendsWithSeasonality: 0
          }
        };
      }

      const varianceTrends: VarianceTrend[] = [];
      const metrics: Array<'revenue' | 'costs' | 'profit'> = ['revenue', 'costs', 'profit'];
      
      for (const metric of metrics) {
        // Check if we have data for this metric
        const hasMetricData = actualsData.some(actual => {
          const projectedPeriod = primaryModel.periods.find(p => p.period === actual.period);
          if (!projectedPeriod) return false;
          
          switch (metric) {
            case 'revenue':
              return actual.revenue !== undefined && projectedPeriod.revenue !== undefined;
            case 'costs':
              return actual.costs !== undefined && projectedPeriod.costs !== undefined;
            case 'profit':
              return (actual.revenue !== undefined && actual.costs !== undefined) &&
                     (projectedPeriod.revenue !== undefined && projectedPeriod.costs !== undefined);
          }
        });

        if (hasMetricData) {
          const varianceTrend = VarianceTrendService.calculateVarianceTrend(
            projectId,
            metric,
            actualsData,
            primaryModel
          );
          
          if (varianceTrend.timeSeriesData.length >= 3) {
            varianceTrends.push(varianceTrend);
          }
        }
      }

      // Generate insights
      const insights = VarianceTrendService.generateVarianceInsights(varianceTrends);

      // Calculate summary
      const summary = {
        totalTrends: varianceTrends.length,
        worseningTrends: varianceTrends.filter(trend => trend.trendDirection === 'worsening').length,
        totalAnomalies: varianceTrends.reduce((sum, trend) => sum + trend.anomalies.length, 0),
        avgVolatility: varianceTrends.length > 0 
          ? varianceTrends.reduce((sum, trend) => sum + trend.volatility, 0) / varianceTrends.length 
          : 0,
        trendsWithSeasonality: varianceTrends.filter(trend => trend.seasonalPattern?.detected).length
      };

      return {
        varianceTrends,
        insights,
        summary
      };
    },
    enabled: !!projectId && financialModels.length > 0 && actualsData.length >= 3,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
};