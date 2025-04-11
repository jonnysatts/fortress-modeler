import { useMemo } from 'react';
import { FinancialModel, ActualsPeriodEntry } from '@/lib/db';
import { generateForecastTimeSeries, ForecastPeriodData } from '@/lib/financialCalculations';

// Export this interface
export interface AnalysisPeriodData {
  period: number;
  point: string; // e.g., "Week 1"
  revenueForecast: number;
  costForecast: number;
  profitForecast: number;
  revenueActual?: number;
  costActual?: number;
  profitActual?: number;
  revenueVariance?: number;
  costVariance?: number;
  profitVariance?: number;
  revenueVariancePercent?: number;
  costVariancePercent?: number;
  profitVariancePercent?: number;
  attendanceForecast?: number;
  attendanceActual?: number;
  attendanceVariance?: number;
  cumulativeRevenueForecast?: number;
  cumulativeCostForecast?: number;
  cumulativeProfitForecast?: number;
  cumulativeRevenueActual?: number;
  cumulativeCostActual?: number;
  cumulativeProfitActual?: number;
}

// Export this interface too
export interface AnalysisSummary {
  // Forecast totals (original forecast)
  totalRevenueForecast: number;
  totalCostForecast: number;
  totalProfitForecast: number;
  avgProfitMarginForecast: number;

  // Period-specific forecasts (for periods with actuals)
  periodSpecificRevenueForecast: number;
  periodSpecificCostForecast: number;
  periodSpecificProfitForecast: number;
  periodSpecificProfitMargin: number;
  periodSpecificAttendanceForecast?: number;

  // Actual totals (only from periods with actual data)
  actualTotalRevenue: number;
  actualTotalCost: number;
  actualTotalProfit: number;
  actualTotalAttendance: number;
  periodsWithActuals: number;
  actualAvgProfitMargin: number;

  // Revised outlook (blend of actuals + forecast)
  revisedTotalRevenue: number;
  revisedTotalCost: number;
  revisedTotalProfit: number;

  // Period-specific variances
  periodRevenueVariance: number;
  periodCostVariance: number;
  periodProfitVariance: number;
  periodRevenueVariancePercent: number;
  periodCostVariancePercent: number;
  periodProfitVariancePercent: number;

  // Other metrics
  duration: number;
  revisedAvgProfitMargin: number;

  // Variances
  totalRevenueVariance: number;
  totalCostVariance: number;
  totalProfitVariance: number;

  // Other metrics
  latestActualPeriod: number;
  timeUnit: 'Week' | 'Month';

  // Attendance metrics
  totalAttendanceForecast: number;
  totalAttendanceActual: number;
  totalAttendanceVariance: number;
}

interface ForecastAnalysisResult {
  summary: AnalysisSummary | null;
  trendData: AnalysisPeriodData[];
  selectedModel: FinancialModel | undefined;
  isWeeklyEvent: boolean;
}

export const useForecastAnalysis = (
  financialModels: FinancialModel[],
  actualsData: ActualsPeriodEntry[],
  selectedModelId?: number
): ForecastAnalysisResult => {
  console.log("[useForecastAnalysis Hook] Running"); // Log hook entry

  // Find the selected model object
  const selectedModel = useMemo(() => {
    console.log("[useForecastAnalysis Hook] Calculating selectedModel");
    return financialModels.find(m => m.id === selectedModelId);
  }, [selectedModelId, financialModels]);

  // Calculate combined forecast, actuals, and variance data
  const analysisData = useMemo(() => {
    if (!selectedModel) return null;
    console.log(`[useForecastAnalysis Hook] Calculating for Model ID: ${selectedModelId}`);

    try {
        // 1. Generate the base forecast using the central function
        const forecastTrendData: ForecastPeriodData[] = generateForecastTimeSeries(selectedModel);
        if (forecastTrendData.length === 0) {
            console.warn("[useForecastAnalysis Hook] generateForecastTimeSeries returned empty data.");
            // Return null or a default state if forecast generation fails?
             return null;
        }

        const duration = forecastTrendData.length;
        const timeUnit = forecastTrendData[0]?.point.split(' ')[0] as 'Week' | 'Month' || 'Period';
        const isWeekly = timeUnit === 'Week';

        // 2. Process Actuals
        const actualsMap = new Map(actualsData.map(a => [a.period, a]));
        let cumulativeRevenueActual = 0;
        let cumulativeCostActual = 0;
        let cumulativeAttendanceActual = 0;
        let latestActualPeriod = 0;

        // Initialize cumulative trackers for forecast (already present)
        const cumulativeRevenueForecast = 0;
        const cumulativeCostForecast = 0;
        const cumulativeProfitForecast = 0;

        // 3. Merge Forecast and Actuals
        const periodicAnalysisData: AnalysisPeriodData[] = forecastTrendData.map(forecastPeriod => {
            const actualEntry = actualsMap.get(forecastPeriod.period);
            let periodRevenueActual: number | undefined = undefined;
            let periodCostActual: number | undefined = undefined; // Will use calculated actual cost including COGS
            let periodProfitActual: number | undefined = undefined;
            let periodAttendanceActual: number | undefined = undefined;

            if (actualEntry) {
                latestActualPeriod = Math.max(latestActualPeriod, forecastPeriod.period);
                // Sum recorded revenue streams
                const recordedRevenue = actualEntry.revenueActuals || {};
                periodRevenueActual = Object.values(recordedRevenue).reduce((s, v) => s + v, 0);
                cumulativeRevenueActual += periodRevenueActual;

                // --- Calculate Actual Costs (including COGS derived from actual revenue) ---
                let calculatedVariableCosts = 0;
                let calculatedFixedCosts = 0;
                let calculatedRecurringCosts = 0;
                let calculatedMarketingCosts = 0;

                // COGS based on Actual Revenue
                const fbRevenueActual = recordedRevenue["F&B Sales"] ?? 0;
                const merchRevenueActual = recordedRevenue["Merchandise Sales"] ?? 0;
                const fbCogsPercent = selectedModel.assumptions?.metadata?.costs?.fbCOGSPercent ?? 0;
                const merchCogsPercent = selectedModel.assumptions?.metadata?.costs?.merchandiseCogsPercent ?? 0;
                calculatedVariableCosts += (fbRevenueActual * fbCogsPercent) / 100;
                calculatedVariableCosts += (merchRevenueActual * merchCogsPercent) / 100;

                // Other costs entered by user
                const recordedCosts = actualEntry.costActuals || {};
                for (const [costName, costValue] of Object.entries(recordedCosts)) {
                    const value = costValue ?? 0;
                    if (costName === "F&B COGS" || costName === "Merchandise COGS") continue; // Skip COGS

                    const assumption = selectedModel.assumptions?.costs?.find(c => c.name === costName);
                    if (costName === "Marketing Budget") calculatedMarketingCosts += value;
                    else if (assumption?.type === 'fixed' || costName === "Setup Costs") calculatedFixedCosts += value;
                    else if (assumption?.type === 'recurring') calculatedRecurringCosts += value;
                    // Handle other 'variable' costs if necessary
                }
                periodCostActual = calculatedVariableCosts + calculatedFixedCosts + calculatedRecurringCosts + calculatedMarketingCosts;
                cumulativeCostActual += periodCostActual;
                // --- End Actual Cost Calculation ---

                periodProfitActual = periodRevenueActual - periodCostActual;

                if (isWeekly && actualEntry.attendanceActual !== undefined && actualEntry.attendanceActual !== null) {
                    periodAttendanceActual = actualEntry.attendanceActual;
                    cumulativeAttendanceActual += periodAttendanceActual;
                }
            }

            // Rename forecast fields to match AnalysisPeriodData interface
            const revenueForecast = forecastPeriod.revenue;
            const costForecast = forecastPeriod.cost;
            const profitForecast = forecastPeriod.profit;
            const attendanceForecast = forecastPeriod.attendance;

            // Calculate Variances
            const revenueVariance = periodRevenueActual !== undefined ? periodRevenueActual - revenueForecast : undefined;
            const costVariance = periodCostActual !== undefined ? periodCostActual - costForecast : undefined;
            const profitVariance = periodProfitActual !== undefined ? periodProfitActual - profitForecast : undefined;
            const revenueVariancePercent = revenueForecast !== 0 && revenueVariance !== undefined ? (revenueVariance / revenueForecast) * 100 : undefined;
            const costVariancePercent = costForecast !== 0 && costVariance !== undefined ? (costVariance / costForecast) * 100 : undefined;
            const profitVariancePercent = profitForecast !== 0 && profitVariance !== undefined ? (profitVariance / profitForecast) * 100 : undefined;
            const attendanceVariance = periodAttendanceActual !== undefined && attendanceForecast !== undefined ? periodAttendanceActual - attendanceForecast : undefined;

            // --- Accumulate Cumulative Values (Corrected) ---
            const cumulativeRevenueForecast = forecastPeriod.cumulativeRevenue;
            const cumulativeCostForecast = forecastPeriod.cumulativeCost;
            const cumulativeProfitForecast = forecastPeriod.cumulativeProfit;
            // Use the CORRECT cumulative actuals calculated earlier
            const currentCumulativeRevenueActual = actualEntry ? cumulativeRevenueActual : undefined;
            const currentCumulativeCostActual = actualEntry ? cumulativeCostActual : undefined;
            const currentCumulativeProfitActual = (currentCumulativeRevenueActual !== undefined && currentCumulativeCostActual !== undefined)
                                                  ? currentCumulativeRevenueActual - currentCumulativeCostActual
                                                  : undefined;

            const periodResult = {
                period: forecastPeriod.period,
                point: forecastPeriod.point,
                revenueForecast,
                costForecast,
                profitForecast,
                revenueActual: periodRevenueActual !== undefined ? Math.ceil(periodRevenueActual) : undefined,
                costActual: periodCostActual !== undefined ? Math.ceil(periodCostActual) : undefined,
                profitActual: periodProfitActual !== undefined ? Math.ceil(periodProfitActual) : undefined,
                revenueVariance, costVariance, profitVariance,
                revenueVariancePercent, costVariancePercent, profitVariancePercent,
                attendanceForecast,
                attendanceActual: periodAttendanceActual,
                attendanceVariance,
                cumulativeRevenueForecast,
                cumulativeCostForecast,
                cumulativeProfitForecast,
                cumulativeRevenueActual: currentCumulativeRevenueActual,
                cumulativeCostActual: currentCumulativeCostActual,
                cumulativeProfitActual: currentCumulativeProfitActual,
            };

            // Log the data for the first period
            if (forecastPeriod.period === 1) {
                console.log("[useForecastAnalysis Hook] Period 1 Merged Data Point:", periodResult);
            }

            return periodResult;
        });

        // 4. Calculate Summary Metrics using merged data
        const { cumulativeRevenue: totalRevenueForecast, cumulativeCost: totalCostForecast, cumulativeProfit: totalProfitForecast } = forecastTrendData[duration - 1] || { cumulativeRevenue: 0, cumulativeCost: 0, cumulativeProfit: 0 };
        const totalAttendanceForecastOverall = isWeekly ? forecastTrendData.reduce((sum, p) => sum + (p.attendance ?? 0), 0) : undefined;
        const avgProfitMarginForecast = totalRevenueForecast > 0 ? (totalProfitForecast / totalRevenueForecast) * 100 : 0;

        // Calculate Actuals Totals & Period-Specific Forecasts (up to latestActualPeriod)
        let actualTotalRevenue = 0;
        let actualTotalCost = 0;
        let actualTotalProfit = 0;
        let periodsWithActuals = 0;
        let periodSpecificRevenueForecast = 0;
        let periodSpecificCostForecast = 0;
        let periodSpecificProfitForecast = 0;
        let periodSpecificAttendanceForecast = 0;

        // Calculate Revised Outlook Totals (blend)
        let revisedTotalRevenue = 0;
        let revisedTotalCost = 0;

        for (let period = 1; period <= duration; period++) {
            const p = periodicAnalysisData[period - 1];

            // Check if we have actuals for this period
            const hasActualsThisPeriod = period <= latestActualPeriod && p.revenueActual !== undefined && p.costActual !== undefined;

            if (hasActualsThisPeriod) {
                actualTotalRevenue += p.revenueActual!;
                actualTotalCost += p.costActual!;
                actualTotalProfit += p.profitActual ?? (p.revenueActual! - p.costActual!);
                periodsWithActuals++;

                // Sum forecast values *only* for periods with actuals
                periodSpecificRevenueForecast += p.revenueForecast;
                periodSpecificCostForecast += p.costForecast;
                periodSpecificProfitForecast += p.profitForecast;
                if(p.attendanceForecast !== undefined) {
                   periodSpecificAttendanceForecast += p.attendanceForecast;
                }
            }

            // Revised outlook uses actuals if available, otherwise forecast
            revisedTotalRevenue += p.revenueActual ?? p.revenueForecast;
            revisedTotalCost += p.costActual ?? p.costForecast;
        }

        const revisedTotalProfit = revisedTotalRevenue - revisedTotalCost;
        const actualAvgProfitMargin = actualTotalRevenue > 0 ? (actualTotalProfit / actualTotalRevenue) * 100 : 0;
        const revisedAvgProfitMargin = revisedTotalRevenue > 0 ? (revisedTotalProfit / revisedTotalRevenue) * 100 : 0;
        const totalRevenueVariance = revisedTotalRevenue - totalRevenueForecast;
        const totalCostVariance = revisedTotalCost - totalCostForecast;
        const totalProfitVariance = revisedTotalProfit - totalProfitForecast;
        const totalAttendanceVariance = cumulativeAttendanceActual - (totalAttendanceForecastOverall ?? 0);

        const summary: AnalysisSummary = {
           // Forecast totals (original full forecast)
           totalRevenueForecast,
           totalCostForecast,
           totalProfitForecast,
           avgProfitMarginForecast,

           // Period-specific forecasts (Forecast up to latest actual period)
           periodSpecificRevenueForecast,
           periodSpecificCostForecast,
           periodSpecificProfitForecast,
           periodSpecificProfitMargin: periodSpecificRevenueForecast > 0 ?
               (periodSpecificProfitForecast / periodSpecificRevenueForecast) * 100 : 0,
           periodSpecificAttendanceForecast: isWeekly ? periodSpecificAttendanceForecast : undefined,

           // Actual totals (Actuals up to latest actual period)
           actualTotalRevenue,
           actualTotalCost,
           actualTotalProfit,
           actualTotalAttendance: cumulativeAttendanceActual,
           periodsWithActuals,
           actualAvgProfitMargin,

           // Revised outlook (blend of actuals + forecast)
           revisedTotalRevenue,
           revisedTotalCost,
           revisedTotalProfit,
           revisedAvgProfitMargin,
           
           // Variances (between revised outlook and original forecast)
           totalRevenueVariance,
           totalCostVariance,
           totalProfitVariance,

           // Period-specific variances (between actuals and period-specific forecasts)
           periodRevenueVariance: actualTotalRevenue - periodSpecificRevenueForecast,
           periodCostVariance: actualTotalCost - periodSpecificCostForecast,
           periodProfitVariance: actualTotalProfit - periodSpecificProfitForecast,
           periodRevenueVariancePercent: periodSpecificRevenueForecast > 0 ?
               ((actualTotalRevenue - periodSpecificRevenueForecast) / periodSpecificRevenueForecast) * 100 : 0,
           periodCostVariancePercent: periodSpecificCostForecast > 0 ?
               ((actualTotalCost - periodSpecificCostForecast) / periodSpecificCostForecast) * 100 : 0,
           periodProfitVariancePercent: periodSpecificProfitForecast > 0 ?
               ((actualTotalProfit - periodSpecificProfitForecast) / periodSpecificProfitForecast) * 100 : 0,

           // Other metrics
           latestActualPeriod,
           timeUnit,
           duration,

           // Attendance metrics
           totalAttendanceForecast: totalAttendanceForecastOverall ?? 0,
           totalAttendanceActual: cumulativeAttendanceActual,
           totalAttendanceVariance,
        };

        // Log the actual values to verify they're being calculated
        console.log("[useForecastAnalysis Hook] Actual values:", {
          actualTotalRevenue,
          actualTotalCost,
          actualTotalProfit,
          periodsWithActuals
        });

        // Log summary before returning
        console.log("[useForecastAnalysis Hook] Calculated Summary:", summary);

        console.log("[useForecastAnalysis Hook] Calculation finished successfully.");
        return {
            summary: summary,
            trendData: periodicAnalysisData
        };
    } catch (error) {
        console.error("[useForecastAnalysis Hook] Error during calculation:", error);
        return null; // Return null on error
    }

  }, [selectedModel, actualsData, selectedModelId]);

  const isWeeklyEvent = selectedModel?.assumptions?.metadata?.type === "WeeklyEvent";
  console.log(`[useForecastAnalysis Hook] Returning data. Summary exists: ${!!analysisData?.summary}, Trend length: ${analysisData?.trendData?.length ?? 0}`);

  return {
    summary: analysisData?.summary || null,
    trendData: analysisData?.trendData || [],
    selectedModel,
    isWeeklyEvent
  };
};
