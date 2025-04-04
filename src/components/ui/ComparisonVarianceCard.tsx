import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { dataColors } from '@/lib/colors';
import { Sparkline } from '@/components/ui/sparkline';

interface ComparisonVarianceCardProps {
  title: string;
  periodForecast: number;
  cumulativeForecast: number;
  totalForecast: number;
  actual: number;
  comparisonMode: 'period' | 'cumulative' | 'projected';
  actualLabel?: string;
  isPercentage?: boolean;
  isUnits?: boolean;
  higherIsBad?: boolean;
  trend?: number[];
  description?: string;
  className?: string;
  secondaryValue?: number;
  secondaryLabel?: string;
}

// Helper to calculate and format variance with color and icon
const VarianceDisplay: React.FC<{
    variance: number,
    forecast: number,
    higherIsBad?: boolean,
    isPercentage?: boolean,
    isUnits?: boolean,
}> = ({ variance, forecast, higherIsBad = false, isPercentage = false, isUnits = false }) => {

  if (isNaN(variance)) {
      return <span className="text-sm text-muted-foreground">N/A</span>;
  }

  const isPositive = variance > 0;
  const isNegative = variance < 0;
  const isZero = variance === 0;

  // Get color from dataColors
  let textColor;
  if (isZero) {
    textColor = dataColors.neutral;
  } else if (isPositive) {
    textColor = higherIsBad ? dataColors.negative : dataColors.positive;
  } else {
    textColor = higherIsBad ? dataColors.positive : dataColors.negative;
  }

  const Icon = isZero ? Minus : (isPositive ? ArrowUp : ArrowDown);

  // Format the primary variance value
  const formattedVariance =
      isPercentage ? `${variance.toFixed(1)} pts`
    : isUnits ? variance.toLocaleString() // Format units with commas
    : formatCurrency(variance); // Default to currency

  // Calculate and format percentage variance (only if not units/percentage itself)
  let percentageString = "";
  if (!isPercentage && !isUnits && forecast !== 0) {
      const percentage = (variance / forecast) * 100;
      if (!isNaN(percentage)) {
           percentageString = ` (${percentage.toFixed(1)}%)`;
      }
  }

  const sign = isPositive && !isUnits ? '+' : (isNegative && !isUnits ? '' : ''); // Only show + for currency/pts

  return (
    <p className="text-sm font-medium flex items-center" style={{ color: textColor }}>
      <Icon className="h-4 w-4 mr-1" />
      {sign}{formattedVariance}{percentageString}
    </p>
  );
};

export const ComparisonVarianceCard: React.FC<ComparisonVarianceCardProps> = ({
    title,
    periodForecast,
    cumulativeForecast,
    totalForecast,
    actual,
    comparisonMode,
    actualLabel = "Actual",
    isPercentage = false,
    isUnits = false,
    higherIsBad = false,
    trend,
    description,
    className,
    secondaryValue,
    secondaryLabel
}) => {

  // Determine which forecast to use based on comparison mode
  const forecast = 
    comparisonMode === 'period' ? periodForecast :
    comparisonMode === 'cumulative' ? cumulativeForecast :
    totalForecast;

  // Calculate variance based on the selected forecast
  const variance = actual - forecast;

  console.log(`[ComparisonVarianceCard] ${title}:`, {
    comparisonMode,
    periodForecast,
    cumulativeForecast,
    totalForecast,
    selectedForecast: forecast,
    actual,
    calculatedVariance: variance
  });

  // Determine the correct formatting function
  const formatValue =
      isPercentage ? formatPercent
    : isUnits ? (val: number) => val.toLocaleString() // Plain number format
    : formatCurrency; // Default

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-muted-foreground">Forecast</p>
            <p className="text-lg font-semibold">{formatValue(forecast)}</p>
          </div>

          {trend && trend.length > 0 && (
            <div className="h-10 w-20">
              <Sparkline
                data={trend}
                color={variance >= 0 ?
                  (higherIsBad ? dataColors.negative : dataColors.positive) :
                  (higherIsBad ? dataColors.positive : dataColors.negative)}
                height={40}
                width={80}
                fillOpacity={0.2}
                strokeWidth={1.5}
              />
            </div>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">{actualLabel || 'Actual'}</p>
            <p className="text-base font-medium">{formatValue(actual)}</p>
          </div>

          {secondaryValue !== undefined && (
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">{secondaryLabel || 'Revised'}</p>
              <p className="text-sm">{formatValue(secondaryValue)}</p>
            </div>
          )}

          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">Variance</p>
            <VarianceDisplay
              variance={variance}
              forecast={forecast}
              higherIsBad={higherIsBad}
              isPercentage={isPercentage}
              isUnits={isUnits}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
