import { useQuery } from '@tanstack/react-query';
import { useMyProjects } from '@/hooks/useProjects';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { ActualsPeriodEntry, FinancialModel } from '@/types/models';
import { ForecastAccuracyService, ForecastAccuracy, AccuracyInsight } from '@/services/ForecastAccuracyService';
import { getSupabaseStorageService } from '@/services/singleton';
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

interface ProjectedPeriod {
  period: number;
  revenue: number;
  costs: number;
}

/**
 * Generate projected revenue and costs for each period from a financial model
 * This replicates the projection logic from ModelProjections component
 */
function generateProjectedPeriods(model: FinancialModel): ProjectedPeriod[] {
  if (!model?.assumptions) {
    return [];
  }

  const periods: ProjectedPeriod[] = [];
  const metadata = model.assumptions.metadata;
  const isWeeklyEvent = metadata?.type === 'WeeklyEvent';
  
  // Determine number of periods
  const duration = isWeeklyEvent ? (metadata?.weeks || 12) : 12;
  
  for (let period = 1; period <= duration; period++) {
    let currentAttendance = metadata?.initialWeeklyAttendance || 0;
    
    // Apply attendance growth for weekly events
    if (isWeeklyEvent && period > 1 && metadata?.growth) {
      const attendanceGrowthRate = (metadata.growth.attendanceGrowthRate || 0) / 100;
      currentAttendance = (metadata.initialWeeklyAttendance || 0) * Math.pow(1 + attendanceGrowthRate, period - 1);
    }
    
    // Calculate period revenue
    let periodRevenue = 0;
    model.assumptions.revenue.forEach(stream => {
      let streamRevenue = 0;
      const baseValue = stream.value;
      
      if (isWeeklyEvent && metadata) {
        // Weekly event specific revenue calculation
        if (stream.name === "F&B Sales") {
          let spend = metadata.perCustomer?.fbSpend || 0;
          if (period > 1 && metadata.growth?.useCustomerSpendGrowth) {
            spend *= Math.pow(1 + (metadata.growth.fbSpendGrowth || 0) / 100, period - 1);
          }
          streamRevenue = currentAttendance * spend;
        } else if (stream.name === "Merchandise Sales") {
          let spend = metadata.perCustomer?.merchandiseSpend || 0;
          if (period > 1 && metadata.growth?.useCustomerSpendGrowth) {
            spend *= Math.pow(1 + (metadata.growth.merchandiseSpendGrowth || 0) / 100, period - 1);
          }
          streamRevenue = currentAttendance * spend;
        } else {
          streamRevenue = baseValue;
          if (period > 1 && metadata.growth?.useCustomerSpendGrowth) {
            let growthRate = 0;
            switch(stream.name) {
              case "Ticket Sales": growthRate = (metadata.growth.ticketPriceGrowth || 0) / 100; break;
              case "Online Sales": growthRate = (metadata.growth.onlineSpendGrowth || 0) / 100; break;
              case "Miscellaneous Revenue": growthRate = (metadata.growth.miscSpendGrowth || 0) / 100; break;
            }
            streamRevenue *= Math.pow(1 + growthRate, period - 1);
          }
        }
      } else {
        // Non-weekly event revenue calculation
        streamRevenue = baseValue;
        if (period > 1) {
          const { type, rate } = model.assumptions.growthModel;
          if (type === "linear") {
            streamRevenue = baseValue * (1 + rate * (period - 1));
          } else {
            streamRevenue = baseValue * Math.pow(1 + rate, period - 1);
          }
        }
      }
      periodRevenue += streamRevenue;
    });

    // Calculate period costs
    let periodCosts = 0;
    model.assumptions.costs.forEach(cost => {
      let costValue = 0;
      const costType = cost.type?.toLowerCase();
      const baseValue = cost.value;

      if (isWeeklyEvent && metadata) {
        // Weekly event specific cost calculation
        if (costType === "fixed") {
          costValue = period === 1 ? baseValue : 0; // Setup costs only in first period
        } else if (costType === "variable") {
          if (cost.name === "F&B COGS") {
            const cogsPct = metadata.costs?.fbCOGSPercent || 30;
            let fbSpend = metadata.perCustomer?.fbSpend || 0;
            if (period > 1 && metadata.growth?.useCustomerSpendGrowth) {
              fbSpend *= Math.pow(1 + (metadata.growth.fbSpendGrowth || 0) / 100, period - 1);
            }
            const fbRevenueThisPeriod = currentAttendance * fbSpend;
            costValue = fbRevenueThisPeriod * (cogsPct / 100);
          } else {
            costValue = baseValue;
          }
        } else {
          costValue = baseValue;
        }
      } else {
        // Non-weekly event cost calculation
        costValue = baseValue;
        if (period > 1) {
          const { type, rate } = model.assumptions.growthModel;
          if (type === "linear") {
            costValue = baseValue * (1 + rate * (period - 1));
          } else {
            costValue = baseValue * Math.pow(1 + rate, period - 1);
          }
        }
      }
      periodCosts += costValue;
    });

    periods.push({
      period,
      revenue: periodRevenue,
      costs: periodCosts
    });
  }
  
  return periods;
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
      
      // Calculate forecast accuracy for each project with data
      const projectAccuracies: ForecastAccuracy[] = [];
      
      for (const { projectId, projectName, actuals, primaryModel } of projectDataResults) {
        if (!primaryModel || actuals.length === 0) {
          continue;
        }

        // Generate projected periods data from the model
        const projectedPeriods = generateProjectedPeriods(primaryModel);

        // Get periods that have both actuals and projections
        const periodsWithData = actuals
          .filter(actual => {
            // Calculate actual revenue for this period
            const actualRevenue = Object.values(actual.revenueActuals || {}).reduce((sum, val) => sum + val, 0);
            
            // Find matching projected period
            const projectedPeriod = projectedPeriods.find(p => p.period === actual.period);
            
            return actualRevenue > 0 && projectedPeriod?.revenue !== undefined;
          })
          .map(actual => {
            const actualRevenue = Object.values(actual.revenueActuals || {}).reduce((sum, val) => sum + val, 0);
            const projectedPeriod = projectedPeriods.find(p => p.period === actual.period)!;
            return {
              period: actual.period,
              actual: actualRevenue,
              projected: projectedPeriod.revenue
            };
          });

        if (periodsWithData.length >= 1) { // Need at least 1 period for analysis
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
              const actualCosts = Object.values(actual.costActuals || {}).reduce((sum, val) => sum + val, 0);
              const projectedPeriod = projectedPeriods.find(p => p.period === actual.period);
              return actualCosts > 0 && projectedPeriod?.costs !== undefined;
            })
            .map(actual => {
              const actualCosts = Object.values(actual.costActuals || {}).reduce((sum, val) => sum + val, 0);
              const projectedPeriod = projectedPeriods.find(p => p.period === actual.period)!;
              return {
                period: actual.period,
                actual: actualCosts,
                projected: projectedPeriod.costs
              };
            });

          if (costPeriodsWithData.length >= 1) {
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