/**
 * Data Export Utilities
 * Direct database access for export functionality
 */

import { db } from '@/lib/db';
import { ExportDataType } from '@/store/types';
import { generateForecastTimeSeries, ForecastPeriodData } from '@/lib/financialCalculations';

/**
 * Get real product data directly from the database
 * @param projectId The ID of the project to export
 * @returns A promise that resolves to the export data
 */
export async function getProductExportData(projectId: number): Promise<ExportDataType> {
  console.log(`[DataExport] Getting export data for project ${projectId}`);
  const fallbackData = createFallbackData("Product");

  try {
    const project = await db.projects.get(projectId);
    if (!project) {
      console.error(`[DataExport] Project ${projectId} not found`);
      return fallbackData;
    }
    console.log(`[DataExport] Found project:`, project);

    // --- Force fetch the LATEST model data directly from DB for export --- 
    console.log(`[DataExport] Force fetching latest model for project ID ${projectId}`);
    const currentModel = await db.financialModels.where({ projectId }).first(); // Fetch latest
    console.log(`[DataExport] Fetched latest model:`, currentModel);

    if (!currentModel) {
      console.warn(`[DataExport] No models found for project ${projectId}`);
      return fallbackData; // Return fallback if no model exists
    }

    // --- Proceed using the freshly fetched currentModel --- 
    const assumptions = currentModel.assumptions; // No optional chaining needed now
    const metadata = assumptions?.metadata;
    console.log("[DataExport] Using fetched model metadata:", metadata);

    // Fetch actuals (needed for marketing processing)
    const actuals = await db.actuals.where({ projectId }).toArray();
    console.log(`[DataExport] Found ${actuals.length} actuals:`, actuals);

    // Process performance data using the fetched model
    const periodPerformance = await processPeriodPerformance(actuals, currentModel);

    // --- NEW: Generate forecastTableData using the same function as the UI ---
    let forecastTableData: ForecastPeriodData[] = [];
    try {
      forecastTableData = generateForecastTimeSeries(currentModel);
      console.log('[DataExport] Generated forecastTableData for export:', forecastTableData);
    } catch (err) {
      console.error('[DataExport] Error generating forecastTableData:', err);
      forecastTableData = [];
    }

    // Calculate Revenue from periods
    const totalForecastRevenue = periodPerformance.reduce((sum, period) => sum + (period.totalForecast || 0), 0);
    const totalActualRevenue = periodPerformance.reduce((sum, period) => sum + (period.totalActual || 0), 0);
    const finalForecastRevenue = totalForecastRevenue;
    console.log(`[DataExport] Revenue Summary: Forecast=${finalForecastRevenue}, Actual=${totalActualRevenue}`);

    // --- Calculate Costs using fetched model data --- 
    let totalForecastCost = 0;
    const totalActualCost = 0; // Initialize totalActualCost to 0

    if (metadata) {
      const costAssumptions = metadata.costs || {};
      const perCustomerAssumptions = metadata.perCustomer || {};
      const weeks = metadata.weeks || 12;
      const growthRate = metadata.growth?.rate || 0;
      const initialAttendance = metadata.initialWeeklyAttendance || 0;
      const fbSpendPerAttendee = perCustomerAssumptions.fbSpend || 0;
      const merchSpendPerAttendee = perCustomerAssumptions.merchandiseSpend || 0;
      const fbCogsPercent = costAssumptions.fbCOGSPercent || 0;
      const merchCogsPercent = costAssumptions.merchandiseCogsPercent || 0;
      const staffCount = costAssumptions.staffCount || 0;
      const staffCostPerPerson = costAssumptions.staffCostPerPerson || 0;
      const managementFee = costAssumptions.managementFee || 0;

      // --- Verification Logs --- 
      console.log(`[DataExport VERIFY] Read Staff#: ${costAssumptions.staffCount}, Read StaffCost: ${costAssumptions.staffCostPerPerson}`);
      console.log(`[DataExport VERIFY] assumptions.costs array:`, assumptions.costs);
      // --- End Verification Logs ---

      // Log key values used in calculation
      console.log(`[DataExport] Weeks: ${weeks}, Growth: ${growthRate}, Initial Attend: ${initialAttendance}`);
      console.log(`[DataExport] Rev Assumptions: F&B Spend=${fbSpendPerAttendee}, Merch Spend=${merchSpendPerAttendee}`);
      console.log(`[DataExport] Cost Assumptions: F&B COGS=${fbCogsPercent}, Merch COGS=${merchCogsPercent}, Staff#=${staffCount}, StaffCost=${staffCostPerPerson}, MgmtFee=${managementFee}`);

      // Calculate COGS base revenue
      let totalForecastFbRevenueForCogs = 0;
      let totalForecastMerchRevenueForCogs = 0;
      if (metadata.type === "WeeklyEvent") {
        for (let week = 1; week <= weeks; week++) {
          const weeklyAttendance = Math.round(initialAttendance * Math.pow(1 + growthRate, week - 1));
          totalForecastFbRevenueForCogs += weeklyAttendance * fbSpendPerAttendee;
          totalForecastMerchRevenueForCogs += weeklyAttendance * merchSpendPerAttendee;
        }
      }
      console.log(`[DataExport] COGS Base Revenue: F&B=${totalForecastFbRevenueForCogs}, Merch=${totalForecastMerchRevenueForCogs}`);

      // Calculate COGS Cost (Divide percentages by 100)
      const forecastFBCogsCost = totalForecastFbRevenueForCogs * (fbCogsPercent / 100);
      const forecastMerchCogsCost = totalForecastMerchRevenueForCogs * (merchCogsPercent / 100);
      totalForecastCost += forecastFBCogsCost + forecastMerchCogsCost;
      console.log(`[DataExport] COGS Cost Contribution: ${forecastFBCogsCost + forecastMerchCogsCost}`);

      // Calculate Staff Costs
      const forecastStaffCost = staffCount * staffCostPerPerson * weeks;
      totalForecastCost += forecastStaffCost;
      console.log(`[DataExport] Staff Cost Contribution: ${forecastStaffCost}`);

      // Calculate Fixed/Management Costs
      const forecastMgmtCost = managementFee * weeks;
      totalForecastCost += forecastMgmtCost;
      console.log(`[DataExport] Mgmt Fee Cost Contribution: ${forecastMgmtCost}`);

      // Add Other Fixed Costs (from assumptions.costs array)
      if (Array.isArray(assumptions.costs)) {
        const otherFixedCosts = assumptions.costs.reduce((sum, cost) => {
          const costValue = cost.value || 0;
          // Check if the cost is recurring and multiply by weeks if so
          if (cost.type === 'recurring') {
            return sum + (costValue * weeks);
          } else {
            // Otherwise, add it as a one-time fixed cost
            return sum + costValue;
          }
        }, 0); // Initial sum is 0
        totalForecastCost += otherFixedCosts;
        console.log(`[DataExport] Other Fixed Cost Contribution (Recurring adjusted): ${otherFixedCosts}`);
      } else {
        console.log("[DataExport] No assumptions.costs array found.");
      }

      // Add Marketing Costs
      // Removed marketing cost calculation
    } else {
      console.warn("[DataExport] Metadata not found in fetched model, cost calculation might be incomplete.");
      totalForecastCost = 0;
    }
    console.log(`[DataExport] Total Forecast Cost Calculated: ${totalForecastCost}`);

    // --- Calculate Profit --- 
    const totalForecastProfit = finalForecastRevenue - totalForecastCost;
    const totalActualProfit = totalActualRevenue - totalActualCost;
    console.log(`[DataExport] Profit Summary: Forecast=${totalForecastProfit}, Actual=${totalActualProfit}`);

    // --- Create the export data object --- 
    const exportData: ExportDataType = {
      title: `${project.name} Report`,
      projectName: project.name,
      productType: project.productType,
      exportDate: new Date(),
      model: currentModel, // Include the fetched model
      summary: {
        totalForecast: finalForecastRevenue,
        totalActual: totalActualRevenue,
        totalForecastCost: totalForecastCost,
        totalActualCost: totalActualCost,
        totalForecastProfit: totalForecastProfit,
        totalActualProfit: totalActualProfit,
        percentUtilized: 0, // Removed marketing utilization calculation
        forecastToDate: finalForecastRevenue,
        actualToDate: totalActualRevenue,
        marketingForecast: 0, // Removed marketing forecast
        marketingActual: 0 // Removed marketing actual
      },
      formattedSummary: {
        totalForecast: formatCurrency(finalForecastRevenue),
        totalActual: formatCurrency(totalActualRevenue),
        totalForecastCost: formatCurrency(totalForecastCost),
        totalActualCost: formatCurrency(totalActualCost),
        totalForecastProfit: formatCurrency(totalForecastProfit),
        totalActualProfit: formatCurrency(totalActualProfit),
        percentUtilized: "0%",
        forecastToDate: formatCurrency(finalForecastRevenue),
        actualToDate: formatCurrency(totalActualRevenue),
        marketingForecast: formatCurrency(0), // Removed marketing forecast
        marketingActual: formatCurrency(0) // Removed marketing actual
      },
      marketingChannels: [], // Removed marketing channels
      performanceData: {
        channelPerformance: [], // Removed channel performance
        periodPerformance: periodPerformance.map(period => ({
          name: period.name,
          forecast: period.totalForecast,
          actual: period.totalActual || 0,
          variance: (period.totalActual || 0) - period.totalForecast,
          attendanceForecast: period.attendanceForecast || 0,
          attendanceActual: period.attendanceActual || 0
        }))
      },
      // --- NEW: Add forecastTableData for Excel export ---
      forecastTableData
    };

    console.log('[DataExport] Returning real export data based on freshly fetched model');
    return exportData;

  } catch (error) {
    console.error(`[DataExport] Error getting export data:`, error);
    return fallbackData;
  }
}

// Helper function to create fallback data
function createFallbackData(projectName: string): ExportDataType {
  console.log(`[DataExport] Creating fallback data for ${projectName}`);

  return {
    title: `${projectName} Report`,
    projectName: projectName,
    exportDate: new Date(),
    summary: {
      totalForecast: 10000,
      totalActual: 8500,
      percentUtilized: 85,
      forecastToDate: 9000,
      actualToDate: 8500
    },
    formattedSummary: {
      totalForecast: "$10,000.00",
      totalActual: "$8,500.00",
      percentUtilized: "85%",
      forecastToDate: "$9,000.00",
      actualToDate: "$8,500.00"
    },
    marketingChannels: [],
    performanceData: {
      channelPerformance: [],
      periodPerformance: [
        { name: "Week 1", forecast: 2500, actual: 2200, variance: -300 },
        { name: "Week 2", forecast: 2500, actual: 2100, variance: -400 },
        { name: "Week 3", forecast: 2500, actual: 2300, variance: -200 },
        { name: "Week 4", forecast: 2500, actual: 1900, variance: -600 }
      ]
    }
  };
}

// Helper function to process period performance
async function processPeriodPerformance(actuals: any[], model: any) {
  console.log('[DataExport] Processing period performance with actuals:', actuals);
  console.log('[DataExport] Model:', model);

  if (!model?.assumptions?.metadata) {
    console.log('[DataExport] No model or metadata found, returning empty array');
    return [];
  }

  // Get forecast data from the model or calculate it
  let forecastData: any[] = [];
  const metadata = model.assumptions.metadata;

  if (model.forecastData && Array.isArray(model.forecastData) && model.forecastData.length > 0) {
    console.log("[DataExport] Using existing forecastData from model");
    forecastData = model.forecastData;
  } else {
    // Calculate forecast data from model assumptions
    console.log("[DataExport] Calculating forecast data from assumptions");
    const weeks = metadata.weeks || 12;
    const initialAttendance = metadata.initialWeeklyAttendance || 0;
    const growthRate = (metadata.growth?.rate || 0); // Keep as decimal for calculation
    const perCustomer = metadata.perCustomer || {};
    const ticketPrice = perCustomer.ticketPrice || 0;
    const fbSpend = perCustomer.fbSpend || 0;
    const merchSpend = perCustomer.merchandiseSpend || 0;

    // Ensure ALL relevant spend types are included here
    const revenuePerAttendee = ticketPrice + fbSpend + merchSpend;
    console.log(`[DataExport] Calculated Revenue Per Attendee: ${revenuePerAttendee} (Ticket: ${ticketPrice}, F&B: ${fbSpend}, Merch: ${merchSpend})`);

    // Generate forecast data for each week - Always run this loop
    for (let week = 1; week <= weeks; week++) {
      // Calculate attendance with growth
      const attendance = Math.round(initialAttendance * Math.pow(1 + growthRate, week - 1));
      // Calculate revenue based on attendance and total revenue per attendee
      const revenue = attendance * revenuePerAttendee;

      forecastData.push({
        period: week,
        revenue: revenue,
        attendance: attendance
      });
    }
    console.log(`[DataExport] Generated forecast data for ${forecastData.length} weeks`);
  }

  // Process actuals if available
  let processedActuals: any[] = [];
  if (actuals && actuals.length > 0) {
    // Sort actuals by period
    processedActuals = [...actuals].sort((a, b) => a.period - b.period);
  }

  // Combine forecast and actuals
  const combinedData = [];
  const maxPeriod = Math.max(
    forecastData.length > 0 ? Math.max(...forecastData.map(d => d.period || 0)) : 0,
    processedActuals.length > 0 ? Math.max(...processedActuals.map(d => d.period || 0)) : 0,
    metadata.weeks || 12 // Use weeks from metadata if available
  );

  for (let period = 1; period <= maxPeriod; period++) {
    const forecastPeriod = forecastData.find(d => d.period === period) || {};
    const actualPeriod = processedActuals.find(d => d.period === period) || {};

    // Get forecast revenue directly from the calculated/provided forecastData
    const forecastRevenue = forecastPeriod.revenue || 0;

    // Get actual revenue from actuals
    let actualRevenue = 0;
    if (actualPeriod.revenue) {
      actualRevenue = actualPeriod.revenue;
    } else if (actualPeriod.revenueActuals) {
      // Sum up revenue actuals if available
      Object.values(actualPeriod.revenueActuals || {}).forEach((revenueActual: any) => {
        actualRevenue += revenueActual.amount || 0;
      });
    }

    combinedData.push({
      period: period,
      name: `Week ${period}`,
      totalForecast: forecastRevenue, // Use the calculated forecast revenue
      totalActual: actualRevenue,
      attendanceForecast: forecastPeriod.attendance || 0,
      attendanceActual: actualPeriod.attendance || 0
      // Add back notes or other fields from actualPeriod if needed
    });
  }

  console.log(`[DataExport] Combined data for ${combinedData.length} periods:`, combinedData);
  return combinedData;
}

// Helper function to format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(value);
}
