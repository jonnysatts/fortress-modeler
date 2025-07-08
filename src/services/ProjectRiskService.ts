/**
 * Phase B1: Project Risk Service
 * 
 * Comprehensive service for managing project risks, mitigation actions,
 * and automatic risk indicators.
 */

import { 
  ProjectRisk, 
  MitigationAction, 
  AutomaticIndicator,
  RiskHistoryEntry,
  RiskSummary,
  RiskHeatMapPoint,
  RiskTrendAnalysis,
  RiskCategory,
  RiskSeverity,
  RiskStatus,
  TrendDirection
} from '@/types/risk';

export class ProjectRiskService {
  
  /**
   * Calculate risk score from probability and impact (1-5 scale each)
   */
  static calculateRiskScore(probability: number, impact: number): number {
    if (probability < 1 || probability > 5 || impact < 1 || impact > 5) {
      throw new Error('Probability and impact must be between 1 and 5');
    }
    return probability * impact;
  }

  /**
   * Determine risk severity from risk score (1-25 scale)
   */
  static determineSeverity(riskScore: number): RiskSeverity {
    if (riskScore >= 20) return 'critical';
    if (riskScore >= 12) return 'high';
    if (riskScore >= 6) return 'medium';
    return 'low';
  }

  /**
   * Create a new project risk with automatic scoring
   */
  static createRisk(riskData: Omit<ProjectRisk, 'id' | 'riskScore' | 'severity' | 'createdAt' | 'updatedAt' | 'riskHistory'>): ProjectRisk {
    const riskScore = this.calculateRiskScore(riskData.probability, riskData.impact);
    const severity = this.determineSeverity(riskScore);
    
    const now = new Date();
    const risk: ProjectRisk = {
      ...riskData,
      id: crypto.randomUUID(),
      riskScore,
      severity,
      createdAt: now,
      updatedAt: now,
      riskHistory: []
    };

    // Create initial history entry
    const initialHistoryEntry: RiskHistoryEntry = {
      id: crypto.randomUUID(),
      date: now,
      probability: risk.probability,
      impact: risk.impact,
      riskScore: risk.riskScore,
      severity: risk.severity,
      notes: 'Risk created',
      changedBy: risk.createdBy,
      changeReason: 'Initial risk creation',
      automaticUpdate: false
    };

    risk.riskHistory = [initialHistoryEntry];
    return risk;
  }

  /**
   * Update risk assessment and create history entry
   */
  static updateRiskAssessment(
    risk: ProjectRisk, 
    probability: number, 
    impact: number, 
    changedBy: string,
    changeReason?: string,
    automaticUpdate: boolean = false
  ): ProjectRisk {
    const newRiskScore = this.calculateRiskScore(probability, impact);
    const newSeverity = this.determineSeverity(newRiskScore);
    
    // Only create history entry if values actually changed
    const hasChanged = 
      risk.probability !== probability ||
      risk.impact !== impact ||
      risk.riskScore !== newRiskScore ||
      risk.severity !== newSeverity;

    const updatedRisk: ProjectRisk = {
      ...risk,
      probability,
      impact,
      riskScore: newRiskScore,
      severity: newSeverity,
      updatedAt: new Date(),
      lastReviewed: automaticUpdate ? risk.lastReviewed : new Date(),
      reviewedBy: automaticUpdate ? risk.reviewedBy : changedBy
    };

    if (hasChanged) {
      const historyEntry: RiskHistoryEntry = {
        id: crypto.randomUUID(),
        date: new Date(),
        probability,
        impact,
        riskScore: newRiskScore,
        severity: newSeverity,
        changedBy,
        changeReason: changeReason || 'Risk assessment updated',
        automaticUpdate
      };

      updatedRisk.riskHistory = [...risk.riskHistory, historyEntry];
    }

    return updatedRisk;
  }

  /**
   * Calculate risk summary statistics for a project
   */
  static calculateRiskSummary(risks: ProjectRisk[]): RiskSummary {
    const totalRisks = risks.length;
    
    // Count risks by severity
    const risksBySeverity: Record<RiskSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    // Count risks by category
    const risksByCategory: Record<RiskCategory, number> = {
      [RiskCategory.MARKET_CUSTOMER]: 0,
      [RiskCategory.FINANCIAL_UNIT_ECONOMICS]: 0,
      [RiskCategory.EXECUTION_DELIVERY]: 0,
      [RiskCategory.STRATEGIC_SCALING]: 0,
      [RiskCategory.OPERATIONAL]: 0,
      [RiskCategory.REGULATORY_COMPLIANCE]: 0
    };

    // Count risks by status
    const risksByStatus: Record<RiskStatus, number> = {
      identified: 0,
      monitoring: 0,
      mitigating: 0,
      closed: 0
    };

    let totalRiskScore = 0;
    let criticalRisksCount = 0;
    let overdueActionsCount = 0;
    let automaticAlertsCount = 0;

    const now = new Date();

    risks.forEach(risk => {
      // Count by severity
      risksBySeverity[risk.severity]++;
      
      // Count by category
      risksByCategory[risk.category]++;
      
      // Count by status
      risksByStatus[risk.status]++;
      
      // Sum risk scores
      totalRiskScore += risk.riskScore;
      
      // Count critical risks
      if (risk.severity === 'critical') {
        criticalRisksCount++;
      }

      // Count overdue actions
      risk.mitigationActions.forEach(action => {
        if (action.status !== 'completed' && 
            action.status !== 'cancelled' && 
            action.dueDate && 
            action.dueDate < now) {
          overdueActionsCount++;
        }
      });

      // Count automatic alerts (warning or critical indicators)
      risk.automaticIndicators.forEach(indicator => {
        if (indicator.status === 'warning' || indicator.status === 'critical') {
          automaticAlertsCount++;
        }
      });
    });

    const averageRiskScore = totalRisks > 0 ? totalRiskScore / totalRisks : 0;

    // Get top risks by score
    const topRisksByScore = [...risks]
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5);

    // Get recently updated risks (last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentlyUpdatedRisks = risks
      .filter(risk => risk.updatedAt > sevenDaysAgo)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 5);

    return {
      projectId: risks[0]?.projectId || '',
      totalRisks,
      risksBySeverity,
      risksByCategory,
      risksByStatus,
      averageRiskScore: Number(averageRiskScore.toFixed(1)),
      criticalRisksCount,
      overdueActionsCount,
      recentlyUpdatedRisks,
      topRisksByScore,
      automaticAlertsCount,
      lastCalculated: now
    };
  }

  /**
   * Generate risk heat map data for visualization
   */
  static generateRiskHeatMap(risks: ProjectRisk[]): RiskHeatMapPoint[] {
    return risks.map(risk => ({
      id: risk.id,
      title: risk.title,
      category: risk.category,
      probability: risk.probability,
      impact: risk.impact,
      riskScore: risk.riskScore,
      severity: risk.severity,
      status: risk.status
    }));
  }

  /**
   * Analyze risk trends over time
   */
  static analyzeRiskTrends(
    currentRisks: ProjectRisk[], 
    previousRisks: ProjectRisk[],
    periodStart: Date,
    periodEnd: Date
  ): RiskTrendAnalysis {
    const currentTotalScore = currentRisks.reduce((sum, risk) => sum + risk.riskScore, 0);
    const previousTotalScore = previousRisks.reduce((sum, risk) => sum + risk.riskScore, 0);
    const totalRiskScoreChange = currentTotalScore - previousTotalScore;

    // Count new and resolved risks
    const previousRiskIds = new Set(previousRisks.map(r => r.id));
    const currentRiskIds = new Set(currentRisks.map(r => r.id));
    
    const newRisksCount = currentRisks.filter(r => !previousRiskIds.has(r.id)).length;
    const resolvedRisksCount = previousRisks.filter(r => !currentRiskIds.has(r.id)).length;

    // Analyze trends by category
    const trendsByCategory: Record<RiskCategory, {
      averageScoreChange: number;
      riskCount: number;
      trend: TrendDirection;
    }> = {} as any;

    Object.values(RiskCategory).forEach(category => {
      const currentCategoryRisks = currentRisks.filter(r => r.category === category);
      const previousCategoryRisks = previousRisks.filter(r => r.category === category);
      
      const currentAvg = currentCategoryRisks.length > 0 
        ? currentCategoryRisks.reduce((sum, r) => sum + r.riskScore, 0) / currentCategoryRisks.length 
        : 0;
      const previousAvg = previousCategoryRisks.length > 0 
        ? previousCategoryRisks.reduce((sum, r) => sum + r.riskScore, 0) / previousCategoryRisks.length 
        : 0;
      
      const averageScoreChange = currentAvg - previousAvg;
      let trend: TrendDirection = 'stable';
      
      if (Math.abs(averageScoreChange) > 1) {
        trend = averageScoreChange > 0 ? 'worsening' : 'improving';
      }

      trendsByCategory[category] = {
        averageScoreChange: Number(averageScoreChange.toFixed(1)),
        riskCount: currentCategoryRisks.length,
        trend
      };
    });

    // Determine overall trends
    const currentCriticalCount = currentRisks.filter(r => r.severity === 'critical').length;
    const previousCriticalCount = previousRisks.filter(r => r.severity === 'critical').length;
    
    let criticalRisksTrend: TrendDirection = 'stable';
    if (currentCriticalCount > previousCriticalCount) criticalRisksTrend = 'worsening';
    else if (currentCriticalCount < previousCriticalCount) criticalRisksTrend = 'improving';

    let overallRiskTrend: TrendDirection = 'stable';
    if (Math.abs(totalRiskScoreChange) > 5) {
      overallRiskTrend = totalRiskScoreChange > 0 ? 'worsening' : 'improving';
    }

    return {
      projectId: currentRisks[0]?.projectId || '',
      periodStart,
      periodEnd,
      totalRiskScoreChange,
      newRisksCount,
      resolvedRisksCount,
      trendsByCategory,
      criticalRisksTrend,
      overallRiskTrend
    };
  }

  /**
   * Create mitigation action
   */
  static createMitigationAction(actionData: Omit<MitigationAction, 'id' | 'createdAt' | 'updatedAt'>): MitigationAction {
    const now = new Date();
    return {
      ...actionData,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Update mitigation action status
   */
  static updateMitigationAction(
    action: MitigationAction, 
    updates: Partial<Omit<MitigationAction, 'id' | 'createdAt' | 'updatedAt'>>
  ): MitigationAction {
    const updatedAction = {
      ...action,
      ...updates,
      updatedAt: new Date()
    };

    // Set completed date if status changed to completed
    if (updates.status === 'completed' && action.status !== 'completed') {
      updatedAction.completedDate = new Date();
    }

    return updatedAction;
  }

  /**
   * Create automatic indicator
   */
  static createAutomaticIndicator(indicatorData: Omit<AutomaticIndicator, 'id' | 'createdAt' | 'updatedAt'>): AutomaticIndicator {
    const now = new Date();
    return {
      ...indicatorData,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Update automatic indicator with new value
   */
  static updateAutomaticIndicator(
    indicator: AutomaticIndicator,
    newValue: number,
    trend: TrendDirection
  ): AutomaticIndicator {
    let status = indicator.status;
    
    // Determine status based on threshold
    switch (indicator.thresholdType) {
      case 'above':
        status = newValue > indicator.thresholdValue ? 'critical' : 'normal';
        break;
      case 'below':
        status = newValue < indicator.thresholdValue ? 'critical' : 'normal';
        break;
      case 'outside_range':
        const threshold = indicator.thresholdValue;
        status = Math.abs(newValue) > threshold ? 'critical' : 'normal';
        break;
    }

    // Set warning status for values approaching threshold (within 20%)
    if (status === 'normal') {
      const threshold = indicator.thresholdValue;
      const warningThreshold = threshold * 0.8;
      
      switch (indicator.thresholdType) {
        case 'above':
          if (newValue > warningThreshold) status = 'warning';
          break;
        case 'below':
          if (newValue < threshold * 1.2) status = 'warning';
          break;
        case 'outside_range':
          if (Math.abs(newValue) > warningThreshold) status = 'warning';
          break;
      }
    }

    return {
      ...indicator,
      currentValue: newValue,
      status,
      trend,
      lastCalculated: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Filter risks by various criteria
   */
  static filterRisks(
    risks: ProjectRisk[],
    filters: {
      category?: RiskCategory;
      severity?: RiskSeverity;
      status?: RiskStatus;
      assignedTo?: string;
      searchTerm?: string;
    }
  ): ProjectRisk[] {
    return risks.filter(risk => {
      if (filters.category && risk.category !== filters.category) return false;
      if (filters.severity && risk.severity !== filters.severity) return false;
      if (filters.status && risk.status !== filters.status) return false;
      if (filters.assignedTo && risk.assignedTo !== filters.assignedTo) return false;
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const titleMatch = risk.title.toLowerCase().includes(searchLower);
        const descMatch = risk.description.toLowerCase().includes(searchLower);
        const subcatMatch = risk.subcategory.toLowerCase().includes(searchLower);
        if (!titleMatch && !descMatch && !subcatMatch) return false;
      }
      return true;
    });
  }

  /**
   * Sort risks by various criteria
   */
  static sortRisks(
    risks: ProjectRisk[],
    sortBy: 'riskScore' | 'title' | 'category' | 'severity' | 'updatedAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): ProjectRisk[] {
    return [...risks].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'riskScore':
          comparison = a.riskScore - b.riskScore;
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'severity':
          const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
          comparison = severityOrder[a.severity] - severityOrder[b.severity];
          break;
        case 'updatedAt':
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }
}