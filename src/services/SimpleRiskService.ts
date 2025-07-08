/**
 * Simple Risk Service - localStorage-based risk management
 * Provides CRUD operations for project risks
 */

import { SimpleRisk, SimpleRiskSummary } from '@/types/simpleRisk';

const STORAGE_KEY_PREFIX = 'fortress-risks-';

export class SimpleRiskService {
  
  /**
   * Get all risks for a specific project
   */
  static getRisksForProject(projectId: string): SimpleRisk[] {
    const key = `${STORAGE_KEY_PREFIX}${projectId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Save a new risk
   */
  static createRisk(risk: Omit<SimpleRisk, 'id' | 'createdAt' | 'updatedAt'>): SimpleRisk {
    const newRisk: SimpleRisk = {
      ...risk,
      id: `risk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const existingRisks = this.getRisksForProject(risk.projectId);
    const updatedRisks = [...existingRisks, newRisk];
    
    const key = `${STORAGE_KEY_PREFIX}${risk.projectId}`;
    localStorage.setItem(key, JSON.stringify(updatedRisks));
    
    return newRisk;
  }

  /**
   * Update an existing risk
   */
  static updateRisk(projectId: string, riskId: string, updates: Partial<SimpleRisk>): SimpleRisk | null {
    const existingRisks = this.getRisksForProject(projectId);
    const riskIndex = existingRisks.findIndex(r => r.id === riskId);
    
    if (riskIndex === -1) {
      return null;
    }

    const updatedRisk: SimpleRisk = {
      ...existingRisks[riskIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    existingRisks[riskIndex] = updatedRisk;
    
    const key = `${STORAGE_KEY_PREFIX}${projectId}`;
    localStorage.setItem(key, JSON.stringify(existingRisks));
    
    return updatedRisk;
  }

  /**
   * Delete a risk
   */
  static deleteRisk(projectId: string, riskId: string): boolean {
    const existingRisks = this.getRisksForProject(projectId);
    const filteredRisks = existingRisks.filter(r => r.id !== riskId);
    
    if (filteredRisks.length === existingRisks.length) {
      return false; // Risk not found
    }

    const key = `${STORAGE_KEY_PREFIX}${projectId}`;
    localStorage.setItem(key, JSON.stringify(filteredRisks));
    
    return true;
  }

  /**
   * Get risk summary for a project
   */
  static getRiskSummary(projectId: string): SimpleRiskSummary {
    const risks = this.getRisksForProject(projectId);
    
    const highPriorityRisks = risks.filter(r => r.priority === 'high').length;
    const risksNeedingAttention = risks.filter(r => 
      r.status === 'identified' || 
      (r.targetDate && new Date(r.targetDate) < new Date())
    ).length;
    
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const resolvedThisMonth = risks.filter(r => 
      r.status === 'resolved' && 
      new Date(r.updatedAt) > oneMonthAgo
    ).length;

    const topRisks = risks
      .filter(r => r.status !== 'resolved')
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .slice(0, 3);

    return {
      projectId,
      totalRisks: risks.length,
      highPriorityRisks,
      risksNeedingAttention,
      resolvedThisMonth,
      topRisks
    };
  }

  /**
   * Search risks by text
   */
  static searchRisks(projectId: string, searchTerm: string): SimpleRisk[] {
    const risks = this.getRisksForProject(projectId);
    const term = searchTerm.toLowerCase();
    
    return risks.filter(risk => 
      risk.title.toLowerCase().includes(term) ||
      risk.description.toLowerCase().includes(term) ||
      risk.potentialImpact.toLowerCase().includes(term) ||
      risk.mitigationPlan.toLowerCase().includes(term) ||
      risk.owner.toLowerCase().includes(term)
    );
  }

  /**
   * Filter risks by various criteria
   */
  static filterRisks(
    projectId: string, 
    filters: {
      category?: string;
      priority?: string;
      status?: string;
      owner?: string;
    }
  ): SimpleRisk[] {
    const risks = this.getRisksForProject(projectId);
    
    return risks.filter(risk => {
      if (filters.category && risk.category !== filters.category) return false;
      if (filters.priority && risk.priority !== filters.priority) return false;
      if (filters.status && risk.status !== filters.status) return false;
      if (filters.owner && !risk.owner.toLowerCase().includes(filters.owner.toLowerCase())) return false;
      return true;
    });
  }

  /**
   * Get all risks across all projects (for portfolio view)
   */
  static getAllRisks(): { projectId: string; risks: SimpleRisk[] }[] {
    const results: { projectId: string; risks: SimpleRisk[] }[] = [];
    
    // Scan localStorage for all risk keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const projectId = key.replace(STORAGE_KEY_PREFIX, '');
        const risks = this.getRisksForProject(projectId);
        if (risks.length > 0) {
          results.push({ projectId, risks });
        }
      }
    }
    
    return results;
  }

  /**
   * Initialize with some sample data for demonstration
   */
  static initializeSampleData(projectId: string): void {
    const existingRisks = this.getRisksForProject(projectId);
    
    // Only add sample data if no risks exist
    if (existingRisks.length === 0) {
      const sampleRisks: Omit<SimpleRisk, 'id' | 'createdAt' | 'updatedAt'>[] = [
        {
          projectId,
          title: 'Key customer may not renew contract',
          description: 'Our largest customer (40% of revenue) contract expires next month and they haven\'t confirmed renewal yet.',
          category: 'customer-market',
          priority: 'high',
          status: 'mitigating',
          potentialImpact: 'Could lose 40% of projected Q4 revenue',
          mitigationPlan: 'Schedule urgent meeting with customer success team, prepare alternative pricing proposal',
          owner: 'Sarah Johnson',
          targetDate: '2024-02-15',
          createdBy: 'current-user'
        },
        {
          projectId,
          title: 'Development timeline at risk',
          description: 'Core feature development is taking longer than expected due to technical complexity.',
          category: 'timeline-delivery',
          priority: 'medium',
          status: 'monitoring',
          potentialImpact: 'Could delay launch by 3-4 weeks',
          mitigationPlan: 'Consider reducing scope for MVP, add extra developer resources',
          owner: 'Mike Chen',
          targetDate: '2024-02-20',
          createdBy: 'current-user'
        }
      ];

      sampleRisks.forEach(risk => this.createRisk(risk));
    }
  }
}