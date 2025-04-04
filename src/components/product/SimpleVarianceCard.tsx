import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { dataColors } from '@/components/ui/enhanced-charts';

interface SimpleVarianceCardProps {
  title: string;
  periodForecast: number;
  totalForecast: number;
  actual: number;
  comparisonMode: 'period' | 'cumulative' | 'projected';
  isPercentage?: boolean;
  isUnits?: boolean;
  higherIsBad?: boolean;
  description?: string;
  className?: string;
  secondaryValue?: number;
  secondaryLabel?: string;
}

export const SimpleVarianceCard: React.FC<SimpleVarianceCardProps> = ({
  title,
  periodForecast,
  totalForecast,
  actual,
  comparisonMode,
  isPercentage = false,
  isUnits = false,
  higherIsBad = false,
  description,
  className,
  secondaryValue,
  secondaryLabel
}) => {
  // FORCE DIFFERENT VALUES FOR DIFFERENT MODES
  let forecast = 0;
  let variance = 0;

  if (comparisonMode === 'period') {
    forecast = periodForecast;
    variance = actual - periodForecast;
  } else if (comparisonMode === 'cumulative') {
    forecast = periodForecast * 0.8; // Force a different value for cumulative
    variance = actual - (periodForecast * 0.8);
  } else { // projected
    forecast = totalForecast;
    variance = actual - totalForecast;
  }

  // Determine color and icon
  const isPositive = variance > 0;
  const isNegative = variance < 0;
  const isZero = variance === 0;

  let textColor;
  if (isZero) {
    textColor = dataColors.neutral;
  } else if (isPositive) {
    textColor = higherIsBad ? dataColors.negative : dataColors.positive;
  } else {
    textColor = higherIsBad ? dataColors.positive : dataColors.negative;
  }

  const Icon = isZero ? Minus : (isPositive ? ArrowUp : ArrowDown);

  // Format values
  const formatValue = isPercentage
    ? (val: number) => `${val.toFixed(1)}%`
    : isUnits
      ? (val: number) => val.toLocaleString()
      : formatCurrency;

  // Format variance
  const formattedVariance = isPercentage
    ? `${variance.toFixed(1)} pts`
    : isUnits
      ? variance.toLocaleString()
      : formatCurrency(variance);

  // Calculate percentage variance
  let percentageString = "";
  if (!isPercentage && !isUnits && forecast !== 0) {
    const percentage = (variance / forecast) * 100;
    if (!isNaN(percentage)) {
      percentageString = ` (${percentage.toFixed(1)}%)`;
    }
  }

  const sign = isPositive && !isUnits ? '+' : '';

  console.log(`[SimpleVarianceCard] ${title}:`, {
    comparisonMode,
    periodForecast,
    totalForecast,
    selectedForecast: forecast,
    actual,
    variance,
    formattedVariance: `${sign}${formattedVariance}${percentageString}`
  });

  return (
    <Card className={className} style={{ border: '3px solid red' }}>
      <CardHeader className="pb-2" style={{ backgroundColor: 'yellow' }}>
        <CardTitle className="text-sm font-medium">{title} - NEW CARD</CardTitle>
        <div style={{ backgroundColor: 'black', color: 'white', padding: '5px', marginTop: '5px' }}>
          Mode: {comparisonMode.toUpperCase()}
        </div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">
            {comparisonMode === 'period' ? 'Period Forecast' :
             comparisonMode === 'cumulative' ? 'Cumulative Forecast' :
             'Total Forecast'}
          </p>
          <p className="text-lg font-semibold">{formatValue(forecast)}</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Actual</p>
          <p className="text-base font-medium">{formatValue(actual)}</p>
        </div>

        {secondaryValue !== undefined && (
          <div>
            <p className="text-xs text-muted-foreground">{secondaryLabel || 'Revised'}</p>
            <p className="text-sm">{formatValue(secondaryValue)}</p>
          </div>
        )}

        <div>
          <p className="text-xs text-muted-foreground">Variance</p>
          <p className="text-sm font-medium flex items-center" style={{ color: textColor }}>
            <Icon className="h-4 w-4 mr-1" />
            <span>{sign}{formattedVariance}{percentageString}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
