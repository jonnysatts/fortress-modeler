/**
 * Phase B1: Risk Category Definitions & Subcategories
 * 
 * Comprehensive definitions of all risk categories, subcategories, and 
 * automatic indicators as specified in the project plan.
 */

import { 
  RiskCategory, 
  RiskCategoryDefinition, 
  RiskSubcategoryDefinition,
  AutomaticIndicatorTemplate,
  ThresholdType 
} from '@/types/risk';

/**
 * Market & Customer Risk Subcategories
 */
const marketCustomerSubcategories: RiskSubcategoryDefinition[] = [
  {
    key: 'customer_acquisition',
    name: 'Customer Acquisition',
    description: 'Risks related to acquiring new customers and customer acquisition costs',
    typicalIndicators: [
      'Customer Acquisition Cost (CAC) trending upward',
      'Lead conversion rates declining', 
      'Marketing channel effectiveness decreasing',
      'Customer payback period extending'
    ]
  },
  {
    key: 'customer_retention',
    name: 'Customer Retention',
    description: 'Risks related to keeping existing customers and preventing churn',
    typicalIndicators: [
      'Customer churn rate increases',
      'Customer satisfaction scores declining',
      'Customer engagement metrics dropping',
      'Support ticket volume rising'
    ]
  },
  {
    key: 'market_penetration',
    name: 'Market Penetration',
    description: 'Risks related to market share and competitive positioning',
    typicalIndicators: [
      'Market penetration stagnation',
      'Competitive pricing pressure',
      'Market size shrinkage indicators',
      'New competitor threats'
    ]
  }
];

/**
 * Financial & Unit Economics Risk Subcategories
 */
const financialUnitEconomicsSubcategories: RiskSubcategoryDefinition[] = [
  {
    key: 'unit_economics',
    name: 'Unit Economics',
    description: 'Risks related to the fundamental economics of the business model',
    typicalIndicators: [
      'Unit economics deterioration (LTV/CAC ratio)',
      'Gross margin compression',
      'Customer lifetime value declining',
      'Variable cost increases'
    ]
  },
  {
    key: 'cash_flow',
    name: 'Cash Flow',
    description: 'Risks related to cash flow timing and liquidity',
    typicalIndicators: [
      'Burn rate acceleration',
      'Cash flow timing mismatches',
      'Payment default rate increases',
      'Collection period extending'
    ]
  },
  {
    key: 'revenue_concentration',
    name: 'Revenue Concentration',
    description: 'Risks related to dependency on key customers or revenue streams',
    typicalIndicators: [
      'Revenue concentration (top 3 customers > 50%)',
      'Single revenue stream dependency',
      'Geographic revenue concentration',
      'Seasonal revenue volatility'
    ]
  }
];

/**
 * Execution & Delivery Risk Subcategories
 */
const executionDeliverySubcategories: RiskSubcategoryDefinition[] = [
  {
    key: 'development_velocity',
    name: 'Development Velocity',
    description: 'Risks related to development speed and efficiency',
    typicalIndicators: [
      'Sprint velocity declining trend',
      'Feature delivery delays (>20% behind schedule)',
      'Development cycle time increasing',
      'Code review bottlenecks'
    ]
  },
  {
    key: 'quality_assurance',
    name: 'Quality Assurance',
    description: 'Risks related to product quality and bug management',
    typicalIndicators: [
      'Bug rate increasing',
      'Customer-reported issues rising',
      'Production incident frequency',
      'Quality gate failures'
    ]
  },
  {
    key: 'team_capacity',
    name: 'Team Capacity',
    description: 'Risks related to team utilization and capability',
    typicalIndicators: [
      'Team utilization < 70% or > 90%',
      'Key person dependency (knowledge silos)',
      'Skills gap identification',
      'Team turnover rate'
    ]
  },
  {
    key: 'technical_debt',
    name: 'Technical Debt',
    description: 'Risks related to accumulating technical debt and maintenance',
    typicalIndicators: [
      'Technical debt accumulation',
      'Code complexity metrics rising',
      'Maintenance effort increasing',
      'Legacy system dependencies'
    ]
  }
];

/**
 * Strategic & Scaling Risk Subcategories
 */
const strategicScalingSubcategories: RiskSubcategoryDefinition[] = [
  {
    key: 'product_market_fit',
    name: 'Product-Market Fit',
    description: 'Risks related to maintaining and improving product-market fit',
    typicalIndicators: [
      'Product-market fit degradation signals',
      'Customer usage patterns changing',
      'Feature adoption rates declining',
      'Market feedback becoming negative'
    ]
  },
  {
    key: 'scalability',
    name: 'Scalability',
    description: 'Risks related to scaling the business and technology',
    typicalIndicators: [
      'Scalability bottlenecks approaching',
      'Resource constraint projections',
      'Infrastructure capacity limits',
      'Process scalability issues'
    ]
  },
  {
    key: 'technology_strategy',
    name: 'Technology Strategy',
    description: 'Risks related to technology choices and architecture',
    typicalIndicators: [
      'Technology stack obsolescence',
      'Platform dependency risks',
      'Architecture limitation signals',
      'Integration complexity growth'
    ]
  },
  {
    key: 'market_timing',
    name: 'Market Timing',
    description: 'Risks related to market timing and strategic positioning',
    typicalIndicators: [
      'Market timing misalignment',
      'Competitive window closing',
      'Regulatory timing risks',
      'Economic cycle misalignment'
    ]
  }
];

/**
 * Operational Risk Subcategories
 */
const operationalSubcategories: RiskSubcategoryDefinition[] = [
  {
    key: 'infrastructure',
    name: 'Infrastructure',
    description: 'Risks related to infrastructure reliability and performance',
    typicalIndicators: [
      'Infrastructure reliability < 99.5%',
      'System performance degradation',
      'Downtime frequency increasing',
      'Capacity utilization risks'
    ]
  },
  {
    key: 'vendor_supplier',
    name: 'Vendor & Supplier',
    description: 'Risks related to external dependencies and partnerships',
    typicalIndicators: [
      'Vendor/supplier concentration',
      'Third-party service reliability',
      'Contract renewal risks',
      'Supplier performance issues'
    ]
  },
  {
    key: 'data_management',
    name: 'Data Management',
    description: 'Risks related to data quality, integrity, and management',
    typicalIndicators: [
      'Data quality degradation',
      'Data integration failures',
      'Backup and recovery issues',
      'Data governance gaps'
    ]
  },
  {
    key: 'process_efficiency',
    name: 'Process Efficiency',
    description: 'Risks related to operational processes and workflows',
    typicalIndicators: [
      'Process bottlenecks',
      'Integration failure rates',
      'Manual process dependencies',
      'Workflow automation gaps'
    ]
  },
  {
    key: 'security',
    name: 'Security',
    description: 'Risks related to cybersecurity and data protection',
    typicalIndicators: [
      'Security vulnerability exposure',
      'Incident response time',
      'Access control violations',
      'Security audit findings'
    ]
  }
];

/**
 * Regulatory & Compliance Risk Subcategories
 */
const regulatoryComplianceSubcategories: RiskSubcategoryDefinition[] = [
  {
    key: 'regulatory_changes',
    name: 'Regulatory Changes',
    description: 'Risks related to changing regulatory requirements',
    typicalIndicators: [
      'Regulatory change impact',
      'Compliance gap analysis',
      'Regulatory monitoring alerts',
      'Industry standard changes'
    ]
  },
  {
    key: 'audit_compliance',
    name: 'Audit & Compliance',
    description: 'Risks related to compliance audits and findings',
    typicalIndicators: [
      'Compliance audit findings',
      'Internal control weaknesses',
      'Certification renewal risks',
      'Regulatory inspection results'
    ]
  },
  {
    key: 'data_privacy',
    name: 'Data Privacy',
    description: 'Risks related to data privacy and protection regulations',
    typicalIndicators: [
      'Data privacy violations',
      'GDPR/CCPA compliance gaps',
      'Privacy impact assessments',
      'Data breach incidents'
    ]
  },
  {
    key: 'legal_ip',
    name: 'Legal & Intellectual Property',
    description: 'Risks related to legal issues and intellectual property',
    typicalIndicators: [
      'Legal/IP risks',
      'Patent infringement concerns',
      'Contract dispute risks',
      'Intellectual property violations'
    ]
  }
];

/**
 * Automatic Indicator Templates for Financial Metrics
 */
const financialAutomaticIndicators: AutomaticIndicatorTemplate[] = [
  {
    metric: 'revenue_variance',
    description: 'Revenue variance from projected targets',
    dataSource: 'forecast_accuracy',
    defaultThresholdType: 'outside_range' as ThresholdType,
    recommendedThreshold: 15, // ±15% variance threshold
    alertLevel: 'medium'
  },
  {
    metric: 'cost_variance',
    description: 'Cost variance from projected targets', 
    dataSource: 'forecast_accuracy',
    defaultThresholdType: 'above' as ThresholdType,
    recommendedThreshold: 20, // 20% cost overrun threshold
    alertLevel: 'high'
  },
  {
    metric: 'profit_margin',
    description: 'Profit margin trending below threshold',
    dataSource: 'financial_performance',
    defaultThresholdType: 'below' as ThresholdType,
    recommendedThreshold: 20, // 20% profit margin threshold
    alertLevel: 'critical'
  },
  {
    metric: 'forecast_accuracy_mape',
    description: 'Mean Absolute Percentage Error in forecasts',
    dataSource: 'forecast_accuracy',
    defaultThresholdType: 'above' as ThresholdType,
    recommendedThreshold: 25, // 25% MAPE threshold
    alertLevel: 'medium'
  }
];

/**
 * Complete Risk Category Definitions
 */
export const RISK_CATEGORY_DEFINITIONS: RiskCategoryDefinition[] = [
  {
    category: RiskCategory.MARKET_CUSTOMER,
    name: 'Market & Customer',
    description: 'Risks related to customer acquisition, retention, and market dynamics',
    subcategories: marketCustomerSubcategories,
    automaticIndicators: []
  },
  {
    category: RiskCategory.FINANCIAL_UNIT_ECONOMICS,
    name: 'Financial & Unit Economics',
    description: 'Risks related to financial performance, unit economics, and cash flow',
    subcategories: financialUnitEconomicsSubcategories,
    automaticIndicators: financialAutomaticIndicators
  },
  {
    category: RiskCategory.EXECUTION_DELIVERY,
    name: 'Execution & Delivery',
    description: 'Risks related to development execution, quality, and delivery',
    subcategories: executionDeliverySubcategories,
    automaticIndicators: []
  },
  {
    category: RiskCategory.STRATEGIC_SCALING,
    name: 'Strategic & Scaling',
    description: 'Risks related to strategic direction, product-market fit, and scaling',
    subcategories: strategicScalingSubcategories,
    automaticIndicators: []
  },
  {
    category: RiskCategory.OPERATIONAL,
    name: 'Operational',
    description: 'Risks related to operations, infrastructure, and processes',
    subcategories: operationalSubcategories,
    automaticIndicators: []
  },
  {
    category: RiskCategory.REGULATORY_COMPLIANCE,
    name: 'Regulatory & Compliance',
    description: 'Risks related to regulatory requirements, compliance, and legal issues',
    subcategories: regulatoryComplianceSubcategories,
    automaticIndicators: []
  }
];

/**
 * Helper functions for working with risk categories
 */
export const getRiskCategoryDefinition = (category: RiskCategory): RiskCategoryDefinition | undefined => {
  return RISK_CATEGORY_DEFINITIONS.find(def => def.category === category);
};

export const getSubcategoryDefinition = (category: RiskCategory, subcategoryKey: string) => {
  const categoryDef = getRiskCategoryDefinition(category);
  return categoryDef?.subcategories.find(sub => sub.key === subcategoryKey);
};

export const getAllSubcategories = (): { category: RiskCategory; subcategory: RiskSubcategoryDefinition }[] => {
  return RISK_CATEGORY_DEFINITIONS.flatMap(cat => 
    cat.subcategories.map(sub => ({ category: cat.category, subcategory: sub }))
  );
};

export const getAutomaticIndicatorsForCategory = (category: RiskCategory): AutomaticIndicatorTemplate[] => {
  const categoryDef = getRiskCategoryDefinition(category);
  return categoryDef?.automaticIndicators || [];
};