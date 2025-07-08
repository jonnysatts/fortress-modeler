import React, { useState, useMemo } from 'react';
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
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ForecastAccuracyService, type RiskFlag } from '@/services/ForecastAccuracyService';
import { ActualsPeriodEntry, FinancialModel } from '@/types/models';
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

interface RiskAssessmentTabProps {
  projectId: string;
  projectName: string;
  financialModels: FinancialModel[];
  actualsData: ActualsPeriodEntry[];
  onAddRisk?: () => void;
}

interface RiskSummary {
  automaticRisks: RiskFlag[];
  risksByCategory: Record<string, RiskFlag[]>;
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
}

export const RiskAssessmentTab: React.FC<RiskAssessmentTabProps> = ({
  projectId,
  projectName,
  financialModels,
  actualsData,
  onAddRisk
}) => {
  const [selectedTab, setSelectedTab] = useState('automatic');

  // Calculate automatic risks from forecast accuracy
  const riskSummary = useMemo<RiskSummary>(() => {
    const automaticRisks: RiskFlag[] = [];
    
    // Get primary model for analysis
    const primaryModel = financialModels.find(m => m.isPrimary) || financialModels[0];
    
    if (primaryModel && actualsData.length >= 2) {
      // Calculate forecast accuracy for revenue
      const revenuePeriodsWithData = actualsData
        .filter(actual => {
          const projectedPeriod = primaryModel.periods.find(p => p.period === actual.period);
          return projectedPeriod && actual.revenue !== undefined && projectedPeriod.revenue !== undefined;
        })
        .map(actual => {
          const projectedPeriod = primaryModel.periods.find(p => p.period === actual.period)!;
          return {
            period: actual.period,
            actual: actual.revenue || 0,
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
          return projectedPeriod && actual.costs !== undefined && projectedPeriod.costs !== undefined;
        })
        .map(actual => {
          const projectedPeriod = primaryModel.periods.find(p => p.period === actual.period)!;
          return {
            period: actual.period,
            actual: actual.costs || 0,
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

  const getRiskIcon = (category: string) => {
    switch (category) {
      case 'financial_unit_economics':
        return <DollarSign className="h-4 w-4" />;
      case 'execution_delivery':
        return <Zap className="h-4 w-4" />;
      case 'strategic_scaling':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
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

  const getCategoryName = (category: string) => {
    const names: Record<string, string> = {
      'financial_unit_economics': 'Financial & Economics',
      'execution_delivery': 'Execution & Delivery',
      'strategic_scaling': 'Strategic & Scaling',
      'market_customer': 'Market & Customer',
      'operational': 'Operational',
      'regulatory_compliance': 'Regulatory & Compliance'
    };
    return names[category] || category;
  };

  const hasData = actualsData.length >= 2 && financialModels.length > 0;

  return (
    <div className="space-y-6">
      {/* Risk Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Shield className="h-5 w-5 text-fortress-emerald" />
              Risk Score
            </CardTitle>
            <CardDescription>Overall project risk assessment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{riskSummary.riskScore}</span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
              <Progress value={riskSummary.riskScore} className="h-2" />
              <Badge className={cn("text-xs", getSeverityColor(riskSummary.overallRiskLevel))}>
                {riskSummary.overallRiskLevel.toUpperCase()} RISK
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Activity className="h-5 w-5 text-fortress-emerald" />
              Identified Risks
            </CardTitle>
            <CardDescription>Automatic risk detection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold">{riskSummary.automaticRisks.length}</div>
              <div className="text-sm text-muted-foreground">
                {Object.keys(riskSummary.risksByCategory).length} categories affected
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Target className="h-5 w-5 text-fortress-emerald" />
              Data Coverage
            </CardTitle>
            <CardDescription>Actuals vs projections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold">{actualsData.length}</div>
              <div className="text-sm text-muted-foreground">
                periods with actual data
              </div>
              {!hasData && (
                <p className="text-xs text-amber-600">
                  Need 2+ periods for risk analysis
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
              <CardTitle>Risk Assessment Details</CardTitle>
              <CardDescription>
                Comprehensive risk analysis for {projectName}
              </CardDescription>
            </div>
            <Button 
              className="bg-fortress-emerald hover:bg-fortress-emerald/90"
              onClick={onAddRisk}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Manual Risk
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList>
              <TabsTrigger value="automatic">
                Automatic Detection ({riskSummary.automaticRisks.length})
              </TabsTrigger>
              <TabsTrigger value="manual" disabled>
                Manual Risks (0)
              </TabsTrigger>
              <TabsTrigger value="mitigation" disabled>
                Mitigation Plans
              </TabsTrigger>
            </TabsList>

            <TabsContent value="automatic" className="mt-4">
              {hasData ? (
                riskSummary.automaticRisks.length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(riskSummary.risksByCategory).map(([category, risks]) => (
                      <div key={category} className="space-y-2">
                        <h3 className="font-medium text-sm flex items-center gap-2">
                          {getRiskIcon(category)}
                          {getCategoryName(category)}
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
              <div className="text-center py-10">
                <div className="mb-4 flex justify-center">
                  <div className="rounded-full bg-muted p-4">
                    <AlertTriangle className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>
                <h3 className="mb-1 text-lg font-medium">No manual risks added</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Document additional risks specific to your project.
                </p>
                <Button 
                  className="bg-fortress-emerald hover:bg-fortress-emerald/90"
                  onClick={onAddRisk}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Manual Risk
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};