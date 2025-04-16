// Centralized types for calculation engine
import type { FinancialModel } from '../db';

export interface ForecastPeriodData {
  period: number;
  point: string;
  revenue: number;
  cost: number;
  profit: number;
  cumulativeRevenue: number;
  cumulativeCost: number;
  cumulativeProfit: number;
  attendance?: number;
  totalCost?: number;
}

export interface ActualsPeriodEntry {
  id?: number;
  projectId: number;
  modelId: number;
  period: number;
  revenueActuals: Record<string, number>;
  costActuals: Record<string, number>;
  marketingActuals?: Record<string, any>;
  attendanceActual?: number;
  notes?: string;
}

export interface MetricsSummary {
  totalRevenue: number;
  totalCosts: number;
  totalProfit: number;
  profitMargin: number;
  breakEvenPeriod: {
    index: number | null;
    label: string;
  };
  averageWeeklyRevenue: number;
  averageWeeklyCosts: number;
  averageWeeklyProfit: number;
}

export interface RiskScore {
  score: number;
  level: string;
}
