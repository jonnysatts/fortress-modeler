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
  // NEW: Marketing totals and per-channel breakdown for export/UI alignment
  marketingTotal?: number; // Total marketing spend (forecast) for this period
  marketingChannels?: {
    [channelId: string]: {
      forecast: number;
      actual?: number;
      conversions?: number;
    };
  };
  costBreakdown?: Record<string, number>;
  // --- Revenue by type for table display ---
  ticketRevenue?: number;
  fbRevenue?: number;
  merchRevenue?: number;
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
  try {
    console.log("[generateForecastTimeSeries] Incoming model:", model);
    // DEBUG: Log the unique marker to trace model pipeline
    console.log('[DEBUG] Model marker:', (model as any).__debugScenarioPatch);
    // --- PATCH: Only log missing fields, never return early ---
    if (!model?.assumptions) {
      console.error("[generateForecastTimeSeries] No assumptions found in model. Model:", model);
    }
    const { assumptions } = model || {};
    const metadata = assumptions?.metadata || {};
    const revenueStreams = assumptions?.revenue || [];
    const costs = assumptions?.costs || [];
    const marketingSetup = assumptions?.marketing || { allocationMode: 'none', channels: [] };
    const growthModel = assumptions?.growthModel;
    const isWeekly = metadata?.type === "WeeklyEvent";
    const duration = metadata?.weeks || 12;
    // PATCH: Default perCustomer to all zeros, but warn if missing
    const perCustomer = metadata?.perCustomer || (() => {
      console.warn('[generateForecastTimeSeries] metadata.perCustomer missing, using all zeros. Metadata:', metadata);
      return { ticketPrice: 0, fbSpend: 0, merchandiseSpend: 0, onlineSpend: 0, miscSpend: 0 };
    })();

    console.log(`[generateForecastTimeSeries] Type: ${isWeekly ? "Weekly" : "Monthly"}, Duration: ${duration}`);

    // Defensive: Zero all customer spend growth if not explicitly enabled
    const growth = model.assumptions.metadata?.growth;
    if (!model.assumptions.metadata?.useCustomerSpendGrowth) {
      if (growth) {
        growth.ticketPriceGrowth = 0;
        growth.fbSpendGrowth = 0;
        growth.merchandiseSpendGrowth = 0;
        growth.onlineSpendGrowth = 0;
        growth.miscSpendGrowth = 0;
        console.log('[DEFENSIVE PATCH] Zeroed all customer spend growth rates because useCustomerSpendGrowth is false');
      }
    }

    // --- DEFENSIVE PATCH: If useCustomerSpendGrowth is false, forcibly zero all growth rates ---
    if (metadata.growth && !metadata.growth.useCustomerSpendGrowth) {
      metadata.growth.ticketPriceGrowth = 0;
      metadata.growth.fbSpendGrowth = 0;
      metadata.growth.merchandiseSpendGrowth = 0;
      metadata.growth.onlineSpendGrowth = 0;
      metadata.growth.miscSpendGrowth = 0;
      console.log('[DEFENSIVE PATCH] All customer spend growth rates forcibly set to 0 because useCustomerSpendGrowth is false.');
    }

    const periodicData: ForecastPeriodData[] = [];
    let cumulativeRevenue = 0;
    let cumulativeCost = 0;
    let cumulativeProfit = 0;

    // Use growthModel if present, otherwise use specific growth fields
    const useOverallGrowth = !!assumptions.growthModel;
    const overallGrowthType = assumptions.growthModel?.type || 'exponential';
    // growthModel.rate is already stored as a decimal (eg 0.05 for 5%) – do not divide by 100 again
    const overallGrowthRate = assumptions.growthModel?.rate ?? 0;

    // Enhanced debug logging for growth settings
    console.log('[DEBUG] GROWTH SETTINGS START');
    console.log('Raw growth settings:', model.assumptions.metadata?.growth);
    console.log('Stringified growth settings:', JSON.stringify(model.assumptions.metadata?.growth, null, 2));
    console.log('Attendance growth rate (decimal):', model.assumptions.metadata?.growth?.attendanceGrowthRate ? model.assumptions.metadata?.growth?.attendanceGrowthRate / 100 : 0);
    console.log('Use customer spend growth:', model.assumptions.metadata?.growth?.useCustomerSpendGrowth);
    console.log('Growth model (raw):', model.assumptions.growthModel);
    console.log('Growth model (stringified):', JSON.stringify(model.assumptions.growthModel, null, 2));
    console.log('[DEBUG] GROWTH SETTINGS END');

    // PATCH: Log growth and attendance info for scenario debugging
    console.log('[DEBUG][generateForecastTimeSeries] attendanceGrowthRate:', metadata?.growth?.attendanceGrowthRate);
    console.log('[DEBUG][generateForecastTimeSeries] useCustomerSpendGrowth:', metadata?.growth?.useCustomerSpendGrowth);
    console.log('[DEBUG][generateForecastTimeSeries] perCustomer:', JSON.stringify(perCustomer));

    for (let period = 1; period <= duration; period++) {
      const point = `${isWeekly ? "Week" : "Month"} ${period}`;
      let periodRevenue = 0;
      let periodCost = 0;
      let currentAttendance = 0;
      let periodMarketingTotal = 0;
      let periodMarketingChannels: { [channelId: string]: { forecast: number; actual?: number; conversions?: number } } = {};
      let periodCostBreakdown: Record<string, number> = {};
      let ticketRevenue = 0;
      let fbRevenue = 0;
      let merchRevenue = 0;

      // Always define currentPerCustomer at the start of each period
      let currentPerCustomer = { ...perCustomer };

      // --- Calculate Attendance (if applicable) ---
      if (isWeekly && metadata.initialWeeklyAttendance !== undefined) {
        const initialAttendance = metadata.initialWeeklyAttendance;
        let rate = 0;
        if (useOverallGrowth && overallGrowthRate !== 0) {
          rate = overallGrowthRate;
        } else if (metadata.growth?.attendanceGrowthRate !== undefined) {
          rate = (metadata.growth.attendanceGrowthRate ?? 0) / 100;
        }
        // LOGGING: Show attendance growth rate and calculation
        console.log(`[AttendanceCalc] Period ${period} | Initial: ${initialAttendance}, Rate: ${rate}`);
        if (rate !== 0) {
          if (useOverallGrowth && overallGrowthType === 'linear') {
            currentAttendance = initialAttendance + initialAttendance * rate * (period - 1);
          } else {
            currentAttendance = initialAttendance * Math.pow(1 + rate, period - 1);
          }
        } else {
          currentAttendance = initialAttendance;
        }
        // LOGGING: Show compounded attendance
        console.log(`[AttendanceCalc] Compounded Attendance for Period ${period}:`, currentAttendance);
        currentAttendance = Math.round(currentAttendance);
      }

      // --- Calculate Revenue ---
      periodRevenue = 0; // Reset period total revenue
      ticketRevenue = 0;
      fbRevenue = 0;
      merchRevenue = 0;

      // Defensive: Always calculate per-attendee revenue, even if some fields are missing
      if (isWeekly && metadata.perCustomer) {
        // --- DEBUG: Log all per-customer values and growth rates for this period ---
        console.log(`[DEBUG][Period ${period}] useCustomerSpendGrowth:`, metadata.growth?.useCustomerSpendGrowth,
          '| ticketPriceGrowth:', metadata.growth?.ticketPriceGrowth,
          '| fbSpendGrowth:', metadata.growth?.fbSpendGrowth,
          '| merchandiseSpendGrowth:', metadata.growth?.merchandiseSpendGrowth,
          '| ticketPrice:', metadata.perCustomer.ticketPrice,
          '| fbSpend:', metadata.perCustomer.fbSpend,
          '| merchandiseSpend:', metadata.perCustomer.merchandiseSpend);

        // --- PATCH: Prevent ticket price from changing when only FB/Merch changes ---
        let ticketGrowth = 0;
        let fbGrowth = 0;
        let merchGrowth = 0;
        if (period > 1 && metadata.growth?.useCustomerSpendGrowth) {
          ticketGrowth = typeof metadata.growth.ticketPriceGrowth === 'number' ? metadata.growth.ticketPriceGrowth / 100 : 0;
          fbGrowth = typeof metadata.growth.fbSpendGrowth === 'number' ? metadata.growth.fbSpendGrowth / 100 : 0;
          merchGrowth = typeof metadata.growth.merchandiseSpendGrowth === 'number' ? metadata.growth.merchandiseSpendGrowth / 100 : 0;
          // LOGGING: Show per-customer growth rates
          console.log(`[PerCustomerGrowth] Period ${period} | Ticket: ${ticketGrowth}, FB: ${fbGrowth}, Merch: ${merchGrowth}`);
          // --- CRITICAL PATCH: Only apply growth to each field if its growth rate is nonzero ---
          if (ticketGrowth !== 0) {
            // --- DEBUG LOGGING: Ticket Price Growth Diagnostics ---
            console.log('[DEBUG][TicketPriceGrowth]', {
              period,
              useCustomerSpendGrowth: metadata.growth?.useCustomerSpendGrowth,
              ticketPriceGrowth: metadata.growth?.ticketPriceGrowth,
              ticketGrowth,
              ticketPriceSliderDelta: metadata.ticketPriceDelta,
              ticketPriceDeltaType: metadata.ticketPriceDeltaType,
              perCustomerTicketPrice: perCustomer.ticketPrice,
              currentPerCustomerTicketPrice: currentPerCustomer.ticketPrice,
              assumptionsGrowthModel: assumptions.growthModel,
            });
            if (useOverallGrowth && overallGrowthType === 'linear') {
              const increment = (metadata.perCustomer.ticketPrice ?? 0) * ticketGrowth;
              currentPerCustomer.ticketPrice = (metadata.perCustomer.ticketPrice ?? 0) + increment * (period - 1);
            } else {
              currentPerCustomer.ticketPrice *= Math.pow(1 + ticketGrowth, period - 1);
            }
          } else {
            currentPerCustomer.ticketPrice = metadata.perCustomer.ticketPrice ?? 0;
          }
          if (fbGrowth !== 0) {
            if (useOverallGrowth && overallGrowthType === 'linear') {
              const increment = (metadata.perCustomer.fbSpend ?? 0) * fbGrowth;
              currentPerCustomer.fbSpend = (metadata.perCustomer.fbSpend ?? 0) + increment * (period - 1);
            } else {
              currentPerCustomer.fbSpend *= Math.pow(1 + fbGrowth, period - 1);
            }
          } else {
            currentPerCustomer.fbSpend = metadata.perCustomer.fbSpend ?? 0;
          }
          if (merchGrowth !== 0) {
            if (useOverallGrowth && overallGrowthType === 'linear') {
              const increment = (metadata.perCustomer.merchandiseSpend ?? 0) * merchGrowth;
              currentPerCustomer.merchandiseSpend = (metadata.perCustomer.merchandiseSpend ?? 0) + increment * (period - 1);
            } else {
              currentPerCustomer.merchandiseSpend *= Math.pow(1 + merchGrowth, period - 1);
            }
          } else {
            currentPerCustomer.merchandiseSpend = metadata.perCustomer.merchandiseSpend ?? 0;
          }
        }
        // --- PATCH: Forcibly reset ticket price to baseline if growth is zero ---
        if ((!(metadata.growth?.ticketPriceGrowth) || metadata.growth.ticketPriceGrowth === 0)
          && (!assumptions.growthModel || assumptions.growthModel.rate === 0)) {
          currentPerCustomer.ticketPrice = perCustomer.ticketPrice ?? 0;
        }
        // LOGGING: Show per-customer values
        console.log(`[PerCustomerGrowth] Period ${period} | PerCustomer:`, currentPerCustomer);
        ticketRevenue = currentAttendance * (currentPerCustomer.ticketPrice ?? 0);
        fbRevenue = currentAttendance * (currentPerCustomer.fbSpend ?? 0);
        merchRevenue = currentAttendance * (currentPerCustomer.merchandiseSpend ?? 0);
        // Always use 0 if undefined
        const onlineSpend = currentPerCustomer.onlineSpend ?? 0;
        const miscSpend = currentPerCustomer.miscSpend ?? 0;
        const totalPerAttendeeRevenue = ticketRevenue + fbRevenue + merchRevenue + (currentAttendance * onlineSpend) + (currentAttendance * miscSpend);
        periodRevenue += totalPerAttendeeRevenue;
      }
      // Add revenue from the *other* streams in the array (non-per-attendee)
      if (Array.isArray(revenueStreams)) {
        revenueStreams.forEach(stream => {
          if (isWeekly && ["Ticket Sales", "F&B Sales", "Merchandise Sales"].includes(stream.name)) {
            return;
          }
          let streamRevenue = 0;
          const baseValue = stream.value ?? 0;
          streamRevenue = baseValue;
          if (period > 1 && growthModel && growthModel.rate > 0) {
            const { type, rate } = growthModel;
            if (type === "linear") {
              streamRevenue = baseValue + (baseValue * rate * (period - 1));
            } else if (type === "exponential") {
              streamRevenue = baseValue * Math.pow(1 + rate, period - 1);
            }
          }
          periodRevenue += streamRevenue;
        });
      }
      // Defensive: If still NaN or undefined, set to 0
      if (!Number.isFinite(periodRevenue)) periodRevenue = 0;
      if (!Number.isFinite(ticketRevenue)) ticketRevenue = 0;
      if (!Number.isFinite(fbRevenue)) fbRevenue = 0;
      if (!Number.isFinite(merchRevenue)) merchRevenue = 0;

      // --- Calculate Marketing Spend (per channel, if detailed mode) ---
      if (marketingSetup.allocationMode === 'channels' && Array.isArray(marketingSetup.channels)) {
        marketingSetup.channels.forEach(channel => {
          let channelForecast = 0;
          if (channel.distribution === 'upfront') {
            channelForecast = period === 1 ? (channel.weeklyBudget ?? 0) : 0;
          } else if (channel.distribution === 'spreadCustom' && channel.spreadDuration) {
            channelForecast = period <= channel.spreadDuration ? ((channel.weeklyBudget ?? 0)) : 0;
          } else {
            channelForecast = channel.weeklyBudget ?? 0;
          }
          periodMarketingTotal += channelForecast;
          periodMarketingChannels[channel.id] = { forecast: channelForecast };
        });
      } else if (marketingSetup.allocationMode === 'highLevel') {
        const totalBudget = marketingSetup.totalBudget || 0;
        let spreadDuration = marketingSetup.spreadDuration || duration;
        let application = marketingSetup.budgetApplication || 'spreadEvenly';
        let channelForecast = 0;
        if (application === 'upfront') {
          channelForecast = period === 1 ? totalBudget : 0;
        } else if (application === 'spreadCustom' && spreadDuration > 0) {
          channelForecast = period <= spreadDuration ? totalBudget / spreadDuration : 0;
        } else {
          channelForecast = totalBudget / duration;
        }
        periodMarketingTotal += channelForecast;
        periodMarketingChannels['highLevel'] = { forecast: channelForecast };
      }
      periodCost += periodMarketingTotal;
      periodCostBreakdown['Marketing'] = periodMarketingTotal;

      // --- Calculate COGS ---
      const fbCogsPercent = metadata?.costs?.fbCOGSPercent ?? 0;
      const merchCogsPercent = metadata?.costs?.merchandiseCogsPercent ?? 0;
      // Use actual per-customer values for this period
      const currentFBSpend = (currentPerCustomer.fbSpend ?? 0) * currentAttendance;
      const currentMerchSpend = (currentPerCustomer.merchandiseSpend ?? 0) * currentAttendance;
      const fbCogs = currentFBSpend * (fbCogsPercent / 100);
      const merchCogs = currentMerchSpend * (merchCogsPercent / 100);
      periodCost += fbCogs + merchCogs;
      periodCostBreakdown['F&B COGS'] = fbCogs;
      periodCostBreakdown['Merchandise COGS'] = merchCogs;

      // --- Staff and Management Costs ---
      const staffCount = metadata?.costs?.staffCount ?? 0;
      const staffCostPerPerson = metadata?.costs?.staffCostPerPerson ?? 0;
      const staffCost = staffCount * staffCostPerPerson;
      const managementCosts = metadata?.costs?.managementCosts ?? 0;
      periodCost += staffCost + managementCosts;
      periodCostBreakdown['Staff'] = staffCost;
      periodCostBreakdown['Management'] = managementCosts;

      // --- User-Defined Other Costs ---
      if (Array.isArray(assumptions.costs)) {
        assumptions.costs.forEach(cost => {
          const { name, value, type, category } = cost;
          let addCost = 0;
          if (type === 'fixed') {
            addCost = period === 1 ? value : 0;
          } else if (type === 'recurring') {
            addCost = value;
          } else if (type === 'variable') {
            // Variable costs can be modeled as a % of revenue or attendance, but here just add every period
            addCost = value;
          }
          // Don't double-count marketing
          if (category === 'marketing') return;
          periodCost += addCost;
          if (!periodCostBreakdown[name]) periodCostBreakdown[name] = 0;
          periodCostBreakdown[name] += addCost;
        });
      }

      // --- User-Defined Marketing Costs from Other Costs (if any) ---
      if (Array.isArray(assumptions.costs)) {
        assumptions.costs.forEach(cost => {
          const { name, value, type, category } = cost;
          if (category !== 'marketing') return;
          let addCost = 0;
          if (type === 'fixed') {
            addCost = period === 1 ? value : 0;
          } else if (type === 'recurring') {
            addCost = value;
          } else if (type === 'variable') {
            addCost = value;
          }
          periodCost += addCost;
          periodMarketingTotal += addCost;
          if (!periodCostBreakdown[name]) periodCostBreakdown[name] = 0;
          periodCostBreakdown[name] += addCost;
        });
      }

      // --- Logging and Output ---
      if (period === 1) {
        console.log(`[ForecastCalc Period ${period}] Total Period Cost: ${periodCost}`, periodCostBreakdown);
      }
      if (period <= 3) {
        console.log(`[Period ${period}] Revenue: ${periodRevenue.toFixed(2)}, Cost: ${periodCost.toFixed(2)}, Profit: ${(periodRevenue - periodCost).toFixed(2)}`);
      }

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
        totalCost: Math.ceil(periodCost),
        marketingTotal: Math.ceil(periodMarketingTotal),
        marketingChannels: periodMarketingChannels,
        costBreakdown: periodCostBreakdown,
        ticketRevenue: ticketRevenue > 0 ? Math.ceil(ticketRevenue) : 0,
        fbRevenue: fbRevenue > 0 ? Math.ceil(fbRevenue) : 0,
        merchRevenue: merchRevenue > 0 ? Math.ceil(merchRevenue) : 0,
      });
    }
    console.log(`[generateForecastTimeSeries] Returning ${periodicData.length} periods`);
    const result = periodicData;
    if (result.length > 0) {
      console.log('[DEBUG][generateForecastTimeSeries] First period:', JSON.stringify(result[0]));
    }
    if (periodicData.length === 0) {
      // Fallback: always return at least one period with zeros
      return [{
        period: 1,
        point: "Week 1",
        revenue: 0,
        cost: 0,
        profit: 0,
        cumulativeRevenue: 0,
        cumulativeCost: 0,
        cumulativeProfit: 0,
        attendance: 0,
        totalCost: 0,
        marketingTotal: 0,
        marketingChannels: {},
        costBreakdown: {},
      }];
    }
    return result;
  } catch (error) {
    console.error("[generateForecastTimeSeries] Error during calculation:", error);
    // Fallback: always return at least one period with zeros
    return [{
      period: 1,
      point: "Week 1",
      revenue: 0,
      cost: 0,
      profit: 0,
      cumulativeRevenue: 0,
      cumulativeCost: 0,
      cumulativeProfit: 0,
      attendance: 0,
      totalCost: 0,
      marketingTotal: 0,
      marketingChannels: {},
      costBreakdown: {},
    }];
  }
};