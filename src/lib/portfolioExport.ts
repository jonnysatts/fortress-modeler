/**
 * Portfolio Export Utilities
 * Functions to collect and format portfolio-level data for export
 */

import { db } from '@/lib/db';
import { ExportDataType } from '@/store/types';
import { formatCurrency } from '@/lib/utils';
import useStore from '@/store/useStore';

/**
 * Get portfolio overview data for export
 * @returns A promise that resolves to the portfolio export data
 */
export async function getPortfolioExportData(): Promise<ExportDataType> {
  console.log('[PortfolioExport] Getting portfolio export data');

  try {
    // Get all projects
    const projects = await db.projects.toArray();
    console.log(`[PortfolioExport] Found ${projects.length} projects`);

    // Calculate metrics for each project
    const projectMetricsPromises = projects.map(async (project) => {
      const models = await db.financialModels.where('projectId').equals(project.id!).toArray();
      const actuals = await db.actuals.where('projectId').equals(project.id!).toArray();

      const latestModel = models.length > 0 ? models[0] : null;

      let totalRevenue = 0;
      let totalProfit = 0;
      let profitMargin = 0;
      const revenueConcentration = 0;
      let breakeven = false;
      let growthRate = 0;
      const forecastAccuracy = 0;
      const costEfficiency = 0;
      const marketingROI = 0;
      let healthScore = 0;
      let riskLevel: 'low' | 'medium' | 'high' = 'medium';

      if (latestModel?.assumptions?.metadata) {
        const metadata = latestModel.assumptions.metadata;

        // Calculate Revenue (based on model type or revenue streams)
        if (metadata.type === "WeeklyEvent" && metadata.initialWeeklyAttendance && metadata.perCustomer) {
          const weeks = metadata.weeks || 12;
          const initialAttendance = metadata.initialWeeklyAttendance;
          const ticketPrice = metadata.perCustomer.ticketPrice || 0;
          const attendanceGrowthRate = (metadata.growth?.attendanceGrowthRate || 0) / 100;

          // Calculate total revenue across all weeks
          let totalAttendance = 0;
          for (let week = 1; week <= weeks; week++) {
            const weeklyAttendance = Math.round(initialAttendance * Math.pow(1 + attendanceGrowthRate, week - 1));
            totalAttendance += weeklyAttendance;
          }

          totalRevenue = totalAttendance * ticketPrice;
          console.log(`[PortfolioExport] Calculated revenue for ${project.name}: ${totalRevenue}`);
        } else if (latestModel.assumptions.revenue && Array.isArray(latestModel.assumptions.revenue)) {
          // Fallback for other models: sum up revenue streams
          totalRevenue = latestModel.assumptions.revenue.reduce((sum, stream) => sum + (stream.value || 0), 0);
        }

        // Calculate Costs (from cost assumptions and marketing)
        let totalCosts = 0;
        if (latestModel.assumptions.costs && Array.isArray(latestModel.assumptions.costs)) {
          totalCosts += latestModel.assumptions.costs.reduce((sum, cost) => sum + (cost.value || 0), 0);
        }
        if (latestModel.assumptions.marketing?.channels && Array.isArray(latestModel.assumptions.marketing.channels)) {
          const marketingCosts = latestModel.assumptions.marketing.channels.reduce(
            (sum, channel) => sum + ((channel.weeklyBudget || 0) * (metadata.weeks || 12)), 0
          );
          totalCosts += marketingCosts;
        }

        // Calculate Profit and Margin dynamically
        totalProfit = totalRevenue - totalCosts;
        profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
        console.log(`[PortfolioExport] Calculated metrics for ${project.name}: Revenue=${totalRevenue}, Profit=${totalProfit}, Margin=${profitMargin}%`);

        // Determine breakeven dynamically
        breakeven = totalProfit > 0;

        // Extract growth rate dynamically from metadata
        growthRate = (latestModel.assumptions.metadata?.growth?.rate || 0) * 100;

        // Calculate health score dynamically
        healthScore = (
          (profitMargin > 15 ? 30 : (profitMargin > 0 ? 15 : 0)) + // Tiered profit margin score
          (breakeven ? 30 : 0) +
          (growthRate > 0 ? 20 : 0) +
          (actuals.length > 0 ? 20 : 0) // Score for having actuals entered
        );
        healthScore = Math.min(Math.max(healthScore, 0), 100); // Clamp score 0-100

        // Determine risk level based on health score
        if (healthScore >= 70) {
          riskLevel = 'low';
        } else if (healthScore >= 40) {
          riskLevel = 'medium';
        } else {
          riskLevel = 'high';
        }
      }

      return {
        ...project,
        totalRevenue,
        totalProfit,
        profitMargin,
        hasActuals: actuals.length > 0,
        revenueConcentration,
        breakeven,
        growthRate,
        forecastAccuracy,
        costEfficiency,
        marketingROI,
        healthScore,
        riskLevel
      };
    });

    const projectsWithMetrics = await Promise.all(projectMetricsPromises);

    // Calculate portfolio totals
    const portfolioTotals = projectsWithMetrics.reduce((totals, project) => {
      return {
        revenue: totals.revenue + (project.totalRevenue || 0),
        profit: totals.profit + (project.totalProfit || 0),
        projectsWithActuals: totals.projectsWithActuals + (project.hasActuals ? 1 : 0),
        projectsWithWarnings: totals.projectsWithWarnings + (
          project.revenueConcentration > 80 ||
          project.profitMargin < 20 ||
          !project.breakeven ? 1 : 0
        ),
        avgProfitMargin: totals.avgProfitMargin + (project.profitMargin || 0),
        avgGrowthRate: totals.avgGrowthRate + (project.growthRate || 0),
        avgHealthScore: totals.avgHealthScore + (project.healthScore || 0),
        highRiskCount: totals.highRiskCount + (project.riskLevel === 'high' ? 1 : 0),
        mediumRiskCount: totals.mediumRiskCount + (project.riskLevel === 'medium' ? 1 : 0),
        lowRiskCount: totals.lowRiskCount + (project.riskLevel === 'low' ? 1 : 0)
      };
    }, {
      revenue: 0,
      profit: 0,
      projectsWithActuals: 0,
      projectsWithWarnings: 0,
      avgProfitMargin: 0,
      avgGrowthRate: 0,
      avgHealthScore: 0,
      highRiskCount: 0,
      mediumRiskCount: 0,
      lowRiskCount: 0
    });

    // Calculate averages
    if (projectsWithMetrics.length > 0) {
      portfolioTotals.avgProfitMargin = portfolioTotals.avgProfitMargin / projectsWithMetrics.length;
      portfolioTotals.avgGrowthRate = portfolioTotals.avgGrowthRate / projectsWithMetrics.length;
      portfolioTotals.avgHealthScore = portfolioTotals.avgHealthScore / projectsWithMetrics.length;
    }

    // Sort projects by profit (highest first)
    projectsWithMetrics.sort((a, b) => b.totalProfit - a.totalProfit);

    // Create the export data
    const exportData: ExportDataType = {
      title: 'Portfolio Overview',
      exportDate: new Date(),
      summary: {
        totalProducts: projects.length,
        totalRevenue: portfolioTotals.revenue,
        totalProfit: portfolioTotals.profit,
        avgProfitMargin: portfolioTotals.avgProfitMargin,
        projectsWithWarnings: portfolioTotals.projectsWithWarnings,
        avgGrowthRate: portfolioTotals.avgGrowthRate,
        avgHealthScore: portfolioTotals.avgHealthScore
      },
      formattedSummary: {
        totalProducts: projects.length.toString(),
        totalRevenue: formatCurrency(portfolioTotals.revenue),
        totalProfit: formatCurrency(portfolioTotals.profit),
        avgProfitMargin: `${portfolioTotals.avgProfitMargin.toFixed(1)}%`,
        projectsWithWarnings: portfolioTotals.projectsWithWarnings.toString(),
        avgGrowthRate: `${portfolioTotals.avgGrowthRate.toFixed(1)}%`,
        avgHealthScore: portfolioTotals.avgHealthScore.toFixed(0)
      },
      riskDistribution: {
        highRisk: portfolioTotals.highRiskCount,
        mediumRisk: portfolioTotals.mediumRiskCount,
        lowRisk: portfolioTotals.lowRiskCount
      },
      projects: projectsWithMetrics.map(project => ({
        id: project.id,
        name: project.name,
        productType: project.productType,
        createdAt: project.createdAt,
        totalRevenue: project.totalRevenue || 0,
        totalProfit: project.totalProfit || 0,
        profitMargin: project.profitMargin || 0,
        growthRate: project.growthRate || 0,
        riskLevel: project.riskLevel,
        healthScore: project.healthScore || 0
      }))
    };

    console.log('[PortfolioExport] Created portfolio export data:', exportData);
    return exportData;
  } catch (error) {
    console.error('[PortfolioExport] Error getting portfolio export data:', error);
    return {
      title: 'Portfolio Overview',
      exportDate: new Date(),
      summary: {
        totalProducts: 0,
        totalRevenue: 0,
        totalProfit: 0,
        avgProfitMargin: 0,
        projectsWithWarnings: 0,
        avgGrowthRate: 0,
        avgHealthScore: 0
      },
      projects: []
    };
  }
}
