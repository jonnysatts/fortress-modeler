import { ActualsPeriodEntry, Model, RevenueStream, CostCategory } from '@/types/models';
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
  totalPeriodsWithActuals: number; // Total periods across all projects that have actual data
  averagePeriodsPerProject: number; // Average periods of actual data per project
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
    let totalPeriodsWithActuals = 0;

    projects.forEach(project => {
      const projectActuals = allActuals[project.id] || [];
      const hasActuals = projectActuals.length > 0;

      if (hasActuals) {
        projectsWithActuals++;
        totalPeriodsWithActuals += projectActuals.length;
        
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
      if (primaryModel && hasActuals) {
        // FIXED: Only calculate projected values for periods that have actuals
        const projectedForActualPeriods = this.calculateProjectedForActualPeriods(
          primaryModel, 
          projectActuals
        );
        
        totalProjectedRevenue += projectedForActualPeriods.revenue;
        totalProjectedCosts += projectedForActualPeriods.costs;
        
      } else if (primaryModel && !hasActuals) {
        // For projects without actuals, show full projection for reference
        const simulation = runModelSimulation(primaryModel);
        totalProjectedRevenue += simulation.totalRevenue;
        totalProjectedCosts += simulation.totalCosts;
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


    const averagePeriodsPerProject = projectsWithActuals > 0 
      ? totalPeriodsWithActuals / projectsWithActuals 
      : 0;

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
      actualsDataCompleteness,
      totalPeriodsWithActuals,
      averagePeriodsPerProject
    };
  }

  /**
   * Calculate projected values only for periods that have actual data
   * This ensures we're comparing like-for-like timeframes
   */
  private static calculateProjectedForActualPeriods(
    model: Model,
    actuals: ActualsPeriodEntry[]
  ): { revenue: number; costs: number } {
    if (!model?.assumptions || actuals.length === 0) {
      return { revenue: 0, costs: 0 };
    }

    let totalProjectedRevenue = 0;
    let totalProjectedCosts = 0;

    // Generate projected periods using the same logic as useForecastAccuracy
    const projectedPeriods = this.generateProjectedPeriods(model);

    // Only sum projections for periods that have actual data
    actuals.forEach(actual => {
      const projectedPeriod = projectedPeriods.find(p => p.period === actual.period);
      if (projectedPeriod) {
        totalProjectedRevenue += projectedPeriod.revenue;
        totalProjectedCosts += projectedPeriod.costs;
      }
    });

    return {
      revenue: totalProjectedRevenue,
      costs: totalProjectedCosts
    };
  }

  /**
   * Generate projected revenue and costs for each period from a financial model
   * This replicates the logic from useForecastAccuracy to ensure consistency
   */
  private static generateProjectedPeriods(model: Model): Array<{ period: number; revenue: number; costs: number }> {
    if (!model?.assumptions) {
      return [];
    }

    const periods: Array<{ period: number; revenue: number; costs: number }> = [];
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
      model.assumptions.revenue.forEach((stream: RevenueStream) => {
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
      model.assumptions.costs.forEach((cost: CostCategory) => {
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
  private static getPrimaryModel(models: FinancialModel[]): FinancialModel | null {
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