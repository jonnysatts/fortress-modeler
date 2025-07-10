import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, TrendingUp, Target } from 'lucide-react';
import { formatCurrency } from '@/lib/export';
import { ScenarioAnalysis, FinancialMetrics } from '@/lib/financial-calculations';

interface ScenarioComparisonProps {
  scenarioAnalysis: ScenarioAnalysis;
  selectedScenario: 'base' | 'best' | 'worst';
  onScenarioChange: (value: 'base' | 'best' | 'worst') => void;
  getMetricColor: (value: number, isPositive?: boolean) => string;
}

export const ScenarioComparison = ({ 
  scenarioAnalysis, 
  selectedScenario, 
  onScenarioChange, 
  getMetricColor 
}: ScenarioComparisonProps) => (
  <>
    <div className="flex justify-between items-center">
      <h3 className="text-lg font-semibold">Scenario Comparison</h3>
      <Select value={selectedScenario} onValueChange={onScenarioChange}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="base">Base Case</SelectItem>
          <SelectItem value="best">Best Case</SelectItem>
          <SelectItem value="worst">Worst Case</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {['worst', 'base', 'best'].map((scenario) => {
        const metrics = scenario === 'worst' ? scenarioAnalysis.worstCase 
                     : scenario === 'best' ? scenarioAnalysis.bestCase 
                     : scenarioAnalysis.baseCase;
        
        const isSelected = selectedScenario === scenario;
        
        return (
          <Card key={scenario} className={isSelected ? 'ring-2 ring-blue-500' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {scenario === 'worst' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                {scenario === 'best' && <TrendingUp className="h-4 w-4 text-green-500" />}
                {scenario === 'base' && <Target className="h-4 w-4 text-blue-500" />}
                {scenario.charAt(0).toUpperCase() + scenario.slice(1)} Case
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">NPV:</span>
                <span className={`text-sm font-medium ${getMetricColor(metrics.npv)}`}>
                  {formatCurrency(metrics.npv)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">IRR:</span>
                <span className="text-sm font-medium">{metrics.irr.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">ROI:</span>
                <span className="text-sm font-medium">{metrics.roi.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Profit Margin:</span>
                <span className="text-sm font-medium">{metrics.profitMargin.toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  </>
);