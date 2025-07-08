export interface ForecastPeriod {
  period: string;
  projected: number;
  actual: number;
  absoluteError: number;
  percentageError: number;
  accuracyGrade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface ForecastAccuracy {
  projectId: string;
  metric: 'revenue' | 'costs' | 'profit';
  periods: ForecastPeriod[];
  overallMAPE: number; // Mean Absolute Percentage Error
  accuracyTrend: 'improving' | 'stable' | 'declining';
  confidenceScore: number; // 0-100
  riskImplications: RiskFlag[]; // Feeds into risk system
}

export interface RiskFlag {
  riskCategory: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestedAction: string;
  dataSource: string;
  confidence: number; // 0-100
}

export type AccuracyTrend = 'improving' | 'stable' | 'declining';

export interface AccuracyInsight {
  projectId: string;
  metric: string;
  insight: string;
  recommendation: string;
  priority: 'low' | 'medium' | 'high';
}

export class ForecastAccuracyService {
  /**
   * Calculate Mean Absolute Percentage Error (MAPE) for forecasts
   * MAPE = (1/n) * Σ(|actual - forecast| / |actual|) * 100
   * 
   * NOTE: Periods where actual values are zero are excluded from the calculation
   * to avoid division by zero. This means the MAPE only reflects accuracy for
   * periods with non-zero actuals. In cases where many actuals are zero (e.g.,
   * new products with no initial revenue), consider using additional metrics
   * like Mean Absolute Error (MAE) or tracking the count of excluded periods.
   */
  static calculateMAPE(projections: number[], actuals: number[]): number {
    if (projections.length !== actuals.length || projections.length === 0) {
      return 0;
    }

    let sum = 0;
    let validCount = 0;

    for (let i = 0; i < projections.length; i++) {
      // Skip if actual is zero to avoid division by zero
      if (actuals[i] !== 0) {
        const percentageError = Math.abs((actuals[i] - projections[i]) / actuals[i]) * 100;
        sum += percentageError;
        validCount++;
      }
    }

    return validCount > 0 ? sum / validCount : 0;
  }

  /**
   * Determine accuracy trend based on recent forecast periods
   */
  static getAccuracyTrend(periods: ForecastPeriod[]): AccuracyTrend {
    if (periods.length < 3) {
      return 'stable';
    }

    // Get the last 6 periods or all available
    const recentPeriods = periods.slice(-6);
    
    // Calculate moving average of errors for trend detection
    const firstHalf = recentPeriods.slice(0, Math.floor(recentPeriods.length / 2));
    const secondHalf = recentPeriods.slice(Math.floor(recentPeriods.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, p) => sum + p.percentageError, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, p) => sum + p.percentageError, 0) / secondHalf.length;

    const improvementThreshold = 5; // 5% improvement threshold
    const declineThreshold = 5; // 5% decline threshold

    if (secondHalfAvg < firstHalfAvg - improvementThreshold) {
      return 'improving';
    } else if (secondHalfAvg > firstHalfAvg + declineThreshold) {
      return 'declining';
    }

    return 'stable';
  }

  /**
   * Identify risk flags based on forecast accuracy
   */
  static identifyAccuracyRisks(accuracy: ForecastAccuracy): RiskFlag[] {
    const risks: RiskFlag[] = [];

    // High MAPE indicates poor forecast reliability
    if (accuracy.overallMAPE > 30) {
      risks.push({
        riskCategory: 'financial_unit_economics',
        severity: 'high',
        description: `Poor forecast accuracy (${accuracy.overallMAPE.toFixed(1)}% MAPE) for ${accuracy.metric}`,
        suggestedAction: 'Review forecasting methodology and assumptions',
        dataSource: 'forecast_accuracy_analysis',
        confidence: 90
      });
    } else if (accuracy.overallMAPE > 20) {
      risks.push({
        riskCategory: 'financial_unit_economics',
        severity: 'medium',
        description: `Moderate forecast accuracy issues (${accuracy.overallMAPE.toFixed(1)}% MAPE) for ${accuracy.metric}`,
        suggestedAction: 'Monitor forecast assumptions and adjust if needed',
        dataSource: 'forecast_accuracy_analysis',
        confidence: 85
      });
    }

    // Declining trend is a risk indicator
    if (accuracy.accuracyTrend === 'declining') {
      risks.push({
        riskCategory: 'execution_delivery',
        severity: 'medium',
        description: `Forecast accuracy is declining for ${accuracy.metric}`,
        suggestedAction: 'Investigate root causes of declining prediction reliability',
        dataSource: 'forecast_trend_analysis',
        confidence: 80
      });
    }

    // Check for consistent over/under estimation
    const overEstimations = accuracy.periods.filter(p => p.projected > p.actual).length;
    const underEstimations = accuracy.periods.filter(p => p.projected < p.actual).length;
    const totalPeriods = accuracy.periods.length;

    if (overEstimations > totalPeriods * 0.8) {
      risks.push({
        riskCategory: 'strategic_scaling',
        severity: 'medium',
        description: `Consistent overestimation of ${accuracy.metric} (${((overEstimations / totalPeriods) * 100).toFixed(0)}% of periods)`,
        suggestedAction: 'Adjust forecasting to be more conservative',
        dataSource: 'forecast_bias_analysis',
        confidence: 85
      });
    } else if (underEstimations > totalPeriods * 0.8) {
      risks.push({
        riskCategory: 'strategic_scaling',
        severity: 'low',
        description: `Consistent underestimation of ${accuracy.metric} (${((underEstimations / totalPeriods) * 100).toFixed(0)}% of periods)`,
        suggestedAction: 'Review if growth opportunities are being missed',
        dataSource: 'forecast_bias_analysis',
        confidence: 75
      });
    }

    return risks;
  }

  /**
   * Generate insights from forecast accuracy data across projects
   */
  static generateAccuracyInsights(projectAccuracies: ForecastAccuracy[]): AccuracyInsight[] {
    const insights: AccuracyInsight[] = [];

    // Find projects with excellent accuracy
    const excellentProjects = projectAccuracies.filter(p => p.overallMAPE < 10);
    if (excellentProjects.length > 0) {
      excellentProjects.forEach(project => {
        insights.push({
          projectId: project.projectId,
          metric: project.metric,
          insight: `Excellent forecast accuracy (${project.overallMAPE.toFixed(1)}% MAPE)`,
          recommendation: 'Maintain current forecasting approach',
          priority: 'low'
        });
      });
    }

    // Find projects needing improvement
    const poorAccuracyProjects = projectAccuracies.filter(p => p.overallMAPE > 25);
    poorAccuracyProjects.forEach(project => {
      insights.push({
        projectId: project.projectId,
        metric: project.metric,
        insight: `Poor forecast accuracy (${project.overallMAPE.toFixed(1)}% MAPE) requires attention`,
        recommendation: 'Schedule forecast methodology review with project team',
        priority: 'high'
      });
    });

    // Identify improving trends
    const improvingProjects = projectAccuracies.filter(p => p.accuracyTrend === 'improving');
    improvingProjects.forEach(project => {
      insights.push({
        projectId: project.projectId,
        metric: project.metric,
        insight: 'Forecast accuracy is improving',
        recommendation: 'Document successful changes to forecasting approach',
        priority: 'medium'
      });
    });

    // Identify declining trends
    const decliningProjects = projectAccuracies.filter(p => p.accuracyTrend === 'declining');
    decliningProjects.forEach(project => {
      insights.push({
        projectId: project.projectId,
        metric: project.metric,
        insight: 'Forecast accuracy is declining and needs intervention',
        recommendation: 'Investigate changes in market conditions or project assumptions',
        priority: 'high'
      });
    });

    return insights;
  }

  /**
   * Calculate accuracy grade based on MAPE percentage
   */
  static getAccuracyGrade(percentageError: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (percentageError <= 10) return 'A';
    if (percentageError <= 20) return 'B';
    if (percentageError <= 30) return 'C';
    if (percentageError <= 40) return 'D';
    return 'F';
  }

  /**
   * Calculate confidence score based on accuracy metrics
   */
  static calculateConfidenceScore(mape: number, trend: AccuracyTrend): number {
    // Base score from MAPE (inverse relationship)
    let score = Math.max(0, 100 - mape * 2);

    // Adjust for trend
    if (trend === 'improving') {
      score = Math.min(100, score + 10);
    } else if (trend === 'declining') {
      score = Math.max(0, score - 15);
    }

    return Math.round(score);
  }

  /**
   * Process forecast periods to calculate accuracy metrics
   */
  static processForecastPeriods(
    periods: Array<{ period: string; projected: number; actual: number }>
  ): ForecastPeriod[] {
    return periods.map(p => {
      const absoluteError = Math.abs(p.actual - p.projected);
      const percentageError = p.actual !== 0 
        ? (absoluteError / Math.abs(p.actual)) * 100 
        : 0;

      return {
        period: p.period,
        projected: p.projected,
        actual: p.actual,
        absoluteError,
        percentageError,
        accuracyGrade: this.getAccuracyGrade(percentageError)
      };
    });
  }

  /**
   * Calculate forecast accuracy for a project and metric
   */
  static calculateForecastAccuracy(
    projectId: string,
    metric: 'revenue' | 'costs' | 'profit',
    periods: Array<{ period: string; projected: number; actual: number }>
  ): ForecastAccuracy {
    const processedPeriods = this.processForecastPeriods(periods);
    const projections = processedPeriods.map(p => p.projected);
    const actuals = processedPeriods.map(p => p.actual);
    
    const overallMAPE = this.calculateMAPE(projections, actuals);
    const accuracyTrend = this.getAccuracyTrend(processedPeriods);
    const confidenceScore = this.calculateConfidenceScore(overallMAPE, accuracyTrend);

    const forecastAccuracy: ForecastAccuracy = {
      projectId,
      metric,
      periods: processedPeriods,
      overallMAPE,
      accuracyTrend,
      confidenceScore,
      riskImplications: []
    };

    // Identify risks based on the accuracy metrics
    forecastAccuracy.riskImplications = this.identifyAccuracyRisks(forecastAccuracy);

    return forecastAccuracy;
  }
}