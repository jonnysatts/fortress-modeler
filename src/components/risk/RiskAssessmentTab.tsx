/**
 * Risk Assessment Tab - Enhanced integration with Risk Management System
 * Updated for Phase 2 to show both automatic and manual risks
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  PlusCircle, 
  TrendingUp, 
  TrendingDown,
  Activity,
  DollarSign,
  Target,
  Zap,
  Shield,
  Info,
  Edit,
  Trash2,
  Calendar,
  User,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ForecastAccuracyService, type RiskFlag } from '@/services/ForecastAccuracyService';
import { ActualsPeriodEntry } from '@/types/models';
import { useRisks, useDeleteRisk } from '@/hooks/useRisks';
import { AddRiskModal } from './AddRiskModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  [key: string]: any;
}

interface FinancialModel {
  id: string;
  isPrimary?: boolean;
  periods: {
    period: number;
    revenue?: number;
    costs?: number;
  }[];
}

interface RiskAssessmentTabProps {
  projectId: string;
  projectName: string;
  financialModels: FinancialModel[];
  actualsData: ActualsPeriodEntry[];
  onAddRisk?: () => void;
  user?: User | null;
}

interface RiskSummary {
  automaticRisks: RiskFlag[];
  risksByCategory: Record<string, RiskFlag[]>;
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
}

// Enhanced risk categories mapping
const RISK_CATEGORY_CONFIG = {
  'customer': {
    name: 'Customer & Market',
    icon: <DollarSign className="h-4 w-4" />,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800'
  },
  'revenue': {
    name: 'Revenue & Financial',
    icon: <DollarSign className="h-4 w-4" />,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800'
  },
  'timeline': {
    name: 'Timeline & Delivery',
    icon: <Calendar className="h-4 w-4" />,
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-800'
  },
  'resources': {
    name: 'Resources & Team',
    icon: <User className="h-4 w-4" />,
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-800'
  },
  'market': {
    name: 'Market & External',
    icon: <BarChart3 className="h-4 w-4" />,
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    textColor: 'text-indigo-800'
  },
  // Legacy categories for automatic risks
  'financial_unit_economics': {
    name: 'Financial & Economics',
    icon: <DollarSign className="h-4 w-4" />,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800'
  },
  'execution_delivery': {
    name: 'Execution & Delivery',
    icon: <Zap className="h-4 w-4" />,
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-800'
  },
  'strategic_scaling': {
    name: 'Strategic & Scaling',
    icon: <TrendingUp className="h-4 w-4" />,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800'
  },
  'market_customer': {
    name: 'Market & Customer',
    icon: <Target className="h-4 w-4" />,
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    textColor: 'text-indigo-800'
  },
  'operational': {
    name: 'Operational',
    icon: <Activity className="h-4 w-4" />,
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-800'
  },
  'regulatory_compliance': {
    name: 'Regulatory & Compliance',
    icon: <Shield className="h-4 w-4" />,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800'
  }
} as const;

const PRIORITY_CONFIG = {
  critical: {
    label: 'Critical',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800'
  },
  high: {
    label: 'High',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-800'
  },
  medium: {
    label: 'Medium',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-800'
  },
  low: {
    label: 'Low',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800'
  }
} as const;

const STATUS_CONFIG = {
  identified: {
    label: 'Identified',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-800'
  },
  monitoring: {
    label: 'Monitoring',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-800'
  },
  mitigating: {
    label: 'Mitigating',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-800'
  },
  resolved: {
    label: 'Resolved',
    bgColor: 'bg-green-50',
    textColor: 'text-green-800'
  }
} as const;

export const RiskAssessmentTab: React.FC<RiskAssessmentTabProps> = ({
  projectId,
  projectName,
  financialModels,
  actualsData,
  onAddRisk,
  user
}) => {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<any>(null);
  
  // Use the enhanced risk management hooks
  const { 
    data: manualRisks, 
    isLoading: risksLoading, 
    error: risksError,
    refetch: refetchRisks
  } = useRisks(projectId);
  
  const { mutate: deleteRisk } = useDeleteRisk();
  

  // Calculate automatic risks from forecast accuracy
  const automaticRiskSummary = useMemo<RiskSummary>(() => {
    const automaticRisks: RiskFlag[] = [];
    
    // Get primary model for analysis
    const primaryModel = financialModels.find(m => m.isPrimary) || financialModels[0];
    
    if (primaryModel && actualsData.length >= 2) {
      // Calculate forecast accuracy for revenue
      const revenuePeriodsWithData = actualsData
        .filter(actual => {
          const projectedPeriod = primaryModel.periods.find(p => p.period === actual.period);
          const totalRevenue = Object.values(actual.revenueActuals || {}).reduce((sum, val) => sum + val, 0);
          return projectedPeriod && totalRevenue !== undefined && projectedPeriod.revenue !== undefined;
        })
        .map(actual => {
          const projectedPeriod = primaryModel.periods.find(p => p.period === actual.period)!;
          const totalRevenue = Object.values(actual.revenueActuals || {}).reduce((sum, val) => sum + val, 0);
          return {
            period: actual.period.toString(),
            actual: totalRevenue,
            projected: projectedPeriod.revenue || 0
          };
        });

      if (revenuePeriodsWithData.length >= 2) {
        const revenueAccuracy = ForecastAccuracyService.calculateForecastAccuracy(
          projectId,
          'revenue',
          revenuePeriodsWithData
        );
        automaticRisks.push(...revenueAccuracy.riskImplications);
      }

      // Calculate forecast accuracy for costs
      const costPeriodsWithData = actualsData
        .filter(actual => {
          const projectedPeriod = primaryModel.periods.find(p => p.period === actual.period);
          const totalCosts = Object.values(actual.costActuals || {}).reduce((sum, val) => sum + val, 0);
          return projectedPeriod && totalCosts !== undefined && projectedPeriod.costs !== undefined;
        })
        .map(actual => {
          const projectedPeriod = primaryModel.periods.find(p => p.period === actual.period)!;
          const totalCosts = Object.values(actual.costActuals || {}).reduce((sum, val) => sum + val, 0);
          return {
            period: actual.period.toString(),
            actual: totalCosts,
            projected: projectedPeriod.costs || 0
          };
        });

      if (costPeriodsWithData.length >= 2) {
        const costAccuracy = ForecastAccuracyService.calculateForecastAccuracy(
          projectId,
          'costs',
          costPeriodsWithData
        );
        automaticRisks.push(...costAccuracy.riskImplications);
      }
    }

    // Group risks by category
    const risksByCategory: Record<string, RiskFlag[]> = {};
    automaticRisks.forEach(risk => {
      if (!risksByCategory[risk.riskCategory]) {
        risksByCategory[risk.riskCategory] = [];
      }
      risksByCategory[risk.riskCategory].push(risk);
    });

    // Calculate overall risk level and score
    let riskScore = 0;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    
    automaticRisks.forEach(risk => {
      switch (risk.severity) {
        case 'critical':
          riskScore += 4;
          criticalCount++;
          break;
        case 'high':
          riskScore += 3;
          highCount++;
          break;
        case 'medium':
          riskScore += 2;
          mediumCount++;
          break;
        case 'low':
          riskScore += 1;
          break;
      }
    });

    const overallRiskLevel = 
      criticalCount > 0 ? 'critical' :
      highCount > 0 ? 'high' :
      mediumCount > 0 ? 'medium' : 'low';

    return {
      automaticRisks,
      risksByCategory,
      overallRiskLevel,
      riskScore: Math.min(100, riskScore * 10) // Scale to 0-100
    };
  }, [projectId, financialModels, actualsData]);

  // Calculate manual risk summary
  const manualRiskSummary = useMemo(() => {
    if (!manualRisks || manualRisks.length === 0) {
      return {
        total: 0,
        byPriority: { critical: 0, high: 0, medium: 0, low: 0 },
        byStatus: { identified: 0, monitoring: 0, mitigating: 0, resolved: 0 },
        byCategory: {}
      };
    }

    const byPriority = manualRisks.reduce((acc, risk) => {
      acc[risk.priority] = (acc[risk.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStatus = manualRisks.reduce((acc, risk) => {
      acc[risk.status] = (acc[risk.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byCategory = manualRisks.reduce((acc, risk) => {
      acc[risk.category] = (acc[risk.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: manualRisks.length,
      byPriority,
      byStatus,
      byCategory
    };
  }, [manualRisks]);

  const handleAddRisk = useCallback(() => {
    setShowAddModal(true);
  }, []);

  const handleEditRisk = useCallback((risk: any) => {
    setSelectedRisk(risk);
    setShowEditModal(true);
  }, []);

  const handleDeleteRisk = useCallback(async (riskId: string) => {
    if (window.confirm('Are you sure you want to delete this risk?')) {
      try {
        deleteRisk({ riskId, projectId });
        toast.success('Risk deleted successfully');
        refetchRisks();
      } catch (error) {
        toast.error('Failed to delete risk');
      }
    }
  }, [deleteRisk, projectId, refetchRisks]);

  const handleRiskAdded = useCallback(() => {
    refetchRisks();
    if (onAddRisk) {
      onAddRisk();
    }
  }, [refetchRisks, onAddRisk]);

  const handleRiskUpdated = useCallback(() => {
    refetchRisks();
    setSelectedRisk(null);
  }, [refetchRisks]);

  const getRiskCategoryConfig = (category: string) => {
    return RISK_CATEGORY_CONFIG[category as keyof typeof RISK_CATEGORY_CONFIG] || {
      name: category,
      icon: <AlertTriangle className="h-4 w-4" />,
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      textColor: 'text-gray-800'
    };
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const hasData = actualsData.length >= 2 && financialModels.length > 0;

  return (
    <div className="space-y-6">
      {/* Risk Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Shield className="h-5 w-5 text-fortress-emerald" />
              Risk Score
            </CardTitle>
            <CardDescription>Overall project risk level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{automaticRiskSummary.riskScore}</span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
              <Progress value={automaticRiskSummary.riskScore} className="h-2" />
              <Badge className={cn("text-xs", getSeverityColor(automaticRiskSummary.overallRiskLevel))}>
                {automaticRiskSummary.overallRiskLevel.toUpperCase()} RISK
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Activity className="h-5 w-5 text-fortress-emerald" />
              Auto Detected
            </CardTitle>
            <CardDescription>Automatic risk detection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold">{automaticRiskSummary.automaticRisks.length}</div>
              <div className="text-sm text-muted-foreground">
                {Object.keys(automaticRiskSummary.risksByCategory).length} categories
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Target className="h-5 w-5 text-fortress-emerald" />
              Manual Risks
            </CardTitle>
            <CardDescription>User-defined risks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold">{manualRiskSummary.total}</div>
              <div className="text-sm text-muted-foreground">
                {manualRiskSummary.byPriority.high || 0} high priority
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-fortress-emerald" />
              Data Coverage
            </CardTitle>
            <CardDescription>Actuals vs projections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold">{actualsData.length}</div>
              <div className="text-sm text-muted-foreground">
                periods with data
              </div>
              {!hasData && (
                <p className="text-xs text-amber-600">
                  Need 2+ periods for analysis
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Risk Management Dashboard</CardTitle>
              <CardDescription>
                Monitor and manage all project risks for {projectName}
              </CardDescription>
            </div>
            <Button 
              className="bg-fortress-emerald hover:bg-fortress-emerald/90"
              onClick={handleAddRisk}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Risk
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="automatic">
                Auto-Detected ({automaticRiskSummary.automaticRisks.length})
              </TabsTrigger>
              <TabsTrigger value="manual">
                Manual ({manualRiskSummary.total})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <div className="space-y-6">
                {/* Priority Distribution */}
                <div>
                  <h3 className="font-medium mb-3">Risk Priority Distribution</h3>
                  <div className="grid grid-cols-4 gap-4">
                    {Object.entries(PRIORITY_CONFIG).map(([priority, config]) => (
                      <Card key={priority} className={cn("text-center", config.bgColor, config.borderColor)}>
                        <CardContent className="p-4">
                          <div className={cn("text-2xl font-bold", config.textColor)}>
                            {(manualRiskSummary.byPriority[priority] || 0)}
                          </div>
                          <div className="text-sm font-medium">{config.label}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Category Breakdown */}
                <div>
                  <h3 className="font-medium mb-3">Risk Categories</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(manualRiskSummary.byCategory).map(([category, count]) => {
                      const config = getRiskCategoryConfig(category);
                      return (
                        <Card key={category} className={cn("p-4", config.bgColor, config.borderColor)}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {config.icon}
                              <span className="font-medium">{config.name}</span>
                            </div>
                            <Badge variant="secondary">{count}</Badge>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="automatic" className="mt-4">
              {hasData ? (
                automaticRiskSummary.automaticRisks.length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(automaticRiskSummary.risksByCategory).map(([category, risks]) => (
                      <div key={category} className="space-y-2">
                        <h3 className="font-medium text-sm flex items-center gap-2">
                          {getRiskCategoryConfig(category).icon}
                          {getRiskCategoryConfig(category).name}
                        </h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Risk Description</TableHead>
                              <TableHead>Severity</TableHead>
                              <TableHead>Confidence</TableHead>
                              <TableHead>Suggested Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {risks.map((risk, index) => (
                              <TableRow key={`${category}-${index}`}>
                                <TableCell className="font-medium">
                                  {risk.description}
                                </TableCell>
                                <TableCell>
                                  <Badge className={cn("text-xs", getSeverityColor(risk.severity))}>
                                    {risk.severity}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Progress value={risk.confidence} className="h-1.5 w-12" />
                                    <span className="text-xs text-muted-foreground">
                                      {risk.confidence}%
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {risk.suggestedAction}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      No risks automatically detected. Your forecast accuracy is within acceptable ranges.
                    </AlertDescription>
                  </Alert>
                )
              ) : (
                <div className="text-center py-10">
                  <div className="mb-4 flex justify-center">
                    <div className="rounded-full bg-muted p-4">
                      <AlertTriangle className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>
                  <h3 className="mb-1 text-lg font-medium">Insufficient Data</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add actual performance data for at least 2 periods to enable automatic risk detection.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="manual" className="mt-4">
              {risksLoading ? (
                <div className="text-center py-10">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-fortress-emerald mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Loading risks...</p>
                </div>
              ) : risksError ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Error loading risks: {risksError.message}
                  </AlertDescription>
                </Alert>
              ) : manualRisks && manualRisks.length > 0 ? (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Risk Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Risk Score</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {manualRisks.map((risk) => {
                        const categoryConfig = getRiskCategoryConfig(risk.category);
                        const priorityConfig = PRIORITY_CONFIG[risk.priority as keyof typeof PRIORITY_CONFIG];
                        const statusConfig = STATUS_CONFIG[risk.status as keyof typeof STATUS_CONFIG];
                        
                        return (
                          <TableRow key={risk.id}>
                            <TableCell className="font-medium">
                              <div>
                                <div className="font-medium">{risk.title}</div>
                                <div className="text-sm text-muted-foreground line-clamp-2">
                                  {risk.description}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {categoryConfig.icon}
                                <span className="text-sm">{categoryConfig.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={cn("text-xs", priorityConfig.bgColor, priorityConfig.textColor)}>
                                {priorityConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn("text-xs", statusConfig.bgColor, statusConfig.textColor)}>
                                {statusConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{risk.owner || 'Unassigned'}</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-medium">{risk.risk_score}</div>
                                <Progress value={risk.risk_score} className="h-1.5 w-12" />
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditRisk(risk)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteRisk(risk.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className="mb-4 flex justify-center">
                    <div className="rounded-full bg-muted p-4">
                      <AlertTriangle className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>
                  <h3 className="mb-1 text-lg font-medium">No manual risks added</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Document project-specific risks to get comprehensive risk management.
                  </p>
                  <Button 
                    className="bg-fortress-emerald hover:bg-fortress-emerald/90"
                    onClick={handleAddRisk}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Your First Risk
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modals */}
      <AddRiskModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        projectId={projectId}
        onRiskAdded={handleRiskAdded}
        user={user}
      />
      
      {/* Edit functionality temporarily disabled - will be re-implemented with Supabase */}
      {selectedRisk && showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Edit Risk</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Risk editing will be available in the next update. For now, you can delete and recreate the risk.
            </p>
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedRisk(null);
                }}
              >
                Close
              </Button>
              <Button 
                variant="destructive"
                onClick={() => {
                  handleDeleteRisk(selectedRisk.id);
                  setShowEditModal(false);
                  setSelectedRisk(null);
                }}
              >
                Delete Risk
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
