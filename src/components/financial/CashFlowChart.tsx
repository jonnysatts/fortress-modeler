import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { formatCurrency } from '@/lib/export';
import { CashFlowPeriod } from '@/lib/financial-calculations';

interface CashFlowChartProps {
  data: Array<{
    period: string;
    revenue: number;
    costs: number;
    netCashFlow: number;
    cumulativeCashFlow: number;
  }>;
}

export const CashFlowChart = ({ data }: CashFlowChartProps) => (
  <div className="h-80 w-full">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
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
);