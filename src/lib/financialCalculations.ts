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
  // For backward compatibility with components that expect totalCost
  totalCost?: number; // Alias for cost
  // Include breakdown per stream/cost if needed later
}

// Calculate total revenue for a weekly event model over its duration, including growth
export const calculateTotalRevenue = (model: FinancialModel): number => {
  try {
    // Check for both "WeeklyEvent" and "Weekly" for backward compatibility
    const isWeeklyEvent = model.assumptions.metadata?.type === "WeeklyEvent" || model.assumptions.metadata?.type === "Weekly";
    if (!isWeeklyEvent || !model.assumptions.metadata) return 0;

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
        (initialAttendance ?? 0) * (attendanceGrowthRate === 0 ? 1 : Math.pow(1 + attendanceGrowthRate, week - 1))
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
    // Check for both "WeeklyEvent" and "Weekly" for backward compatibility
    const isWeeklyEvent = model.assumptions.metadata?.type === "WeeklyEvent" || model.assumptions.metadata?.type === "Weekly";
    if (!isWeeklyEvent || !model.assumptions.metadata) return 0;

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
        (initialAttendance ?? 0) * (attendanceGrowthRate === 0 ? 1 : Math.pow(1 + attendanceGrowthRate, week - 1))
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
  console.log("[DEBUG] Growth settings:", {
    attendanceGrowthRate: model.assumptions.metadata?.growth?.attendanceGrowthRate,
    ticketPriceGrowth: model.assumptions.metadata?.growth?.ticketPriceGrowth,
    fbSpendGrowth: model.assumptions.metadata?.growth?.fbSpendGrowth,
    merchandiseSpendGrowth: model.assumptions.metadata?.growth?.merchandiseSpendGrowth,
    useCustomerSpendGrowth: model.assumptions.metadata?.growth?.useCustomerSpendGrowth,
    growthModel: model.assumptions.growthModel,
    modelName: model.name,
    time: new Date().toISOString(),
  });

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

  // Check for both "WeeklyEvent" and "Weekly" for backward compatibility
  const isWeekly = metadata?.type === "WeeklyEvent" || metadata?.type === "Weekly";
  // Ensure duration is at least 1, default to 12 if not set or invalid
  const duration = Math.max(1, (isWeekly ? metadata?.weeks : 12) ?? 12);
  const timeUnit = isWeekly ? "Week" : "Month";

  console.log(`[generateForecastTimeSeries] Type: ${timeUnit}, Duration: ${duration}`);

  const periodicData: ForecastPeriodData[] = [];
  let cumulativeRevenue = 0;
  let cumulativeCost = 0;
  let cumulativeProfit = 0;

  try {
    // Use growthModel if present, otherwise use specific growth fields
    const useOverallGrowth = !!assumptions.growthModel;
    const overallGrowthType = assumptions.growthModel?.type || 'exponential';
    // FIX: Growth rate must always be a decimal
    const overallGrowthRate = (assumptions.growthModel?.rate ?? 0) / 100;

    // Enhanced debug logging for growth settings
    console.log('[DEBUG] GROWTH SETTINGS START');
    console.log('Raw growth settings:', model.assumptions.metadata?.growth);
    console.log('Stringified growth settings:', JSON.stringify(model.assumptions.metadata?.growth, null, 2));
    console.log('Attendance growth rate (decimal):', model.assumptions.metadata?.growth?.attendanceGrowthRate ? model.assumptions.metadata?.growth?.attendanceGrowthRate / 100 : 0);
    console.log('Use customer spend growth:', model.assumptions.metadata?.growth?.useCustomerSpendGrowth);
    console.log('Use growth:', model.assumptions.metadata?.useGrowth);
    console.log('Growth model (raw):', model.assumptions.growthModel);
    console.log('Growth model (stringified):', JSON.stringify(model.assumptions.growthModel, null, 2));
    console.log('[DEBUG] GROWTH SETTINGS END');

    for (let period = 1; period <= duration; period++) {
      const point = `${timeUnit} ${period}`;
      let periodRevenue = 0;
      let periodCost = 0;
      let currentAttendance = 0;

      // --- Calculate Attendance (if applicable) ---
      if (isWeekly && metadata?.initialWeeklyAttendance !== undefined) {
        const initialAttendance = metadata.initialWeeklyAttendance;
        if (period === 1) {
          currentAttendance = initialAttendance;
          console.log(`[FinancialCalc Period ${period}] Initial attendance: ${currentAttendance}`);
        } else {
          let rate = 0;
          if (useOverallGrowth && overallGrowthRate > 0) {
            rate = overallGrowthRate;
          } else if (metadata.growth?.attendanceGrowthRate) {
            rate = (metadata.growth.attendanceGrowthRate ?? 0) / 100;
          }
          if (rate > 0) {
            if (useOverallGrowth && overallGrowthType === 'linear') {
              currentAttendance = initialAttendance + initialAttendance * rate * (period - 1);
            } else {
              currentAttendance = initialAttendance * Math.pow(1 + rate, period - 1);
            }
          } else {
            currentAttendance = initialAttendance;
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
        // Get the base per-customer values
        let currentTicketPrice = metadata.perCustomer.ticketPrice ?? 0;
        let currentFbSpend = metadata.perCustomer.fbSpend ?? 0;
        let currentMerchSpend = metadata.perCustomer.merchandiseSpend ?? 0;

        // Apply growth if applicable
        if (period > 1 && metadata.growth?.useCustomerSpendGrowth) {
          let ticketGrowth = (metadata.growth.ticketPriceGrowth ?? 0) / 100;
          let fbGrowth = (metadata.growth.fbSpendGrowth ?? 0) / 100;
          let merchGrowth = (metadata.growth.merchandiseSpendGrowth ?? 0) / 100;

          if (ticketGrowth > 0) {
            if (useOverallGrowth && overallGrowthType === 'linear') {
              const increment = (metadata.perCustomer.ticketPrice ?? 0) * ticketGrowth;
              currentTicketPrice = (metadata.perCustomer.ticketPrice ?? 0) + increment * (period - 1);
            } else {
              currentTicketPrice *= Math.pow(1 + ticketGrowth, period - 1);
            }
          }
          if (fbGrowth > 0) {
            if (useOverallGrowth && overallGrowthType === 'linear') {
              const increment = (metadata.perCustomer.fbSpend ?? 0) * fbGrowth;
              currentFbSpend = (metadata.perCustomer.fbSpend ?? 0) + increment * (period - 1);
            } else {
              currentFbSpend *= Math.pow(1 + fbGrowth, period - 1);
            }
          }
          if (merchGrowth > 0) {
            if (useOverallGrowth && overallGrowthType === 'linear') {
              const increment = (metadata.perCustomer.merchandiseSpend ?? 0) * merchGrowth;
              currentMerchSpend = (metadata.perCustomer.merchandiseSpend ?? 0) + increment * (period - 1);
            } else {
              currentMerchSpend *= Math.pow(1 + merchGrowth, period - 1);
            }
          }
        }

        // Calculate revenue for each stream
        const ticketRevenue = currentAttendance * currentTicketPrice;
        periodFBCRevenue = currentAttendance * currentFbSpend; // Assign to specific var for COGS
        periodMerchRevenue = currentAttendance * currentMerchSpend; // Assign to specific var for COGS

        // Add all per-attendee revenues together
        const totalPerAttendeeRevenue = ticketRevenue + periodFBCRevenue + periodMerchRevenue;
        periodRevenue += totalPerAttendeeRevenue;
        // DEBUG: Log period revenue and attendance math for each week
        console.log(`[DEBUG][Period ${period}] Attendance: ${currentAttendance}, Ticket Price: ${currentTicketPrice}, Period Revenue: ${periodRevenue}`);
      }

      // Add revenue from the *other* streams in the array (non-per-attendee)
      revenueStreams.forEach(stream => {
        // Skip the standard per-attendee streams as they are calculated above
        if (isWeekly && ["Ticket Sales", "F&B Sales", "Merchandise Sales"].includes(stream.name)) {
            return;
        }

        let streamRevenue = 0;
        const baseValue = stream.value ?? 0;

        // Log the base value for debugging
        if (period === 1) {
            console.log(`[FinancialCalc Period ${period}] Revenue stream ${stream.name}: Base value=$${baseValue.toFixed(2)}`);
        }

        // Apply growth model (non-weekly or non-per-attendee streams)
        streamRevenue = baseValue;
        // Only apply growthModel if the user has explicitly set a non-zero rate for this stream
        if (period > 1 && growthModel && growthModel.rate > 0) {
            const { type, rate } = growthModel;
            const originalStreamRevenue = streamRevenue;

            if (type === "linear") {
                streamRevenue = baseValue + (baseValue * rate * (period - 1));
            } else if (type === "exponential") {
                streamRevenue = baseValue * Math.pow(1 + rate, period - 1);
            }

            // Log the growth-adjusted value for debugging
            if (period <= 3) {
                console.log(`[FinancialCalc Period ${period}] Revenue stream ${stream.name}: After ${type} growth (rate=${rate}): $${originalStreamRevenue.toFixed(2)} -> $${streamRevenue.toFixed(2)}`);
            }
        }

        periodRevenue += streamRevenue;

        // Log the contribution to period revenue
        if (period <= 3) {
            console.log(`[Period ${period}] Revenue stream ${stream.name} contributing $${streamRevenue.toFixed(2)} to period revenue`);
        }
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

      // 2. Calculated Staff Costs (if applicable)
      let periodStaffCost = 0;
      if (isWeekly && metadata?.costs?.staffCount && metadata?.costs?.staffCostPerPerson) {
        periodStaffCost = (metadata.costs.staffCount || 0) * (metadata.costs.staffCostPerPerson || 0);
        periodCost += periodStaffCost;
        if (periodStaffCost > 0) currentCostBreakdown["staffCost"] = periodStaffCost; // Add to breakdown
      }

      // 3. Fixed/Recurring Costs from the list
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

      // 4. Marketing Costs
      let periodMarketingCost = 0;
      const marketingMode = marketingSetup?.allocationMode || 'none';
      console.log(`[ForecastCalc Period ${period}] Marketing Mode: ${marketingMode}`);
      if (marketingMode === 'channels') {
        // Calculate per-channel costs respecting distribution
        const channels = Array.isArray(marketingSetup.channels) ? marketingSetup.channels : [];
        let totalChannelCost = 0;
        channels.forEach((ch, idx) => {
          const totalBudget = typeof ch.weeklyBudget === 'number' ? ch.weeklyBudget : 0;
          const distribution = ch.distribution || 'spreadEvenly';
          let channelCost = 0;
          if (distribution === 'upfront') {
            channelCost = period === 1 ? totalBudget : 0;
          } else if (distribution === 'spreadEvenly') {
            channelCost = duration > 0 ? totalBudget / duration : 0;
          } else if (distribution === 'spreadCustom') {
            const spreadDuration = typeof ch.spreadDuration === 'number' && ch.spreadDuration > 0 ? ch.spreadDuration : duration;
            channelCost = period <= spreadDuration ? totalBudget / spreadDuration : 0;
          }
          totalChannelCost += channelCost;
          if (period <= 3) {
            console.log(`[ForecastCalc Period ${period}] Channel ${ch.name || 'Unnamed'} (${ch.channelType || 'Unknown'}) - Distribution: ${distribution}, Total: $${totalBudget}, Applied: $${channelCost}`);
          }
        });
        periodMarketingCost = isWeekly ? totalChannelCost : totalChannelCost * (365.25 / 7 / 12); // Approx monthly
        if (period <= 3) {
          console.log(`[ForecastCalc Period ${period}] Total Channel Marketing Cost: ${periodMarketingCost}`);
        }
      } else if (marketingMode === 'highLevel' && marketingSetup) {
        // Assert the type within this block
        const highLevelMarketing = marketingSetup as MarketingSetup;

        // Ensure we have valid values for all required fields
        const totalBudget = typeof highLevelMarketing.totalBudget === 'number' ? highLevelMarketing.totalBudget : 0;
        const application = ['upfront', 'spreadEvenly', 'spreadCustom'].includes(highLevelMarketing.budgetApplication || '')
          ? highLevelMarketing.budgetApplication
          : 'spreadEvenly';
        const spreadDuration = typeof highLevelMarketing.spreadDuration === 'number' && highLevelMarketing.spreadDuration > 0
          ? highLevelMarketing.spreadDuration
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

      // Log period data for debugging
      if (period <= 3) {
        console.log(`[Period ${period}] Revenue: ${periodRevenue.toFixed(2)}, Cost: ${periodCost.toFixed(2)}, Profit: ${periodProfit.toFixed(2)}`);
      }

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
        // Add totalCost as an alias for cost to maintain compatibility
        totalCost: Math.ceil(periodCost)
      });
    }
    console.log("[generateForecastTimeSeries] Calculation finished.");
    return periodicData;
  } catch (error) {
    console.error("[generateForecastTimeSeries] Error during calculation:", error);
    return []; // Return empty array on error
  }
};