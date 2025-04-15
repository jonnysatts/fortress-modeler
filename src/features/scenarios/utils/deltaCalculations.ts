/**
 * Delta Calculations
 *
 * This module contains functions for applying scenario parameter deltas to financial models.
 */

import { FinancialModel } from '@/lib/db';
import { ScenarioParameterDeltas } from '../types/scenarioTypes';

/**
 * Ensure the model has the necessary structure for scenario calculations
 *
 * @param model - The financial model to check and update
 */
function ensureModelStructure(model: FinancialModel): void {
  // Ensure metadata exists
  if (!model.assumptions.metadata) {
    console.log('Creating metadata structure');
    model.assumptions.metadata = {};
  }

  // Set model type if not set
  if (!model.assumptions.metadata.type) {
    console.log('Setting default model type to WeeklyEvent');
    model.assumptions.metadata.type = 'WeeklyEvent';
  }

  // Ensure initial attendance is set
  if (!model.assumptions.metadata.initialWeeklyAttendance) {
    console.log('Setting default initial attendance');
    model.assumptions.metadata.initialWeeklyAttendance = 75;
  }

  // Ensure useGrowth is set
  model.assumptions.metadata.useGrowth = true;

  // Ensure growth structure exists
  if (!model.assumptions.metadata.growth) {
    console.log('Creating growth structure');
    model.assumptions.metadata.growth = {
      attendanceGrowthRate: 0,
      useCustomerSpendGrowth: true,
      ticketPriceGrowth: 2,
      fbSpendGrowth: 2,
      merchandiseSpendGrowth: 2
    };
  } else {
    // Ensure all growth properties exist
    const growth = model.assumptions.metadata.growth;
    growth.useCustomerSpendGrowth = true;
    if (growth.attendanceGrowthRate === undefined) growth.attendanceGrowthRate = 0;
    if (growth.ticketPriceGrowth === undefined) growth.ticketPriceGrowth = 2;
    if (growth.fbSpendGrowth === undefined) growth.fbSpendGrowth = 2;
    if (growth.merchandiseSpendGrowth === undefined) growth.merchandiseSpendGrowth = 2;
  }

  // Ensure perCustomer structure exists
  if (!model.assumptions.metadata.perCustomer) {
    console.log('Creating perCustomer structure');
    model.assumptions.metadata.perCustomer = {
      ticketPrice: 10,
      fbSpend: 5,
      merchandiseSpend: 2
    };
  } else {
    // Ensure all perCustomer properties exist
    const perCustomer = model.assumptions.metadata.perCustomer;
    if (perCustomer.ticketPrice === undefined) perCustomer.ticketPrice = 10;
    if (perCustomer.fbSpend === undefined) perCustomer.fbSpend = 5;
    if (perCustomer.merchandiseSpend === undefined) perCustomer.merchandiseSpend = 2;
  }

  // Ensure costs structure exists
  if (!model.assumptions.metadata.costs) {
    console.log('Creating costs structure');
    model.assumptions.metadata.costs = {
      fbCOGSPercent: 30,
      merchandiseCogsPercent: 50,
      staffCount: 5,
      staffCostPerPerson: 100
    };
  } else {
    // Ensure all costs properties exist
    const costs = model.assumptions.metadata.costs;
    if (costs.fbCOGSPercent === undefined) costs.fbCOGSPercent = 30;
    if (costs.merchandiseCogsPercent === undefined) costs.merchandiseCogsPercent = 50;
    if (costs.staffCount === undefined) costs.staffCount = 5;
    if (costs.staffCostPerPerson === undefined) costs.staffCostPerPerson = 100;
  }

  // Ensure growth model exists
  if (!model.assumptions.growthModel) {
    console.log('Creating growth model');
    model.assumptions.growthModel = {
      type: 'exponential',
      rate: 0.05
    };
  } else {
    // Ensure growth model properties are set
    model.assumptions.growthModel.type = 'exponential';
    if (model.assumptions.growthModel.rate === undefined) {
      model.assumptions.growthModel.rate = 0.05;
    }
  }

  // Ensure marketing structure exists
  if (!model.assumptions.marketing) {
    console.log('Creating marketing structure');
    model.assumptions.marketing = {
      allocationMode: 'highLevel',
      channels: [],
      totalBudget: 1000,
      budgetApplication: 'spreadEvenly',
      spreadDuration: model.assumptions.metadata.weeks || 12
    };
  } else {
    // Ensure marketing properties are set
    const marketing = model.assumptions.marketing;
    if (!marketing.channels) marketing.channels = [];
    if (!marketing.totalBudget) marketing.totalBudget = 1000;
    if (!marketing.budgetApplication) marketing.budgetApplication = 'spreadEvenly';
    if (!marketing.spreadDuration) marketing.spreadDuration = model.assumptions.metadata.weeks || 12;
  }

  // Log the structure to ensure it's properly set up
  console.log('Model structure ensured with type:', model.assumptions.metadata.type);
}

/**
 * Apply scenario deltas to a baseline model
 * Creates a new model with the deltas applied
 *
 * @param baselineModel - The original financial model
 * @param deltas - The parameter deltas to apply
 * @returns A new financial model with deltas applied
 */
export function applyScenarioDeltas(
  baselineModel: FinancialModel,
  deltas: ScenarioParameterDeltas
): FinancialModel {
  console.log('Applying scenario deltas:', deltas);

  // Create a deep copy of the baseline model
  const modifiedModel: FinancialModel = JSON.parse(JSON.stringify(baselineModel));

  // Ensure the model has the necessary structure
  ensureModelStructure(modifiedModel);

  // Apply each type of delta
  applyMarketingDeltas(modifiedModel, baselineModel, deltas);
  applyPricingDeltas(modifiedModel, deltas);
  applyAttendanceDeltas(modifiedModel, deltas);
  applyCostDeltas(modifiedModel, deltas);

  // Log the final modified model for debugging
  console.log('Final modified model:', JSON.stringify(modifiedModel.assumptions.metadata, null, 2));

  return modifiedModel;
}

/**
 * Apply marketing-related deltas to the model
 *
 * @param modifiedModel - The model being modified (will be mutated)
 * @param baselineModel - The original model (for comparison)
 * @param deltas - The parameter deltas
 */
function applyMarketingDeltas(
  modifiedModel: FinancialModel,
  baselineModel: FinancialModel,
  deltas: ScenarioParameterDeltas
): void {
  // Apply marketing spend percent delta
  console.log(`Applying marketing spend delta: ${deltas.marketingSpendPercent}%`);

  // If we have marketing channels, adjust each channel's budget
  if (modifiedModel.assumptions.marketing?.channels) {
    console.log('Adjusting marketing channels budgets');

    modifiedModel.assumptions.marketing.channels = modifiedModel.assumptions.marketing.channels.map(channel => {
      // Store original value for logging
      const originalBudget = channel.weeklyBudget;

      // Only apply the adjustment if the delta is not zero
      let adjustedBudget = channel.weeklyBudget;
      if (deltas.marketingSpendPercent !== 0) {
        adjustedBudget = channel.weeklyBudget * (1 + deltas.marketingSpendPercent / 100);
      }

      // Apply any channel-specific adjustments
      const channelSpecificDelta = deltas.marketingSpendByChannel[channel.id] || 0;
      let finalBudget = adjustedBudget;
      if (channelSpecificDelta !== 0) {
        finalBudget = adjustedBudget * (1 + channelSpecificDelta / 100);
      }

      console.log(`Channel ${channel.name || channel.id}: Original budget: $${originalBudget.toFixed(2)} -> After global ${deltas.marketingSpendPercent}% change: $${adjustedBudget.toFixed(2)} -> After channel-specific ${channelSpecificDelta}% change: $${finalBudget.toFixed(2)}`);

      return {
        ...channel,
        weeklyBudget: Math.round(finalBudget)
      };
    });

    // Calculate and log total marketing spend before and after
    const originalTotalSpend = baselineModel.assumptions.marketing?.channels?.reduce(
      (total, channel) => total + channel.weeklyBudget, 0
    ) || 0;

    const modifiedTotalSpend = modifiedModel.assumptions.marketing?.channels?.reduce(
      (total, channel) => total + channel.weeklyBudget, 0
    ) || 0;

    console.log(`Total weekly marketing spend: Original: $${originalTotalSpend.toFixed(2)} -> Modified: $${modifiedTotalSpend.toFixed(2)}, Change: ${((modifiedTotalSpend/originalTotalSpend - 1) * 100).toFixed(2)}%`);
  }

  // If we have a high-level marketing budget, adjust it
  if (modifiedModel.assumptions.marketing?.totalBudget) {
    const oldBudget = modifiedModel.assumptions.marketing.totalBudget;
    let newBudget = oldBudget;

    if (deltas.marketingSpendPercent !== 0) {
      newBudget = oldBudget * (1 + deltas.marketingSpendPercent / 100);
    }

    console.log(`Total marketing budget: $${oldBudget.toFixed(2)} -> $${newBudget.toFixed(2)}, Change: ${deltas.marketingSpendPercent}%`);

    modifiedModel.assumptions.marketing.totalBudget = newBudget;
  }

  // CRITICAL: Fix marketing setup if there's marketing spend
  if (deltas.marketingSpendPercent !== 0) {
    // Ensure marketing mode is properly set
    if (!modifiedModel.assumptions.marketing) {
      console.log('Creating marketing setup because marketing spend changed');
      modifiedModel.assumptions.marketing = {
        allocationMode: 'highLevel',
        channels: [],
        totalBudget: 1000, // Default budget
        budgetApplication: 'spreadEvenly',
        spreadDuration: modifiedModel.assumptions.metadata?.weeks || 12
      };
    }

    // Ensure allocation mode is set
    const validModes = ['channels', 'highLevel'];
    const currentMode = modifiedModel.assumptions.marketing.allocationMode as string;
    if (currentMode === 'none' || !validModes.includes(currentMode)) {
      console.log('Fixing marketing allocation mode from', currentMode, 'to highLevel');
      modifiedModel.assumptions.marketing.allocationMode = 'highLevel';
      if (!modifiedModel.assumptions.marketing.totalBudget) {
        modifiedModel.assumptions.marketing.totalBudget = 1000; // Default budget
      }
      modifiedModel.assumptions.marketing.budgetApplication = 'spreadEvenly';
      modifiedModel.assumptions.marketing.spreadDuration = modifiedModel.assumptions.metadata?.weeks || 12;
    }

    console.log('Marketing setup configured:', modifiedModel.assumptions.marketing);
  }
}

/**
 * Apply pricing-related deltas to the model
 *
 * @param modifiedModel - The model being modified (will be mutated)
 * @param deltas - The parameter deltas
 */
function applyPricingDeltas(
  modifiedModel: FinancialModel,
  deltas: ScenarioParameterDeltas
): void {
  // Always apply pricing delta to ensure it's properly configured
  console.log(`Applying pricing delta: ${deltas.pricingPercent}%`);

  // Get the original values from the base model
  const perCustomer = modifiedModel.assumptions.metadata.perCustomer;

  // Apply pricing delta to ticket price
  const originalTicketPrice = perCustomer.ticketPrice;
  perCustomer.ticketPrice = originalTicketPrice * (1 + deltas.pricingPercent / 100);
  console.log(`Ticket price: Original: $${originalTicketPrice.toFixed(2)} -> Modified: $${perCustomer.ticketPrice.toFixed(2)}, Change: ${deltas.pricingPercent}%`);

  // Apply to F&B spend
  const originalFbSpend = perCustomer.fbSpend;
  perCustomer.fbSpend = originalFbSpend * (1 + deltas.pricingPercent / 100);
  console.log(`F&B spend: Original: $${originalFbSpend.toFixed(2)} -> Modified: $${perCustomer.fbSpend.toFixed(2)}, Change: ${deltas.pricingPercent}%`);

  // Apply to merchandise spend
  const originalMerchSpend = perCustomer.merchandiseSpend;
  perCustomer.merchandiseSpend = originalMerchSpend * (1 + deltas.pricingPercent / 100);
  console.log(`Merchandise spend: Original: $${originalMerchSpend.toFixed(2)} -> Modified: $${perCustomer.merchandiseSpend.toFixed(2)}, Change: ${deltas.pricingPercent}%`);

  // Also apply to any revenue streams that might exist
  if (modifiedModel.assumptions.revenueStreams && modifiedModel.assumptions.revenueStreams.length > 0) {
    console.log('Applying pricing delta to revenue streams');

    modifiedModel.assumptions.revenueStreams = modifiedModel.assumptions.revenueStreams.map(stream => {
      if (stream.value !== undefined) {
        const originalValue = stream.value;
        const newValue = originalValue * (1 + deltas.pricingPercent / 100);
        console.log(`Revenue stream ${stream.name}: Original: $${originalValue.toFixed(2)} -> Modified: $${newValue.toFixed(2)}, Change: ${deltas.pricingPercent}%`);
        return { ...stream, value: newValue };
      }
      return stream;
    });
  }

  // Log the final pricing settings for debugging
  console.log('Final pricing settings:', JSON.stringify({
    ticketPrice: perCustomer.ticketPrice,
    fbSpend: perCustomer.fbSpend,
    merchandiseSpend: perCustomer.merchandiseSpend,
    pricingDelta: deltas.pricingPercent
  }, null, 2));
}

/**
 * Apply attendance-related deltas to the model
 *
 * @param modifiedModel - The model being modified (will be mutated)
 * @param deltas - The parameter deltas
 */
function applyAttendanceDeltas(
  modifiedModel: FinancialModel,
  deltas: ScenarioParameterDeltas
): void {
  // Apply attendance growth rate delta
  console.log(`Applying attendance growth delta: ${deltas.attendanceGrowthPercent}%`);

  // Get the growth settings
  const growth = modifiedModel.assumptions.metadata.growth;

  // Store original rate for logging
  const originalRate = growth.attendanceGrowthRate || 0;

  // Add the delta to the existing growth rate (not multiply)
  growth.attendanceGrowthRate = originalRate + deltas.attendanceGrowthPercent;
  console.log(`Attendance growth rate: Original: ${originalRate}% -> Modified: ${growth.attendanceGrowthRate}%, Change: ${deltas.attendanceGrowthPercent}%`);

  // CRITICAL: Ensure that growth-related settings are ALWAYS enabled
  growth.useCustomerSpendGrowth = true;
  modifiedModel.assumptions.metadata.useCustomerSpendGrowth = true; // Set at both levels to ensure it's picked up
  console.log(`Enabled useCustomerSpendGrowth: ${growth.useCustomerSpendGrowth}`);

  // Configure the growth model
  modifiedModel.assumptions.growthModel.type = 'exponential';

  // Update the growth model rate to match the attendance growth rate
  // Convert percentage to decimal and ensure it's positive
  const growthRate = Math.max(0.01, growth.attendanceGrowthRate / 100);
  modifiedModel.assumptions.growthModel.rate = growthRate;
  console.log('Growth model set to type: exponential, rate:', modifiedModel.assumptions.growthModel.rate);

  // CRITICAL: Ensure the model knows to use the growth settings
  if (modifiedModel.assumptions.metadata.type === 'WeeklyEvent' ||
      modifiedModel.assumptions.metadata.type === 'Weekly') {
    console.log('Setting weekly event growth parameters');
    // Force enable growth for weekly events
    modifiedModel.assumptions.metadata.useGrowth = true;
  }

  // Ensure all growth rates are set to reasonable values
  if (!growth.ticketPriceGrowth || growth.ticketPriceGrowth === 0) {
    growth.ticketPriceGrowth = 2.0; // Default 2% growth
    console.log(`Set default ticket price growth: ${growth.ticketPriceGrowth}%`);
  }

  if (!growth.fbSpendGrowth || growth.fbSpendGrowth === 0) {
    growth.fbSpendGrowth = 2.0; // Default 2% growth
    console.log(`Set default F&B spend growth: ${growth.fbSpendGrowth}%`);
  }

  if (!growth.merchandiseSpendGrowth || growth.merchandiseSpendGrowth === 0) {
    growth.merchandiseSpendGrowth = 2.0; // Default 2% growth
    console.log(`Set default merchandise spend growth: ${growth.merchandiseSpendGrowth}%`);
  }

  // Log the final growth settings for debugging
  console.log('Final growth settings:', JSON.stringify({
    attendanceGrowthRate: growth.attendanceGrowthRate,
    useCustomerSpendGrowth: growth.useCustomerSpendGrowth,
    useGrowth: modifiedModel.assumptions.metadata.useGrowth,
    growthModel: modifiedModel.assumptions.growthModel
  }, null, 2));
}

/**
 * Apply cost-related deltas to the model
 *
 * @param modifiedModel - The model being modified (will be mutated)
 * @param deltas - The parameter deltas
 */
function applyCostDeltas(
  modifiedModel: FinancialModel,
  deltas: ScenarioParameterDeltas
): void {
  // Apply COGS multiplier delta
  console.log(`Applying COGS multiplier delta: ${deltas.cogsMultiplier}%`);

  // Get the costs structure
  const costs = modifiedModel.assumptions.metadata.costs;

  // Only apply changes if the multiplier is not zero
  if (deltas.cogsMultiplier !== 0) {
    // Adjust F&B COGS percentage
    const originalFbCogs = costs.fbCOGSPercent;
    costs.fbCOGSPercent = originalFbCogs * (1 + deltas.cogsMultiplier / 100);
    console.log(`F&B COGS: Original: ${originalFbCogs}% -> Modified: ${costs.fbCOGSPercent}%, Change: ${deltas.cogsMultiplier}%`);

    // Adjust merchandise COGS percentage
    const originalMerchCogs = costs.merchandiseCogsPercent;
    costs.merchandiseCogsPercent = originalMerchCogs * (1 + deltas.cogsMultiplier / 100);
    console.log(`Merchandise COGS: Original: ${originalMerchCogs}% -> Modified: ${costs.merchandiseCogsPercent}%, Change: ${deltas.cogsMultiplier}%`);

    // Adjust staff costs
    const originalStaffCost = costs.staffCostPerPerson;
    costs.staffCostPerPerson = originalStaffCost * (1 + deltas.cogsMultiplier / 100);
    console.log(`Staff cost per person: Original: $${originalStaffCost.toFixed(2)} -> Modified: $${costs.staffCostPerPerson.toFixed(2)}, Change: ${deltas.cogsMultiplier}%`);
  } else {
    console.log('COGS multiplier is zero, no changes applied to costs');
  }
}
