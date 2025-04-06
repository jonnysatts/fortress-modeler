import { FinancialModel } from './db'; // Adjust import path if necessary
import { RevenueStream, CostCategory, ModelMetadata, MarketingSetup, GrowthModel } from '@/types/models'; // Import necessary types

// Define the structure for each period in the time series
export interface ForecastPeriodData {
  period: number;
  point: string; // e.g., "Week 1" or "Month 1"
  revenue: number; // Renamed from revenueForecast for clarity
  cost: number; // Renamed from costForecast for clarity
  profit: number; // Renamed from profitForecast for clarity
  cumulativeRevenue: number;
  cumulativeCost: number;
  cumulativeProfit: number;
  attendance?: number; // Renamed from attendanceForecast
  // Include breakdown per stream/cost if needed later
}

// Calculate total revenue for a weekly event model over its duration, including growth
export const calculateTotalRevenue = (model: FinancialModel): number => {
  try {
    if (model.assumptions.metadata?.type !== "WeeklyEvent" || !model.assumptions.metadata) return 0;

    const metadata = model.assumptions.metadata;
    const weeks = metadata.weeks || 12;
    let totalRevenue = 0;

    // Calculate initial revenue from all streams
    const initialAttendance = metadata.initialWeeklyAttendance;
    const perCustomer = metadata.perCustomer;

    // Calculate week by week, starting from week 1 (not 0)
    for (let week = 1; week <= weeks; week++) {
      // Calculate attendance for this week
      const attendanceGrowthRate = metadata.growth.attendanceGrowthRate / 100;
      const currentAttendance = Math.round(
        initialAttendance * Math.pow(1 + attendanceGrowthRate, week - 1)
      );

      // Calculate per-customer values with growth if enabled
      let currentPerCustomer = { ...perCustomer };
      if (metadata.growth.useCustomerSpendGrowth) {
        currentPerCustomer = {
          ticketPrice: perCustomer.ticketPrice *
            Math.pow(1 + (metadata.growth.ticketPriceGrowth / 100), week - 1),
          fbSpend: perCustomer.fbSpend *
            Math.pow(1 + (metadata.growth.fbSpendGrowth / 100), week - 1),
          merchandiseSpend: perCustomer.merchandiseSpend *
            Math.pow(1 + (metadata.growth.merchandiseSpendGrowth / 100), week - 1),
          onlineSpend: perCustomer.onlineSpend *
            Math.pow(1 + (metadata.growth.onlineSpendGrowth / 100), week - 1),
          miscSpend: perCustomer.miscSpend *
            Math.pow(1 + (metadata.growth.miscSpendGrowth / 100), week - 1),
        };
      }

      // Calculate revenue for this week
      const weekRevenue =
        (currentAttendance * currentPerCustomer.ticketPrice) +
        (currentAttendance * currentPerCustomer.fbSpend) +
        (currentAttendance * currentPerCustomer.merchandiseSpend) +
        (currentAttendance * currentPerCustomer.onlineSpend) +
        (currentAttendance * currentPerCustomer.miscSpend);

      totalRevenue += weekRevenue;
    }

    return Math.round(totalRevenue);
  } catch (error) {
    console.error("Error calculating total revenue:", error);
    return 0;
  }
};

// Calculate total costs for a weekly event model over its duration, handling different cost types and growth
export const calculateTotalCosts = (model: FinancialModel): number => {
  try {
    if (model.assumptions.metadata?.type !== "WeeklyEvent" || !model.assumptions.metadata) return 0;

    const metadata = model.assumptions.metadata;
    const weeks = metadata.weeks || 12;
    if (weeks <= 0) return 0;

    let totalCosts = 0;
    const initialAttendance = metadata.initialWeeklyAttendance;
    const perCustomer = metadata.perCustomer;

    // Handle setup costs - should only be applied once
    const setupCosts = model.assumptions.costs.find(cost => cost.name === "Setup Costs")?.value || 0;
    totalCosts += setupCosts; // Add setup costs once, not per week

    // Calculate weekly costs
    for (let week = 1; week <= weeks; week++) {
      // Calculate attendance for this week
      const attendanceGrowthRate = metadata.growth.attendanceGrowthRate / 100;
      const currentAttendance = Math.round(
        initialAttendance * Math.pow(1 + attendanceGrowthRate, week - 1)
      );

      // Calculate F&B revenue for this week to determine COGS
      let currentFBSpend = perCustomer.fbSpend;
      if (metadata.growth.useCustomerSpendGrowth) {
        currentFBSpend *= Math.pow(1 + (metadata.growth.fbSpendGrowth / 100), week - 1);
      }
      const fbRevenue = currentAttendance * currentFBSpend;

      // Calculate costs for this week
      const fbCOGS = (fbRevenue * (metadata.costs.fbCOGSPercent || 30)) / 100;
      const staffCosts = (metadata.costs.staffCount || 0) * (metadata.costs.staffCostPerPerson || 0);
      const managementCosts = metadata.costs.managementCosts || 0;

      // Add all weekly costs
      totalCosts += fbCOGS + staffCosts + managementCosts;
    }

    return Math.round(totalCosts);
  } catch (error) {
    console.error("Error calculating total costs:", error);
    return 0;
  }
};

// NEW: Function to generate the full forecast time series
export const generateForecastTimeSeries = (model: FinancialModel): ForecastPeriodData[] => {
  console.log("[generateForecastTimeSeries] Starting calculation for model:", model?.name);
  if (!model?.assumptions) {
    console.warn("[generateForecastTimeSeries] No assumptions found in model.");
    return [];
  }

  const { assumptions } = model;
  const metadata = assumptions.metadata;
  const revenueStreams = assumptions.revenue || [];
  const costs = assumptions.costs || []; // Fixed/Recurring costs
  const marketingSetup = assumptions.marketing || { allocationMode: 'none', channels: [] };
  const growthModel = assumptions.growthModel; // Assume growthModel exists

  const isWeekly = metadata?.type === "WeeklyEvent";
  // Ensure duration is at least 1, default to 12 if not set or invalid
  const duration = Math.max(1, (isWeekly ? metadata?.weeks : 12) ?? 12);
  const timeUnit = isWeekly ? "Week" : "Month";

  console.log(`[generateForecastTimeSeries] Type: ${timeUnit}, Duration: ${duration}`);

  const periodicData: ForecastPeriodData[] = [];
  let cumulativeRevenue = 0;
  let cumulativeCost = 0;
  let cumulativeProfit = 0;

  try {
    for (let period = 1; period <= duration; period++) {
      const point = `${timeUnit} ${period}`;
      let periodRevenue = 0;
      let periodCost = 0;
      let currentAttendance = 0;

      // --- Calculate Attendance (if applicable) ---
      if (isWeekly && metadata?.initialWeeklyAttendance !== undefined) {
        const initialAttendance = metadata.initialWeeklyAttendance ?? 0;
        if (period === 1) {
          currentAttendance = initialAttendance;
        } else {
          // Use the overall growth model rate if attendance growth rate is not set
          let rate = (metadata.growth?.attendanceGrowthRate ?? 0) / 100;

          // If attendance growth rate is 0 but we have an overall growth model with exponential type,
          // use that rate instead
          if (rate === 0 && growthModel?.type === 'exponential' && growthModel?.rate > 0) {
            rate = growthModel.rate / 100;
            console.log(`[FinancialCalc] Using overall growth rate: ${rate * 100}% instead of attendance growth rate: 0%`);
          }

          currentAttendance = initialAttendance * Math.pow(1 + rate, period - 1);

          // Add debug logging
          if (period === 2) { // Only log for the second period to avoid console spam
            console.log(`[FinancialCalc] Attendance Growth: Initial=${initialAttendance}, Rate=${rate * 100}%, Period ${period}=${currentAttendance}`);
          }
        }
        currentAttendance = Math.round(currentAttendance);
      }
      // else: Handle non-weekly attendance if needed

      // --- Calculate Revenue ---
      let periodFBCRevenue = 0; // Track F&B revenue specifically for COGS
      let periodMerchRevenue = 0; // Track Merch revenue specifically for COGS
      periodRevenue = 0; // Reset period total revenue

      // Calculate Per-Attendee based revenue FIRST (if WeeklyEvent)
      if (isWeekly && metadata?.perCustomer) {
          let currentTicketPrice = metadata.perCustomer.ticketPrice ?? 0;
          let currentFbSpend = metadata.perCustomer.fbSpend ?? 0;
          let currentMerchSpend = metadata.perCustomer.merchandiseSpend ?? 0;

          // Apply growth if applicable
          if (period > 1 && metadata.growth?.useCustomerSpendGrowth) {
              currentTicketPrice *= Math.pow(1 + (metadata.growth.ticketPriceGrowth ?? 0) / 100, period - 1);
              currentFbSpend *= Math.pow(1 + (metadata.growth.fbSpendGrowth ?? 0) / 100, period - 1);
              currentMerchSpend *= Math.pow(1 + (metadata.growth.merchandiseSpendGrowth ?? 0) / 100, period - 1);
              // Add growth for other per-customer spend if needed
          }

          const ticketRevenue = currentAttendance * currentTicketPrice;
          periodFBCRevenue = currentAttendance * currentFbSpend; // Assign to specific var for COGS
          periodMerchRevenue = currentAttendance * currentMerchSpend; // Assign to specific var for COGS

          periodRevenue += ticketRevenue + periodFBCRevenue + periodMerchRevenue;
          // Add other per-attendee based streams (e.g., online, misc if calculated similarly)
      }

      // Add revenue from the *other* streams in the array (non-per-attendee)
      revenueStreams.forEach(stream => {
        // Skip the standard per-attendee streams as they are calculated above
        if (isWeekly && ["Ticket Sales", "F&B Sales", "Merchandise Sales"].includes(stream.name)) {
            return;
        }

        let streamRevenue = 0;
        const baseValue = stream.value ?? 0;

        // Apply growth model (non-weekly or non-per-attendee streams)
        streamRevenue = baseValue;
        if (period > 1 && growthModel) {
            const { type, rate } = growthModel;
            if (type === "linear") {
                streamRevenue = baseValue * (1 + rate * (period - 1));
            } else if (type === "exponential") {
                streamRevenue = baseValue * Math.pow(1 + rate, period - 1);
            }
        }
        periodRevenue += streamRevenue;
      });

      // --- Calculate Costs ---
      // 1. Calculated COGS
      const fbCogsPercent = metadata?.costs?.fbCOGSPercent ?? 0;
      const merchCogsPercent = metadata?.costs?.merchandiseCogsPercent ?? 0;
      const fbCOGS = (periodFBCRevenue * fbCogsPercent) / 100;
      const merchCOGS = (periodMerchRevenue * merchCogsPercent) / 100;

      // Add Logging for COGS
      if (period === 1) { // Log only for the first period to avoid flood
          console.log(`[ForecastCalc Period ${period}] F&B Revenue: ${periodFBCRevenue}, COGS %: ${fbCogsPercent}, Calculated F&B COGS: ${fbCOGS}`);
          console.log(`[ForecastCalc Period ${period}] Merch Revenue: ${periodMerchRevenue}, COGS %: ${merchCogsPercent}, Calculated Merch COGS: ${merchCOGS}`);
      }

      periodCost += fbCOGS + merchCOGS;
      let currentCostBreakdown: Record<string, number> = { fbCOGS, merchCOGS };

      // 2. Fixed/Recurring Costs from the list
      costs.forEach(cost => {
        let costValue = 0;
        const costType = cost.type?.toLowerCase();
        const baseValue = cost.value ?? 0;
        const costName = cost.name;

        if (costType === "fixed") {
          costValue = period === 1 ? baseValue : 0;
        } else if (costType === "recurring") {
          if (cost.name === "Setup Costs" && isWeekly && duration > 0) {
             costValue = baseValue / duration;
          } else {
             costValue = baseValue;
          }
        }

        periodCost += costValue;
        // Add to breakdown for logging
        if (costValue > 0) currentCostBreakdown[costName] = costValue; // Now allowed
      });

      // 3. Marketing Costs
      let periodMarketingCost = 0;

      // Ensure marketingSetup exists and has a valid allocationMode
      const marketingMode = marketingSetup?.allocationMode || 'none';

      console.log(`[ForecastCalc Period ${period}] Marketing Mode: ${marketingMode}`);

      if (marketingMode === 'channels') {
        // Sum up all channel weekly budgets
        const channels = Array.isArray(marketingSetup.channels) ? marketingSetup.channels : [];

        // Log each channel for debugging
        if (channels.length > 0) {
          console.log(`[ForecastCalc Period ${period}] Marketing Channels (${channels.length}):`);
          channels.forEach((ch, idx) => {
            console.log(`  Channel ${idx+1}: ${ch.name || 'Unnamed'} (${ch.channelType || 'Unknown'}) - Budget: ${ch.weeklyBudget || 0}`);
          });
        } else {
          console.log(`[ForecastCalc Period ${period}] No marketing channels defined.`);
        }

        // Calculate total budget from all channels
        const budget = channels.reduce((s, ch) => {
          const weeklyBudget = typeof ch.weeklyBudget === 'number' ? ch.weeklyBudget : 0;
          return s + weeklyBudget;
        }, 0);

        periodMarketingCost = isWeekly ? budget : budget * (365.25 / 7 / 12); // Approx monthly

        // Log channel budgets for debugging
        console.log(`[ForecastCalc Period ${period}] Total Channel Budget: ${budget} per ${isWeekly ? 'week' : 'month'}`);
        console.log(`[ForecastCalc Period ${period}] Calculated Marketing Cost: ${periodMarketingCost}`);
      } else if (marketingMode === 'highLevel') {
        // Ensure we have valid values for all required fields
        const totalBudget = typeof marketingSetup.totalBudget === 'number' ? marketingSetup.totalBudget : 0;
        const application = ['upfront', 'spreadEvenly', 'spreadCustom'].includes(marketingSetup.budgetApplication)
          ? marketingSetup.budgetApplication
          : 'spreadEvenly';
        const spreadDuration = typeof marketingSetup.spreadDuration === 'number' && marketingSetup.spreadDuration > 0
          ? marketingSetup.spreadDuration
          : duration; // Default to full duration
        const modelDuration = duration;

        // Log high-level budget for debugging
        console.log(`[ForecastCalc Period ${period}] Marketing Budget: ${totalBudget}, Application: ${application}, Duration: ${spreadDuration}/${modelDuration}`);

        if (application === 'upfront') {
          periodMarketingCost = (period === 1) ? totalBudget : 0;
        } else if (application === 'spreadEvenly' && modelDuration > 0) {
          periodMarketingCost = totalBudget / modelDuration;
        } else if (application === 'spreadCustom' && spreadDuration > 0) {
          periodMarketingCost = (period <= spreadDuration) ? (totalBudget / spreadDuration) : 0;
        }
      }

      // Add marketing cost to period cost
      periodCost += periodMarketingCost;
      if (periodMarketingCost > 0) {
        currentCostBreakdown["MarketingCost"] = periodMarketingCost;

        // Log marketing cost for debugging
        console.log(`[ForecastCalc Period ${period}] Marketing Cost: ${periodMarketingCost}`);
      } else {
        console.log(`[ForecastCalc Period ${period}] No marketing cost applied.`);
      }

      // Add Logging for Total Period Cost
      if (period === 1) {
          console.log(`[ForecastCalc Period ${period}] Total Period Cost: ${periodCost}`, currentCostBreakdown);
      }

      // --- Calculate Period Profit & Accumulate ---
      const periodProfit = periodRevenue - periodCost;
      cumulativeRevenue += periodRevenue;
      cumulativeCost += periodCost;
      cumulativeProfit += periodProfit;

      periodicData.push({
        period,
        point,
        revenue: Math.ceil(periodRevenue),
        cost: Math.ceil(periodCost),
        profit: Math.ceil(periodProfit),
        cumulativeRevenue: Math.ceil(cumulativeRevenue),
        cumulativeCost: Math.ceil(cumulativeCost),
        cumulativeProfit: Math.ceil(cumulativeProfit),
        attendance: isWeekly ? currentAttendance : undefined,
      });
    }
    console.log("[generateForecastTimeSeries] Calculation finished.");
    return periodicData;
  } catch (error) {
    console.error("[generateForecastTimeSeries] Error during calculation:", error);
    return []; // Return empty array on error
  }
};