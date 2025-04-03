import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FinancialModel } from '@/lib/db';
import useStore from '@/store/useStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TypographyH4, TypographyMuted } from '@/components/ui/typography';
import ContentCard from '@/components/common/ContentCard';
import ChartContainer from '@/components/common/ChartContainer';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { AlertTriangle, Info, TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

const ProductForecast: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentProject, loadModelsForProject } = useStore();
  const [models, setModels] = useState<FinancialModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('revenue');
  const [showCumulative, setShowCumulative] = useState(true);
  const [projectionPeriods, setProjectionPeriods] = useState(12);
  
  useEffect(() => {
    const loadData = async () => {
      if (id) {
        setIsLoading(true);
        try {
          const projectId = parseInt(id);
          const loadedModels = await loadModelsForProject(projectId);
          setModels(loadedModels);
        } catch (error) {
          console.error('Error loading data:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadData();
  }, [id, loadModelsForProject]);
  
  // Get the latest model
  const latestModel = models.length > 0 ? models[0] : null;
  
  if (isLoading) {
    return <div className="py-8 text-center">Loading forecast data...</div>;
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
          This product doesn't have any forecasts yet. Create a forecast to see projections.
        </TypographyMuted>
      </div>
    );
  }
  
  const { assumptions } = latestModel;
  const metadata = assumptions.metadata || {};
  const isWeeklyEvent = metadata.type === 'WeeklyEvent';
  const growthModel = assumptions.growthModel || { type: 'linear', rate: 0 };
  const revenueStreams = assumptions.revenue || [];
  const costs = assumptions.costs || [];
  
  // Generate forecast data
  const generateForecastData = () => {
    const periods = [];
    const timeUnit = isWeeklyEvent ? 'Week' : 'Month';
    const duration = isWeeklyEvent ? metadata.weeks || 12 : projectionPeriods;
    
    let cumulativeRevenue = 0;
    let cumulativeCosts = 0;
    let cumulativeProfit = 0;
    
    for (let period = 1; period <= duration; period++) {
      // Calculate revenue for this period
      let periodRevenue = 0;
      let periodCosts = 0;
      
      // Calculate revenue based on growth model
      revenueStreams.forEach(stream => {
        let streamRevenue = stream.value;
        
        if (period > 1) {
          if (growthModel.type === 'linear') {
            streamRevenue = stream.value * (1 + growthModel.rate * (period - 1));
          } else if (growthModel.type === 'exponential') {
            streamRevenue = stream.value * Math.pow(1 + growthModel.rate, period - 1);
          }
          // Add seasonal logic if needed
        }
        
        periodRevenue += streamRevenue;
      });
      
      // Calculate costs
      costs.forEach(cost => {
        let costValue = cost.value;
        
        // Fixed costs are typically one-time
        if (cost.type === 'fixed' && period > 1) {
          costValue = 0;
        }
        
        periodCosts += costValue;
      });
      
      const periodProfit = periodRevenue - periodCosts;
      
      cumulativeRevenue += periodRevenue;
      cumulativeCosts += periodCosts;
      cumulativeProfit += periodProfit;
      
      periods.push({
        period,
        name: `${timeUnit} ${period}`,
        revenue: Math.round(periodRevenue),
        costs: Math.round(periodCosts),
        profit: Math.round(periodProfit),
        cumulativeRevenue: Math.round(cumulativeRevenue),
        cumulativeCosts: Math.round(cumulativeCosts),
        cumulativeProfit: Math.round(cumulativeProfit)
      });
    }
    
    return periods;
  };
  
  const forecastData = generateForecastData();
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-md shadow-md">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
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
          <TypographyH4>Financial Forecast</TypographyH4>
          <TypographyMuted>
            Projected financial performance over {isWeeklyEvent ? metadata.weeks || 12 : projectionPeriods} {isWeeklyEvent ? 'weeks' : 'months'}
          </TypographyMuted>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="cumulative"
              checked={showCumulative}
              onCheckedChange={setShowCumulative}
            />
            <Label htmlFor="cumulative">Cumulative</Label>
          </div>
          
          {!isWeeklyEvent && (
            <select
              className="border rounded-md px-2 py-1"
              value={projectionPeriods}
              onChange={(e) => setProjectionPeriods(parseInt(e.target.value))}
            >
              <option value="6">6 Months</option>
              <option value="12">12 Months</option>
              <option value="24">24 Months</option>
              <option value="36">36 Months</option>
            </select>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ContentCard title="Total Revenue">
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">
              {formatCurrency(forecastData[forecastData.length - 1][showCumulative ? 'cumulativeRevenue' : 'revenue'])}
            </div>
            <TrendingUp className="h-6 w-6 text-fortress-emerald" />
          </div>
          <TypographyMuted className="text-xs mt-1">
            {showCumulative ? 'Cumulative' : 'Final period'} revenue
          </TypographyMuted>
        </ContentCard>
        
        <ContentCard title="Total Costs">
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">
              {formatCurrency(forecastData[forecastData.length - 1][showCumulative ? 'cumulativeCosts' : 'costs'])}
            </div>
            <TrendingDown className="h-6 w-6 text-red-500" />
          </div>
          <TypographyMuted className="text-xs mt-1">
            {showCumulative ? 'Cumulative' : 'Final period'} costs
          </TypographyMuted>
        </ContentCard>
        
        <ContentCard title="Profit">
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">
              {formatCurrency(forecastData[forecastData.length - 1][showCumulative ? 'cumulativeProfit' : 'profit'])}
            </div>
            {forecastData[forecastData.length - 1][showCumulative ? 'cumulativeProfit' : 'profit'] >= 0 ? (
              <Badge variant="success">Profitable</Badge>
            ) : (
              <Badge variant="destructive">Loss</Badge>
            )}
          </div>
          <TypographyMuted className="text-xs mt-1">
            {showCumulative ? 'Cumulative' : 'Final period'} profit
          </TypographyMuted>
        </ContentCard>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="profit">Profit</TabsTrigger>
          <TabsTrigger value="combined">Combined</TabsTrigger>
        </TabsList>
        
        <TabsContent value="revenue" className="space-y-6">
          <ChartContainer
            title="Revenue Forecast"
            description={`${showCumulative ? 'Cumulative' : 'Period-by-period'} revenue projection`}
            height={400}
          >
            <ResponsiveContainer width="100%" height="100%">
              {showCumulative ? (
                <AreaChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="cumulativeRevenue" 
                    name="Revenue" 
                    stroke="#10B981" 
                    fill="#10B981" 
                    fillOpacity={0.3} 
                  />
                </AreaChart>
              ) : (
                <BarChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" name="Revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </ChartContainer>
          
          <ContentCard title="Revenue Growth Analysis">
            <div className="space-y-4">
              <div className="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-md">
                <Info className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
                <p className="text-blue-700 text-sm">
                  This forecast uses a {growthModel.type} growth model with a rate of {formatPercent(growthModel.rate * 100)}.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Revenue Streams</h3>
                  <ul className="space-y-2">
                    {revenueStreams.map((stream, index) => (
                      <li key={index} className="flex justify-between p-2 border-b">
                        <span>{stream.name}</span>
                        <span className="font-medium">{formatCurrency(stream.value)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Growth Metrics</h3>
                  <ul className="space-y-2">
                    <li className="flex justify-between p-2 border-b">
                      <span>Initial Revenue</span>
                      <span className="font-medium">{formatCurrency(forecastData[0].revenue)}</span>
                    </li>
                    <li className="flex justify-between p-2 border-b">
                      <span>Final Revenue</span>
                      <span className="font-medium">{formatCurrency(forecastData[forecastData.length - 1].revenue)}</span>
                    </li>
                    <li className="flex justify-between p-2 border-b">
                      <span>Growth Multiple</span>
                      <span className="font-medium">
                        {(forecastData[forecastData.length - 1].revenue / forecastData[0].revenue).toFixed(2)}x
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </ContentCard>
        </TabsContent>
        
        <TabsContent value="costs" className="space-y-6">
          <ChartContainer
            title="Cost Forecast"
            description={`${showCumulative ? 'Cumulative' : 'Period-by-period'} cost projection`}
            height={400}
          >
            <ResponsiveContainer width="100%" height="100%">
              {showCumulative ? (
                <AreaChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="cumulativeCosts" 
                    name="Costs" 
                    stroke="#EF4444" 
                    fill="#EF4444" 
                    fillOpacity={0.3} 
                  />
                </AreaChart>
              ) : (
                <BarChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="costs" name="Costs" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </ChartContainer>
          
          <ContentCard title="Cost Analysis">
            <div className="space-y-4">
              <div className="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-md">
                <Info className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
                <p className="text-blue-700 text-sm">
                  Fixed costs are typically one-time expenses, while variable costs recur in each period.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Cost Categories</h3>
                  <ul className="space-y-2">
                    {costs.map((cost, index) => (
                      <li key={index} className="flex justify-between p-2 border-b">
                        <div>
                          <span>{cost.name}</span>
                          <Badge 
                            variant={cost.type === 'fixed' ? 'outline' : 'destructive'}
                            className={`ml-2 ${cost.type !== 'fixed' ? 'bg-red-100 text-red-800 hover:bg-red-100' : ''}`}
                          >
                            {cost.type}
                          </Badge>
                        </div>
                        <span className="font-medium">{formatCurrency(cost.value)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Cost Metrics</h3>
                  <ul className="space-y-2">
                    <li className="flex justify-between p-2 border-b">
                      <span>Initial Costs</span>
                      <span className="font-medium">{formatCurrency(forecastData[0].costs)}</span>
                    </li>
                    <li className="flex justify-between p-2 border-b">
                      <span>Final Period Costs</span>
                      <span className="font-medium">{formatCurrency(forecastData[forecastData.length - 1].costs)}</span>
                    </li>
                    <li className="flex justify-between p-2 border-b">
                      <span>Total Costs</span>
                      <span className="font-medium">{formatCurrency(forecastData[forecastData.length - 1].cumulativeCosts)}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </ContentCard>
        </TabsContent>
        
        <TabsContent value="profit" className="space-y-6">
          <ChartContainer
            title="Profit Forecast"
            description={`${showCumulative ? 'Cumulative' : 'Period-by-period'} profit projection`}
            height={400}
          >
            <ResponsiveContainer width="100%" height="100%">
              {showCumulative ? (
                <AreaChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="cumulativeProfit" 
                    name="Profit" 
                    stroke="#1A2942" 
                    fill="#1A2942" 
                    fillOpacity={0.3} 
                  />
                </AreaChart>
              ) : (
                <BarChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="profit" 
                    name="Profit" 
                    fill={(entry) => entry.profit >= 0 ? "#10B981" : "#EF4444"}
                    radius={[4, 4, 0, 0]} 
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </ChartContainer>
          
          <ContentCard title="Profitability Analysis">
            <div className="space-y-4">
              {/* Find breakeven point */}
              {(() => {
                const breakevenPeriod = forecastData.findIndex(d => d.cumulativeProfit >= 0) + 1;
                return (
                  <div className={`flex items-center p-4 ${breakevenPeriod > 0 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'} rounded-md`}>
                    {breakevenPeriod > 0 ? (
                      <>
                        <Info className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <p className="text-green-700 text-sm">
                          This product reaches breakeven in {isWeeklyEvent ? 'Week' : 'Month'} {breakevenPeriod}.
                        </p>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-5 w-5 text-amber-500 mr-3 flex-shrink-0" />
                        <p className="text-amber-700 text-sm">
                          This product does not reach breakeven within the forecast period.
                        </p>
                      </>
                    )}
                  </div>
                );
              })()}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Profit Metrics</h3>
                  <ul className="space-y-2">
                    <li className="flex justify-between p-2 border-b">
                      <span>Initial Profit</span>
                      <span className={`font-medium ${forecastData[0].profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(forecastData[0].profit)}
                      </span>
                    </li>
                    <li className="flex justify-between p-2 border-b">
                      <span>Final Period Profit</span>
                      <span className={`font-medium ${forecastData[forecastData.length - 1].profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(forecastData[forecastData.length - 1].profit)}
                      </span>
                    </li>
                    <li className="flex justify-between p-2 border-b">
                      <span>Total Profit</span>
                      <span className={`font-medium ${forecastData[forecastData.length - 1].cumulativeProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(forecastData[forecastData.length - 1].cumulativeProfit)}
                      </span>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Profit Margins</h3>
                  <ul className="space-y-2">
                    <li className="flex justify-between p-2 border-b">
                      <span>Initial Profit Margin</span>
                      <span className={`font-medium ${forecastData[0].profit / forecastData[0].revenue >= 0.2 ? 'text-green-600' : 'text-amber-600'}`}>
                        {formatPercent(forecastData[0].profit / forecastData[0].revenue * 100)}
                      </span>
                    </li>
                    <li className="flex justify-between p-2 border-b">
                      <span>Final Profit Margin</span>
                      <span className={`font-medium ${forecastData[forecastData.length - 1].profit / forecastData[forecastData.length - 1].revenue >= 0.2 ? 'text-green-600' : 'text-amber-600'}`}>
                        {formatPercent(forecastData[forecastData.length - 1].profit / forecastData[forecastData.length - 1].revenue * 100)}
                      </span>
                    </li>
                    <li className="flex justify-between p-2 border-b">
                      <span>Average Profit Margin</span>
                      <span className={`font-medium ${forecastData[forecastData.length - 1].cumulativeProfit / forecastData[forecastData.length - 1].cumulativeRevenue >= 0.2 ? 'text-green-600' : 'text-amber-600'}`}>
                        {formatPercent(forecastData[forecastData.length - 1].cumulativeProfit / forecastData[forecastData.length - 1].cumulativeRevenue * 100)}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </ContentCard>
        </TabsContent>
        
        <TabsContent value="combined" className="space-y-6">
          <ChartContainer
            title="Combined Financial Forecast"
            description={`${showCumulative ? 'Cumulative' : 'Period-by-period'} financial projection`}
            height={400}
          >
            <ResponsiveContainer width="100%" height="100%">
              {showCumulative ? (
                <LineChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="cumulativeRevenue" 
                    name="Revenue" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cumulativeCosts" 
                    name="Costs" 
                    stroke="#EF4444" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cumulativeProfit" 
                    name="Profit" 
                    stroke="#1A2942" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              ) : (
                <LineChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    name="Revenue" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="costs" 
                    name="Costs" 
                    stroke="#EF4444" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="profit" 
                    name="Profit" 
                    stroke="#1A2942" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </ChartContainer>
          
          <ContentCard title="Financial Summary">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 px-4 text-left">Period</th>
                    <th className="py-2 px-4 text-right">Revenue</th>
                    <th className="py-2 px-4 text-right">Costs</th>
                    <th className="py-2 px-4 text-right">Profit</th>
                    <th className="py-2 px-4 text-right">Margin</th>
                    {showCumulative && (
                      <>
                        <th className="py-2 px-4 text-right">Cum. Revenue</th>
                        <th className="py-2 px-4 text-right">Cum. Costs</th>
                        <th className="py-2 px-4 text-right">Cum. Profit</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {forecastData.map((period, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4">{period.name}</td>
                      <td className="py-2 px-4 text-right">{formatCurrency(period.revenue)}</td>
                      <td className="py-2 px-4 text-right">{formatCurrency(period.costs)}</td>
                      <td className={`py-2 px-4 text-right ${period.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(period.profit)}
                      </td>
                      <td className="py-2 px-4 text-right">
                        {formatPercent((period.profit / period.revenue) * 100)}
                      </td>
                      {showCumulative && (
                        <>
                          <td className="py-2 px-4 text-right">{formatCurrency(period.cumulativeRevenue)}</td>
                          <td className="py-2 px-4 text-right">{formatCurrency(period.cumulativeCosts)}</td>
                          <td className={`py-2 px-4 text-right ${period.cumulativeProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(period.cumulativeProfit)}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ContentCard>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductForecast;
