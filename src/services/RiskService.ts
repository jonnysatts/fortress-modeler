import { supabase } from '@/lib/supabase';
import { ForecastAccuracyService, type RiskFlag } from './ForecastAccuracyService';
import { toast } from 'sonner';

// Types for the enhanced risk management system
export interface Risk {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description?: string;
  category: RiskCategory;
  priority: RiskPriority;
  status: RiskStatus;
  impact_description?: string;
  mitigation_plan?: string;
  owner?: string;
  target_resolution_date?: string;
  risk_score?: number;
  probability?: number;
  impact_score?: number;
  source: 'manual' | 'automatic';
  automatic_trigger_data?: any;
  created_at: string;
  updated_at: string;
}

export interface RiskUpdate {
  id: string;
  risk_id: string;
  user_id: string;
  field_changed: string;
  old_value?: string;
  new_value?: string;
  notes?: string;
  created_at: string;
}

export interface RiskNotification {
  id: string;
  risk_id: string;
  user_id: string;
  project_id: string;
  type: 'new_risk' | 'status_change' | 'target_approaching' | 'score_increase' | 'automatic_detection';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  is_read: boolean;
  data?: any;
  created_at: string;
  expires_at?: string;
}

export interface RiskAnalytics {
  project_id: string;
  total_risks: number;
  critical_risks: number;
  high_risks: number;
  medium_risks: number;
  low_risks: number;
  identified_risks: number;
  assessing_risks: number;
  mitigating_risks: number;
  monitoring_risks: number;
  closed_risks: number;
  customer_risks: number;
  revenue_risks: number;
  timeline_risks: number;
  resources_risks: number;
  market_risks: number;
  automatic_risks: number;
  manual_risks: number;
  avg_risk_score: number;
  max_risk_score: number;
  overdue_risks: number;
}

export type RiskCategory = 'customer' | 'revenue' | 'timeline' | 'resources' | 'market';
export type RiskPriority = 'low' | 'medium' | 'high' | 'critical';
export type RiskStatus = 'identified' | 'monitoring' | 'mitigating' | 'resolved';

export interface CreateRiskData {
  project_id: string;
  user_id: string;
  title: string;
  description?: string;
  category: RiskCategory;
  priority: RiskPriority;
  status?: RiskStatus;
  impact_description?: string;
  mitigation_plan?: string;
  owner?: string;
  target_resolution_date?: string | null;
  probability?: number;
  impact_score?: number;
  risk_score?: number;
  source?: 'manual' | 'automatic';
  automatic_trigger_data?: any;
}

export interface UpdateRiskData {
  title?: string;
  description?: string;
  category?: RiskCategory;
  priority?: RiskPriority;
  status?: RiskStatus;
  impact_description?: string;
  mitigation_plan?: string;
  owner?: string;
  target_resolution_date?: string | null;
  probability?: number;
  impact_score?: number;
  risk_score?: number;
}

// Business-focused risk categories with descriptions
export const RISK_CATEGORIES = {
  customer: {
    label: 'Customer & Market',
    description: 'Risks related to customer acquisition, retention, and market conditions',
    icon: '👥'
  },
  revenue: {
    label: 'Revenue & Financial',
    description: 'Risks affecting revenue streams, pricing, and financial performance',
    icon: '💰'
  },
  timeline: {
    label: 'Timeline & Delivery',
    description: 'Risks that could impact project timelines and delivery schedules',
    icon: '⏱️'
  },
  resources: {
    label: 'Resources & Capacity',
    description: 'Risks related to team capacity, skills, and resource availability',
    icon: '🏗️'
  },
  market: {
    label: 'Market & Competition',
    description: 'Risks from market changes, competitive threats, and external factors',
    icon: '📊'
  }
} as const;

export const RISK_PRIORITIES = {
  low: {
    label: 'Low',
    color: 'bg-blue-100 text-blue-800',
    description: 'Minor impact, can be addressed in normal course'
  },
  medium: {
    label: 'Medium', 
    color: 'bg-yellow-100 text-yellow-800',
    description: 'Moderate impact, requires attention and planning'
  },
  high: {
    label: 'High',
    color: 'bg-orange-100 text-orange-800', 
    description: 'Significant impact, needs immediate attention'
  },
  critical: {
    label: 'Critical',
    color: 'bg-red-100 text-red-800',
    description: 'Severe impact, requires urgent action'
  }
} as const;

export const RISK_STATUSES = {
  identified: {
    label: 'Identified',
    color: 'bg-gray-100 text-gray-800',
    description: 'Risk has been identified and documented'
  },
  monitoring: {
    label: 'Monitoring',
    color: 'bg-purple-100 text-purple-800',
    description: 'Risk is under control but being monitored'
  },
  mitigating: {
    label: 'Mitigating',
    color: 'bg-yellow-100 text-yellow-800',
    description: 'Actively working to reduce risk impact'
  },
  resolved: {
    label: 'Resolved',
    color: 'bg-green-100 text-green-800',
    description: 'Risk has been resolved or is no longer relevant'
  }
} as const;

class RiskService {
  // Create a new risk
  async createRisk(data: CreateRiskData): Promise<Risk> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Convert percentage-based inputs to database-expected format
      const probability1to5 = this.convertPercentageTo1to5Scale(data.probability || 50);
      const impact1to5 = this.convertPercentageTo1to5Scale(data.impact_score || 50);
      
      // Calculate enhanced risk score with priority multiplier
      const enhancedRiskScore = this.calculateEnhancedRiskScore(
        probability1to5, 
        impact1to5, 
        data.priority
      );

      // Map UI fields to database schema
      const riskData = {
        project_id: data.project_id,
        user_id: user.user.id,
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority,
        status: data.status || 'identified',
        potential_impact: data.impact_description, // Map impact_description → potential_impact
        mitigation_plan: data.mitigation_plan,
        owner: data.owner,
        target_date: data.target_resolution_date || null, // Map target_resolution_date → target_date
        probability: probability1to5, // Convert percentage to 1-5 scale
        impact: impact1to5, // Convert percentage to 1-5 scale
        risk_score: enhancedRiskScore, // Enhanced calculation with priority multiplier
        source: data.source || 'manual',
        automatic_trigger_data: data.automatic_trigger_data
      };

      const { data: newRisk, error } = await supabase
        .from('risks')
        .insert([riskData])
        .select()
        .single();

      if (error) {
        console.error('Database error details:', error);
        throw error;
      }

      // Create notification for new risk (stubbed until database migration)
      try {
        await this.createNotification({
          risk_id: newRisk.id,
          user_id: user.user.id,
          project_id: data.project_id,
          type: data.source === 'automatic' ? 'automatic_detection' : 'new_risk',
          title: data.source === 'automatic' ? 'New Risk Detected' : 'New Risk Added',
          message: `${data.source === 'automatic' ? 'Automatic risk detection identified' : 'Manual risk created'}: ${data.title}`,
          severity: this.getPriorityBasedSeverity(data.priority)
        });
      } catch (notificationError) {
        console.warn('Failed to create notification (table may not exist yet):', notificationError);
      }

      return newRisk as Risk;
    } catch (error) {
      console.error('Error creating risk:', error);
      throw error;
    }
  }

  // Update an existing risk
  async updateRisk(riskId: string, updates: UpdateRiskData): Promise<Risk> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data: updatedRisk, error } = await supabase
        .from('risks')
        .update(updates)
        .eq('id', riskId)
        .select()
        .single();

      if (error) throw error;

      return updatedRisk as Risk;
    } catch (error) {
      console.error('Error updating risk:', error);
      throw error;
    }
  }

  // Delete a risk
  async deleteRisk(riskId: string): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('risks')
        .delete()
        .eq('id', riskId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting risk:', error);
      throw error;
    }
  }

  // Get all risks for a project
  async getRisksByProject(projectId: string): Promise<Risk[]> {
    try {
      const { data: risks, error } = await supabase
        .from('risks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (risks || []) as Risk[];
    } catch (error) {
      console.error('Error fetching risks:', error);
      throw error;
    }
  }

  // Get risk analytics for a project (stubbed)
  async getRiskAnalytics(projectId: string): Promise<RiskAnalytics | null> {
    try {
      // Get all risks for the project
      const risks = await this.getRisksForProject(projectId);
      const automaticRisks = await this.getAutomaticRiskIndicators(projectId);
      
      // Calculate risk distribution
      const totalRisks = risks.length;
      const risksByPriority = {
        critical: risks.filter(r => r.priority === 'critical').length,
        high: risks.filter(r => r.priority === 'high').length,
        medium: risks.filter(r => r.priority === 'medium').length,
        low: risks.filter(r => r.priority === 'low').length,
      };
      
      const risksByStatus = {
        identified: risks.filter(r => r.status === 'identified').length,
        assessing: risks.filter(r => r.status === 'assessing').length,
        mitigating: risks.filter(r => r.status === 'mitigating').length,
        monitoring: risks.filter(r => r.status === 'monitoring').length,
        resolved: risks.filter(r => r.status === 'resolved').length,
      };
      
      // Calculate risk trend (simplified version)
      const recentRisks = risks.filter(r => {
        const riskDate = new Date(r.created_at || Date.now());
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return riskDate > thirtyDaysAgo;
      });
      
      const riskTrend = recentRisks.length > totalRisks * 0.3 ? 'increasing' : 
                      recentRisks.length < totalRisks * 0.1 ? 'decreasing' : 'stable';
      
      // Calculate overall risk score (0-100)
      const riskScore = Math.min(100, Math.max(0, 
        (risksByPriority.critical * 25) + 
        (risksByPriority.high * 15) + 
        (risksByPriority.medium * 10) + 
        (risksByPriority.low * 5) +
        (automaticRisks.length * 5)
      ));

      return {
        projectId,
        totalRisks,
        risksByPriority,
        risksByStatus,
        riskScore,
        riskTrend: riskTrend as 'increasing' | 'decreasing' | 'stable',
        automaticRisksDetected: automaticRisks.length,
        lastCalculated: new Date().toISOString(),
        recommendations: this.generateRiskRecommendations(risks, automaticRisks, riskScore)
      };
    } catch (error) {
      console.error('Error calculating risk analytics:', error);
      return null;
    }
  }

  private generateRiskRecommendations(risks: Risk[], automaticRisks: RiskFlag[], riskScore: number): string[] {
    const recommendations: string[] = [];
    
    if (riskScore > 75) {
      recommendations.push('High risk score detected. Prioritize mitigation of critical and high-priority risks.');
    }
    
    if (automaticRisks.length > 3) {
      recommendations.push('Multiple forecast accuracy risks detected. Review model assumptions and data quality.');
    }
    
    const unresolvedCritical = risks.filter(r => r.priority === 'critical' && r.status !== 'resolved').length;
    if (unresolvedCritical > 0) {
      recommendations.push(`${unresolvedCritical} critical risk(s) need immediate attention.`);
    }
    
    const identifiedRisks = risks.filter(r => r.status === 'identified').length;
    if (identifiedRisks > 5) {
      recommendations.push('Consider moving identified risks to assessment phase for active management.');
    }
    
    return recommendations;
  }

  // Convert automatic risk detection to manual risk
  async convertAutomaticToManualRisk(automaticRisk: RiskFlag, projectId: string): Promise<Risk> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const category = this.mapRiskCategoryToBusinessCategory(automaticRisk.riskCategory);
      const priority = this.mapSeverityToPriority(automaticRisk.severity);

      const riskData: CreateRiskData = {
        project_id: projectId,
        user_id: user.user.id,
        title: automaticRisk.description,
        description: `Automatically detected risk: ${automaticRisk.description}`,
        category,
        priority,
        status: 'identified',
        impact_description: automaticRisk.suggestedAction || 'Monitor and assess impact',
        mitigation_plan: automaticRisk.suggestedAction || 'Develop mitigation strategy',
        source: 'automatic',
        automatic_trigger_data: {
          original_risk: automaticRisk,
          detection_date: new Date().toISOString(),
          confidence: automaticRisk.confidence
        }
      };

      return await this.createRisk(riskData);
    } catch (error) {
      console.error('Error converting automatic risk:', error);
      throw error;
    }
  }

  // Get automatic risk indicators for a project
  async getAutomaticRiskIndicators(projectId: string): Promise<RiskFlag[]> {
    try {
      const riskFlags: RiskFlag[] = [];
      
      // Get project data and models for analysis
      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
        
      if (!project) {
        console.warn('Project not found for risk analysis:', projectId);
        return [];
      }

      // Get models for the project
      const { data: models } = await supabase
        .from('financial_models')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null);

      // Get actuals data for comparison
      const { data: actualsData } = await supabase
        .from('actuals_period_entries')
        .select('*')
        .eq('project_id', projectId)
        .order('period', { ascending: true });

      if (!models || models.length === 0) {
        // Risk: No financial models
        riskFlags.push({
          riskCategory: 'planning',
          severity: 'medium',
          description: 'No financial models defined for project',
          suggestedAction: 'Create at least one financial model to enable forecasting and risk assessment',
          dataSource: 'project_analysis',
          confidence: 95
        });
        return riskFlags;
      }

      // Use ForecastAccuracyService to analyze each model
      const ForecastAccuracyService = (await import('./ForecastAccuracyService')).ForecastAccuracyService;
      
      for (const model of models) {
        try {
          // Analyze forecast accuracy for revenue
          const revenueAccuracy = ForecastAccuracyService.analyzeAccuracy(
            projectId,
            'revenue',
            model,
            actualsData || []
          );
          
          // Analyze forecast accuracy for costs  
          const costsAccuracy = ForecastAccuracyService.analyzeAccuracy(
            projectId,
            'costs',
            model,
            actualsData || []
          );

          // Extract risk flags from accuracy analysis
          const revenueRisks = ForecastAccuracyService.identifyAccuracyRisks(revenueAccuracy);
          const costRisks = ForecastAccuracyService.identifyAccuracyRisks(costsAccuracy);

          riskFlags.push(...revenueRisks, ...costRisks);
        } catch (analysisError) {
          console.warn('Error analyzing model for risks:', model.id, analysisError);
        }
      }

      // Additional business logic risks
      if (actualsData && actualsData.length === 0) {
        riskFlags.push({
          riskCategory: 'data_quality',
          severity: 'medium',
          description: 'No actual performance data available for comparison',
          suggestedAction: 'Start tracking actual revenue and cost data to improve forecast accuracy',
          dataSource: 'data_completeness_check',
          confidence: 90
        });
      }

      return riskFlags;
    } catch (error) {
      console.error('Error getting automatic risk indicators:', error);
      return [];
    }
  }

  // Get risk notifications for a user (stubbed)
  async getRiskNotifications(userId?: string): Promise<RiskNotification[]> {
    try {
      // TODO: Implement risk_notifications table
      // For now, return empty array until database migration is complete
      console.log('Risk notifications not yet implemented for user:', userId);
      return [];
    } catch (error) {
      console.error('Error fetching risk notifications:', error);
      return [];
    }
  }

  // Mark notifications as read (stubbed)
  async markNotificationsAsRead(notificationIds: string[]): Promise<void> {
    try {
      // TODO: Implement when risk_notifications table exists
      console.log('Mark notifications as read not yet implemented:', notificationIds);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }

  // Create a notification (stubbed)
  private async createNotification(data: Omit<RiskNotification, 'id' | 'is_read' | 'created_at'>): Promise<void> {
    try {
      // TODO: Implement when risk_notifications table exists
      console.log('Create notification not yet implemented:', data);
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  // Helper methods
  private mapRiskCategoryToBusinessCategory(category: string): RiskCategory {
    const mapping: Record<string, RiskCategory> = {
      'Revenue Performance': 'revenue',
      'Cost Performance': 'revenue',
      'Market Conditions': 'market',
      'Customer Behavior': 'customer',
      'Operational': 'resources',
      'Timeline': 'timeline'
    };
    return mapping[category] || 'market';
  }

  private mapSeverityToPriority(severity: string): RiskPriority {
    const mapping: Record<string, RiskPriority> = {
      'critical': 'critical',
      'high': 'high',
      'medium': 'medium',
      'low': 'low'
    };
    return mapping[severity] || 'medium';
  }

  private getPriorityBasedSeverity(priority: RiskPriority): 'low' | 'medium' | 'high' | 'critical' {
    return priority;
  }

  // Enhanced risk score calculation with priority multiplier
  calculateEnhancedRiskScore(probability1to5: number, impact1to5: number, priority: RiskPriority): number {
    const baseScore = probability1to5 * impact1to5; // 1-25 range
    
    // Priority multipliers for business relevance
    const priorityMultipliers = {
      low: 1.0,
      medium: 1.5,
      high: 2.0,
      critical: 3.0
    };
    
    const multipliedScore = baseScore * priorityMultipliers[priority];
    
    // Keep result within database constraints (1-25)
    return Math.min(25, Math.max(1, Math.round(multipliedScore)));
  }

  // Convert percentage (0-100) to 1-5 scale for database
  convertPercentageTo1to5Scale(percentage: number): number {
    if (percentage <= 20) return 1;
    if (percentage <= 40) return 2;
    if (percentage <= 60) return 3;
    if (percentage <= 80) return 4;
    return 5;
  }

  // Calculate risk score (legacy method for backward compatibility)
  calculateRiskScore(probability: number, impact: number): number {
    return Math.round((probability * impact) / 100);
  }

  // Get risk summary for dashboard
  async getRiskSummary(projectId: string): Promise<{
    totalRisks: number;
    criticalRisks: number;
    highRisks: number;
    overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
    recentRisks: Risk[];
    urgentActions: Risk[];
  }> {
    try {
      const risks = await this.getRisksByProject(projectId);

      const criticalRisks = risks.filter(r => r.priority === 'critical').length;
      const highRisks = risks.filter(r => r.priority === 'high').length;
      const totalRisks = risks.length;

      // Determine overall risk level
      let overallRiskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (criticalRisks > 0) {
        overallRiskLevel = 'critical';
      } else if (highRisks > 2) {
        overallRiskLevel = 'high';
      } else if (totalRisks > 5) {
        overallRiskLevel = 'medium';
      }

      // Get recent risks (last 7 days)
      const recentRisks = risks.filter(r => {
        const createdAt = new Date(r.created_at);
        const daysSinceCreated = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceCreated <= 7;
      });

      // Get urgent actions (high/critical priority risks that are not resolved)
      const urgentActions = risks.filter(r => 
        (r.priority === 'critical' || r.priority === 'high') && 
        r.status !== 'resolved'
      );

      return {
        totalRisks,
        criticalRisks,
        highRisks,
        overallRiskLevel,
        recentRisks,
        urgentActions
      };
    } catch (error) {
      console.error('Error getting risk summary:', error);
      return {
        totalRisks: 0,
        criticalRisks: 0,
        highRisks: 0,
        overallRiskLevel: 'low',
        recentRisks: [],
        urgentActions: []
      };
    }
  }
}

export const riskService = new RiskService();
