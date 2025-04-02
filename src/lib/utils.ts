import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// Formats variance, showing $ amount and (percentage %)
export const formatVariance = (variance: number | undefined, forecast: number | undefined): string => {
  if (variance === undefined || variance === null) return "N/A";
  
  const formattedAmount = formatCurrency(variance);
  let percentageString = "";

  if (forecast !== undefined && forecast !== null && forecast !== 0) {
    const percentage = (variance / forecast) * 100;
    percentageString = ` (${percentage.toFixed(1)}%)`;
  }
  
  // Add a plus sign for positive variance
  const sign = variance > 0 ? '+' : '';
  
  return `${sign}${formattedAmount}${percentageString}`;
};
