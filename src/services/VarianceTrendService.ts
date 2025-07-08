import { ActualsPeriodEntry, FinancialModel } from '@/types/models';

export interface VariancePoint {
  period: string;
  variance: number;
  isAnomaly: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  actual?: number;
  projected?: number;
}

export interface VarianceTrend {
  projectId: string;
  metric: string;
  timeSeriesData: VariancePoint[];
  trendDirection: 'improving' | 'stable' | 'worsening';
  volatility: number;
  seasonalPattern?: SeasonalPattern;
  anomalies: AnomalyPoint[];
  averageVariance: number;
  varianceStandardDeviation: number;
}

export interface SeasonalPattern {
  detected: boolean;
  period: number; // e.g., 12 for yearly, 4 for quarterly
  strength: number; // 0-1, how strong the seasonal pattern is
  adjustmentFactors: Record<string, number>; // period -> adjustment factor
}

export interface AnomalyPoint {
  period: string;
  variance: number;
  severity: 'mild' | 'moderate' | 'severe';
  deviationFromNorm: number; // standard deviations from mean
  potentialCauses: string[];
}

export interface TrendAnalysis {
  direction: 'improving' | 'stable' | 'worsening';
  strength: number; // 0-1, how strong the trend is
  confidence: number; // 0-100, confidence in the trend detection
  changeRate: number; // rate of change per period
  projectedNextVariance?: number; // predicted variance for next period
}

export interface VarianceInsight {
  type: 'trend' | 'anomaly' | 'seasonal' | 'volatility';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  recommendation: string;
  affectedPeriods: string[];
  confidenceScore: number;
}

export class VarianceTrendService {
  /**
   * Calculate variance trends for a project's specific metric
   */
  static calculateVarianceTrend(
    projectId: string,
    metric: 'revenue' | 'costs' | 'profit',
    actualData: ActualsPeriodEntry[],
    financialModel: FinancialModel
  ): VarianceTrend {
    const timeSeriesData = this.buildTimeSeriesData(metric, actualData, financialModel);
    
    if (timeSeriesData.length < 3) {
      return {
        projectId,
        metric,
        timeSeriesData,
        trendDirection: 'stable',
        volatility: 0,
        anomalies: [],
        averageVariance: 0,
        varianceStandardDeviation: 0
      };
    }

    const trendAnalysis = this.detectTrend(timeSeriesData);
    const anomalies = this.detectAnomalies(timeSeriesData);
    const seasonalPattern = this.detectSeasonalPattern(timeSeriesData);
    const volatility = this.calculateVolatility(timeSeriesData);
    const statistics = this.calculateStatistics(timeSeriesData);

    // Mark anomalous points in the time series
    const enrichedTimeSeriesData = timeSeriesData.map(point => ({
      ...point,
      isAnomaly: anomalies.some(anomaly => anomaly.period === point.period),
      riskLevel: this.assessRiskLevel(point.variance, statistics.mean, statistics.stdDev)
    }));

    return {
      projectId,
      metric,
      timeSeriesData: enrichedTimeSeriesData,
      trendDirection: trendAnalysis.direction,
      volatility,
      seasonalPattern,
      anomalies,
      averageVariance: statistics.mean,
      varianceStandardDeviation: statistics.stdDev
    };
  }

  /**
   * Build time series data from actuals and projections
   */
  private static buildTimeSeriesData(
    metric: 'revenue' | 'costs' | 'profit',
    actualData: ActualsPeriodEntry[],
    financialModel: FinancialModel
  ): VariancePoint[] {
    const timeSeriesData: VariancePoint[] = [];

    actualData.forEach(actual => {
      const projectedPeriod = financialModel.periods.find(p => p.period === actual.period);
      if (!projectedPeriod) return;

      let actualValue: number;
      let projectedValue: number;

      switch (metric) {
        case 'revenue':
          actualValue = actual.revenue || 0;
          projectedValue = projectedPeriod.revenue || 0;
          break;
        case 'costs':
          actualValue = actual.costs || 0;
          projectedValue = projectedPeriod.costs || 0;
          break;
        case 'profit':
          actualValue = (actual.revenue || 0) - (actual.costs || 0);
          projectedValue = (projectedPeriod.revenue || 0) - (projectedPeriod.costs || 0);
          break;
      }

      if (projectedValue !== 0) {
        const variance = ((actualValue - projectedValue) / projectedValue) * 100;
        timeSeriesData.push({
          period: actual.period,
          variance,
          actual: actualValue,
          projected: projectedValue,
          isAnomaly: false,
          riskLevel: 'low'
        });
      }
    });

    // Sort by period (assuming period format allows string sorting)
    return timeSeriesData.sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Detect trend direction and strength using linear regression
   */
  private static detectTrend(timeSeriesData: VariancePoint[]): TrendAnalysis {
    if (timeSeriesData.length < 3) {
      return {
        direction: 'stable',
        strength: 0,
        confidence: 0,
        changeRate: 0
      };
    }

    const n = timeSeriesData.length;
    const x = Array.from({ length: n }, (_, i) => i + 1); // Time periods as 1, 2, 3...
    const y = timeSeriesData.map(point => point.variance);

    // Linear regression to find slope
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared for confidence
    const meanY = sumY / n;
    const totalSumSquares = y.reduce((sum, val) => sum + Math.pow(val - meanY, 2), 0);
    const residualSumSquares = y.reduce((sum, val, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(val - predicted, 2);
    }, 0);
    
    const rSquared = 1 - (residualSumSquares / totalSumSquares);
    const confidence = Math.max(0, Math.min(100, rSquared * 100));

    // Determine trend direction based on slope
    let direction: 'improving' | 'stable' | 'worsening';
    const slopeThreshold = 1; // 1% change per period threshold

    if (slope < -slopeThreshold) {
      direction = 'improving'; // Variance decreasing = performance improving
    } else if (slope > slopeThreshold) {
      direction = 'worsening'; // Variance increasing = performance worsening
    } else {
      direction = 'stable';
    }

    const strength = Math.min(1, Math.abs(slope) / 10); // Normalize to 0-1 scale

    // Project next period variance
    const projectedNextVariance = slope * (n + 1) + intercept;

    return {
      direction,
      strength,
      confidence,
      changeRate: slope,
      projectedNextVariance
    };
  }

  /**
   * Detect anomalies using statistical methods (Z-score and IQR)
   */
  private static detectAnomalies(timeSeriesData: VariancePoint[]): AnomalyPoint[] {
    if (timeSeriesData.length < 5) return []; // Need enough data for meaningful anomaly detection

    const variances = timeSeriesData.map(point => point.variance);
    const statistics = this.calculateStatistics(timeSeriesData);
    const anomalies: AnomalyPoint[] = [];

    // Calculate IQR for additional anomaly detection
    const sortedVariances = [...variances].sort((a, b) => a - b);
    const q1Index = Math.floor(sortedVariances.length * 0.25);
    const q3Index = Math.floor(sortedVariances.length * 0.75);
    const q1 = sortedVariances[q1Index];
    const q3 = sortedVariances[q3Index];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    timeSeriesData.forEach(point => {
      const zScore = Math.abs((point.variance - statistics.mean) / statistics.stdDev);
      const isZScoreAnomaly = zScore > 2; // 2 standard deviations
      const isIQRAnomaly = point.variance < lowerBound || point.variance > upperBound;

      if (isZScoreAnomaly || isIQRAnomaly) {
        let severity: 'mild' | 'moderate' | 'severe';
        if (zScore > 3 || Math.abs(point.variance) > 50) {
          severity = 'severe';
        } else if (zScore > 2.5 || Math.abs(point.variance) > 25) {
          severity = 'moderate';
        } else {
          severity = 'mild';
        }

        const potentialCauses = this.identifyPotentialCauses(point, statistics);

        anomalies.push({
          period: point.period,
          variance: point.variance,
          severity,
          deviationFromNorm: zScore,
          potentialCauses
        });
      }
    });

    return anomalies;
  }

  /**
   * Detect seasonal patterns in variance data
   */
  private static detectSeasonalPattern(timeSeriesData: VariancePoint[]): SeasonalPattern | undefined {
    if (timeSeriesData.length < 12) return undefined; // Need at least a year of data

    // Simple seasonal detection - can be enhanced with more sophisticated algorithms
    const variances = timeSeriesData.map(point => point.variance);
    
    // Check for yearly patterns (assuming monthly data)
    const monthlyAverages: Record<string, number[]> = {};
    
    timeSeriesData.forEach(point => {
      // Extract month from period (assuming format like "2023-01")
      const month = point.period.split('-')[1] || point.period.slice(-2);
      if (!monthlyAverages[month]) {
        monthlyAverages[month] = [];
      }
      monthlyAverages[month].push(point.variance);
    });

    // Calculate average variance for each month
    const monthlyMeans: Record<string, number> = {};
    let totalVariation = 0;
    const overallMean = variances.reduce((sum, v) => sum + v, 0) / variances.length;

    Object.entries(monthlyAverages).forEach(([month, values]) => {
      monthlyMeans[month] = values.reduce((sum, v) => sum + v, 0) / values.length;
      totalVariation += Math.pow(monthlyMeans[month] - overallMean, 2);
    });

    const seasonalStrength = Math.sqrt(totalVariation / Object.keys(monthlyMeans).length) / 
                           Math.abs(overallMean || 1);

    // Consider it seasonal if variation is significant
    const isSeasonalityDetected = seasonalStrength > 0.1 && Object.keys(monthlyMeans).length >= 3;

    if (!isSeasonalityDetected) return undefined;

    // Calculate adjustment factors
    const adjustmentFactors: Record<string, number> = {};
    Object.entries(monthlyMeans).forEach(([month, mean]) => {
      adjustmentFactors[month] = mean / overallMean;
    });

    return {
      detected: true,
      period: 12, // Assuming monthly data with yearly seasonality
      strength: Math.min(1, seasonalStrength),
      adjustmentFactors
    };
  }

  /**
   * Calculate volatility (standard deviation of variances)
   */
  private static calculateVolatility(timeSeriesData: VariancePoint[]): number {
    if (timeSeriesData.length < 2) return 0;

    const variances = timeSeriesData.map(point => point.variance);
    const mean = variances.reduce((sum, v) => sum + v, 0) / variances.length;
    const squaredDifferences = variances.map(v => Math.pow(v - mean, 2));
    const variance = squaredDifferences.reduce((sum, v) => sum + v, 0) / variances.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Calculate basic statistics for variance data
   */
  private static calculateStatistics(timeSeriesData: VariancePoint[]): { mean: number; stdDev: number; median: number } {
    const variances = timeSeriesData.map(point => point.variance);
    const mean = variances.reduce((sum, v) => sum + v, 0) / variances.length;
    
    const squaredDifferences = variances.map(v => Math.pow(v - mean, 2));
    const variance = squaredDifferences.reduce((sum, v) => sum + v, 0) / variances.length;
    const stdDev = Math.sqrt(variance);

    const sortedVariances = [...variances].sort((a, b) => a - b);
    const median = sortedVariances.length % 2 === 0
      ? (sortedVariances[sortedVariances.length / 2 - 1] + sortedVariances[sortedVariances.length / 2]) / 2
      : sortedVariances[Math.floor(sortedVariances.length / 2)];

    return { mean, stdDev, median };
  }

  /**
   * Assess risk level based on variance magnitude
   */
  private static assessRiskLevel(variance: number, mean: number, stdDev: number): 'low' | 'medium' | 'high' {
    const absVariance = Math.abs(variance);
    const zScore = Math.abs((variance - mean) / (stdDev || 1));

    if (absVariance > 30 || zScore > 2) {
      return 'high';
    } else if (absVariance > 15 || zScore > 1) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Identify potential causes for anomalous variance
   */
  private static identifyPotentialCauses(point: VariancePoint, statistics: { mean: number; stdDev: number }): string[] {
    const causes: string[] = [];
    const absVariance = Math.abs(point.variance);

    if (point.variance > 0) {
      // Positive variance (actual > projected)
      if (absVariance > 50) {
        causes.push('Significant market opportunity or forecasting error');
        causes.push('Seasonal effects not captured in projections');
      } else if (absVariance > 25) {
        causes.push('Better than expected market conditions');
        causes.push('Operational efficiency improvements');
      } else {
        causes.push('Minor forecasting adjustment needed');
      }
    } else {
      // Negative variance (actual < projected)
      if (absVariance > 50) {
        causes.push('Major market downturn or competitive pressure');
        causes.push('Operational challenges or capacity constraints');
      } else if (absVariance > 25) {
        causes.push('Market conditions worse than expected');
        causes.push('Execution or delivery issues');
      } else {
        causes.push('Conservative forecasting or minor headwinds');
      }
    }

    // Add statistical context
    const zScore = Math.abs((point.variance - statistics.mean) / (statistics.stdDev || 1));
    if (zScore > 3) {
      causes.push('Highly unusual event requiring investigation');
    }

    return causes;
  }

  /**
   * Generate insights from variance trend analysis
   */
  static generateVarianceInsights(varianceTrends: VarianceTrend[]): VarianceInsight[] {
    const insights: VarianceInsight[] = [];

    varianceTrends.forEach(trend => {
      // Trend insights
      if (trend.trendDirection === 'worsening' && trend.timeSeriesData.length >= 3) {
        insights.push({
          type: 'trend',
          severity: trend.volatility > 20 ? 'critical' : 'warning',
          title: `${trend.metric} variance is worsening`,
          description: `Variance has been trending worse over the last ${trend.timeSeriesData.length} periods with ${trend.volatility.toFixed(1)}% volatility`,
          recommendation: 'Review forecasting methodology and identify root causes of increasing variance',
          affectedPeriods: trend.timeSeriesData.slice(-3).map(p => p.period),
          confidenceScore: 85
        });
      }

      // Anomaly insights
      if (trend.anomalies.length > 0) {
        const severeAnomalies = trend.anomalies.filter(a => a.severity === 'severe');
        if (severeAnomalies.length > 0) {
          insights.push({
            type: 'anomaly',
            severity: 'critical',
            title: `Severe variance anomalies detected in ${trend.metric}`,
            description: `${severeAnomalies.length} severe anomalies found with deviations up to ${Math.max(...severeAnomalies.map(a => a.deviationFromNorm)).toFixed(1)} standard deviations`,
            recommendation: 'Investigate underlying causes and adjust future forecasting assumptions',
            affectedPeriods: severeAnomalies.map(a => a.period),
            confidenceScore: 90
          });
        }
      }

      // Volatility insights
      if (trend.volatility > 30) {
        insights.push({
          type: 'volatility',
          severity: 'warning',
          title: `High volatility in ${trend.metric} variance`,
          description: `Variance volatility of ${trend.volatility.toFixed(1)}% indicates unpredictable performance`,
          recommendation: 'Consider implementing more frequent forecasting reviews and scenario planning',
          affectedPeriods: trend.timeSeriesData.map(p => p.period),
          confidenceScore: 75
        });
      }

      // Seasonal insights
      if (trend.seasonalPattern?.detected && trend.seasonalPattern.strength > 0.3) {
        insights.push({
          type: 'seasonal',
          severity: 'info',
          title: `Seasonal pattern detected in ${trend.metric} variance`,
          description: `Strong seasonal pattern (${(trend.seasonalPattern.strength * 100).toFixed(0)}% strength) suggests predictable variance cycles`,
          recommendation: 'Incorporate seasonal adjustments into forecasting models to improve accuracy',
          affectedPeriods: Object.keys(trend.seasonalPattern.adjustmentFactors),
          confidenceScore: 80
        });
      }
    });

    return insights.sort((a, b) => {
      const severityOrder = { critical: 3, warning: 2, info: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Apply seasonal adjustments to future projections
   */
  static applySeasonalAdjustments(
    futureProjections: Array<{ period: string; value: number }>,
    seasonalPattern: SeasonalPattern
  ): Array<{ period: string; adjustedValue: number; adjustmentFactor: number }> {
    return futureProjections.map(projection => {
      const month = projection.period.split('-')[1] || projection.period.slice(-2);
      const adjustmentFactor = seasonalPattern.adjustmentFactors[month] || 1;
      
      return {
        period: projection.period,
        adjustedValue: projection.value * adjustmentFactor,
        adjustmentFactor
      };
    });
  }
}