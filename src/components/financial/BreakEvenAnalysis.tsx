import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/export';
import { FinancialMetrics } from '@/lib/financial-calculations';

interface BreakEvenAnalysisProps {
  metrics: FinancialMetrics;
  chartData: Array<{
    period: string;
    revenue: number;
    costs: number;
  }>;
}

export const BreakEvenAnalysis = ({ metrics, chartData }: BreakEvenAnalysisProps) => (
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
              {metrics.breakEvenUnits 
                ? metrics.breakEvenUnits.toLocaleString() 
                : 'N/A'
              }
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Break-even Revenue:</span>
            <span className="font-medium">
              {metrics.breakEvenRevenue 
                ? formatCurrency(metrics.breakEvenRevenue)
                : 'N/A'
              }
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Revenue:</span>
            <span className="font-medium">{formatCurrency(metrics.totalRevenue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Costs:</span>
            <span className="font-medium">{formatCurrency(metrics.totalCosts)}</span>
          </div>
        </div>
        
        {metrics.breakEvenRevenue && (
          <div className="pt-4 border-t">
            <div className="text-sm text-muted-foreground mb-2">Break-even Status</div>
            <Badge 
              variant={metrics.totalRevenue >= metrics.breakEvenRevenue ? "default" : "destructive"}
            >
              {metrics.totalRevenue >= metrics.breakEvenRevenue 
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
            <BarChart data={chartData.slice(0, 12)}>
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
);