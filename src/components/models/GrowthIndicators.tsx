import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts';

interface SimulationPeriod {
  period: number;
  point: string;
  revenue: number;
  costs: number;
  profit: number;
  cumulativeRevenue: number;
  cumulativeCosts: number;
  cumulativeProfit: number;
  attendance?: number;
}

interface SparklineTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    color: string;
    name: string;
  }>;
  label?: string;
}

const SparklineTooltip = ({ active, payload }: SparklineTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border px-2 py-1 rounded shadow-lg text-xs">
        <p className="font-semibold">{data.point}</p>
        {payload[0].dataKey === 'attendance' ? (
           <p>{`Attendance: ${Math.round(payload[0].value).toLocaleString()}`}</p>
        ) : (
           <p>{`${payload[0].name}: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(payload[0].value)}`}</p>
        )}
      </div>
    );
  }
  return null;
};

interface GrowthIndicatorsProps {
  periodicData: SimulationPeriod[];
  isWeekly: boolean;
  totalAttendance: number;
}

export const GrowthIndicators = ({ periodicData, isWeekly, totalAttendance }: GrowthIndicatorsProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg font-semibold text-primary">Growth Indicators</CardTitle>
    </CardHeader>
    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
      {/* Revenue Trend Sparkline */}
      <div className="text-center">
        <p className="text-sm font-medium mb-1">Revenue Trend</p>
        <div className="h-20 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={periodicData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <Tooltip content={<SparklineTooltip />} cursor={{ fill: 'transparent' }} />
              <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} dot={false} name="Revenue"/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Cost Trend Sparkline */}
      <div className="text-center">
        <p className="text-sm font-medium mb-1">Cost Trend</p>
        <div className="h-20 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={periodicData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <Tooltip content={<SparklineTooltip />} cursor={{ fill: 'transparent' }}/>
              <Line type="monotone" dataKey="costs" stroke="#dc2626" strokeWidth={2} dot={false} name="Costs"/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Attendance Trend / Total */}
      <div className="text-center">
        <p className="text-sm font-medium mb-1">Attendance</p>
        <div className="h-20 w-full">
          {isWeekly ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={periodicData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <Tooltip content={<SparklineTooltip />} cursor={{ fill: 'transparent' }}/>
                <Line type="monotone" dataKey="attendance" stroke="#6366f1" strokeWidth={2} dot={false} name="Attendance"/>
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted-foreground h-full flex items-center justify-center">(Weekly Only)</p>
          )}
        </div>
        {isWeekly && (
          <p className="text-xs text-muted-foreground mt-1">Total Est. Attendance: {totalAttendance.toLocaleString()}</p>
        )}
      </div>
    </CardContent>
  </Card>
);