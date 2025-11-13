import { useQuery } from '@tanstack/react-query';
import { useMyProjects } from '@/hooks/useProjects';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { ActualsPeriodEntry, FinancialModel } from '@/types/models';
import { DashboardAnalyticsService, PortfolioMetrics, PeriodPerformance, ProjectPerformance } from '@/services/DashboardAnalyticsService';
import { getSupabaseStorageService } from '@/services/singleton';
import { getActualsForProject, getModelsForProject } from '@/lib/db';
import { isCloudModeEnabled } from '@/config/app.config';

/**
 * Hook for portfolio-wide analytics combining actual and projected data
 */
export const usePortfolioAnalytics = (
  eventType: 'all' | 'weekly' | 'special' = 'all'
) => {
  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useMyProjects();
  const { isAuthenticated, isLoading: authLoading } = useSupabaseAuth();

  const filteredProjects =
    eventType === 'all' ? projects : projects.filter(p => p.event_type === eventType);

  return useQuery({
    queryKey: ['portfolio-analytics', eventType, filteredProjects.map(p => p?.id).filter(Boolean)],
    queryFn: async () => {
      if (filteredProjects.length === 0) {
        return {
          portfolioMetrics: {
            totalActualRevenue: 0,
            totalActualCosts: 0,
            totalActualProfit: 0,
            totalProjectedRevenue: 0,
            totalProjectedCosts: 0,
            totalProjectedProfit: 0,
            revenueVariance: 0,
            costVariance: 0,
            profitVariance: 0,
            projectsWithActuals: 0,
            totalProjects: 0,
            actualsDataCompleteness: 0
          } as PortfolioMetrics,
          periodPerformance: [] as PeriodPerformance[],
          projectPerformance: [] as ProjectPerformance[]
        };
      }

      // Fetch both actuals and financial models for all projects
      const allProjectDataPromises = filteredProjects.map(async (project) => {
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

        return { 
          projectId: project.id, 
          project,
          actuals,
          financialModels
        };
      });

      const projectDataResults = await Promise.all(allProjectDataPromises);
      
      // Convert to Record format for the analytics service
      const allActuals: Record<string, ActualsPeriodEntry[]> = {};
      const projectsWithModels = projectDataResults.map(({ project, financialModels, actuals, projectId }) => {
        allActuals[projectId] = actuals;
        return {
          ...project,
          financialModels
        };
      });

      // Calculate analytics using the service with projects that include financial models
      const portfolioMetrics = DashboardAnalyticsService.calculatePortfolioMetrics(projectsWithModels, allActuals);
      const periodPerformance = DashboardAnalyticsService.generatePeriodPerformance(projectsWithModels, allActuals);
      const projectPerformance = DashboardAnalyticsService.calculateProjectPerformance(projectsWithModels, allActuals);

      return {
        portfolioMetrics,
        periodPerformance,
        projectPerformance
      };
    },
    enabled: !authLoading && isAuthenticated && !projectsLoading && !projectsError && projects.length >= 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    onError: (error) => {
      console.error('Portfolio analytics error:', error);
    },
  });
};

/**
 * Hook for getting performance data for charts
 */
export const usePerformanceChartData = (
  eventType: 'all' | 'weekly' | 'special' = 'all'
) => {
  const { data: analytics } = usePortfolioAnalytics(eventType);
  
  if (!analytics?.periodPerformance) {
    return { data: [], isLoading: true };
  }

  // Format data for recharts
  const chartData = analytics.periodPerformance.map(period => ({
    name: period.period,
    actual: period.actualRevenue,
    projected: period.projectedRevenue,
    variance: period.revenueVariance,
    actualProfit: period.actualProfit,
    projectedProfit: period.projectedProfit
  }));

  return { 
    data: chartData,
    isLoading: false
  };
};

/**
 * Hook for risk analysis data
 */
export const useRiskAnalysis = (
  eventType: 'all' | 'weekly' | 'special' = 'all'
) => {
  const { data: analytics } = usePortfolioAnalytics(eventType);
  
  if (!analytics?.projectPerformance) {
    return { riskData: [], totalRisk: 0, isLoading: true };
  }

  const projectRisks = analytics.projectPerformance.map(project => {
    const riskScore = DashboardAnalyticsService.calculateRiskScore(
      project.revenueVariance,
      project.costVariance,
      [] // TODO: Add project-specific trend data
    );

    return {
      projectName: project.projectName,
      riskScore,
      revenueVariance: project.revenueVariance,
      costVariance: project.costVariance,
      hasActuals: project.hasActuals
    };
  });

  // Categorize risks for pie chart
  const riskCategories = {
    'Low Risk': projectRisks.filter(p => p.riskScore < 30).length,
    'Medium Risk': projectRisks.filter(p => p.riskScore >= 30 && p.riskScore < 60).length,
    'High Risk': projectRisks.filter(p => p.riskScore >= 60).length
  };

  const riskData = Object.entries(riskCategories)
    .map(([name, value]) => ({ name, value }))
    .filter(item => item.value > 0);

  const totalRisk = projectRisks.reduce((sum, project) => sum + project.riskScore, 0) / Math.max(projectRisks.length, 1);

  return {
    riskData,
    totalRisk,
    projectRisks,
    isLoading: false
  };
};

/**
 * Hook for variance indicators
 */
export const useVarianceIndicators = (
  eventType: 'all' | 'weekly' | 'special' = 'all'
) => {
  const { data: analytics } = usePortfolioAnalytics(eventType);
  
  if (!analytics?.portfolioMetrics) {
    return { indicators: [], isLoading: true };
  }

  const { portfolioMetrics } = analytics;
  
  const indicators = [
    {
      metric: 'Revenue',
      variance: portfolioMetrics.revenueVariance,
      actual: portfolioMetrics.totalActualRevenue,
      projected: portfolioMetrics.totalProjectedRevenue,
      status: portfolioMetrics.revenueVariance >= 0 ? 'positive' : 'negative'
    },
    {
      metric: 'Costs',
      variance: portfolioMetrics.costVariance,
      actual: portfolioMetrics.totalActualCosts,
      projected: portfolioMetrics.totalProjectedCosts,
      status: portfolioMetrics.costVariance <= 0 ? 'positive' : 'negative' // Lower costs are better
    },
    {
      metric: 'Profit',
      variance: portfolioMetrics.profitVariance,
      actual: portfolioMetrics.totalActualProfit,
      projected: portfolioMetrics.totalProjectedProfit,
      status: portfolioMetrics.profitVariance >= 0 ? 'positive' : 'negative'
    }
  ];

  return {
    indicators,
    dataCompleteness: portfolioMetrics.actualsDataCompleteness,
    projectsWithActuals: portfolioMetrics.projectsWithActuals,
    totalProjects: portfolioMetrics.totalProjects,
    isLoading: false
  };
};