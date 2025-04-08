import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';

interface SummaryMetrics {
  totalRevenue: number;
  totalCosts: number;
  totalProfit: number;
  profitMargin: number;
  breakEvenPeriod: {
    index: number | null;
    label: string;
  };
  averageWeeklyRevenue: number;
  averageWeeklyCosts: number;
  averageWeeklyProfit: number;
}

interface ScenarioSummaryMetricsProps {
  baselineMetrics: SummaryMetrics;
  scenarioMetrics: SummaryMetrics;
}

/**
 * ScenarioSummaryMetrics Component
 * Displays the impact of scenario changes on key metrics
 */
const ScenarioSummaryMetrics: React.FC<ScenarioSummaryMetricsProps> = ({
  baselineMetrics,
  scenarioMetrics
}) => {
  // Calculate deltas
  const revenueDelta = scenarioMetrics.totalRevenue - baselineMetrics.totalRevenue;
  const revenueDeltaPercent = (revenueDelta / baselineMetrics.totalRevenue) * 100;
  
  const costsDelta = scenarioMetrics.totalCosts - baselineMetrics.totalCosts;
  const costsDeltaPercent = (costsDelta / baselineMetrics.totalCosts) * 100;
  
  const profitDelta = scenarioMetrics.totalProfit - baselineMetrics.totalProfit;
  const profitDeltaPercent = baselineMetrics.totalProfit !== 0 
    ? (profitDelta / Math.abs(baselineMetrics.totalProfit)) * 100 
    : 0;
  
  const marginDelta = scenarioMetrics.profitMargin - baselineMetrics.profitMargin;
  
  // Calculate breakeven delta
  let breakEvenDelta = 0;
  if (scenarioMetrics.breakEvenPeriod.index !== null && baselineMetrics.breakEvenPeriod.index !== null) {
    breakEvenDelta = scenarioMetrics.breakEvenPeriod.index - baselineMetrics.breakEvenPeriod.index;
  }
  
  // Helper function to render delta with arrow
  const renderDelta = (delta: number, deltaPercent: number, inverse = false) => {
    const isPositive = delta > 0;
    const isNegative = delta < 0;
    
    // For costs, positive is bad and negative is good (inverse)
    const colorClass = inverse
      ? isNegative ? 'text-green-600' : isPositive ? 'text-red-600' : 'text-gray-500'
      : isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500';
    
    return (
      <div className={`flex items-center ${colorClass}`}>
        {isPositive ? (
          <ArrowUpIcon className="h-4 w-4 mr-1" />
        ) : isNegative ? (
          <ArrowDownIcon className="h-4 w-4 mr-1" />
        ) : null}
        <span>
          {delta > 0 ? '+' : ''}{formatCurrency(delta)} ({deltaPercent > 0 ? '+' : ''}{deltaPercent.toFixed(1)}%)
        </span>
      </div>
    );
  };
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Scenario Impact</h3>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Revenue Card */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Total Revenue</h4>
              <div className="text-2xl font-bold">{formatCurrency(scenarioMetrics.totalRevenue)}</div>
              {renderDelta(revenueDelta, revenueDeltaPercent)}
            </div>
          </CardContent>
        </Card>
        
        {/* Costs Card */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Total Costs</h4>
              <div className="text-2xl font-bold">{formatCurrency(scenarioMetrics.totalCosts)}</div>
              {renderDelta(costsDelta, costsDeltaPercent, true)}
            </div>
          </CardContent>
        </Card>
        
        {/* Profit Card */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Total Profit</h4>
              <div className="text-2xl font-bold">{formatCurrency(scenarioMetrics.totalProfit)}</div>
              {renderDelta(profitDelta, profitDeltaPercent)}
            </div>
          </CardContent>
        </Card>
        
        {/* Margin Card */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Profit Margin</h4>
              <div className="text-2xl font-bold">{scenarioMetrics.profitMargin.toFixed(1)}%</div>
              <div className={`flex items-center ${marginDelta > 0 ? 'text-green-600' : marginDelta < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                {marginDelta > 0 ? (
                  <ArrowUpIcon className="h-4 w-4 mr-1" />
                ) : marginDelta < 0 ? (
                  <ArrowDownIcon className="h-4 w-4 mr-1" />
                ) : null}
                <span>
                  {marginDelta > 0 ? '+' : ''}{marginDelta.toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Breakeven Point */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Breakeven Point</h4>
            <div className="text-xl font-bold">
              {scenarioMetrics.breakEvenPeriod.index !== null 
                ? scenarioMetrics.breakEvenPeriod.label 
                : 'Not reached'}
            </div>
            {breakEvenDelta !== 0 && (
              <div className={`flex items-center ${breakEvenDelta < 0 ? 'text-green-600' : 'text-red-600'}`}>
                {breakEvenDelta < 0 ? (
                  <ArrowUpIcon className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowDownIcon className="h-4 w-4 mr-1" />
                )}
                <span>
                  {breakEvenDelta < 0 ? 'Earlier by ' : 'Later by '}
                  {Math.abs(breakEvenDelta)} {Math.abs(breakEvenDelta) === 1 ? 'period' : 'periods'}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Weekly Averages */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Weekly Averages</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Revenue</div>
              <div className="text-base font-semibold">{formatCurrency(scenarioMetrics.averageWeeklyRevenue)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Costs</div>
              <div className="text-base font-semibold">{formatCurrency(scenarioMetrics.averageWeeklyCosts)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Profit</div>
              <div className="text-base font-semibold">{formatCurrency(scenarioMetrics.averageWeeklyProfit)}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScenarioSummaryMetrics;
