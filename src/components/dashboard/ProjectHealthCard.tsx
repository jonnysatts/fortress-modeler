import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Heart,
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectHealthScore } from '@/services/ProjectHealthService';

interface ProjectHealthCardProps {
  healthScore: ProjectHealthScore;
  title?: string;
  showDetails?: boolean;
  onViewDetails?: () => void;
}

export const ProjectHealthCard: React.FC<ProjectHealthCardProps> = ({
  healthScore,
  title,
  showDetails = true,
  onViewDetails
}) => {
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'text-green-600 bg-green-100';
      case 'B':
        return 'text-blue-600 bg-blue-100';
      case 'C':
        return 'text-yellow-600 bg-yellow-100';
      case 'D':
        return 'text-orange-600 bg-orange-100';
      case 'F':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = () => {
    switch (healthScore.healthTrend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendText = () => {
    switch (healthScore.healthTrend) {
      case 'improving':
        return { text: 'Improving', color: 'text-green-600' };
      case 'declining':
        return { text: 'Declining', color: 'text-red-600' };
      default:
        return { text: 'Stable', color: 'text-gray-600' };
    }
  };

  const getHealthDescription = (score: number) => {
    if (score >= 90) return 'Excellent health';
    if (score >= 80) return 'Good health';
    if (score >= 70) return 'Fair health';
    if (score >= 60) return 'Concerning health';
    return 'Poor health';
  };

  const getComponentIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-3 w-3 text-green-600" />;
    if (score >= 60) return <AlertTriangle className="h-3 w-3 text-yellow-600" />;
    return <XCircle className="h-3 w-3 text-red-600" />;
  };

  const formatComponentName = (key: string) => {
    const names: Record<string, string> = {
      financialHealth: 'Financial',
      forecastReliability: 'Forecast',
      trendHealth: 'Trends',
      riskProfile: 'Risk',
      dataQuality: 'Data'
    };
    return names[key] || key;
  };

  const trend = getTrendText();

  return (
    <Card className={cn(
      "transition-all duration-200",
      onViewDetails && "cursor-pointer hover:shadow-md"
    )} onClick={onViewDetails}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Heart className="h-5 w-5 text-fortress-emerald" />
          {title || 'Project Health'}
        </CardTitle>
        <CardDescription>
          Overall project performance assessment
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main Health Score */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{healthScore.overallScore}</span>
                <span className="text-sm text-muted-foreground">/ 100</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge className={cn("text-lg font-bold px-2 py-0.5", getGradeColor(healthScore.healthGrade))}>
                        {healthScore.healthGrade}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Health Grade</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="text-sm text-muted-foreground">
                {getHealthDescription(healthScore.overallScore)}
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

          {/* Health Progress Bar */}
          <div className="space-y-2">
            <Progress value={healthScore.overallScore} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Confidence: {healthScore.confidenceLevel}%</span>
              <span>Last updated: {healthScore.lastCalculated.toLocaleDateString()}</span>
            </div>
          </div>

          {showDetails && (
            <>
              {/* Component Scores */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Component Scores</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(healthScore.componentScores).map(([key, score]) => (
                    <TooltipProvider key={key}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-between p-2 rounded border">
                            <div className="flex items-center gap-1">
                              {getComponentIcon(score)}
                              <span>{formatComponentName(key)}</span>
                            </div>
                            <span className="font-medium">{score}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{formatComponentName(key)}: {score}/100</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </div>

              {/* Risk Factors */}
              {healthScore.riskFactors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Key Risk Factors
                  </h4>
                  <div className="space-y-1">
                    {healthScore.riskFactors.slice(0, 3).map((risk, index) => (
                      <div key={index} className="text-xs text-muted-foreground p-2 bg-amber-50 rounded">
                        {risk}
                      </div>
                    ))}
                    {healthScore.riskFactors.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{healthScore.riskFactors.length - 3} more risk factors
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Top Recommendations */}
              {healthScore.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-1">
                    <Target className="h-4 w-4 text-blue-500" />
                    Top Recommendations
                  </h4>
                  <div className="space-y-1">
                    {healthScore.recommendations.slice(0, 2).map((rec, index) => (
                      <div key={index} className="text-xs text-muted-foreground p-2 bg-blue-50 rounded">
                        {rec}
                      </div>
                    ))}
                    {healthScore.recommendations.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{healthScore.recommendations.length - 2} more recommendations
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Summary component for portfolio overview
interface PortfolioHealthSummaryProps {
  healthScores: ProjectHealthScore[];
  title?: string;
}

export const PortfolioHealthSummary: React.FC<PortfolioHealthSummaryProps> = ({
  healthScores,
  title = "Portfolio Health"
}) => {
  if (healthScores.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Heart className="h-5 w-5 text-fortress-emerald" />
            {title}
          </CardTitle>
          <CardDescription>Overall portfolio health assessment</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No health data available. Projects need actual performance data to calculate health scores.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const averageScore = Math.round(
    healthScores.reduce((sum, h) => sum + h.overallScore, 0) / healthScores.length
  );

  const gradeDistribution = healthScores.reduce((dist, h) => {
    dist[h.healthGrade] = (dist[h.healthGrade] || 0) + 1;
    return dist;
  }, {} as Record<string, number>);

  const trendDistribution = healthScores.reduce((dist, h) => {
    dist[h.healthTrend] = (dist[h.healthTrend] || 0) + 1;
    return dist;
  }, {} as Record<string, number>);

  const concernedProjects = healthScores.filter(h => h.overallScore < 60).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Heart className="h-5 w-5 text-fortress-emerald" />
          {title}
        </CardTitle>
        <CardDescription>
          Health assessment across {healthScores.length} projects
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Average Score */}
          <div className="text-center space-y-2">
            <div className="text-3xl font-bold">{averageScore}</div>
            <div className="text-sm text-muted-foreground">Average Health Score</div>
            <Progress value={averageScore} className="h-2" />
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-green-600">
                {(gradeDistribution.A || 0) + (gradeDistribution.B || 0)}
              </div>
              <div className="text-muted-foreground">Healthy Projects</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-yellow-600">
                {gradeDistribution.C || 0}
              </div>
              <div className="text-muted-foreground">At Risk</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-red-600">
                {concernedProjects}
              </div>
              <div className="text-muted-foreground">Concerning</div>
            </div>
          </div>

          {/* Grade Distribution */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Grade Distribution</h4>
            <div className="flex gap-2 text-xs">
              {(['A', 'B', 'C', 'D', 'F'] as const).map(grade => {
                const count = gradeDistribution[grade] || 0;
                return (
                  <Badge 
                    key={grade} 
                    variant="outline" 
                    className={cn("text-xs", count > 0 ? getGradeColor(grade) : "opacity-50")}
                  >
                    {grade}: {count}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Trend Summary */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Health Trends</h4>
            <div className="flex justify-between text-xs">
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="h-3 w-3" />
                <span>{trendDistribution.improving || 0} improving</span>
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <Minus className="h-3 w-3" />
                <span>{trendDistribution.stable || 0} stable</span>
              </div>
              <div className="flex items-center gap-1 text-red-600">
                <TrendingDown className="h-3 w-3" />
                <span>{trendDistribution.declining || 0} declining</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

function getGradeColor(grade: string) {
  switch (grade) {
    case 'A':
      return 'text-green-600 bg-green-100';
    case 'B':
      return 'text-blue-600 bg-blue-100';
    case 'C':
      return 'text-yellow-600 bg-yellow-100';
    case 'D':
      return 'text-orange-600 bg-orange-100';
    case 'F':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}