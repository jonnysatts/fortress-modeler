import { FinancialModel } from './db'; // Adjust import path if necessary
import logger from '@/utils/logger';

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
    logger.error("Error calculating total revenue:", error);
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
    logger.error("Error calculating total costs:", error);
    return 0;
  }
};
