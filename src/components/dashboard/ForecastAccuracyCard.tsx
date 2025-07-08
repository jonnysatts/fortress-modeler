import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Target, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ForecastAccuracyCardProps {
  title?: string;
  overallMAPE: number;
  accuracyTrend: 'improving' | 'stable' | 'declining';
  confidenceScore: number;
  projectsAnalyzed: number;
  projectsWithPoorAccuracy: number;
  showDetails?: boolean;
}

export const ForecastAccuracyCard: React.FC<ForecastAccuracyCardProps> = ({
  title = "Forecast Accuracy",
  overallMAPE,
  accuracyTrend,
  confidenceScore,
  projectsAnalyzed,
  projectsWithPoorAccuracy,
  showDetails = true
}) => {
  // Show empty state if no projects have been analyzed
  if (projectsAnalyzed === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Activity className="h-5 w-5 text-fortress-emerald" />
            {title}
          </CardTitle>
          <CardDescription>Portfolio-wide prediction reliability</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Target className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
              No forecast accuracy data available
            </p>
            <p className="text-xs text-muted-foreground">
              Add actual performance data to at least 2 periods in your projects to see accuracy metrics
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  const getAccuracyGrade = (mape: number): { grade: string; color: string } => {
    if (mape <= 10) return { grade: 'A', color: 'text-green-600 bg-green-100' };
    if (mape <= 20) return { grade: 'B', color: 'text-blue-600 bg-blue-100' };
    if (mape <= 30) return { grade: 'C', color: 'text-yellow-600 bg-yellow-100' };
    if (mape <= 40) return { grade: 'D', color: 'text-orange-600 bg-orange-100' };
    return { grade: 'F', color: 'text-red-600 bg-red-100' };
  };

  const getTrendIcon = () => {
    switch (accuracyTrend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendText = () => {
    switch (accuracyTrend) {
      case 'improving':
        return { text: 'Improving', color: 'text-green-600' };
      case 'declining':
        return { text: 'Declining', color: 'text-red-600' };
      default:
        return { text: 'Stable', color: 'text-gray-600' };
    }
  };

  const { grade, color } = getAccuracyGrade(overallMAPE);
  const trend = getTrendText();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Activity className="h-5 w-5 text-fortress-emerald" />
          {title}
        </CardTitle>
        <CardDescription>Portfolio-wide prediction reliability</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main Metrics */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{overallMAPE.toFixed(1)}%</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <span className={cn(
                        "text-lg font-bold px-2 py-0.5 rounded",
                        color
                      )}>
                        {grade}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Accuracy Grade</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="text-sm text-muted-foreground">
                Mean Absolute Percentage Error
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="flex items-center gap-1">
                {getTrendIcon()}
                <span className={cn("text-sm font-medium", trend.color)}>
                  {trend.text}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Trend
              </div>
            </div>
          </div>

          {/* Confidence Score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Confidence Score</span>
              <span className="font-medium">{confidenceScore}%</span>
            </div>
            <Progress value={confidenceScore} className="h-2" />
          </div>

          {showDetails && (
            <>
              {/* Project Analysis Summary */}
              <div className="pt-2 border-t space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Projects Analyzed</span>
                  <span className="font-medium">{projectsAnalyzed}</span>
                </div>
                {projectsWithPoorAccuracy > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                      Poor Accuracy
                    </span>
                    <span className="font-medium text-amber-600">
                      {projectsWithPoorAccuracy} projects
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Insights */}
              {overallMAPE > 20 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Consider reviewing forecasting methodology for projects with MAPE above 20%
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface ProjectAccuracyItemProps {
  projectName: string;
  mape: number;
  trend: 'improving' | 'stable' | 'declining';
  metric: 'revenue' | 'costs' | 'profit';
  onClick?: () => void;
}

export const ProjectAccuracyItem: React.FC<ProjectAccuracyItemProps> = ({
  projectName,
  mape,
  trend,
  metric,
  onClick
}) => {
  const getAccuracyColor = (mape: number) => {
    if (mape <= 10) return 'text-green-600';
    if (mape <= 20) return 'text-blue-600';
    if (mape <= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'declining':
        return <TrendingDown className="h-3 w-3 text-red-600" />;
      default:
        return <Minus className="h-3 w-3 text-gray-500" />;
    }
  };

  return (
    <div 
      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex-1">
        <h4 className="font-medium text-sm">{projectName}</h4>
        <p className="text-xs text-muted-foreground capitalize">{metric} forecast</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className={cn("font-semibold text-sm", getAccuracyColor(mape))}>
            {mape.toFixed(1)}% MAPE
          </p>
        </div>
        {getTrendIcon()}
      </div>
    </div>
  );
};