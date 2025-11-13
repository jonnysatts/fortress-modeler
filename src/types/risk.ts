/**
 * Phase B1: Comprehensive Risk Data Model & Categories
 * 
 * This file defines all interfaces, enums, and types for the project-level
 * risk management system as specified in the project plan.
 */

// Risk Categories as defined in the project plan
export enum RiskCategory {
  MARKET_CUSTOMER = 'market_customer',
  FINANCIAL_UNIT_ECONOMICS = 'financial_unit_economics', 
  EXECUTION_DELIVERY = 'execution_delivery',
  STRATEGIC_SCALING = 'strategic_scaling',
  OPERATIONAL = 'operational',
  REGULATORY_COMPLIANCE = 'regulatory_compliance'
}

// Risk severity levels
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

// Risk status tracking
export type RiskStatus = 'identified' | 'monitoring' | 'mitigating' | 'closed';

// Trend indicators
export type TrendDirection = 'improving' | 'stable' | 'worsening';

// Threshold comparison types
export type ThresholdType = 'above' | 'below' | 'outside_range';

// Automatic indicator status
export type IndicatorStatus = 'normal' | 'warning' | 'critical';

/**
 * Automatic risk indicator that monitors specific metrics
 */
export interface AutomaticIndicator {
  id: string;
  projectRiskId: string;
  metric: string;
  currentValue: number;
  thresholdValue: number;
  thresholdType: ThresholdType;
  status: IndicatorStatus;
  trend: TrendDirection;
  lastCalculated: Date;
  dataSource: string;
  description?: string;
  alertLevel?: RiskSeverity;
}

/**
 * Individual mitigation action within a risk management plan
 */
export interface MitigationAction {
  id: string;
  title: string;
  description: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo?: string;
  dueDate?: Date;
  completedDate?: Date;
  priority: 'low' | 'medium' | 'high';
  estimatedEffort?: string; // e.g., "2 weeks", "1 month"
  actualEffort?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Historical entry tracking risk score changes over time
 */
export interface RiskHistoryEntry {
  id: string;
  date: Date;
  probability: number;
  impact: number;
  riskScore: number;
  severity: RiskSeverity;
  notes?: string;
  changedBy: string;
  changeReason?: string;
  automaticUpdate: boolean; // Whether this was updated by automatic indicators
}

/**
 * Comprehensive project risk interface as defined in the project plan
 */
export interface ProjectRisk {
  // Basic identification
  id: string;
  projectId: string;
  category: RiskCategory;
  subcategory: string;
  title: string;
  description: string;

  // Risk Assessment (1-5 scale as specified)
  probability: number;          // 1-5 scale
  impact: number;              // 1-5 scale  
  riskScore: number;           // probability × impact (1-25)
  severity: RiskSeverity;      // Derived from risk score

  // Status & Tracking
  status: RiskStatus;
  identifiedDate: Date;
  targetResolutionDate?: Date;
  actualResolutionDate?: Date;

  // Mitigation
  mitigationPlan?: string;
  mitigationActions: MitigationAction[];
  assignedTo?: string;

  // Automatic Indicators
  automaticIndicators: AutomaticIndicator[];
  lastAutoUpdate: Date;

  // History & Audit
  riskHistory: RiskHistoryEntry[];
  lastReviewed: Date;
  reviewedBy: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  tags?: string[];
  externalReferences?: string[]; // Links to external docs, tickets, etc.
}

/**
 * Risk category definitions with subcategories as defined in project plan
 */
export interface RiskCategoryDefinition {
  category: RiskCategory;
  name: string;
  description: string;
  subcategories: RiskSubcategoryDefinition[];
  automaticIndicators: AutomaticIndicatorTemplate[];
}

export interface RiskSubcategoryDefinition {
  key: string;
  name: string;
  description: string;
  typicalIndicators: string[];
}

export interface AutomaticIndicatorTemplate {
  metric: string;
  description: string;
  dataSource: string;
  defaultThresholdType: ThresholdType;
  recommendedThreshold?: number;
  alertLevel: RiskSeverity;
}

/**
 * Risk dashboard summary statistics
 */
export interface RiskSummary {
  projectId: string;
  totalRisks: number;
  risksBySeverity: Record<RiskSeverity, number>;
  risksByCategory: Record<RiskCategory, number>;
  risksByStatus: Record<RiskStatus, number>;
  averageRiskScore: number;
  criticalRisksCount: number;
  overdueActionsCount: number;
  recentlyUpdatedRisks: ProjectRisk[];
  topRisksByScore: ProjectRisk[];
  automaticAlertsCount: number;
  lastCalculated: Date;
}

/**
 * Risk heat map data point for visualization
 */
export interface RiskHeatMapPoint {
  id: string;
  title: string;
  category: RiskCategory;
  probability: number;
  impact: number;
  riskScore: number;
  severity: RiskSeverity;
  status: RiskStatus;
}

/**
 * Risk trend analysis over time
 */
export interface RiskTrendAnalysis {
  projectId: string;
  periodStart: Date;
  periodEnd: Date;
  totalRiskScoreChange: number;
  newRisksCount: number;
  resolvedRisksCount: number;
  trendsByCategory: Record<RiskCategory, {
    averageScoreChange: number;
    riskCount: number;
    trend: TrendDirection;
  }>;
  criticalRisksTrend: TrendDirection;
  overallRiskTrend: TrendDirection;
}