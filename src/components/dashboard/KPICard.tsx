import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  description: string;
  value: number;
  projectedValue?: number;
  variance?: number;
  icon: React.ReactNode;
  formatValue?: (value: number) => string;
  showVariance?: boolean;
  hasActualData?: boolean;
  periodsCompared?: number; // How many periods of actual data are being compared
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  description,
  value,
  projectedValue,
  variance,
  icon,
  formatValue = (v) => v.toLocaleString(),
  showVariance = true,
  hasActualData = true,
  periodsCompared = 1
}) => {
  const getVarianceDisplay = () => {
    if (!showVariance || variance === undefined) return null;
    
    const isPositive = variance >= 0;
    const isNeutral = Math.abs(variance) < 1;
    
    if (isNeutral) {
      return (
        <div className="flex items-center text-xs text-gray-500">
          <Minus className="h-3 w-3 mr-1" />
          <span>On target</span>
        </div>
      );
    }
    
    return (
      <div className={cn(
        "flex items-center text-xs",
        isPositive ? "text-green-600" : "text-red-600"
      )}>
        {isPositive ? (
          <TrendingUp className="h-3 w-3 mr-1" />
        ) : (
          <TrendingDown className="h-3 w-3 mr-1" />
        )}
        <span>{Math.abs(variance).toFixed(1)}%</span>
        <span className="ml-1 text-gray-500">
          vs projected ({periodsCompared} period{periodsCompared !== 1 ? 's' : ''})
        </span>
      </div>
    );
  };

  const getDataQualityIndicator = () => {
    if (!hasActualData) {
      return (
        <div className="flex items-center text-xs text-amber-600 mt-1">
          <AlertTriangle className="h-3 w-3 mr-1" />
          <span>Projected only</span>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="text-3xl font-bold">
              {formatValue(value)}
            </div>
            {projectedValue !== undefined && hasActualData && (
              <div className="text-sm text-gray-500 mt-1">
                Projected: {formatValue(projectedValue)}
              </div>
            )}
            {getVarianceDisplay()}
            {getDataQualityIndicator()}
          </div>
          <div className="ml-4">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface VarianceIndicatorProps {
  metric: string;
  variance: number;
  actual: number;
  projected: number;
  status: 'positive' | 'negative';
  formatValue?: (value: number) => string;
}

export const VarianceIndicator: React.FC<VarianceIndicatorProps> = ({
  metric,
  variance,
  actual,
  projected,
  status,
  formatValue = (v) => `$${v.toLocaleString()}`
}) => {
  const isNeutral = Math.abs(variance) < 1;
  
  return (
    <div className="p-3 border rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm">{metric}</span>
        <div className={cn(
          "flex items-center text-xs px-2 py-1 rounded-full",
          isNeutral ? "bg-gray-100 text-gray-600" :
          status === 'positive' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        )}>
          {isNeutral ? (
            <Minus className="h-3 w-3 mr-1" />
          ) : status === 'positive' ? (
            <TrendingUp className="h-3 w-3 mr-1" />
          ) : (
            <TrendingDown className="h-3 w-3 mr-1" />
          )}
          <span>
            {isNeutral ? 'On target' : `${variance >= 0 ? '+' : ''}${variance.toFixed(1)}%`}
          </span>
        </div>
      </div>
      <div className="text-lg font-bold">{formatValue(actual)}</div>
      <div className="text-xs text-gray-500">vs {formatValue(projected)} projected</div>
    </div>
  );
};