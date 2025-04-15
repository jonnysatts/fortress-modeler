/**
 * Delta Calculations
 * 
 * This module contains functions for applying scenario parameter deltas to financial models.
 */

import { FinancialModel } from '@/lib/db';
import { ScenarioParameterDeltas } from '../types/scenarioTypes';

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
  
  // Apply each type of delta
  applyMarketingDeltas(modifiedModel, baselineModel, deltas);
  applyPricingDeltas(modifiedModel, deltas);
  applyAttendanceDeltas(modifiedModel, deltas);
  applyCostDeltas(modifiedModel, deltas);
  
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
  // Apply pricing percent delta - ALWAYS apply this to ensure it's properly configured
  if (modifiedModel.assumptions.metadata?.perCustomer) {
    console.log(`Applying pricing delta: ${deltas.pricingPercent}%`);

    // Apply pricing delta to ticket price
    if (modifiedModel.assumptions.metadata.perCustomer.ticketPrice !== undefined) {
      const originalTicketPrice = modifiedModel.assumptions.metadata.perCustomer.ticketPrice;

      // Always apply the pricing delta, even if it's 0, to ensure consistent calculation
      modifiedModel.assumptions.metadata.perCustomer.ticketPrice =
        originalTicketPrice * (1 + deltas.pricingPercent / 100);

      console.log(`Ticket price: Original: $${originalTicketPrice.toFixed(2)} -> Modified: $${modifiedModel.assumptions.metadata.perCustomer.ticketPrice.toFixed(2)}, Change: ${deltas.pricingPercent}%`);
    }

    // Also apply to F&B and merchandise if they exist
    if (modifiedModel.assumptions.metadata.perCustomer.fbSpend !== undefined) {
      const originalFbSpend = modifiedModel.assumptions.metadata.perCustomer.fbSpend;

      // Always apply the pricing delta, even if it's 0, to ensure consistent calculation
      modifiedModel.assumptions.metadata.perCustomer.fbSpend =
        originalFbSpend * (1 + deltas.pricingPercent / 100);

      console.log(`F&B spend: Original: $${originalFbSpend.toFixed(2)} -> Modified: $${modifiedModel.assumptions.metadata.perCustomer.fbSpend.toFixed(2)}, Change: ${deltas.pricingPercent}%`);
    }

    if (modifiedModel.assumptions.metadata.perCustomer.merchandiseSpend !== undefined) {
      const originalMerchSpend = modifiedModel.assumptions.metadata.perCustomer.merchandiseSpend;

      // Always apply the pricing delta, even if it's 0, to ensure consistent calculation
      modifiedModel.assumptions.metadata.perCustomer.merchandiseSpend =
        originalMerchSpend * (1 + deltas.pricingPercent / 100);

      console.log(`Merchandise spend: Original: $${originalMerchSpend.toFixed(2)} -> Modified: $${modifiedModel.assumptions.metadata.perCustomer.merchandiseSpend.toFixed(2)}, Change: ${deltas.pricingPercent}%`);
    }

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
  }
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
  if (modifiedModel.assumptions.metadata?.growth) {
    // Always apply the attendance growth delta, even if it's 0
    // This ensures the growth settings are properly configured
    const originalRate = modifiedModel.assumptions.metadata.growth.attendanceGrowthRate || 0;

    // Add the delta to the existing growth rate (not multiply)
    // Always apply the delta, even if it's 0, to ensure consistent calculation
    modifiedModel.assumptions.metadata.growth.attendanceGrowthRate = originalRate + deltas.attendanceGrowthPercent;
    console.log(`Attendance growth rate: Original: ${originalRate}% -> Modified: ${modifiedModel.assumptions.metadata.growth.attendanceGrowthRate}%, Change: ${deltas.attendanceGrowthPercent}%`);

    // CRITICAL: Ensure that growth-related settings are ALWAYS enabled
    // Force enable customer spend growth to ensure growth calculations are used
    modifiedModel.assumptions.metadata.growth.useCustomerSpendGrowth = true;
    console.log(`Enabled useCustomerSpendGrowth: ${modifiedModel.assumptions.metadata.growth.useCustomerSpendGrowth}`);

    // If this is a weekly event model, ensure the attendance growth is properly configured
    if (modifiedModel.assumptions.metadata.type === "WeeklyEvent" ||
        modifiedModel.assumptions.metadata.type === "Weekly") {
      console.log('Configuring weekly event model for attendance growth');

      // Ensure the growth model is properly set to use exponential growth
      if (modifiedModel.assumptions.growthModel) {
        // FORCE Set growth model to use exponential growth with a matching rate
        modifiedModel.assumptions.growthModel.type = 'exponential';

        // Update the growth model rate to match or complement the attendance growth rate
        // Ensure it's active by setting a positive rate
        const growthRate = modifiedModel.assumptions.metadata.growth.attendanceGrowthRate / 100; // Convert to decimal
        modifiedModel.assumptions.growthModel.rate = Math.max(0.01, growthRate);

        console.log('Growth model FORCED to type: exponential, rate:', modifiedModel.assumptions.growthModel.rate);
      }

      // Ensure ticket price growth is enabled and set to a reasonable value if not already set
      if (modifiedModel.assumptions.metadata.growth.ticketPriceGrowth === undefined ||
          modifiedModel.assumptions.metadata.growth.ticketPriceGrowth === 0) {
        modifiedModel.assumptions.metadata.growth.ticketPriceGrowth = 2.0; // Default 2% growth
        console.log(`Set default ticket price growth: ${modifiedModel.assumptions.metadata.growth.ticketPriceGrowth}%`);
      }

      // Ensure F&B spend growth is enabled and set to a reasonable value if not already set
      if (modifiedModel.assumptions.metadata.growth.fbSpendGrowth === undefined ||
          modifiedModel.assumptions.metadata.growth.fbSpendGrowth === 0) {
        modifiedModel.assumptions.metadata.growth.fbSpendGrowth = 2.0; // Default 2% growth
        console.log(`Set default F&B spend growth: ${modifiedModel.assumptions.metadata.growth.fbSpendGrowth}%`);
      }

      // Ensure merchandise spend growth is enabled and set to a reasonable value if not already set
      if (modifiedModel.assumptions.metadata.growth.merchandiseSpendGrowth === undefined ||
          modifiedModel.assumptions.metadata.growth.merchandiseSpendGrowth === 0) {
        modifiedModel.assumptions.metadata.growth.merchandiseSpendGrowth = 2.0; // Default 2% growth
        console.log(`Set default merchandise spend growth: ${modifiedModel.assumptions.metadata.growth.merchandiseSpendGrowth}%`);
      }
    }
  }
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
  if (modifiedModel.assumptions.metadata?.costs) {
    // Always apply the COGS multiplier, even if it's 0
    // This ensures the cost settings are properly configured

    // Adjust F&B COGS percentage
    if (modifiedModel.assumptions.metadata.costs.fbCOGSPercent !== undefined && deltas.cogsMultiplier !== 0) {
      const originalFbCogs = modifiedModel.assumptions.metadata.costs.fbCOGSPercent;
      modifiedModel.assumptions.metadata.costs.fbCOGSPercent =
        originalFbCogs * (1 + deltas.cogsMultiplier / 100);

      console.log(`F&B COGS: Original: ${originalFbCogs}% -> Modified: ${modifiedModel.assumptions.metadata.costs.fbCOGSPercent}%, Change: ${deltas.cogsMultiplier}%`);
    }

    // Adjust merchandise COGS percentage
    if (modifiedModel.assumptions.metadata.costs.merchandiseCogsPercent !== undefined && deltas.cogsMultiplier !== 0) {
      const originalMerchCogs = modifiedModel.assumptions.metadata.costs.merchandiseCogsPercent;
      modifiedModel.assumptions.metadata.costs.merchandiseCogsPercent =
        originalMerchCogs * (1 + deltas.cogsMultiplier / 100);

      console.log(`Merchandise COGS: Original: ${originalMerchCogs}% -> Modified: ${modifiedModel.assumptions.metadata.costs.merchandiseCogsPercent}%, Change: ${deltas.cogsMultiplier}%`);
    }

    // Adjust staff costs if they exist
    if (modifiedModel.assumptions.metadata.costs.staffCostPerPerson !== undefined && deltas.cogsMultiplier !== 0) {
      const originalStaffCost = modifiedModel.assumptions.metadata.costs.staffCostPerPerson;
      modifiedModel.assumptions.metadata.costs.staffCostPerPerson =
        originalStaffCost * (1 + deltas.cogsMultiplier / 100);

      console.log(`Staff cost per person: Original: $${originalStaffCost.toFixed(2)} -> Modified: $${modifiedModel.assumptions.metadata.costs.staffCostPerPerson.toFixed(2)}, Change: ${deltas.cogsMultiplier}%`);
    }
  }
}
