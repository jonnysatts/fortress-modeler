import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FinancialModel, ActualsPeriodEntry } from '@/lib/db';
import useStore from '@/store/useStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TypographyH4, TypographyMuted } from '@/components/ui/typography';
import ContentCard from '@/components/common/ContentCard';
import ChartContainer from '@/components/common/ChartContainer';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { AlertTriangle, Info, PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

const ProductActuals: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentProject, loadModelsForProject, loadActualsForProject } = useStore();
  const [models, setModels] = useState<FinancialModel[]>([]);
  const [actuals, setActuals] = useState<ActualsPeriodEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  useEffect(() => {
    const loadData = async () => {
      if (id) {
        setIsLoading(true);
        try {
          const projectId = parseInt(id);
          const loadedModels = await loadModelsForProject(projectId);
          const loadedActuals = await loadActualsForProject(projectId);
          
          setModels(loadedModels);
          setActuals(loadedActuals);
        } catch (error) {
          console.error('Error loading data:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadData();
  }, [id, loadModelsForProject, loadActualsForProject]);
  
  // Get the latest model
  const latestModel = models.length > 0 ? models[0] : null;
  
  if (isLoading) {
    return <div className="py-8 text-center">Loading actuals data...</div>;
  }
  
  if (!currentProject) {
    return <div className="py-8 text-center">Product not found</div>;
  }
  
  if (!latestModel) {
    return (
      <div className="py-8 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <TypographyH4>No Forecasts Available</TypographyH4>
        <TypographyMuted className="mt-2">
          This product doesn't have any forecasts yet. Create a forecast before recording actuals.
        </TypographyMuted>
      </div>
    );
  }
  
  const { assumptions } = latestModel;
  const metadata = assumptions.metadata || {};
  const isWeeklyEvent = metadata.type === 'WeeklyEvent';
  const timeUnit = isWeeklyEvent ? 'Week' : 'Month';
  const revenueStreams = assumptions.revenue || [];
  const costs = assumptions.costs || [];
  
  // Sort actuals by period
  const sortedActuals = [...actuals].sort((a, b) => a.period - b.period);
  
  // Prepare data for charts
  const prepareChartData = () => {
    const data = [];
    const duration = isWeeklyEvent ? metadata.weeks || 12 : 12;
    
    for (let period = 1; period <= duration; period++) {
      const actual = sortedActuals.find(a => a.period === period);
      
      const periodData: any = {
        period,
        name: `${timeUnit} ${period}`,
        hasActuals: !!actual
      };
      
      if (actual) {
        // Sum up all revenue actuals
        periodData.revenueActual = Object.values(actual.revenueActuals || {}).reduce((sum, val) => sum + val, 0);
        periodData.costActual = Object.values(actual.costActuals || {}).reduce((sum, val) => sum + val, 0);
        periodData.profitActual = periodData.revenueActual - periodData.costActual;
        
        if (isWeeklyEvent && actual.attendanceActual !== undefined) {
          periodData.attendanceActual = actual.attendanceActual;
        }
      }
      
      data.push(periodData);
    }
    
    return data;
  };
  
  const chartData = prepareChartData();
  
  // Calculate totals
  const totalRevenueActual = chartData.reduce((sum, period) => sum + (period.revenueActual || 0), 0);
  const totalCostActual = chartData.reduce((sum, period) => sum + (period.costActual || 0), 0);
  const totalProfitActual = totalRevenueActual - totalCostActual;
  const profitMargin = totalRevenueActual > 0 ? (totalProfitActual / totalRevenueActual) * 100 : 0;
  const totalAttendanceActual = isWeeklyEvent ? chartData.reduce((sum, period) => sum + (period.attendanceActual || 0), 0) : 0;
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-md shadow-md">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.dataKey.includes('attendance') 
                ? entry.value.toLocaleString() 
                : formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <TypographyH4>Actual Performance</TypographyH4>
          <TypographyMuted>
            Recorded actual performance data for {currentProject.name}
          </TypographyMuted>
        </div>
        
        <Button className="bg-fortress-emerald hover:bg-fortress-emerald/90">
          <PlusCircle className="mr-2 h-4 w-4" />
          Record New Actuals
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ContentCard title="Total Revenue">
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">{formatCurrency(totalRevenueActual)}</div>
            <Badge variant="outline">Actual</Badge>
          </div>
          <TypographyMuted className="text-xs mt-1">
            Total recorded revenue
          </TypographyMuted>
        </ContentCard>
        
        <ContentCard title="Total Costs">
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">{formatCurrency(totalCostActual)}</div>
            <Badge variant="outline">Actual</Badge>
          </div>
          <TypographyMuted className="text-xs mt-1">
            Total recorded costs
          </TypographyMuted>
        </ContentCard>
        
        <ContentCard title={isWeeklyEvent ? "Total Attendance" : "Profit Margin"}>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">
              {isWeeklyEvent 
                ? totalAttendanceActual.toLocaleString() 
                : formatPercent(profitMargin)}
            </div>
            <Badge variant="outline">Actual</Badge>
          </div>
          <TypographyMuted className="text-xs mt-1">
            {isWeeklyEvent ? "Total recorded attendance" : "Actual profit margin"}
          </TypographyMuted>
        </ContentCard>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          {isWeeklyEvent && <TabsTrigger value="attendance">Attendance</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <ChartContainer
            title="Actuals Overview"
            description="Recorded revenue and costs by period"
            height={400}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="revenueActual" name="Revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="costActual" name="Costs" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
          
          <ContentCard title="Actuals Summary">
            <div className="space-y-4">
              <div className="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-md">
                <Info className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
                <p className="text-blue-700 text-sm">
                  {sortedActuals.length > 0 
                    ? `You have recorded actuals for ${sortedActuals.length} ${sortedActuals.length === 1 ? 'period' : 'periods'}.`
                    : 'You have not recorded any actuals yet. Use the "Record New Actuals" button to get started.'}
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 px-4 text-left">Period</th>
                      <th className="py-2 px-4 text-right">Revenue</th>
                      <th className="py-2 px-4 text-right">Costs</th>
                      <th className="py-2 px-4 text-right">Profit</th>
                      <th className="py-2 px-4 text-right">Margin</th>
                      {isWeeklyEvent && <th className="py-2 px-4 text-right">Attendance</th>}
                      <th className="py-2 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((period, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-4">{period.name}</td>
                        <td className="py-2 px-4 text-right">
                          {period.hasActuals ? formatCurrency(period.revenueActual) : '-'}
                        </td>
                        <td className="py-2 px-4 text-right">
                          {period.hasActuals ? formatCurrency(period.costActual) : '-'}
                        </td>
                        <td className={`py-2 px-4 text-right ${period.hasActuals && period.profitActual >= 0 ? 'text-green-600' : period.hasActuals ? 'text-red-600' : ''}`}>
                          {period.hasActuals ? formatCurrency(period.profitActual) : '-'}
                        </td>
                        <td className="py-2 px-4 text-right">
                          {period.hasActuals && period.revenueActual > 0 
                            ? formatPercent((period.profitActual / period.revenueActual) * 100) 
                            : '-'}
                        </td>
                        {isWeeklyEvent && (
                          <td className="py-2 px-4 text-right">
                            {period.hasActuals && period.attendanceActual !== undefined 
                              ? period.attendanceActual.toLocaleString() 
                              : '-'}
                          </td>
                        )}
                        <td className="py-2 px-4 text-center">
                          {period.hasActuals 
                            ? <Badge variant="success">Recorded</Badge>
                            : <Badge variant="outline">Missing</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </ContentCard>
        </TabsContent>
        
        <TabsContent value="revenue" className="space-y-6">
          <ChartContainer
            title="Revenue Actuals"
            description="Recorded revenue by period"
            height={400}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="revenueActual" 
                  name="Revenue" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
          
          <ContentCard title="Revenue Breakdown">
            <div className="space-y-4">
              {sortedActuals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {sortedActuals.map((actual, index) => (
                    <div key={index} className="border rounded-md p-4">
                      <h3 className="font-medium text-lg mb-3">{timeUnit} {actual.period}</h3>
                      
                      {Object.entries(actual.revenueActuals || {}).length > 0 ? (
                        <div className="space-y-2">
                          {Object.entries(actual.revenueActuals || {}).map(([key, value], idx) => (
                            <div key={idx} className="flex justify-between py-1 border-b">
                              <span>{key}</span>
                              <span className="font-medium">{formatCurrency(value)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between py-1 font-medium">
                            <span>Total</span>
                            <span>{formatCurrency(Object.values(actual.revenueActuals || {}).reduce((sum, val) => sum + val, 0))}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No revenue data recorded</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                  <TypographyH4>No Actuals Recorded</TypographyH4>
                  <TypographyMuted className="mt-2">
                    You haven't recorded any actual revenue data yet.
                  </TypographyMuted>
                </div>
              )}
            </div>
          </ContentCard>
        </TabsContent>
        
        <TabsContent value="costs" className="space-y-6">
          <ChartContainer
            title="Cost Actuals"
            description="Recorded costs by period"
            height={400}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="costActual" 
                  name="Costs" 
                  stroke="#EF4444" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
          
          <ContentCard title="Cost Breakdown">
            <div className="space-y-4">
              {sortedActuals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {sortedActuals.map((actual, index) => (
                    <div key={index} className="border rounded-md p-4">
                      <h3 className="font-medium text-lg mb-3">{timeUnit} {actual.period}</h3>
                      
                      {Object.entries(actual.costActuals || {}).length > 0 ? (
                        <div className="space-y-2">
                          {Object.entries(actual.costActuals || {}).map(([key, value], idx) => (
                            <div key={idx} className="flex justify-between py-1 border-b">
                              <span>{key}</span>
                              <span className="font-medium">{formatCurrency(value)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between py-1 font-medium">
                            <span>Total</span>
                            <span>{formatCurrency(Object.values(actual.costActuals || {}).reduce((sum, val) => sum + val, 0))}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No cost data recorded</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                  <TypographyH4>No Actuals Recorded</TypographyH4>
                  <TypographyMuted className="mt-2">
                    You haven't recorded any actual cost data yet.
                  </TypographyMuted>
                </div>
              )}
            </div>
          </ContentCard>
        </TabsContent>
        
        {isWeeklyEvent && (
          <TabsContent value="attendance" className="space-y-6">
            <ChartContainer
              title="Attendance Actuals"
              description="Recorded attendance by week"
              height={400}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="attendanceActual" 
                    name="Attendance" 
                    stroke="#6366F1" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
            
            <ContentCard title="Attendance Details">
              <div className="space-y-4">
                {sortedActuals.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2 px-4 text-left">Week</th>
                          <th className="py-2 px-4 text-right">Attendance</th>
                          <th className="py-2 px-4 text-right">Revenue Per Attendee</th>
                          <th className="py-2 px-4 text-right">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedActuals.map((actual, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-4">Week {actual.period}</td>
                            <td className="py-2 px-4 text-right">
                              {actual.attendanceActual !== undefined 
                                ? actual.attendanceActual.toLocaleString() 
                                : '-'}
                            </td>
                            <td className="py-2 px-4 text-right">
                              {actual.attendanceActual !== undefined && actual.attendanceActual > 0 
                                ? formatCurrency(
                                    Object.values(actual.revenueActuals || {}).reduce((sum, val) => sum + val, 0) / 
                                    actual.attendanceActual
                                  )
                                : '-'}
                            </td>
                            <td className="py-2 px-4 text-right">
                              {actual.notes || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                    <TypographyH4>No Attendance Data</TypographyH4>
                    <TypographyMuted className="mt-2">
                      You haven't recorded any attendance data yet.
                    </TypographyMuted>
                  </div>
                )}
              </div>
            </ContentCard>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default ProductActuals;
