import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { ArrowUp, ArrowDown, Minus, TrendingUp, TrendingDown } from 'lucide-react';
import { dataColors } from '@/lib/colors';
import { Sparkline } from '@/components/ui/sparkline';

interface VarianceCardProps {
  title: string;
  forecast: number;
  actual: number;
  actualLabel?: string;
  isPercentage?: boolean;
  isUnits?: boolean;
  higherIsBad?: boolean;
  showPercentageVariance?: boolean;
  trend?: number[];
  previousValue?: number;
  previousLabel?: string;
  description?: string;
  className?: string;
  footer?: React.ReactNode;
  secondaryValue?: number;
  secondaryLabel?: string;
  // Optional pre-calculated variance (if not provided, will be calculated as actual - forecast)
  variance?: number;
}

// Helper to calculate and format variance with color and icon
const VarianceDisplay: React.FC<{
    variance: number,
    forecast: number,
    higherIsBad?: boolean,
    isPercentage?: boolean,
    isUnits?: boolean,
    showIcon?: boolean
}> = ({ variance, forecast, higherIsBad = false, isPercentage = false, isUnits = false, showIcon = true }) => {

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
      {showIcon && <Icon className="h-4 w-4 mr-1" />}
      {sign}{formattedVariance}{percentageString}
    </p>
  );
};

export const VarianceCard: React.FC<VarianceCardProps> = ({
    title,
    forecast,
    actual,
    actualLabel = "Actual",
    isPercentage = false,
    isUnits = false,
    higherIsBad = false,
    showPercentageVariance = false,
    trend,
    previousValue,
    previousLabel = "Previous",
    description,
    className,
    footer,
    secondaryValue,
    secondaryLabel,
    variance: providedVariance
}) => {

  // Always use the provided variance if available
  const variance = providedVariance !== undefined ? providedVariance : actual - forecast;

  // Log the values for debugging
  console.log(`[VarianceCard] ${title}:`, {
    forecast,
    actual,
    providedVariance,
    calculatedVariance: variance,
    usingProvidedVariance: providedVariance !== undefined
  });

  // Calculate previous variance if available
  const previousVariance = previousValue !== undefined ? actual - previousValue : undefined;

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

        {previousValue !== undefined && (
          <div className="pt-2 border-t border-border/50 mt-2">
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">vs {previousLabel}</p>
              {previousVariance !== undefined && (
                <VarianceDisplay
                  variance={previousVariance}
                  forecast={previousValue}
                  higherIsBad={higherIsBad}
                  isPercentage={isPercentage}
                  isUnits={isUnits}
                />
              )}
            </div>
          </div>
        )}
      </CardContent>

      {footer && (
        <CardFooter className="px-6 py-3 bg-muted/20 border-t">
          {footer}
        </CardFooter>
      )}
    </Card>
  );
};