import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { ScenarioAnalysis } from '@/lib/financial-calculations';

interface SensitivityAnalysisProps {
  scenarioAnalysis: ScenarioAnalysis;
}

export const SensitivityAnalysis = ({ scenarioAnalysis }: SensitivityAnalysisProps) => (
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
);