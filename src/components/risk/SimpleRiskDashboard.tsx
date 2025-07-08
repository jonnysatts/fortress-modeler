/**
 * Simple Risk Dashboard - Product Manager-friendly risk overview
 * Replaces technical metrics with actionable insights
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Plus, AlertTriangle, CheckCircle2, Clock, TrendingUp, Eye, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  SimpleRisk, 
  SimpleRiskSummary, 
  SIMPLE_RISK_CATEGORIES, 
  RISK_PRIORITY_CONFIG,
  RISK_STATUS_CONFIG 
} from '@/types/simpleRisk';
import { AddRiskModal } from './AddRiskModal';

interface SimpleRiskDashboardProps {
  projectId: string;
  className?: string;
}

export const SimpleRiskDashboard: React.FC<SimpleRiskDashboardProps> = ({
  projectId,
  className
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [risks, setRisks] = useState<SimpleRisk[]>([
    // Mock data for demonstration - replace with real data
    {
      id: '1',
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
      createdAt: '2024-01-10T10:00:00Z',
      updatedAt: '2024-01-15T15:30:00Z',
      createdBy: 'current-user'
    },
    {
      id: '2',
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
      createdAt: '2024-01-12T14:00:00Z',
      updatedAt: '2024-01-12T14:00:00Z',
      createdBy: 'current-user'
    }
  ]);

  const handleRiskAdded = (newRisk: SimpleRisk) => {
    setRisks(prev => [...prev, newRisk]);
  };

  const getRiskSummary = (): SimpleRiskSummary => {
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
  };

  const summary = getRiskSummary();

  const getRiskCategoryIcon = (category: string) => {
    return SIMPLE_RISK_CATEGORIES[category as keyof typeof SIMPLE_RISK_CATEGORIES]?.icon || '⚠️';
  };

  const getRiskPriorityBadge = (priority: SimpleRisk['priority']) => {
    const config = RISK_PRIORITY_CONFIG[priority];
    return (
      <Badge className={cn(config.bgColor, config.textColor, config.borderColor, "border")}>
        {config.label}
      </Badge>
    );
  };

  const getRiskStatusIcon = (status: SimpleRisk['status']) => {
    switch (status) {
      case 'identified': return <AlertTriangle className="h-4 w-4 text-blue-500" />;
      case 'monitoring': return <Eye className="h-4 w-4 text-gray-500" />;
      case 'mitigating': return <Clock className="h-4 w-4 text-orange-500" />;
      case 'resolved': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
  };

  const getHealthScore = () => {
    if (risks.length === 0) return { score: 100, status: 'excellent', message: 'No risks identified yet' };
    
    const totalWeight = risks.length;
    const riskWeight = risks.reduce((sum, risk) => {
      const weights = { high: 3, medium: 2, low: 1 };
      const statusMultiplier = risk.status === 'resolved' ? 0.1 : 1;
      return sum + (weights[risk.priority] * statusMultiplier);
    }, 0);
    
    const maxPossibleWeight = totalWeight * 3; // All high priority
    const score = Math.max(0, Math.round(100 - (riskWeight / maxPossibleWeight) * 100));
    
    if (score >= 80) return { score, status: 'good', message: 'Risk levels are manageable' };
    if (score >= 60) return { score, status: 'fair', message: 'Some risks need attention' };
    return { score, status: 'needs-attention', message: 'Multiple high-priority risks' };
  };

  const healthScore = getHealthScore();

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Risk Management</h2>
          <p className="text-muted-foreground">Track and manage project risks</p>
        </div>
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-fortress-emerald hover:bg-fortress-emerald/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Risk
        </Button>
      </div>

      {/* Risk Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Risk Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{healthScore.score}%</span>
                <div className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium",
                  healthScore.status === 'excellent' ? "bg-green-100 text-green-800" :
                  healthScore.status === 'good' ? "bg-green-100 text-green-800" :
                  healthScore.status === 'fair' ? "bg-yellow-100 text-yellow-800" :
                  "bg-red-100 text-red-800"
                )}>
                  {healthScore.status === 'excellent' ? 'Excellent' :
                   healthScore.status === 'good' ? 'Good' :
                   healthScore.status === 'fair' ? 'Fair' : 'Needs Attention'}
                </div>
              </div>
              <Progress value={healthScore.score} className="h-2" />
              <p className="text-xs text-muted-foreground">{healthScore.message}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Risks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalRisks}</div>
            <p className="text-xs text-muted-foreground">
              {summary.resolvedThisMonth} resolved this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">High Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.highPriorityRisks}</div>
            <p className="text-xs text-muted-foreground">Need immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Action Required</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{summary.risksNeedingAttention}</div>
            <p className="text-xs text-muted-foreground">Risks needing attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Risks */}
      {summary.topRisks.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Top Risks Requiring Attention
            </CardTitle>
            <CardDescription>
              Your highest priority risks that need monitoring or action
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary.topRisks.map((risk) => (
              <div key={risk.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <span className="text-xl">{getRiskCategoryIcon(risk.category)}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{risk.title}</h4>
                        {getRiskPriorityBadge(risk.priority)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{risk.description}</p>
                      
                      {risk.potentialImpact && (
                        <div className="bg-red-50 border border-red-200 rounded p-2 mb-2">
                          <p className="text-sm text-red-800">
                            <strong>Potential Impact:</strong> {risk.potentialImpact}
                          </p>
                        </div>
                      )}
                      
                      {risk.mitigationPlan && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-2">
                          <p className="text-sm text-blue-800">
                            <strong>Mitigation Plan:</strong> {risk.mitigationPlan}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {risk.owner && (
                          <span>👤 Owner: {risk.owner}</span>
                        )}
                        {risk.targetDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Target: {new Date(risk.targetDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {getRiskStatusIcon(risk.status)}
                    <span className="text-sm text-muted-foreground">
                      {RISK_STATUS_CONFIG[risk.status].label}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Active Risks</h3>
            <p className="text-muted-foreground mb-4">
              Great! No high-priority risks have been identified for this project.
            </p>
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add a Risk
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      {summary.risksNeedingAttention > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have {summary.risksNeedingAttention} risk{summary.risksNeedingAttention > 1 ? 's' : ''} that need{summary.risksNeedingAttention === 1 ? 's' : ''} attention. 
            Review the mitigation plans and update their status.
          </AlertDescription>
        </Alert>
      )}

      {/* Add Risk Modal */}
      <AddRiskModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        projectId={projectId}
        onRiskAdded={handleRiskAdded}
      />
    </div>
  );
};