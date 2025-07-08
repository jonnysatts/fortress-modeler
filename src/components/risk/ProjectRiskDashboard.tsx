/**
 * Phase B3: Project Risk Dashboard UI
 * 
 * Comprehensive risk management dashboard for project-level risk assessment,
 * monitoring, and mitigation tracking.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  AlertTriangle, 
  Shield, 
  TrendingUp, 
  TrendingDown,
  Target,
  Activity,
  Plus,
  Filter,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  RiskCategory, 
  RiskSeverity, 
  RiskStatus, 
  ProjectRisk,
  RiskSummary,
  AutomaticIndicator
} from '@/types/risk';
import { useProjectAutomaticRiskIndicators } from '@/hooks/useAutomaticRiskIndicators';
import { RISK_CATEGORY_DEFINITIONS } from '@/data/riskCategories';

interface ProjectRiskDashboardProps {
  projectId: string;
  className?: string;
}

export const ProjectRiskDashboard: React.FC<ProjectRiskDashboardProps> = ({
  projectId,
  className
}) => {
  const [selectedCategory, setSelectedCategory] = useState<RiskCategory | 'all'>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<RiskSeverity | 'all'>('all');
  
  // Get automatic risk indicators from Phase A data
  const { 
    data: riskIndicatorData, 
    isLoading: indicatorsLoading 
  } = useProjectAutomaticRiskIndicators(projectId);

  // Mock data for demonstration (in real implementation, this would come from database)
  const mockRiskSummary: RiskSummary = {
    projectId,
    totalRisks: 5,
    risksBySeverity: { low: 1, medium: 2, high: 1, critical: 1 },
    risksByCategory: {
      [RiskCategory.MARKET_CUSTOMER]: 1,
      [RiskCategory.FINANCIAL_UNIT_ECONOMICS]: 2,
      [RiskCategory.EXECUTION_DELIVERY]: 1,
      [RiskCategory.STRATEGIC_SCALING]: 1,
      [RiskCategory.OPERATIONAL]: 0,
      [RiskCategory.REGULATORY_COMPLIANCE]: 0
    },
    risksByStatus: { identified: 2, monitoring: 2, mitigating: 1, closed: 0 },
    averageRiskScore: 12.4,
    criticalRisksCount: 1,
    overdueActionsCount: 2,
    recentlyUpdatedRisks: [],
    topRisksByScore: [],
    automaticAlertsCount: riskIndicatorData?.alertCount || 0,
    lastCalculated: new Date()
  };

  const getSeverityColor = (severity: RiskSeverity): string => {
    switch (severity) {
      case 'low': return 'text-green-600 bg-green-100 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
    }
  };

  const getStatusColor = (status: RiskStatus): string => {
    switch (status) {
      case 'identified': return 'text-blue-600 bg-blue-100';
      case 'monitoring': return 'text-yellow-600 bg-yellow-100';
      case 'mitigating': return 'text-orange-600 bg-orange-100';
      case 'closed': return 'text-green-600 bg-green-100';
    }
  };

  const getStatusIcon = (status: RiskStatus) => {
    switch (status) {
      case 'identified': return <Eye className="h-3 w-3" />;
      case 'monitoring': return <Activity className="h-3 w-3" />;
      case 'mitigating': return <Target className="h-3 w-3" />;
      case 'closed': return <CheckCircle className="h-3 w-3" />;
    }
  };

  const getCategoryIcon = (category: RiskCategory) => {
    switch (category) {
      case RiskCategory.MARKET_CUSTOMER: return <TrendingUp className="h-4 w-4" />;
      case RiskCategory.FINANCIAL_UNIT_ECONOMICS: return <Activity className="h-4 w-4" />;
      case RiskCategory.EXECUTION_DELIVERY: return <Target className="h-4 w-4" />;
      case RiskCategory.STRATEGIC_SCALING: return <TrendingUp className="h-4 w-4" />;
      case RiskCategory.OPERATIONAL: return <Shield className="h-4 w-4" />;
      case RiskCategory.REGULATORY_COMPLIANCE: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (indicatorsLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-fortress-emerald" />
          <h2 className="text-2xl font-bold">Risk Management</h2>
        </div>
        <Button className="bg-fortress-emerald hover:bg-fortress-emerald/90">
          <Plus className="h-4 w-4 mr-2" />
          Add Risk
        </Button>
      </div>

      {/* Risk Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Risks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-fortress-emerald" />
              Total Risks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockRiskSummary.totalRisks}</div>
            <p className="text-xs text-muted-foreground">
              Avg Score: {mockRiskSummary.averageRiskScore}
            </p>
          </CardContent>
        </Card>

        {/* Critical Risks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Critical Risks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {mockRiskSummary.criticalRisksCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        {/* Automatic Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-500" />
              Auto Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {riskIndicatorData?.alertCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {riskIndicatorData?.criticalAlertCount || 0} critical, {riskIndicatorData?.warningAlertCount || 0} warning
            </p>
          </CardContent>
        </Card>

        {/* Overdue Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Overdue Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {mockRiskSummary.overdueActionsCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Mitigation actions past due
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Automatic Indicators Alert */}
      {riskIndicatorData && riskIndicatorData.alertCount > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>{riskIndicatorData.alertCount} automatic risk indicators</strong> detected issues 
            based on your project's financial performance. 
            {riskIndicatorData.criticalAlertCount > 0 && (
              <span className="text-red-600 font-medium">
                {' '}{riskIndicatorData.criticalAlertCount} require immediate attention.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Risk Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="indicators">Auto Indicators</TabsTrigger>
          <TabsTrigger value="risks">All Risks</TabsTrigger>
          <TabsTrigger value="actions">Mitigation</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Risk by Severity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Risks by Severity</CardTitle>
                <CardDescription>Distribution of risk severity levels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(mockRiskSummary.risksBySeverity).map(([severity, count]) => (
                  <div key={severity} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-xs", getSeverityColor(severity as RiskSeverity))}>
                        {severity.charAt(0).toUpperCase() + severity.slice(1)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{count}</span>
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full", getSeverityColor(severity as RiskSeverity).split(' ')[1])}
                          style={{ width: `${(count / mockRiskSummary.totalRisks) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Risk by Category */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Risks by Category</CardTitle>
                <CardDescription>Distribution across risk categories</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {RISK_CATEGORY_DEFINITIONS.map(categoryDef => {
                  const count = mockRiskSummary.risksByCategory[categoryDef.category];
                  if (count === 0) return null;
                  
                  return (
                    <div key={categoryDef.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(categoryDef.category)}
                        <span className="text-sm">{categoryDef.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{count}</span>
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-fortress-emerald"
                            style={{ width: `${(count / mockRiskSummary.totalRisks) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Risk Status Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Risk Management Progress</CardTitle>
              <CardDescription>Current status of all identified risks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(mockRiskSummary.risksByStatus).map(([status, count]) => (
                  <div key={status} className="text-center space-y-2">
                    <div className="flex items-center justify-center">
                      <Badge className={cn("text-xs", getStatusColor(status as RiskStatus))}>
                        {getStatusIcon(status as RiskStatus)}
                        <span className="ml-1">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold">{count}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automatic Indicators Tab */}
        <TabsContent value="indicators" className="space-y-4">
          {riskIndicatorData && riskIndicatorData.indicators.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {riskIndicatorData.indicators.map((indicator, index) => (
                <AutomaticIndicatorCard key={index} indicator={indicator} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center space-y-4">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <h3 className="font-medium">No Automatic Indicators</h3>
                    <p className="text-sm text-muted-foreground">
                      Automatic risk indicators will appear here once your project has 
                      sufficient performance data.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* All Risks Tab */}
        <TabsContent value="risks" className="space-y-4">
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="font-medium">No Manual Risks</h3>
                  <p className="text-sm text-muted-foreground">
                    Manually identified risks will appear here. Click "Add Risk" to create your first risk.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mitigation Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <Target className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="font-medium">No Mitigation Actions</h3>
                  <p className="text-sm text-muted-foreground">
                    Mitigation actions and progress tracking will appear here once risks are identified.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

/**
 * Component for displaying individual automatic indicators
 */
interface AutomaticIndicatorCardProps {
  indicator: AutomaticIndicator;
}

const AutomaticIndicatorCard: React.FC<AutomaticIndicatorCardProps> = ({ indicator }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'text-green-600 bg-green-100 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getTrendIcon = () => {
    switch (indicator.trend) {
      case 'improving': return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'worsening': return <TrendingDown className="h-3 w-3 text-red-600" />;
      default: return <div className="h-3 w-3 bg-gray-400 rounded-full" />;
    }
  };

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-sm font-medium">{indicator.description}</CardTitle>
            <CardDescription className="text-xs">
              Source: {indicator.dataSource} • Last updated: {indicator.lastCalculated.toLocaleTimeString()}
            </CardDescription>
          </div>
          <Badge className={cn("text-xs", getStatusColor(indicator.status))}>
            {indicator.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current Value</span>
            <div className="flex items-center gap-1">
              <span className="font-medium">{indicator.currentValue.toFixed(1)}</span>
              {getTrendIcon()}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Threshold</span>
            <span className="font-medium">{indicator.thresholdValue}</span>
          </div>
          
          {indicator.status !== 'normal' && (
            <Alert className={cn("text-xs", getStatusColor(indicator.status))}>
              <AlertCircle className="h-3 w-3" />
              <AlertDescription>
                {indicator.status === 'critical' ? 'Immediate attention required' : 'Monitor closely'}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
};