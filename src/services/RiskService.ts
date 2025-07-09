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
  potential_impact?: string;
  mitigation_plan?: string;
  owner?: string;
  target_date?: string;
  risk_score?: number;
  probability?: number;
  impact?: number;
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
export type RiskStatus = 'identified' | 'assessing' | 'mitigating' | 'monitoring' | 'closed';

export interface CreateRiskData {
  project_id: string;
  title: string;
  description?: string;
  category: RiskCategory;
  priority: RiskPriority;
  status?: RiskStatus;
  potential_impact?: string;
  mitigation_plan?: string;
  owner?: string;
  target_date?: string;
  probability?: number;
  impact?: number;
  source?: 'manual' | 'automatic';
  automatic_trigger_data?: any;
}

export interface UpdateRiskData {
  title?: string;
  description?: string;
  category?: RiskCategory;
  priority?: RiskPriority;
  status?: RiskStatus;
  potential_impact?: string;
  mitigation_plan?: string;
  owner?: string;
  target_date?: string;
  probability?: number;
  impact?: number;
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
  assessing: {
    label: 'Assessing',
    color: 'bg-blue-100 text-blue-800',
    description: 'Currently analyzing impact and probability'
  },
  mitigating: {
    label: 'Mitigating',
    color: 'bg-yellow-100 text-yellow-800',
    description: 'Actively working to reduce risk impact'
  },
  monitoring: {
    label: 'Monitoring',
    color: 'bg-purple-100 text-purple-800',
    description: 'Risk is under control but being monitored'
  },
  closed: {
    label: 'Closed',
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

      const riskData = {
        ...data,
        user_id: user.user.id,
        status: data.status || 'identified',
        source: data.source || 'manual'
      };

      const { data: newRisk, error } = await supabase
        .from('risks')
        .insert([riskData] as any)
        .select()
        .single();

      if (error) throw error;

      // Create notification for new risk (will implement after database migration)
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
        .eq('user_id', user.user.id)
        .select()
        .single();

      if (error) throw error;

      return updatedRisk;
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
        // Removed .eq('user_id', user.user.id) constraint
        // Security is now handled by RLS policies which allow deletion
        // based on project ownership/access rather than risk creator

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
      return risks || [];
    } catch (error) {
      console.error('Error fetching risks:', error);
      throw error;
    }
  }

  // Get risk analytics for a project
  async getRiskAnalytics(projectId: string): Promise<RiskAnalytics | null> {
    try {
      const { data: analytics, error } = await supabase
        .from('risk_analytics')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (error) {
        console.error('Error fetching risk analytics:', error);
        return null;
      }

      return analytics;
    } catch (error) {
      console.error('Error fetching risk analytics:', error);
      return null;
    }
  }

  // Convert automatic risk detection to manual risk
  async convertAutomaticToManualRisk(automaticRisk: RiskFlag, projectId: string): Promise<Risk> {
    try {
      const category = this.mapRiskCategoryToBusinessCategory(automaticRisk.riskCategory);
      const priority = this.mapSeverityToPriority(automaticRisk.severity);

      const riskData: CreateRiskData = {
        project_id: projectId,
        title: automaticRisk.description,
        description: `Automatically detected risk: ${automaticRisk.description}`,
        category,
        priority,
        status: 'identified',
        potential_impact: automaticRisk.suggestedAction || 'Monitor and assess impact',
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
      // Get actuals data for the project
      const { data: actualsData, error: actualsError } = await supabase
        .from('actuals_period_entries')
        .select('*')
        .eq('project_id', projectId)
        .order('period', { ascending: true });

      if (actualsError) throw actualsError;

      if (!actualsData || actualsData.length < 2) {
        return [];
      }

      const risks: RiskFlag[] = [];

      // Check revenue accuracy
      const revenueAccuracy = ForecastAccuracyService.checkRevenueAccuracy(actualsData);
      if (revenueAccuracy) {
        risks.push(...revenueAccuracy.riskImplications);
      }

      // Check cost accuracy
      const costAccuracy = ForecastAccuracyService.checkCostAccuracy(actualsData);
      if (costAccuracy) {
        risks.push(...costAccuracy.riskImplications);
      }

      return risks;
    } catch (error) {
      console.error('Error getting automatic risk indicators:', error);
      return [];
    }
  }

  // Get risk notifications for a user
  async getRiskNotifications(userId?: string): Promise<RiskNotification[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      const targetUserId = userId || user.user?.id;
      
      if (!targetUserId) throw new Error('User not authenticated');

      const { data: notifications, error } = await supabase
        .from('risk_notifications')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return notifications || [];
    } catch (error) {
      console.error('Error fetching risk notifications:', error);
      return [];
    }
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('risk_notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Create a notification
  private async createNotification(data: Omit<RiskNotification, 'id' | 'is_read' | 'created_at'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('risk_notifications')
        .insert([{
          ...data,
          is_read: false
        }]);

      if (error) throw error;
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

  // Calculate risk score
  calculateRiskScore(probability: number, impact: number): number {
    return probability * impact;
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
      const analytics = await this.getRiskAnalytics(projectId);

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

      // Get urgent actions (high/critical priority risks that are not closed)
      const urgentActions = risks.filter(r => 
        (r.priority === 'critical' || r.priority === 'high') && 
        r.status !== 'closed'
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
