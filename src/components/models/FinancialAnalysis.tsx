import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinancialModel } from '@/lib/db';
import { 
  performFinancialAnalysis, 
  generateCashFlowProjections, 
  performScenarioAnalysis,
  FinancialMetrics,
  ScenarioAnalysis 
} from '@/lib/financial-calculations';
import { formatCurrency } from '@/lib/export';
import { Calculator, DollarSign, Percent, Target, TrendingUp } from 'lucide-react';
import { MetricCard } from '@/components/financial/MetricCard';
import { CashFlowChart } from '@/components/financial/CashFlowChart';
import { CashFlowTable } from '@/components/financial/CashFlowTable';
import { BreakEvenAnalysis } from '@/components/financial/BreakEvenAnalysis';
import { ScenarioComparison } from '@/components/financial/ScenarioComparison';
import { SensitivityAnalysis } from '@/components/financial/SensitivityAnalysis';

interface FinancialAnalysisProps {
  model: FinancialModel;
  isWeekly?: boolean;
}

const FinancialAnalysis = ({ model, isWeekly = false }: FinancialAnalysisProps) => {
  const [periods, setPeriods] = useState(36);
  const [discountRate, setDiscountRate] = useState(10);
  const [selectedScenario, setSelectedScenario] = useState<'base' | 'best' | 'worst'>('base');

  // Calculate financial metrics
  const financialMetrics = useMemo(() => {
    return performFinancialAnalysis(model, periods, discountRate / 100, isWeekly);
  }, [model, periods, discountRate, isWeekly]);

  // Generate cash flow projections
  const cashFlowProjections = useMemo(() => {
    return generateCashFlowProjections(model, periods, isWeekly);
  }, [model, periods, isWeekly]);

  // Perform scenario analysis
  const scenarioAnalysis = useMemo(() => {
    return performScenarioAnalysis(model, periods, discountRate / 100, isWeekly);
  }, [model, periods, discountRate, isWeekly]);

  // Prepare chart data
  const cashFlowChartData = cashFlowProjections.map(cf => ({
    period: cf.periodName,
    revenue: cf.revenue,
    costs: cf.costs,
    netCashFlow: cf.netCashFlow,
    cumulativeCashFlow: cf.cumulativeCashFlow,
  }));

  const metricsComparison = [
    { scenario: 'Worst Case', npv: scenarioAnalysis.worstCase.npv, irr: scenarioAnalysis.worstCase.irr, color: '#ef4444' },
    { scenario: 'Base Case', npv: scenarioAnalysis.baseCase.npv, irr: scenarioAnalysis.baseCase.irr, color: '#3b82f6' },
    { scenario: 'Best Case', npv: scenarioAnalysis.bestCase.npv, irr: scenarioAnalysis.bestCase.irr, color: '#10b981' },
  ];

  const getMetricColor = (value: number, isPositive: boolean = true): string => {
    if (isPositive) {
      return value > 0 ? 'text-green-600' : 'text-red-600';
    }
    return value < 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Financial Analysis
          </h2>
          <p className="text-muted-foreground">
            Comprehensive financial modeling and scenario analysis
          </p>
        </div>
        
        <div className="flex gap-4">
          <div className="space-y-1">
            <Label htmlFor="periods" className="text-sm">Periods</Label>
            <Input
              id="periods"
              type="number"
              value={periods}
              onChange={(e) => setPeriods(Number(e.target.value))}
              className="w-20"
              min="12"
              max="60"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="discount-rate" className="text-sm">Discount Rate (%)</Label>
            <Input
              id="discount-rate"
              type="number"
              value={discountRate}
              onChange={(e) => setDiscountRate(Number(e.target.value))}
              className="w-24"
              min="1"
              max="50"
              step="0.5"
            />
          </div>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Net Present Value"
          value={formatCurrency(financialMetrics.npv)}
          subtitle={`At ${discountRate}% discount rate`}
          icon={DollarSign}
          colorClass={getMetricColor(financialMetrics.npv)}
        />
        
        <MetricCard
          title="Internal Rate of Return"
          value={`${financialMetrics.irr.toFixed(2)}%`}
          subtitle="Annualized return"
          icon={Percent}
          colorClass={getMetricColor(financialMetrics.irr - discountRate)}
        />
        
        <MetricCard
          title="Payback Period"
          value={`${financialMetrics.paybackPeriod.toFixed(1)} ${isWeekly ? 'weeks' : 'months'}`}
          subtitle="Time to break even"
          icon={Target}
        />
        
        <MetricCard
          title="Total Profit"
          value={formatCurrency(financialMetrics.totalProfit)}
          subtitle={`${financialMetrics.profitMargin.toFixed(1)}% margin`}
          icon={TrendingUp}
          colorClass={getMetricColor(financialMetrics.totalProfit)}
        />
      </div>

      <Tabs defaultValue="cash-flow" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
          <TabsTrigger value="break-even">Break-even</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="sensitivity">Sensitivity</TabsTrigger>
        </TabsList>

        {/* Cash Flow Analysis */}
        <TabsContent value="cash-flow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Statement</CardTitle>
              <CardDescription>
                Operating, investing, and financing cash flows over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CashFlowChart data={cashFlowChartData} />
              <CashFlowTable data={cashFlowProjections} getMetricColor={getMetricColor} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Break-even Analysis */}
        <TabsContent value="break-even" className="space-y-4">
          <BreakEvenAnalysis metrics={financialMetrics} chartData={cashFlowChartData} />
        </TabsContent>

        {/* Scenario Analysis */}
        <TabsContent value="scenarios" className="space-y-4">
          <ScenarioComparison 
            scenarioAnalysis={scenarioAnalysis}
            selectedScenario={selectedScenario}
            onScenarioChange={(value) => setSelectedScenario(value)}
            getMetricColor={getMetricColor}
          />
        </TabsContent>

        {/* Sensitivity Analysis */}
        <TabsContent value="sensitivity" className="space-y-4">
          <SensitivityAnalysis scenarioAnalysis={scenarioAnalysis} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialAnalysis;