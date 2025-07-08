import { useQuery } from '@tanstack/react-query';
import { useMyProjects } from '@/hooks/useProjects';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { ActualsPeriodEntry, FinancialModel } from '@/types/models';
import { ForecastAccuracyService, ForecastAccuracy, AccuracyInsight } from '@/services/ForecastAccuracyService';
import { SupabaseStorageService } from '@/services/implementations/SupabaseStorageService';
import { getActualsForProject, getModelsForProject } from '@/lib/db';
import { isCloudModeEnabled } from '@/config/app.config';

interface ForecastAccuracyData {
  overallMAPE: number;
  accuracyTrend: 'improving' | 'stable' | 'declining';
  confidenceScore: number;
  projectsAnalyzed: number;
  projectsWithPoorAccuracy: number;
  projectAccuracies: ForecastAccuracy[];
  insights: AccuracyInsight[];
}

/**
 * Hook for calculating forecast accuracy across the portfolio
 */
export const useForecastAccuracy = () => {
  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useMyProjects();
  const { isAuthenticated, isLoading: authLoading } = useSupabaseAuth();

  return useQuery({
    queryKey: ['forecast-accuracy', projects.map(p => p?.id).filter(Boolean)],
    queryFn: async (): Promise<ForecastAccuracyData> => {
      if (projects.length === 0) {
        return {
          overallMAPE: 0,
          accuracyTrend: 'stable',
          confidenceScore: 0,
          projectsAnalyzed: 0,
          projectsWithPoorAccuracy: 0,
          projectAccuracies: [],
          insights: []
        };
      }

      // Fetch both actuals and financial models for all projects
      const allProjectDataPromises = projects.map(async (project) => {
        let actuals: ActualsPeriodEntry[] = [];
        let financialModels: FinancialModel[] = [];
        
        try {
          if (isCloudModeEnabled()) {
            const supabaseStorage = new SupabaseStorageService();
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
      
      // Calculate forecast accuracy for each project with data
      const projectAccuracies: ForecastAccuracy[] = [];
      
      for (const { projectId, projectName, actuals, primaryModel } of projectDataResults) {
        if (!primaryModel || actuals.length === 0) continue;

        // Get periods that have both actuals and projections
        const periodsWithData = actuals
          .filter(actual => {
            const projectedPeriod = primaryModel.periods.find(p => p.period === actual.period);
            return projectedPeriod && actual.revenue !== undefined && projectedPeriod.revenue !== undefined;
          })
          .map(actual => {
            const projectedPeriod = primaryModel.periods.find(p => p.period === actual.period)!;
            return {
              period: actual.period,
              actual: actual.revenue || 0,
              projected: projectedPeriod.revenue || 0
            };
          });

        if (periodsWithData.length >= 2) { // Need at least 2 periods for meaningful analysis
          // Calculate accuracy for revenue
          const revenueAccuracy = ForecastAccuracyService.calculateForecastAccuracy(
            projectId,
            'revenue',
            periodsWithData
          );
          projectAccuracies.push(revenueAccuracy);

          // Could also calculate for costs and profit if needed
          const costPeriodsWithData = actuals
            .filter(actual => {
              const projectedPeriod = primaryModel.periods.find(p => p.period === actual.period);
              return projectedPeriod && actual.costs !== undefined && projectedPeriod.costs !== undefined;
            })
            .map(actual => {
              const projectedPeriod = primaryModel.periods.find(p => p.period === actual.period)!;
              return {
                period: actual.period,
                actual: actual.costs || 0,
                projected: projectedPeriod.costs || 0
              };
            });

          if (costPeriodsWithData.length >= 2) {
            const costAccuracy = ForecastAccuracyService.calculateForecastAccuracy(
              projectId,
              'costs',
              costPeriodsWithData
            );
            projectAccuracies.push(costAccuracy);
          }
        }
      }

      // Calculate overall portfolio metrics
      const revenueAccuracies = projectAccuracies.filter(a => a.metric === 'revenue');
      const overallMAPE = revenueAccuracies.length > 0
        ? revenueAccuracies.reduce((sum, a) => sum + a.overallMAPE, 0) / revenueAccuracies.length
        : 0;

      // Determine overall trend based on majority
      const trendCounts = { improving: 0, stable: 0, declining: 0 };
      revenueAccuracies.forEach(a => trendCounts[a.accuracyTrend]++);
      const accuracyTrend = (Object.entries(trendCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'stable') as 'improving' | 'stable' | 'declining';

      // Calculate confidence score
      const confidenceScore = ForecastAccuracyService.calculateConfidenceScore(overallMAPE, accuracyTrend);

      // Count projects with poor accuracy (MAPE > 25%)
      const projectsWithPoorAccuracy = revenueAccuracies.filter(a => a.overallMAPE > 25).length;

      // Generate insights
      const insights = ForecastAccuracyService.generateAccuracyInsights(projectAccuracies);

      return {
        overallMAPE,
        accuracyTrend,
        confidenceScore,
        projectsAnalyzed: revenueAccuracies.length,
        projectsWithPoorAccuracy,
        projectAccuracies,
        insights
      };
    },
    enabled: !authLoading && isAuthenticated && !projectsLoading && !projectsError && projects.length >= 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    onError: (error) => {
      console.error('Forecast accuracy calculation error:', error);
    },
  });
};