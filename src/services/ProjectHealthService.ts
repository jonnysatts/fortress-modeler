import { ActualsPeriodEntry, FinancialModel } from '@/types/models';
import { ForecastAccuracyService, type ForecastAccuracy } from './ForecastAccuracyService';
import { VarianceTrendService, type VarianceTrend } from './VarianceTrendService';

export interface ProjectHealthScore {
  projectId: string;
  overallScore: number; // 0-100 composite score
  componentScores: {
    financialHealth: number; // Revenue/cost performance
    forecastReliability: number; // Prediction accuracy
    trendHealth: number; // Growth trajectory
    riskProfile: number; // Risk assessment (links to Phase B)
    dataQuality: number; // Completeness and consistency
  };
  healthGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  healthTrend: 'improving' | 'stable' | 'declining';
  riskFactors: string[]; // Key concerns affecting health
  recommendations: string[]; // Actionable improvement suggestions
  lastCalculated: Date;
  confidenceLevel: number; // 0-100, how confident we are in the score
}

export interface HealthTrendPoint {
  period: string;
  overallScore: number;
  componentScores: ProjectHealthScore['componentScores'];
}

export interface HealthInsight {
  type: 'strength' | 'weakness' | 'opportunity' | 'threat';
  category: keyof ProjectHealthScore['componentScores'] | 'overall';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  impact: number; // How much this affects overall health (0-100)
  recommendation: string;
  timeframe: 'immediate' | 'short-term' | 'long-term';
}

export interface PortfolioHealthSummary {
  averageHealthScore: number;
  healthDistribution: Record<ProjectHealthScore['healthGrade'], number>;
  topPerformers: Array<{ projectId: string; score: number; grade: string }>;
  concernedProjects: Array<{ projectId: string; score: number; riskFactors: string[] }>;
  trends: {
    improving: number;
    stable: number;
    declining: number;
  };
  keyInsights: HealthInsight[];
}

export class ProjectHealthService {
  /**
   * Calculate comprehensive health score for a project
   */
  static calculateProjectHealth(
    projectId: string,
    financialModels: FinancialModel[],
    actualsData: ActualsPeriodEntry[],
    forecastAccuracy?: ForecastAccuracy[],
    varianceTrends?: VarianceTrend[]
  ): ProjectHealthScore {
    const primaryModel = financialModels.find(m => m.isPrimary) || financialModels[0];
    
    // Calculate each component score
    const financialHealth = this.calculateFinancialHealth(actualsData, primaryModel);
    const forecastReliability = this.calculateForecastReliability(forecastAccuracy);
    const trendHealth = this.calculateTrendHealth(varianceTrends);
    const riskProfile = this.calculateRiskProfile(forecastAccuracy, varianceTrends);
    const dataQuality = this.calculateDataQuality(actualsData, financialModels);

    const componentScores = {
      financialHealth,
      forecastReliability,
      trendHealth,
      riskProfile,
      dataQuality
    };

    // Calculate weighted overall score
    const weights = {
      financialHealth: 0.3,
      forecastReliability: 0.25,
      trendHealth: 0.2,
      riskProfile: 0.15,
      dataQuality: 0.1
    };

    const overallScore = Object.entries(componentScores).reduce((sum, [key, score]) => {
      return sum + (score * weights[key as keyof typeof weights]);
    }, 0);

    const healthGrade = this.calculateHealthGrade(overallScore);
    const healthTrend = this.calculateHealthTrend(varianceTrends);
    const riskFactors = this.identifyRiskFactors(componentScores, forecastAccuracy, varianceTrends);
    const recommendations = this.generateRecommendations(componentScores, riskFactors);
    const confidenceLevel = this.calculateConfidenceLevel(actualsData, financialModels);

    return {
      projectId,
      overallScore: Math.round(overallScore),
      componentScores,
      healthGrade,
      healthTrend,
      riskFactors,
      recommendations,
      lastCalculated: new Date(),
      confidenceLevel
    };
  }

  /**
   * Calculate financial health based on actual performance
   */
  private static calculateFinancialHealth(
    actualsData: ActualsPeriodEntry[],
    primaryModel?: FinancialModel
  ): number {
    if (!actualsData.length || !primaryModel) return 50; // Neutral score

    let score = 50; // Start with neutral
    const recentPeriods = actualsData.slice(-6); // Last 6 periods

    // Revenue performance
    const revenueScores: number[] = [];
    recentPeriods.forEach(actual => {
      const projectedPeriod = primaryModel.periods.find(p => p.period === actual.period);
      if (projectedPeriod && actual.revenue !== undefined && projectedPeriod.revenue !== undefined) {
        const variance = ((actual.revenue - projectedPeriod.revenue) / projectedPeriod.revenue) * 100;
        // Positive variance is good for revenue
        let periodScore = 50 + Math.min(variance, 50); // Cap at 100
        periodScore = Math.max(0, Math.min(100, periodScore)); // Clamp 0-100
        revenueScores.push(periodScore);
      }
    });

    // Cost performance  
    const costScores: number[] = [];
    recentPeriods.forEach(actual => {
      const projectedPeriod = primaryModel.periods.find(p => p.period === actual.period);
      if (projectedPeriod && actual.costs !== undefined && projectedPeriod.costs !== undefined) {
        const variance = ((actual.costs - projectedPeriod.costs) / projectedPeriod.costs) * 100;
        // Negative variance is good for costs (spending less)
        let periodScore = 50 - Math.min(variance, 50); // Cap at 100
        periodScore = Math.max(0, Math.min(100, periodScore)); // Clamp 0-100
        costScores.push(periodScore);
      }
    });

    // Average performance
    if (revenueScores.length > 0) {
      const avgRevenueScore = revenueScores.reduce((sum, s) => sum + s, 0) / revenueScores.length;
      score = (score + avgRevenueScore) / 2;
    }

    if (costScores.length > 0) {
      const avgCostScore = costScores.reduce((sum, s) => sum + s, 0) / costScores.length;
      score = (score + avgCostScore) / 2;
    }

    // Growth trajectory
    if (recentPeriods.length >= 3) {
      const revenues = recentPeriods
        .map(a => a.revenue)
        .filter(r => r !== undefined) as number[];
      
      if (revenues.length >= 3) {
        const growth = (revenues[revenues.length - 1] - revenues[0]) / revenues[0] * 100;
        if (growth > 10) score += 10; // Bonus for growth
        if (growth < -10) score -= 15; // Penalty for decline
      }
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate forecast reliability score
   */
  private static calculateForecastReliability(forecastAccuracy?: ForecastAccuracy[]): number {
    if (!forecastAccuracy || forecastAccuracy.length === 0) return 50; // Neutral

    // Average MAPE across all metrics
    const avgMAPE = forecastAccuracy.reduce((sum, acc) => sum + acc.overallMAPE, 0) / forecastAccuracy.length;
    
    // Convert MAPE to score (lower MAPE = higher score)
    let score = Math.max(0, 100 - (avgMAPE * 2)); // 50% MAPE = 0 score, 0% MAPE = 100 score
    
    // Adjust for trend
    const improvingCount = forecastAccuracy.filter(acc => acc.accuracyTrend === 'improving').length;
    const decliningCount = forecastAccuracy.filter(acc => acc.accuracyTrend === 'declining').length;
    
    if (improvingCount > decliningCount) score += 5;
    if (decliningCount > improvingCount) score -= 10;

    // Confidence adjustment
    const avgConfidence = forecastAccuracy.reduce((sum, acc) => sum + acc.confidenceScore, 0) / forecastAccuracy.length;
    score = (score + avgConfidence) / 2;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate trend health score
   */
  private static calculateTrendHealth(varianceTrends?: VarianceTrend[]): number {
    if (!varianceTrends || varianceTrends.length === 0) return 50; // Neutral

    let score = 50;
    
    varianceTrends.forEach(trend => {
      // Trend direction impact
      switch (trend.trendDirection) {
        case 'improving':
          score += 15;
          break;
        case 'worsening':
          score -= 20;
          break;
        case 'stable':
          score += 5; // Stability is good
          break;
      }

      // Volatility penalty
      if (trend.volatility > 30) score -= 15;
      else if (trend.volatility > 20) score -= 10;
      else if (trend.volatility < 10) score += 5;

      // Anomaly penalty
      const severeAnomalies = trend.anomalies.filter(a => a.severity === 'severe').length;
      score -= severeAnomalies * 5;
    });

    // Average for multiple trends
    score = score / Math.max(1, varianceTrends.length) * varianceTrends.length;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate risk profile score (higher score = lower risk)
   */
  private static calculateRiskProfile(
    forecastAccuracy?: ForecastAccuracy[],
    varianceTrends?: VarianceTrend[]
  ): number {
    let score = 80; // Start optimistic

    // Forecast accuracy risks
    if (forecastAccuracy) {
      forecastAccuracy.forEach(acc => {
        acc.riskImplications.forEach(risk => {
          switch (risk.severity) {
            case 'critical':
              score -= 20;
              break;
            case 'high':
              score -= 15;
              break;
            case 'medium':
              score -= 10;
              break;
            case 'low':
              score -= 5;
              break;
          }
        });
      });
    }

    // Variance trend risks
    if (varianceTrends) {
      varianceTrends.forEach(trend => {
        // High volatility is risky
        if (trend.volatility > 30) score -= 15;
        else if (trend.volatility > 20) score -= 10;

        // Severe anomalies are risky
        const severeAnomalies = trend.anomalies.filter(a => a.severity === 'severe').length;
        score -= severeAnomalies * 10;

        // Worsening trends are risky
        if (trend.trendDirection === 'worsening') score -= 10;
      });
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate data quality score
   */
  private static calculateDataQuality(
    actualsData: ActualsPeriodEntry[],
    financialModels: FinancialModel[]
  ): number {
    let score = 0;

    // Has financial models
    if (financialModels.length > 0) score += 20;
    if (financialModels.some(m => m.isPrimary)) score += 10;

    // Has actuals data
    if (actualsData.length > 0) score += 20;
    if (actualsData.length >= 6) score += 15; // Good historical data
    if (actualsData.length >= 12) score += 10; // Excellent historical data

    // Data completeness
    const recentActuals = actualsData.slice(-6);
    const revenueCompleteness = recentActuals.filter(a => a.revenue !== undefined).length / recentActuals.length;
    const costCompleteness = recentActuals.filter(a => a.costs !== undefined).length / recentActuals.length;
    
    score += Math.round(revenueCompleteness * 15);
    score += Math.round(costCompleteness * 10);

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Convert overall score to letter grade
   */
  private static calculateHealthGrade(overallScore: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (overallScore >= 90) return 'A';
    if (overallScore >= 80) return 'B';
    if (overallScore >= 70) return 'C';
    if (overallScore >= 60) return 'D';
    return 'F';
  }

  /**
   * Determine health trend from variance trends
   */
  private static calculateHealthTrend(varianceTrends?: VarianceTrend[]): 'improving' | 'stable' | 'declining' {
    if (!varianceTrends || varianceTrends.length === 0) return 'stable';

    const improvingCount = varianceTrends.filter(t => t.trendDirection === 'improving').length;
    const worseningCount = varianceTrends.filter(t => t.trendDirection === 'worsening').length;

    if (improvingCount > worseningCount) return 'improving';
    if (worseningCount > improvingCount) return 'declining';
    return 'stable';
  }

  /**
   * Identify key risk factors affecting health
   */
  private static identifyRiskFactors(
    componentScores: ProjectHealthScore['componentScores'],
    forecastAccuracy?: ForecastAccuracy[],
    varianceTrends?: VarianceTrend[]
  ): string[] {
    const riskFactors: string[] = [];

    // Component-based risks
    if (componentScores.financialHealth < 60) {
      riskFactors.push('Poor financial performance vs projections');
    }
    if (componentScores.forecastReliability < 60) {
      riskFactors.push('Low forecast accuracy affecting planning reliability');
    }
    if (componentScores.trendHealth < 60) {
      riskFactors.push('Negative performance trends');
    }
    if (componentScores.riskProfile < 60) {
      riskFactors.push('High risk indicators detected');
    }
    if (componentScores.dataQuality < 60) {
      riskFactors.push('Insufficient data for reliable analysis');
    }

    // Specific risks from analysis
    if (varianceTrends) {
      const highVolatilityTrends = varianceTrends.filter(t => t.volatility > 25);
      if (highVolatilityTrends.length > 0) {
        riskFactors.push('High performance volatility');
      }

      const severeAnomalies = varianceTrends.reduce((sum, t) => 
        sum + t.anomalies.filter(a => a.severity === 'severe').length, 0);
      if (severeAnomalies > 0) {
        riskFactors.push('Severe performance anomalies detected');
      }
    }

    if (forecastAccuracy) {
      const highMAPE = forecastAccuracy.filter(acc => acc.overallMAPE > 30);
      if (highMAPE.length > 0) {
        riskFactors.push('Very poor forecast accuracy');
      }
    }

    return riskFactors.slice(0, 5); // Limit to top 5 risk factors
  }

  /**
   * Generate actionable recommendations
   */
  private static generateRecommendations(
    componentScores: ProjectHealthScore['componentScores'],
    riskFactors: string[]
  ): string[] {
    const recommendations: string[] = [];

    // Component-specific recommendations
    if (componentScores.financialHealth < 70) {
      recommendations.push('Review and adjust financial projections based on actual performance');
    }
    if (componentScores.forecastReliability < 70) {
      recommendations.push('Improve forecasting methodology and validation processes');
    }
    if (componentScores.trendHealth < 70) {
      recommendations.push('Investigate root causes of negative performance trends');
    }
    if (componentScores.dataQuality < 70) {
      recommendations.push('Increase frequency of actuals data entry and model updates');
    }

    // Risk-based recommendations
    if (riskFactors.includes('High performance volatility')) {
      recommendations.push('Implement more frequent performance reviews and course corrections');
    }
    if (riskFactors.includes('Poor financial performance vs projections')) {
      recommendations.push('Conduct detailed variance analysis and adjust operational strategy');
    }

    // General recommendations
    if (componentScores.riskProfile < 60) {
      recommendations.push('Develop and implement risk mitigation strategies');
    }

    return recommendations.slice(0, 5); // Limit to top 5 recommendations
  }

  /**
   * Calculate confidence level in the health score
   */
  private static calculateConfidenceLevel(
    actualsData: ActualsPeriodEntry[],
    financialModels: FinancialModel[]
  ): number {
    let confidence = 0;

    // Data volume confidence
    if (actualsData.length >= 12) confidence += 40;
    else if (actualsData.length >= 6) confidence += 30;
    else if (actualsData.length >= 3) confidence += 20;
    else confidence += 10;

    // Data completeness confidence
    const recentActuals = actualsData.slice(-6);
    if (recentActuals.length > 0) {
      const completeness = recentActuals.filter(a => 
        a.revenue !== undefined && a.costs !== undefined
      ).length / recentActuals.length;
      confidence += Math.round(completeness * 30);
    }

    // Model quality confidence
    if (financialModels.length > 0) confidence += 20;
    if (financialModels.some(m => m.isPrimary)) confidence += 10;

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Generate health insights for a project
   */
  static generateHealthInsights(healthScore: ProjectHealthScore): HealthInsight[] {
    const insights: HealthInsight[] = [];

    // Identify strengths
    Object.entries(healthScore.componentScores).forEach(([category, score]) => {
      if (score >= 80) {
        insights.push({
          type: 'strength',
          category: category as keyof ProjectHealthScore['componentScores'],
          severity: 'low',
          title: `Strong ${category.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
          description: `${category} score of ${score}/100 indicates excellent performance`,
          impact: Math.round(score * 0.2), // 20% of score as impact
          recommendation: `Maintain current practices in ${category}`,
          timeframe: 'long-term'
        });
      }
    });

    // Identify weaknesses
    Object.entries(healthScore.componentScores).forEach(([category, score]) => {
      if (score < 60) {
        insights.push({
          type: 'weakness',
          category: category as keyof ProjectHealthScore['componentScores'],
          severity: score < 40 ? 'high' : 'medium',
          title: `Weak ${category.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
          description: `${category} score of ${score}/100 requires attention`,
          impact: Math.round((100 - score) * 0.3), // Impact based on how poor it is
          recommendation: this.getComponentRecommendation(category, score),
          timeframe: score < 40 ? 'immediate' : 'short-term'
        });
      }
    });

    // Overall health insights
    if (healthScore.overallScore >= 85) {
      insights.push({
        type: 'strength',
        category: 'overall',
        severity: 'low',
        title: 'Excellent overall health',
        description: `Project health score of ${healthScore.overallScore}/100 with grade ${healthScore.healthGrade}`,
        impact: 20,
        recommendation: 'Continue current practices and share learnings with other projects',
        timeframe: 'long-term'
      });
    } else if (healthScore.overallScore < 60) {
      insights.push({
        type: 'threat',
        category: 'overall',
        severity: 'high',
        title: 'Poor overall health requires immediate attention',
        description: `Project health score of ${healthScore.overallScore}/100 with grade ${healthScore.healthGrade}`,
        impact: 40,
        recommendation: 'Conduct comprehensive project review and implement improvement plan',
        timeframe: 'immediate'
      });
    }

    return insights.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Get specific recommendation for a component
   */
  private static getComponentRecommendation(category: string, score: number): string {
    const recommendations: Record<string, string> = {
      financialHealth: 'Review pricing strategy, cost management, and operational efficiency',
      forecastReliability: 'Improve forecasting models and incorporate more leading indicators',
      trendHealth: 'Analyze performance drivers and implement corrective actions',
      riskProfile: 'Develop comprehensive risk management and mitigation strategies',
      dataQuality: 'Improve data collection processes and ensure regular updates'
    };

    return recommendations[category] || 'Review and improve this area of project performance';
  }

  /**
   * Calculate portfolio health summary
   */
  static calculatePortfolioHealthSummary(healthScores: ProjectHealthScore[]): PortfolioHealthSummary {
    if (healthScores.length === 0) {
      return {
        averageHealthScore: 0,
        healthDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 },
        topPerformers: [],
        concernedProjects: [],
        trends: { improving: 0, stable: 0, declining: 0 },
        keyInsights: []
      };
    }

    const averageHealthScore = healthScores.reduce((sum, h) => sum + h.overallScore, 0) / healthScores.length;

    const healthDistribution = healthScores.reduce((dist, h) => {
      dist[h.healthGrade]++;
      return dist;
    }, { A: 0, B: 0, C: 0, D: 0, F: 0 });

    const topPerformers = healthScores
      .filter(h => h.overallScore >= 80)
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 5)
      .map(h => ({ projectId: h.projectId, score: h.overallScore, grade: h.healthGrade }));

    const concernedProjects = healthScores
      .filter(h => h.overallScore < 60)
      .sort((a, b) => a.overallScore - b.overallScore)
      .slice(0, 5)
      .map(h => ({ projectId: h.projectId, score: h.overallScore, riskFactors: h.riskFactors }));

    const trends = healthScores.reduce((trends, h) => {
      trends[h.healthTrend]++;
      return trends;
    }, { improving: 0, stable: 0, declining: 0 });

    // Generate key insights for the portfolio
    const keyInsights: HealthInsight[] = [];

    if (averageHealthScore < 60) {
      keyInsights.push({
        type: 'threat',
        category: 'overall',
        severity: 'high',
        title: 'Portfolio health below target',
        description: `Average health score of ${averageHealthScore.toFixed(1)} indicates systemic issues`,
        impact: 50,
        recommendation: 'Conduct portfolio-wide review and implement improvement initiatives',
        timeframe: 'immediate'
      });
    }

    if (trends.declining > trends.improving) {
      keyInsights.push({
        type: 'threat',
        category: 'overall',
        severity: 'medium',
        title: 'More projects declining than improving',
        description: `${trends.declining} projects declining vs ${trends.improving} improving`,
        impact: 30,
        recommendation: 'Focus on identifying and addressing common decline factors',
        timeframe: 'short-term'
      });
    }

    return {
      averageHealthScore: Math.round(averageHealthScore),
      healthDistribution,
      topPerformers,
      concernedProjects,
      trends,
      keyInsights
    };
  }
}