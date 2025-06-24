import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine } from 'recharts';
import { FinancialModel } from '@/lib/db';
import { 
  performFinancialAnalysis, 
  generateCashFlowProjections, 
  performScenarioAnalysis,
  FinancialMetrics,
  CashFlowPeriod,
  ScenarioAnalysis 
} from '@/lib/financial-calculations';
import { formatCurrency, formatPercentage } from '@/lib/export';
import { Calculator, TrendingUp, AlertTriangle, Target, DollarSign, Percent } from 'lucide-react';

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

  const getCurrentScenarioMetrics = (): FinancialMetrics => {
    switch (selectedScenario) {
      case 'best': return scenarioAnalysis.bestCase;
      case 'worst': return scenarioAnalysis.worstCase;
      default: return scenarioAnalysis.baseCase;
    }
  };

  const getMetricColor = (value: number, isPositive: boolean = true): string => {
    if (isPositive) {
      return value > 0 ? 'text-green-600' : 'text-red-600';
    }
    return value < 0 ? 'text-green-600' : 'text-red-600';
  };

  const MetricCard = ({ title, value, subtitle, icon: Icon, colorClass }: {
    title: string;
    value: string;
    subtitle?: string;
    icon: any;
    colorClass?: string;
  }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${colorClass || ''}`}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );

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
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cashFlowChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="period" 
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tickFormatter={(value) => `$${Math.round(value / 1000)}K`} />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), '']}
                      labelFormatter={(label) => `Period: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="netCashFlow" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Net Cash Flow"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cumulativeCashFlow" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Cumulative Cash Flow"
                    />
                    <ReferenceLine y={0} stroke="#666" strokeDasharray="2 2" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              {/* Cash Flow Table */}
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Period</th>
                      <th className="text-right py-2">Operating CF</th>
                      <th className="text-right py-2">Investing CF</th>
                      <th className="text-right py-2">Financing CF</th>
                      <th className="text-right py-2">Net CF</th>
                      <th className="text-right py-2">Cumulative CF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashFlowProjections.slice(0, 12).map((cf) => (
                      <tr key={cf.period} className="border-b">
                        <td className="py-1">{cf.periodName}</td>
                        <td className="text-right py-1">{formatCurrency(cf.operatingCashFlow)}</td>
                        <td className="text-right py-1">{formatCurrency(cf.investingCashFlow)}</td>
                        <td className="text-right py-1">{formatCurrency(cf.financingCashFlow)}</td>
                        <td className={`text-right py-1 ${getMetricColor(cf.netCashFlow)}`}>
                          {formatCurrency(cf.netCashFlow)}
                        </td>
                        <td className={`text-right py-1 ${getMetricColor(cf.cumulativeCashFlow)}`}>
                          {formatCurrency(cf.cumulativeCashFlow)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Break-even Analysis */}
        <TabsContent value="break-even" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Break-even Metrics</CardTitle>
                <CardDescription>Units and revenue required to break even</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Break-even Units:</span>
                    <span className="font-medium">
                      {financialMetrics.breakEvenUnits 
                        ? financialMetrics.breakEvenUnits.toLocaleString() 
                        : 'N/A'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Break-even Revenue:</span>
                    <span className="font-medium">
                      {financialMetrics.breakEvenRevenue 
                        ? formatCurrency(financialMetrics.breakEvenRevenue)
                        : 'N/A'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Revenue:</span>
                    <span className="font-medium">{formatCurrency(financialMetrics.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Costs:</span>
                    <span className="font-medium">{formatCurrency(financialMetrics.totalCosts)}</span>
                  </div>
                </div>
                
                {financialMetrics.breakEvenRevenue && (
                  <div className="pt-4 border-t">
                    <div className="text-sm text-muted-foreground mb-2">Break-even Status</div>
                    <Badge 
                      variant={financialMetrics.totalRevenue >= financialMetrics.breakEvenRevenue ? "default" : "destructive"}
                    >
                      {financialMetrics.totalRevenue >= financialMetrics.breakEvenRevenue 
                        ? "Above Break-even" 
                        : "Below Break-even"
                      }
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Costs</CardTitle>
                <CardDescription>Monthly comparison over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cashFlowChartData.slice(0, 12)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis tickFormatter={(value) => `$${Math.round(value / 1000)}K`} />
                      <Tooltip formatter={(value: number) => [formatCurrency(value), '']} />
                      <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                      <Bar dataKey="costs" fill="#ef4444" name="Costs" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Scenario Analysis */}
        <TabsContent value="scenarios" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Scenario Comparison</h3>
            <Select value={selectedScenario} onValueChange={(value: any) => setSelectedScenario(value)}>
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
        </TabsContent>

        {/* Sensitivity Analysis */}
        <TabsContent value="sensitivity" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Sensitivity</CardTitle>
                <CardDescription>Impact of revenue changes on NPV</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={scenarioAnalysis.sensitivity.revenueImpact}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="change" tickFormatter={(value) => `${value}%`} />
                      <YAxis tickFormatter={(value) => `${value.toFixed(0)}%`} />
                      <Tooltip 
                        formatter={(value: number) => [`${value.toFixed(2)}%`, 'NPV Change']}
                        labelFormatter={(label) => `Revenue Change: ${label}%`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="npvChange" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                      />
                      <ReferenceLine x={0} stroke="#666" strokeDasharray="2 2" />
                      <ReferenceLine y={0} stroke="#666" strokeDasharray="2 2" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Sensitivity</CardTitle>
                <CardDescription>Impact of cost changes on NPV</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={scenarioAnalysis.sensitivity.costImpact}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="change" tickFormatter={(value) => `${value}%`} />
                      <YAxis tickFormatter={(value) => `${value.toFixed(0)}%`} />
                      <Tooltip 
                        formatter={(value: number) => [`${value.toFixed(2)}%`, 'NPV Change']}
                        labelFormatter={(label) => `Cost Change: ${label}%`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="npvChange" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                      />
                      <ReferenceLine x={0} stroke="#666" strokeDasharray="2 2" />
                      <ReferenceLine y={0} stroke="#666" strokeDasharray="2 2" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialAnalysis;