/**
 * Simplified Risk Types for Product Managers
 * User-friendly risk management focused on actionable insights
 */

export type SimpleRiskCategory = 
  | 'customer-market'
  | 'timeline-delivery' 
  | 'budget-resources'
  | 'team-execution'
  | 'external-factors';

export type SimpleRiskPriority = 'low' | 'medium' | 'high';

export type SimpleRiskStatus = 'identified' | 'monitoring' | 'mitigating' | 'resolved';

export interface SimpleRisk {
  id: string;
  projectId: string;
  title: string;
  description: string;
  category: SimpleRiskCategory;
  priority: SimpleRiskPriority;
  status: SimpleRiskStatus;
  
  // What could happen?
  potentialImpact: string;
  
  // What are we doing about it?
  mitigationPlan: string;
  
  // Who's responsible?
  owner: string;
  
  // When do we need to act?
  targetDate?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface SimpleRiskSummary {
  projectId: string;
  totalRisks: number;
  highPriorityRisks: number;
  risksNeedingAttention: number; // identified or overdue
  resolvedThisMonth: number;
  topRisks: SimpleRisk[]; // Top 3 by priority and status
}

export const SIMPLE_RISK_CATEGORIES = {
  'customer-market': {
    name: 'Customer & Market',
    description: 'Customer adoption, market conditions, competitive threats',
    icon: '👥',
    examples: ['Low customer adoption', 'Competitor launches similar product', 'Market demand changes']
  },
  'timeline-delivery': {
    name: 'Timeline & Delivery',
    description: 'Project delays, scope creep, technical challenges',
    icon: '📅',
    examples: ['Key milestone at risk', 'Scope expanding beyond resources', 'Technical complexity underestimated']
  },
  'budget-resources': {
    name: 'Budget & Resources',
    description: 'Budget overruns, resource constraints, cost increases',
    icon: '💰',
    examples: ['Budget running over', 'Key team member unavailable', 'External costs increasing']
  },
  'team-execution': {
    name: 'Team & Execution',
    description: 'Team capacity, skill gaps, communication issues',
    icon: '👩‍💻',
    examples: ['Team lacking specific skills', 'Communication breakdown', 'Key person dependency']
  },
  'external-factors': {
    name: 'External Factors',
    description: 'Regulatory changes, vendor issues, market disruption',
    icon: '🌍',
    examples: ['Regulatory requirement changes', 'Key vendor relationship at risk', 'Economic downturn impact']
  }
} as const;

export const RISK_PRIORITY_CONFIG = {
  high: {
    label: 'High Priority',
    description: 'Needs immediate attention - could significantly impact project success',
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800'
  },
  medium: {
    label: 'Medium Priority', 
    description: 'Should monitor closely - could cause delays or issues',
    color: 'yellow',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-800'
  },
  low: {
    label: 'Low Priority',
    description: 'Keep on radar - minimal immediate impact expected',
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800'
  }
} as const;

export const RISK_STATUS_CONFIG = {
  identified: {
    label: 'Just Identified',
    description: 'Risk spotted, needs assessment and planning',
    action: 'Plan response',
    color: 'blue'
  },
  monitoring: {
    label: 'Monitoring',
    description: 'Keeping an eye on this risk, no immediate action needed',
    action: 'Continue monitoring',
    color: 'gray'
  },
  mitigating: {
    label: 'Taking Action',
    description: 'Actively working to reduce or prevent this risk',
    action: 'Execute mitigation',
    color: 'orange'
  },
  resolved: {
    label: 'Resolved',
    description: 'Risk has been addressed or is no longer relevant',
    action: 'Review lessons learned',
    color: 'green'
  }
} as const;