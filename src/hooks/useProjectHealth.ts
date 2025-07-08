import { useQuery } from '@tanstack/react-query';
import { useMyProjects } from '@/hooks/useProjects';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useForecastAccuracy } from '@/hooks/useForecastAccuracy';
import { useVarianceTrends } from '@/hooks/useVarianceTrends';
import { ActualsPeriodEntry, FinancialModel } from '@/types/models';
import { ProjectHealthService, ProjectHealthScore, PortfolioHealthSummary, HealthInsight } from '@/services/ProjectHealthService';
import { SupabaseStorageService } from '@/services/implementations/SupabaseStorageService';
import { getActualsForProject, getModelsForProject } from '@/lib/db';
import { isCloudModeEnabled } from '@/config/app.config';

interface ProjectHealthData {
  healthScores: ProjectHealthScore[];
  portfolioSummary: PortfolioHealthSummary;
  allInsights: HealthInsight[];
}

/**
 * Hook for calculating project health scores across the portfolio
 */
export const useProjectHealth = () => {
  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useMyProjects();
  const { isAuthenticated, isLoading: authLoading } = useSupabaseAuth();
  const { data: forecastAccuracyData } = useForecastAccuracy();
  const { data: varianceTrendData } = useVarianceTrends();

  return useQuery({
    queryKey: [
      'project-health', 
      projects.map(p => p?.id).filter(Boolean),
      forecastAccuracyData?.projectsAnalyzed || 0,
      varianceTrendData?.varianceTrends.length || 0
    ],
    queryFn: async (): Promise<ProjectHealthData> => {
      if (projects.length === 0) {
        return {
          healthScores: [],
          portfolioSummary: ProjectHealthService.calculatePortfolioHealthSummary([]),
          allInsights: []
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

        return { 
          projectId: project.id,
          projectName: project.name,
          actuals,
          financialModels
        };
      });

      const projectDataResults = await Promise.all(allProjectDataPromises);
      
      // Calculate health scores for each project
      const healthScores: ProjectHealthScore[] = [];
      const allInsights: HealthInsight[] = [];
      
      for (const { projectId, projectName, actuals, financialModels } of projectDataResults) {
        if (financialModels.length === 0) continue; // Skip projects without models

        // Get project-specific forecast accuracy data
        const projectForecastAccuracy = forecastAccuracyData?.projectAccuracies.filter(
          acc => acc.projectId === projectId
        ) || [];

        // Get project-specific variance trends
        const projectVarianceTrends = varianceTrendData?.varianceTrends.filter(
          trend => trend.projectId === projectId
        ) || [];

        // Calculate health score
        const healthScore = ProjectHealthService.calculateProjectHealth(
          projectId,
          financialModels,
          actuals,
          projectForecastAccuracy,
          projectVarianceTrends
        );

        healthScores.push(healthScore);

        // Generate insights for this project
        const projectInsights = ProjectHealthService.generateHealthInsights(healthScore);
        allInsights.push(...projectInsights.map(insight => ({
          ...insight,
          // Add project context to insights
          title: `${projectName}: ${insight.title}`
        })));
      }

      // Calculate portfolio summary
      const portfolioSummary = ProjectHealthService.calculatePortfolioHealthSummary(healthScores);

      return {
        healthScores,
        portfolioSummary,
        allInsights: allInsights.sort((a, b) => {
          const severityOrder = { high: 3, medium: 2, low: 1 };
          return severityOrder[b.severity] - severityOrder[a.severity];
        })
      };
    },
    enabled: !authLoading && isAuthenticated && !projectsLoading && !projectsError && projects.length >= 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    onError: (error) => {
      console.error('Project health calculation error:', error);
    },
  });
};

/**
 * Hook for calculating health score for a specific project
 */
export const useIndividualProjectHealth = (
  projectId: string,
  financialModels: FinancialModel[],
  actualsData: ActualsPeriodEntry[]
) => {
  const { data: forecastAccuracyData } = useForecastAccuracy();
  const { data: varianceTrendData } = useVarianceTrends();

  return useQuery({
    queryKey: [
      'individual-project-health', 
      projectId, 
      financialModels.length, 
      actualsData.length,
      forecastAccuracyData?.projectsAnalyzed || 0,
      varianceTrendData?.varianceTrends.length || 0
    ],
    queryFn: (): { healthScore: ProjectHealthScore; insights: HealthInsight[] } => {
      if (financialModels.length === 0) {
        // Return default health score for projects without models
        const defaultHealthScore: ProjectHealthScore = {
          projectId,
          overallScore: 50,
          componentScores: {
            financialHealth: 50,
            forecastReliability: 50,
            trendHealth: 50,
            riskProfile: 50,
            dataQuality: financialModels.length > 0 ? 60 : 20
          },
          healthGrade: 'C',
          healthTrend: 'stable',
          riskFactors: ['No financial models created'],
          recommendations: ['Create financial models to enable health tracking'],
          lastCalculated: new Date(),
          confidenceLevel: 10
        };

        return {
          healthScore: defaultHealthScore,
          insights: []
        };
      }

      // Get project-specific forecast accuracy data
      const projectForecastAccuracy = forecastAccuracyData?.projectAccuracies.filter(
        acc => acc.projectId === projectId
      ) || [];

      // Get project-specific variance trends
      const projectVarianceTrends = varianceTrendData?.varianceTrends.filter(
        trend => trend.projectId === projectId
      ) || [];

      // Calculate health score
      const healthScore = ProjectHealthService.calculateProjectHealth(
        projectId,
        financialModels,
        actualsData,
        projectForecastAccuracy,
        projectVarianceTrends
      );

      // Generate insights
      const insights = ProjectHealthService.generateHealthInsights(healthScore);

      return {
        healthScore,
        insights
      };
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
};