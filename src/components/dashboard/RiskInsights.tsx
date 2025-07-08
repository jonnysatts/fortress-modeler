/**
 * Risk Insights Component - Actionable risk information for the main dashboard
 * Replaces confusing pie charts with practical insights
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Shield, 
  Eye,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface RiskInsight {
  type: 'automatic' | 'financial' | 'performance';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  action?: string;
  projectId?: string;
}

interface RiskInsightsProps {
  className?: string;
}

export const RiskInsights: React.FC<RiskInsightsProps> = ({ className }) => {
  const navigate = useNavigate();

  // Mock insights - replace with real data from your analytics
  const insights: RiskInsight[] = [
    {
      type: 'performance',
      severity: 'medium',
      title: 'Revenue tracking below projections',
      description: 'Week 1 actuals are 58% below projected revenue',
      action: 'Review customer pipeline and adjust forecasts',
      projectId: 'project-1'
    },
    {
      type: 'financial',
      severity: 'low',
      title: 'Cost variance within normal range',
      description: 'Operating costs are tracking close to budget',
      action: 'Continue monitoring'
    }
  ];

  const getInsightIcon = (type: RiskInsight['type'], severity: RiskInsight['severity']) => {
    const baseClass = "h-4 w-4";
    
    if (severity === 'high') return <AlertTriangle className={cn(baseClass, "text-red-500")} />;
    if (severity === 'medium') return <Eye className={cn(baseClass, "text-orange-500")} />;
    return <CheckCircle2 className={cn(baseClass, "text-green-500")} />;
  };

  const getSeverityBadge = (severity: RiskInsight['severity']) => {
    const config = {
      high: { label: 'High Priority', className: 'bg-red-100 text-red-800 border-red-200' },
      medium: { label: 'Monitor', className: 'bg-orange-100 text-orange-800 border-orange-200' },
      low: { label: 'On Track', className: 'bg-green-100 text-green-800 border-green-200' }
    };
    
    return (
      <Badge className={cn("border", config[severity].className)}>
        {config[severity].label}
      </Badge>
    );
  };

  const getRiskSummary = () => {
    const highPriority = insights.filter(i => i.severity === 'high').length;
    const needsAttention = insights.filter(i => i.severity !== 'low').length;
    
    if (highPriority > 0) {
      return {
        status: 'needs-attention',
        message: `${highPriority} high priority risk${highPriority > 1 ? 's' : ''} need immediate attention`,
        icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
        color: 'red'
      };
    }
    
    if (needsAttention > 0) {
      return {
        status: 'monitoring',
        message: `${needsAttention} area${needsAttention > 1 ? 's' : ''} to monitor`,
        icon: <Eye className="h-5 w-5 text-orange-500" />,
        color: 'orange'
      };
    }
    
    return {
      status: 'good',
      message: 'All indicators look good',
      icon: <Shield className="h-5 w-5 text-green-500" />,
      color: 'green'
    };
  };

  const summary = getRiskSummary();

  if (insights.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-500" />
            Risk & Performance Insights
          </CardTitle>
          <CardDescription>Automated monitoring of project health indicators</CardDescription>
        </CardHeader>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full mx-auto flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium text-green-800">All Systems Go</h3>
              <p className="text-sm text-muted-foreground">
                No performance issues detected. Keep up the great work!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {summary.icon}
              Risk & Performance Insights
            </CardTitle>
            <CardDescription>{summary.message}</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/projects')} // Navigate to projects list or specific project
          >
            View Details
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary.status === 'needs-attention' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Some areas need your attention. Review the insights below and take action where needed.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {insights.slice(0, 3).map((insight, index) => (
            <div 
              key={index}
              className={cn(
                "p-3 rounded-lg border-l-4 bg-slate-50",
                insight.severity === 'high' ? "border-red-500" :
                insight.severity === 'medium' ? "border-orange-500" : "border-green-500"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {getInsightIcon(insight.type, insight.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{insight.title}</h4>
                      {getSeverityBadge(insight.severity)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {insight.description}
                    </p>
                    {insight.action && (
                      <p className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded">
                        💡 {insight.action}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {insights.length > 3 && (
          <div className="text-center pt-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
              View {insights.length - 3} more insights
            </Button>
          </div>
        )}

        {/* Quick Health Summary */}
        <div className="bg-slate-100 rounded-lg p-3 mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Portfolio Health:</span>
            <div className="flex items-center gap-2">
              {summary.icon}
              <span className={cn(
                "font-medium",
                summary.color === 'red' ? "text-red-700" :
                summary.color === 'orange' ? "text-orange-700" : "text-green-700"
              )}>
                {summary.status === 'needs-attention' ? 'Needs Attention' :
                 summary.status === 'monitoring' ? 'Monitoring' : 'Good'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};