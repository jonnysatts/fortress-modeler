/**
 * Phase B2: Automatic Risk Indicator Service
 * 
 * Integrates with Phase A analytics to automatically detect and monitor
 * financial risk indicators based on forecast accuracy, variance trends,
 * and project health metrics.
 */

import { 
  AutomaticIndicator, 
  RiskCategory, 
  RiskSeverity,
  IndicatorStatus,
  TrendDirection,
  ThresholdType
} from '@/types/risk';
import { ForecastAccuracy } from '@/services/ForecastAccuracyService';
import { VarianceTrend } from '@/services/VarianceTrendService';
import { ProjectHealthScore } from '@/services/ProjectHealthService';

export interface RiskIndicatorConfig {
  metric: string;
  description: string;
  dataSource: string;
  thresholdValue: number;
  thresholdType: ThresholdType;
  alertLevel: RiskSeverity;
  category: RiskCategory;
  subcategory: string;
}

export interface IndicatorCalculationResult {
  indicator: AutomaticIndicator;
  riskDetected: boolean;
  riskLevel: RiskSeverity;
  recommendation?: string;
}

export class AutomaticRiskIndicatorService {

  /**
   * Financial Risk Indicator Configurations
   */
  private static readonly FINANCIAL_INDICATORS: RiskIndicatorConfig[] = [
    {
      metric: 'revenue_variance',
      description: 'Revenue variance from projected targets',
      dataSource: 'forecast_accuracy',
      thresholdValue: 15, // ±15% variance threshold
      thresholdType: 'outside_range',
      alertLevel: 'medium',
      category: RiskCategory.FINANCIAL_UNIT_ECONOMICS,
      subcategory: 'unit_economics'
    },
    {
      metric: 'cost_variance',
      description: 'Cost variance from projected targets',
      dataSource: 'forecast_accuracy',
      thresholdValue: 20, // 20% cost overrun threshold
      thresholdType: 'above',
      alertLevel: 'high',
      category: RiskCategory.FINANCIAL_UNIT_ECONOMICS,
      subcategory: 'unit_economics'
    },
    {
      metric: 'profit_margin_degradation',
      description: 'Profit margin trending below acceptable levels',
      dataSource: 'financial_performance',
      thresholdValue: 20, // 20% profit margin threshold
      thresholdType: 'below',
      alertLevel: 'critical',
      category: RiskCategory.FINANCIAL_UNIT_ECONOMICS,
      subcategory: 'unit_economics'
    },
    {
      metric: 'forecast_accuracy_mape',
      description: 'Mean Absolute Percentage Error in forecasts',
      dataSource: 'forecast_accuracy',
      thresholdValue: 25, // 25% MAPE threshold
      thresholdType: 'above',
      alertLevel: 'medium',
      category: RiskCategory.FINANCIAL_UNIT_ECONOMICS,
      subcategory: 'cash_flow'
    },
    {
      metric: 'variance_volatility',
      description: 'High volatility in performance variance',
      dataSource: 'variance_trends',
      thresholdValue: 30, // 30% volatility threshold
      thresholdType: 'above',
      alertLevel: 'medium',
      category: RiskCategory.FINANCIAL_UNIT_ECONOMICS,
      subcategory: 'cash_flow'
    },
    {
      metric: 'trend_deterioration',
      description: 'Consistently declining performance trends',
      dataSource: 'variance_trends',
      thresholdValue: 3, // 3 consecutive declining periods
      thresholdType: 'above',
      alertLevel: 'high',
      category: RiskCategory.STRATEGIC_SCALING,
      subcategory: 'product_market_fit'
    },
    {
      metric: 'project_health_score',
      description: 'Overall project health score below threshold',
      dataSource: 'project_health',
      thresholdValue: 60, // Health score below 60
      thresholdType: 'below',
      alertLevel: 'high',
      category: RiskCategory.EXECUTION_DELIVERY,
      subcategory: 'development_velocity'
    }
  ];

  /**
   * Calculate all automatic risk indicators for a project
   */
  static calculateAutomaticIndicators(
    projectId: string,
    forecastAccuracy?: ForecastAccuracy[],
    varianceTrends?: VarianceTrend[],
    projectHealth?: ProjectHealthScore
  ): IndicatorCalculationResult[] {
    const results: IndicatorCalculationResult[] = [];

    // Process forecast accuracy indicators
    if (forecastAccuracy && forecastAccuracy.length > 0) {
      results.push(...this.processForecastAccuracyIndicators(projectId, forecastAccuracy));
    }

    // Process variance trend indicators
    if (varianceTrends && varianceTrends.length > 0) {
      results.push(...this.processVarianceTrendIndicators(projectId, varianceTrends));
    }

    // Process project health indicators
    if (projectHealth) {
      results.push(...this.processProjectHealthIndicators(projectId, projectHealth));
    }

    return results;
  }

  /**
   * Process forecast accuracy data for risk indicators
   */
  private static processForecastAccuracyIndicators(
    projectId: string,
    forecastAccuracies: ForecastAccuracy[]
  ): IndicatorCalculationResult[] {
    const results: IndicatorCalculationResult[] = [];

    forecastAccuracies.forEach(accuracy => {
      // Revenue variance indicator
      if (accuracy.metric === 'revenue') {
        const revenueVarianceResult = this.calculateIndicator(
          projectId,
          'revenue_variance',
          accuracy.overallMAPE,
          this.getIndicatorConfig('revenue_variance')!,
          this.getTrendFromAccuracy(accuracy.accuracyTrend)
        );
        results.push(revenueVarianceResult);

        // MAPE indicator
        const mapeResult = this.calculateIndicator(
          projectId,
          'forecast_accuracy_mape',
          accuracy.overallMAPE,
          this.getIndicatorConfig('forecast_accuracy_mape')!,
          this.getTrendFromAccuracy(accuracy.accuracyTrend)
        );
        results.push(mapeResult);
      }

      // Cost variance indicator (if cost accuracy data exists)
      if (accuracy.metric === 'costs') {
        const costVarianceResult = this.calculateIndicator(
          projectId,
          'cost_variance',
          accuracy.overallMAPE,
          this.getIndicatorConfig('cost_variance')!,
          this.getTrendFromAccuracy(accuracy.accuracyTrend)
        );
        results.push(costVarianceResult);
      }
    });

    return results;
  }

  /**
   * Process variance trend data for risk indicators
   */
  private static processVarianceTrendIndicators(
    projectId: string,
    varianceTrends: VarianceTrend[]
  ): IndicatorCalculationResult[] {
    const results: IndicatorCalculationResult[] = [];

    varianceTrends.forEach(trend => {
      // Variance volatility indicator
      const volatilityResult = this.calculateIndicator(
        projectId,
        'variance_volatility',
        trend.volatilityMetrics?.standardDeviation || 0,
        this.getIndicatorConfig('variance_volatility')!,
        trend.trendDirection
      );
      results.push(volatilityResult);

      // Trend deterioration indicator
      if (trend.trendDirection === 'declining') {
        const deteriorationResult = this.calculateIndicator(
          projectId,
          'trend_deterioration',
          trend.anomalies?.length || 0,
          this.getIndicatorConfig('trend_deterioration')!,
          trend.trendDirection
        );
        results.push(deteriorationResult);
      }
    });

    return results;
  }

  /**
   * Process project health data for risk indicators
   */
  private static processProjectHealthIndicators(
    projectId: string,
    projectHealth: ProjectHealthScore
  ): IndicatorCalculationResult[] {
    const results: IndicatorCalculationResult[] = [];

    // Overall health score indicator
    const healthResult = this.calculateIndicator(
      projectId,
      'project_health_score',
      projectHealth.overallScore,
      this.getIndicatorConfig('project_health_score')!,
      projectHealth.healthTrend
    );
    results.push(healthResult);

    // Profit margin indicator (derived from financial health component)
    const profitMarginValue = projectHealth.componentScores.financialHealth;
    const profitMarginResult = this.calculateIndicator(
      projectId,
      'profit_margin_degradation',
      profitMarginValue,
      this.getIndicatorConfig('profit_margin_degradation')!,
      projectHealth.healthTrend
    );
    results.push(profitMarginResult);

    return results;
  }

  /**
   * Calculate individual risk indicator
   */
  private static calculateIndicator(
    projectId: string,
    metric: string,
    currentValue: number,
    config: RiskIndicatorConfig,
    trend: TrendDirection
  ): IndicatorCalculationResult {
    const now = new Date();
    
    // Determine status based on threshold
    let status: IndicatorStatus = 'normal';
    let riskDetected = false;
    let riskLevel: RiskSeverity = 'low';

    switch (config.thresholdType) {
      case 'above':
        if (currentValue > config.thresholdValue) {
          status = 'critical';
          riskDetected = true;
          riskLevel = config.alertLevel;
        } else if (currentValue > config.thresholdValue * 0.8) {
          status = 'warning';
          riskLevel = 'medium';
        }
        break;

      case 'below':
        if (currentValue < config.thresholdValue) {
          status = 'critical';
          riskDetected = true;
          riskLevel = config.alertLevel;
        } else if (currentValue < config.thresholdValue * 1.2) {
          status = 'warning';
          riskLevel = 'medium';
        }
        break;

      case 'outside_range':
        const absValue = Math.abs(currentValue);
        if (absValue > config.thresholdValue) {
          status = 'critical';
          riskDetected = true;
          riskLevel = config.alertLevel;
        } else if (absValue > config.thresholdValue * 0.8) {
          status = 'warning';
          riskLevel = 'medium';
        }
        break;
    }

    // Create automatic indicator
    const indicator: AutomaticIndicator = {
      id: crypto.randomUUID(),
      projectRiskId: '', // Will be set when associated with a risk
      metric,
      currentValue,
      thresholdValue: config.thresholdValue,
      thresholdType: config.thresholdType,
      status,
      trend,
      lastCalculated: now,
      dataSource: config.dataSource,
      description: config.description,
      alertLevel: riskLevel,
      createdAt: now,
      updatedAt: now
    };

    // Generate recommendation
    const recommendation = this.generateRecommendation(metric, currentValue, config, status, trend);

    return {
      indicator,
      riskDetected,
      riskLevel,
      recommendation
    };
  }

  /**
   * Generate recommendations based on indicator status
   */
  private static generateRecommendation(
    metric: string,
    currentValue: number,
    config: RiskIndicatorConfig,
    status: IndicatorStatus,
    trend: TrendDirection
  ): string | undefined {
    if (status === 'normal') return undefined;

    const recommendationMap: Record<string, Record<IndicatorStatus, string>> = {
      'revenue_variance': {
        warning: `Revenue variance is ${currentValue.toFixed(1)}%, approaching the ${config.thresholdValue}% threshold. Review pricing and sales forecasts.`,
        critical: `Revenue variance of ${currentValue.toFixed(1)}% exceeds ${config.thresholdValue}% threshold. Immediate action needed to align actual performance with projections.`,
        normal: ''
      },
      'cost_variance': {
        warning: `Cost variance is ${currentValue.toFixed(1)}%, approaching the ${config.thresholdValue}% threshold. Review budget allocation and cost controls.`,
        critical: `Cost overrun of ${currentValue.toFixed(1)}% exceeds ${config.thresholdValue}% threshold. Implement immediate cost control measures.`,
        normal: ''
      },
      'profit_margin_degradation': {
        warning: `Profit margin at ${currentValue.toFixed(1)}% is approaching the ${config.thresholdValue}% minimum threshold. Monitor cost structure and pricing.`,
        critical: `Profit margin of ${currentValue.toFixed(1)}% is below the ${config.thresholdValue}% threshold. Critical review of unit economics required.`,
        normal: ''
      },
      'forecast_accuracy_mape': {
        warning: `Forecast accuracy MAPE of ${currentValue.toFixed(1)}% indicates declining prediction reliability. Review forecasting methodology.`,
        critical: `MAPE of ${currentValue.toFixed(1)}% exceeds ${config.thresholdValue}% threshold. Forecasting model needs significant improvement.`,
        normal: ''
      },
      'variance_volatility': {
        warning: `Performance volatility of ${currentValue.toFixed(1)}% indicates increasing unpredictability. Monitor for underlying causes.`,
        critical: `High volatility of ${currentValue.toFixed(1)}% suggests unstable business metrics. Investigate root causes immediately.`,
        normal: ''
      },
      'trend_deterioration': {
        warning: `${currentValue} consecutive declining periods detected. Monitor performance trends closely.`,
        critical: `Sustained decline over ${currentValue} periods indicates serious performance deterioration. Strategic intervention required.`,
        normal: ''
      },
      'project_health_score': {
        warning: `Project health score of ${currentValue.toFixed(1)} approaching critical threshold. Review all health components.`,
        critical: `Project health score of ${currentValue.toFixed(1)} below ${config.thresholdValue} threshold. Comprehensive project review required.`,
        normal: ''
      }
    };

    const metricRecommendations = recommendationMap[metric];
    if (!metricRecommendations) {
      return `${metric} indicator shows ${status} status. Review current performance and take appropriate action.`;
    }

    let recommendation = metricRecommendations[status];
    
    // Add trend context
    if (trend === 'worsening') {
      recommendation += ' Trend is worsening - prioritize immediate action.';
    } else if (trend === 'improving') {
      recommendation += ' Trend is improving - continue current mitigation efforts.';
    }

    return recommendation;
  }

  /**
   * Get indicator configuration by metric name
   */
  private static getIndicatorConfig(metric: string): RiskIndicatorConfig | undefined {
    return this.FINANCIAL_INDICATORS.find(config => config.metric === metric);
  }

  /**
   * Convert forecast accuracy trend to risk trend direction
   */
  private static getTrendFromAccuracy(accuracyTrend: 'improving' | 'stable' | 'declining'): TrendDirection {
    switch (accuracyTrend) {
      case 'improving': return 'improving';
      case 'stable': return 'stable';
      case 'declining': return 'worsening';
    }
  }

  /**
   * Create automatic risks based on detected indicators
   */
  static createAutomaticRisks(
    projectId: string,
    indicatorResults: IndicatorCalculationResult[],
    userId: string
  ): any[] { // Return type would be ProjectRisk[] but avoiding circular import
    const automaticRisks: any[] = [];

    indicatorResults
      .filter(result => result.riskDetected)
      .forEach(result => {
        const config = this.getIndicatorConfig(result.indicator.metric);
        if (!config) return;

        const risk = {
          id: crypto.randomUUID(),
          projectId,
          category: config.category,
          subcategory: config.subcategory,
          title: `Automatic Risk: ${config.description}`,
          description: result.recommendation || `Automatic risk detected based on ${result.indicator.metric} indicator exceeding threshold.`,
          
          // Set probability and impact based on alert level
          probability: this.getAutomaticProbability(result.riskLevel),
          impact: this.getAutomaticImpact(result.riskLevel),
          
          status: 'monitoring' as const,
          identifiedDate: new Date(),
          
          mitigationPlan: `Monitor ${result.indicator.metric} and implement corrective actions based on trend analysis.`,
          mitigationActions: [],
          
          automaticIndicators: [result.indicator],
          lastAutoUpdate: new Date(),
          
          riskHistory: [],
          lastReviewed: new Date(),
          reviewedBy: 'system',
          
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'system',
          tags: ['automatic', 'financial', result.indicator.dataSource]
        };

        automaticRisks.push(risk);
      });

    return automaticRisks;
  }

  /**
   * Map risk level to probability (1-5 scale)
   */
  private static getAutomaticProbability(riskLevel: RiskSeverity): number {
    switch (riskLevel) {
      case 'low': return 2;
      case 'medium': return 3;
      case 'high': return 4;
      case 'critical': return 5;
    }
  }

  /**
   * Map risk level to impact (1-5 scale)
   */
  private static getAutomaticImpact(riskLevel: RiskSeverity): number {
    switch (riskLevel) {
      case 'low': return 2;
      case 'medium': return 3;
      case 'high': return 4;
      case 'critical': return 5;
    }
  }

  /**
   * Update existing automatic indicators with new data
   */
  static updateAutomaticIndicators(
    existingIndicators: AutomaticIndicator[],
    newCalculations: IndicatorCalculationResult[]
  ): AutomaticIndicator[] {
    const updatedIndicators: AutomaticIndicator[] = [];

    newCalculations.forEach(calculation => {
      const existing = existingIndicators.find(ind => ind.metric === calculation.indicator.metric);
      
      if (existing) {
        // Update existing indicator
        const updated = {
          ...existing,
          currentValue: calculation.indicator.currentValue,
          status: calculation.indicator.status,
          trend: calculation.indicator.trend,
          lastCalculated: calculation.indicator.lastCalculated,
          updatedAt: new Date()
        };
        updatedIndicators.push(updated);
      } else {
        // Add new indicator
        updatedIndicators.push(calculation.indicator);
      }
    });

    // Keep existing indicators not in new calculations
    existingIndicators.forEach(existing => {
      if (!newCalculations.find(calc => calc.indicator.metric === existing.metric)) {
        updatedIndicators.push(existing);
      }
    });

    return updatedIndicators;
  }
}