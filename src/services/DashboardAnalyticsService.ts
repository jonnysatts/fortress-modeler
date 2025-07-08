import { ActualsPeriodEntry } from '@/types/models';
import { Project } from '@/lib/db';
import { runModelSimulation } from '@/lib/project-aggregation';

export interface PortfolioMetrics {
  totalActualRevenue: number;
  totalActualCosts: number;
  totalActualProfit: number;
  totalProjectedRevenue: number;
  totalProjectedCosts: number;
  totalProjectedProfit: number;
  revenueVariance: number;
  costVariance: number;
  profitVariance: number;
  projectsWithActuals: number;
  totalProjects: number;
  actualsDataCompleteness: number; // percentage
}

export interface PeriodPerformance {
  period: string;
  actualRevenue: number;
  actualCosts: number;
  actualProfit: number;
  projectedRevenue: number;
  projectedCosts: number;
  projectedProfit: number;
  revenueVariance: number;
  costVariance: number;
}

export interface ProjectPerformance {
  projectId: string;
  projectName: string;
  actualRevenue: number;
  actualCosts: number;
  actualProfit: number;
  projectedRevenue: number;
  projectedCosts: number;
  projectedProfit: number;
  revenueVariance: number;
  costVariance: number;
  hasActuals: boolean;
  lastActualPeriod: string | null;
  periodsWithData: number;
}

export class DashboardAnalyticsService {
  /**
   * Calculate portfolio-wide metrics combining actual and projected data
   */
  static calculatePortfolioMetrics(
    projects: Project[],
    allActuals: Record<string, ActualsPeriodEntry[]>
  ): PortfolioMetrics {
    let totalActualRevenue = 0;
    let totalActualCosts = 0;
    let totalProjectedRevenue = 0;
    let totalProjectedCosts = 0;
    let projectsWithActuals = 0;

    projects.forEach(project => {
      const projectActuals = allActuals[project.id] || [];
      const hasActuals = projectActuals.length > 0;

      if (hasActuals) {
        projectsWithActuals++;
        
        // Sum up all actual data for this project
        projectActuals.forEach(actual => {
          // Sum all revenue streams
          Object.values(actual.revenueActuals || {}).forEach(revenue => {
            totalActualRevenue += revenue || 0;
          });
          
          // Sum all cost categories
          Object.values(actual.costActuals || {}).forEach(cost => {
            totalActualCosts += cost || 0;
          });
        });
      }

      // Only use primary model for dashboard projections
      const primaryModel = this.getPrimaryModel(project.financialModels || []);
      if (primaryModel) {
        console.log('🔍 [Analytics Debug] Processing PRIMARY model:', primaryModel.name);
        
        // Use proper simulation logic instead of simple multiplication
        const simulation = runModelSimulation(primaryModel);
        
        console.log(`🔍 [Analytics Debug] Model ${primaryModel.name}: Proper Simulation Results:`);
        console.log(`🔍 [Analytics Debug] - Total Revenue: $${simulation.totalRevenue}`);
        console.log(`🔍 [Analytics Debug] - Total Costs: $${simulation.totalCosts}`);
        console.log(`🔍 [Analytics Debug] - Total Profit: $${simulation.totalProfit}`);
        console.log(`🔍 [Analytics Debug] - Total Attendance: ${simulation.totalAttendance}`);
        
        totalProjectedRevenue += simulation.totalRevenue;
        totalProjectedCosts += simulation.totalCosts;
      } else {
        console.log('🔍 [Analytics Debug] No primary model found for project:', project.name);
      }
    });

    const totalActualProfit = totalActualRevenue - totalActualCosts;
    const totalProjectedProfit = totalProjectedRevenue - totalProjectedCosts;

    // Calculate variance as percentage difference
    const revenueVariance = totalProjectedRevenue > 0 
      ? ((totalActualRevenue - totalProjectedRevenue) / totalProjectedRevenue) * 100 
      : 0;
    
    const costVariance = totalProjectedCosts > 0 
      ? ((totalActualCosts - totalProjectedCosts) / totalProjectedCosts) * 100 
      : 0;

    const profitVariance = totalProjectedProfit > 0 
      ? ((totalActualProfit - totalProjectedProfit) / totalProjectedProfit) * 100 
      : 0;

    const actualsDataCompleteness = projects.length > 0 
      ? (projectsWithActuals / projects.length) * 100 
      : 0;

    console.log('🔍 [Analytics Debug] FINAL TOTALS:');
    console.log(`🔍 [Analytics Debug] Total Projected Revenue: $${totalProjectedRevenue}`);
    console.log(`🔍 [Analytics Debug] Total Projected Costs: $${totalProjectedCosts}`);
    console.log(`🔍 [Analytics Debug] Total Actual Revenue: $${totalActualRevenue}`);
    console.log(`🔍 [Analytics Debug] Total Actual Costs: $${totalActualCosts}`);

    return {
      totalActualRevenue,
      totalActualCosts,
      totalActualProfit,
      totalProjectedRevenue,
      totalProjectedCosts,
      totalProjectedProfit,
      revenueVariance,
      costVariance,
      profitVariance,
      projectsWithActuals,
      totalProjects: projects.length,
      actualsDataCompleteness
    };
  }

  /**
   * Generate performance data by period for trending charts
   */
  static generatePeriodPerformance(
    projects: Project[],
    allActuals: Record<string, ActualsPeriodEntry[]>
  ): PeriodPerformance[] {
    const periodMap = new Map<string, {
      actualRevenue: number;
      actualCosts: number;
      projectedRevenue: number;
      projectedCosts: number;
      count: number;
    }>();

    // Aggregate actual data by period
    Object.entries(allActuals).forEach(([projectId, actuals]) => {
      const project = projects.find(p => p.id === projectId);
      
      actuals.forEach(actual => {
        const periodKey = this.formatPeriodKey(actual.period, actual.periodType);
        
        if (!periodMap.has(periodKey)) {
          periodMap.set(periodKey, {
            actualRevenue: 0,
            actualCosts: 0,
            projectedRevenue: 0,
            projectedCosts: 0,
            count: 0
          });
        }

        const periodData = periodMap.get(periodKey)!;
        
        // Sum actual revenue and costs
        Object.values(actual.revenueActuals || {}).forEach(revenue => {
          periodData.actualRevenue += revenue || 0;
        });
        
        Object.values(actual.costActuals || {}).forEach(cost => {
          periodData.actualCosts += cost || 0;
        });

        // Add projected data for comparison (normalized to period) - use primary model only
        const primaryModel = this.getPrimaryModel(project?.financialModels || []);
        if (primaryModel) {
          // Use proper simulation logic for accurate projections
          const simulation = runModelSimulation(primaryModel);
          const duration = primaryModel.assumptions?.metadata?.weeks || 12;
          
          // Calculate average per period from total simulation
          const avgRevenuePerPeriod = simulation.totalRevenue / duration;
          const avgCostsPerPeriod = simulation.totalCosts / duration;
          
          const periodMultiplier = actual.periodType === 'Week' ? 1 : 4.33; // Week to week, or week to month
          periodData.projectedRevenue += avgRevenuePerPeriod * periodMultiplier;
          periodData.projectedCosts += avgCostsPerPeriod * periodMultiplier;
        }

        periodData.count++;
      });
    });

    // Convert to array and calculate variances
    return Array.from(periodMap.entries())
      .map(([period, data]) => {
        const actualProfit = data.actualRevenue - data.actualCosts;
        const projectedProfit = data.projectedRevenue - data.projectedCosts;
        
        const revenueVariance = data.projectedRevenue > 0 
          ? ((data.actualRevenue - data.projectedRevenue) / data.projectedRevenue) * 100 
          : 0;
        
        const costVariance = data.projectedCosts > 0 
          ? ((data.actualCosts - data.projectedCosts) / data.projectedCosts) * 100 
          : 0;

        return {
          period,
          actualRevenue: data.actualRevenue,
          actualCosts: data.actualCosts,
          actualProfit,
          projectedRevenue: data.projectedRevenue,
          projectedCosts: data.projectedCosts,
          projectedProfit,
          revenueVariance,
          costVariance
        };
      })
      .sort((a, b) => a.period.localeCompare(b.period))
      .slice(-12); // Last 12 periods
  }

  /**
   * Calculate performance metrics for each project
   */
  static calculateProjectPerformance(
    projects: Project[],
    allActuals: Record<string, ActualsPeriodEntry[]>
  ): ProjectPerformance[] {
    return projects.map(project => {
      const projectActuals = allActuals[project.id] || [];
      const hasActuals = projectActuals.length > 0;

      let actualRevenue = 0;
      let actualCosts = 0;
      let lastActualPeriod: string | null = null;

      if (hasActuals) {
        // Sum all actual data for this project
        projectActuals.forEach(actual => {
          Object.values(actual.revenueActuals || {}).forEach(revenue => {
            actualRevenue += revenue || 0;
          });
          
          Object.values(actual.costActuals || {}).forEach(cost => {
            actualCosts += cost || 0;
          });
        });

        // Find the most recent period
        const sortedActuals = projectActuals.sort((a, b) => b.period - a.period);
        const latestActual = sortedActuals[0];
        lastActualPeriod = this.formatPeriodKey(latestActual.period, latestActual.periodType);
      }

      // Calculate projected metrics from assumptions - use primary model only
      let projectedRevenue = 0;
      let projectedCosts = 0;
      
      const primaryModel = this.getPrimaryModel(project.financialModels || []);
      if (primaryModel) {
        // Use proper simulation logic for accurate projections
        const simulation = runModelSimulation(primaryModel);
        projectedRevenue = simulation.totalRevenue;
        projectedCosts = simulation.totalCosts;
      }

      const actualProfit = actualRevenue - actualCosts;
      const projectedProfit = projectedRevenue - projectedCosts;

      const revenueVariance = projectedRevenue > 0 && hasActuals
        ? ((actualRevenue - projectedRevenue) / projectedRevenue) * 100 
        : 0;
      
      const costVariance = projectedCosts > 0 && hasActuals
        ? ((actualCosts - projectedCosts) / projectedCosts) * 100 
        : 0;

      return {
        projectId: project.id,
        projectName: project.name,
        actualRevenue,
        actualCosts,
        actualProfit,
        projectedRevenue,
        projectedCosts,
        projectedProfit,
        revenueVariance,
        costVariance,
        hasActuals,
        lastActualPeriod,
        periodsWithData: projectActuals.length
      };
    });
  }


  /**
   * Get the primary model for dashboard projections
   * Falls back to first model if no primary is set
   */
  private static getPrimaryModel(models: any[]): any | null {
    if (!models || models.length === 0) return null;
    
    // Look for a model marked as primary
    const primaryModel = models.find(model => model.isPrimary === true);
    if (primaryModel) {
      return primaryModel;
    }
    
    // Fallback: use the first model if no primary is set
    console.log('🔍 [Analytics Debug] No primary model found, using first model as fallback');
    return models[0];
  }

  /**
   * Format period for consistent display
   */
  private static formatPeriodKey(period: number, periodType: 'Week' | 'Month'): string {
    if (periodType === 'Week') {
      return `Week ${period}`;
    } else {
      const year = Math.floor(period / 100);
      const month = period % 100;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[month - 1]} ${year}`;
    }
  }

  /**
   * Calculate risk score based on variance and trend
   */
  static calculateRiskScore(
    revenueVariance: number,
    costVariance: number,
    trendData: PeriodPerformance[]
  ): number {
    let riskScore = 0;

    // Variance-based risk (higher negative variance = higher risk)
    if (revenueVariance < -20) riskScore += 30;
    else if (revenueVariance < -10) riskScore += 15;
    
    if (costVariance > 20) riskScore += 25;
    else if (costVariance > 10) riskScore += 10;

    // Trend-based risk (declining performance = higher risk)
    if (trendData.length >= 3) {
      const recentPeriods = trendData.slice(-3);
      const isRevenueDecreasing = recentPeriods.every((period, index) => 
        index === 0 || period.actualRevenue < recentPeriods[index - 1].actualRevenue
      );
      
      if (isRevenueDecreasing) riskScore += 20;
    }

    return Math.min(riskScore, 100); // Cap at 100
  }
}