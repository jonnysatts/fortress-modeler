import { z } from 'zod';

/**
 * Validation schema for projects
 */
export const projectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100, "Project name cannot exceed 100 characters"),
  description: z.string().optional(),
  productType: z.string().min(1, "Product type is required"),
  targetAudience: z.string().optional(),
  timeline: z.object({
    startDate: z.date(),
    endDate: z.date().optional(),
  }).optional(),
  avatarImage: z.string().optional(),
});

/**
 * Validation schema for revenue streams
 */
export const revenueStreamSchema = z.object({
  name: z.string().min(1, "Name is required"),
  value: z.number().nonnegative("Value must be non-negative"),
  type: z.enum(["fixed", "variable", "recurring"], {
    errorMap: () => ({ message: "Type must be fixed, variable, or recurring" }),
  }),
  frequency: z.enum(["weekly", "monthly", "quarterly", "annually", "one-time"], {
    errorMap: () => ({ message: "Invalid frequency" }),
  }).optional(),
});

/**
 * Validation schema for cost categories
 */
export const costCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  value: z.number().nonnegative("Value must be non-negative"),
  type: z.enum(["fixed", "variable", "recurring"], {
    errorMap: () => ({ message: "Type must be fixed, variable, or recurring" }),
  }),
  category: z.enum(["staffing", "marketing", "operations", "other"], {
    errorMap: () => ({ message: "Invalid category" }),
  }).optional(),
});

/**
 * Validation schema for growth models
 */
export const growthModelSchema = z.object({
  type: z.string().min(1, "Growth model type is required"),
  rate: z.number().min(0, "Growth rate must be positive"),
  seasonalFactors: z.array(z.number()).optional(),
  individualRates: z.record(z.string(), z.number()).optional(),
});

/**
 * Validation schema for marketing channel items
 */
export const marketingChannelItemSchema = z.object({
  id: z.string().min(1),
  channelType: z.string().min(1, "Channel type is required"),
  name: z.string().min(1, "Name is required"),
  weeklyBudget: z.number().nonnegative("Budget must be non-negative"),
  targetAudience: z.string().min(1, "Target audience is required"),
  description: z.string().optional(),
});

/**
 * Validation schema for marketing setup
 */
export const marketingSetupSchema = z.object({
  allocationMode: z.enum(["channels", "highLevel"]),
  channels: z.array(marketingChannelItemSchema),
  totalBudget: z.number().nonnegative("Total budget must be non-negative").optional(),
  budgetApplication: z.enum(["upfront", "spreadEvenly", "spreadCustom"]).optional(),
  spreadDuration: z.number().positive("Spread duration must be positive").optional(),
});

/**
 * Validation schema for model metadata
 */
export const modelMetadataSchema = z.object({
  type: z.string().optional(),
  weeks: z.number().positive("Weeks must be positive").optional(),
  initialWeeklyAttendance: z.number().nonnegative("Initial attendance must be non-negative").optional(),
  perCustomer: z.object({
    ticketPrice: z.number().nonnegative().optional(),
    fbSpend: z.number().nonnegative().optional(),
    merchandiseSpend: z.number().nonnegative().optional(),
    onlineSpend: z.number().nonnegative().optional(),
    miscSpend: z.number().nonnegative().optional(),
  }).optional(),
  growth: z.object({
    attendanceGrowthRate: z.number(),
    useCustomerSpendGrowth: z.boolean().optional(),
    ticketPriceGrowth: z.number().optional(),
    fbSpendGrowth: z.number().optional(),
    merchandiseSpendGrowth: z.number().optional(),
    onlineSpendGrowth: z.number().optional(),
    miscSpendGrowth: z.number().optional(),
  }).optional(),
  costs: z.object({
    fbCOGSPercent: z.number().min(0).max(100).optional(),
    staffCount: z.number().nonnegative().optional(),
    staffCostPerPerson: z.number().nonnegative().optional(),
    managementCosts: z.number().nonnegative().optional(),
  }).optional(),
});

/**
 * Validation schema for model assumptions
 */
export const modelAssumptionsSchema = z.object({
  metadata: modelMetadataSchema.optional(),
  revenue: z.array(revenueStreamSchema),
  costs: z.array(costCategorySchema),
  growthModel: growthModelSchema,
  marketing: marketingSetupSchema.optional(),
});

/**
 * Validation schema for financial models
 */
export const financialModelSchema = z.object({
  name: z.string().min(1, "Model name is required").max(100, "Model name cannot exceed 100 characters"),
  projectId: z.number().positive("Project ID is required"),
  assumptions: modelAssumptionsSchema,
});

/**
 * Validation schema for actuals period entries
 */
export const actualsPeriodEntrySchema = z.object({
  projectId: z.number().positive("Project ID is required"),
  period: z.number().positive("Period must be positive"),
  periodType: z.enum(["Week", "Month"]),
  revenueActuals: z.record(z.string(), z.number()),
  costActuals: z.record(z.string(), z.number()),
  attendanceActual: z.number().nonnegative("Attendance must be non-negative").optional(),
  notes: z.string().optional(),
});
