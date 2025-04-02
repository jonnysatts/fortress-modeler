import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface VarianceCardProps {
  title: string;
  forecast: number;
  actual: number;
  actualLabel?: string; // NEW prop for custom label
  isPercentage?: boolean; // Is the primary value a percentage?
  isUnits?: boolean; // NEW: Flag for plain number formatting
  higherIsBad?: boolean; // If true, positive variance is red, negative is green
  showPercentageVariance?: boolean; // Optionally show percentage variance even if main value is currency
}

// Helper to calculate and format variance with color and icon
const VarianceDisplay: React.FC<{ 
    variance: number, 
    forecast: number, 
    higherIsBad?: boolean, 
    isPercentage?: boolean,
    isUnits?: boolean // Add isUnits here too
}> = ({ variance, forecast, higherIsBad = false, isPercentage = false, isUnits = false }) => {
  
  if (isNaN(variance)) {
      return <span className="text-sm text-muted-foreground">N/A</span>;
  }

  const isPositive = variance > 0;
  const isNegative = variance < 0;
  const isZero = variance === 0;
  
  // Determine color based on variance sign and higherIsBad flag
  let textColor = "text-muted-foreground"; // Default for zero variance
  if (isPositive) {
    textColor = higherIsBad ? 'text-red-600' : 'text-green-600';
  } else if (isNegative) {
    textColor = higherIsBad ? 'text-green-600' : 'text-red-600';
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
    <p className={`text-sm font-medium ${textColor} flex items-center`}>
      <Icon className="h-4 w-4 mr-1" />
      {sign}{formattedVariance}{percentageString}
    </p>
  );
};

export const VarianceCard: React.FC<VarianceCardProps> = ({ 
    title, 
    forecast, 
    actual, 
    actualLabel = "Actual", // Default to "Actual"
    isPercentage = false, 
    isUnits = false, // Add prop here
    higherIsBad = false,
    showPercentageVariance = false // Default to false if not passed
}) => {
  
  const variance = actual - forecast;
  
  // Determine the correct formatting function
  const formatValue = 
      isPercentage ? formatPercent 
    : isUnits ? (val: number) => val.toLocaleString() // Plain number format
    : formatCurrency; // Default

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">Forecast: {formatValue(forecast)}</p>
        <p className="text-lg font-semibold">{actualLabel}: {formatValue(actual)}</p>
        <VarianceDisplay 
            variance={variance} 
            forecast={forecast} 
            higherIsBad={higherIsBad} 
            isPercentage={isPercentage} 
            isUnits={isUnits} // Pass down isUnits
        />
      </CardContent>
    </Card>
  );
}; 