import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FinancialModel } from '@/lib/db';
import useStore from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TypographyH4, TypographyMuted } from '@/components/ui/typography';
import ContentCard from '@/components/common/ContentCard';
import ChartContainer from '@/components/common/ChartContainer';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { AlertTriangle, Info, TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const ProductInputs: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentProject, loadModelsForProject } = useStore();
  const [models, setModels] = useState<FinancialModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('revenue');
  
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
    return <div className="py-8 text-center">Loading product inputs...</div>;
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
          This product doesn't have any forecasts yet. Create a forecast to see revenue and cost inputs.
        </TypographyMuted>
      </div>
    );
  }
  
  const { assumptions } = latestModel;
  const revenueStreams = assumptions.revenue || [];
  const costs = assumptions.costs || [];
  
  // Calculate totals
  const totalRevenue = revenueStreams.reduce((sum, stream) => sum + stream.value, 0);
  const totalCosts = costs.reduce((sum, cost) => sum + cost.value, 0);
  const totalProfit = totalRevenue - totalCosts;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  
  // Prepare data for charts
  const revenueData = revenueStreams.map(stream => ({
    name: stream.name,
    value: stream.value,
    percent: totalRevenue > 0 ? (stream.value / totalRevenue) * 100 : 0
  }));
  
  const costData = costs.map(cost => ({
    name: cost.name,
    value: cost.value,
    percent: totalCosts > 0 ? (cost.value / totalCosts) * 100 : 0
  }));
  
  // Group costs by category
  const costsByCategory = costs.reduce((acc, cost) => {
    const category = cost.category || 'other';
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += cost.value;
    return acc;
  }, {} as Record<string, number>);
  
  const costCategoryData = Object.entries(costsByCategory).map(([category, value]) => ({
    name: category.charAt(0).toUpperCase() + category.slice(1),
    value,
    percent: totalCosts > 0 ? (value / totalCosts) * 100 : 0
  }));
  
  const COLORS = ['#1A2942', '#3E5C89', '#10B981', '#334155', '#6366F1', '#EC4899', '#F59E0B', '#10B981'];
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-md shadow-md">
          <p className="font-medium">{payload[0].payload.name}</p>
          <p className="text-sm">{formatCurrency(payload[0].value)}</p>
          <p className="text-sm text-muted-foreground">{formatPercent(payload[0].payload.percent)}</p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ContentCard title="Total Revenue">
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">{formatCurrency(totalRevenue)}</div>
            <TrendingUp className="h-6 w-6 text-fortress-emerald" />
          </div>
        </ContentCard>
        
        <ContentCard title="Total Costs">
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">{formatCurrency(totalCosts)}</div>
            <TrendingDown className="h-6 w-6 text-red-500" />
          </div>
        </ContentCard>
        
        <ContentCard title="Profit Margin">
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">{formatPercent(profitMargin)}</div>
            {profitMargin >= 20 ? (
              <Badge variant="success">Healthy</Badge>
            ) : profitMargin > 0 ? (
              <Badge variant="warning">Low</Badge>
            ) : (
              <Badge variant="destructive">Negative</Badge>
            )}
          </div>
        </ContentCard>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="breakdown">Detailed Breakdown</TabsTrigger>
        </TabsList>
        
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartContainer
              title="Revenue Breakdown"
              description="By revenue stream"
              height={300}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={val => formatCurrency(val)} />
                  <YAxis type="category" dataKey="name" width={150} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
            
            <ChartContainer
              title="Revenue Distribution"
              description="Percentage of total revenue"
              height={300}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {revenueData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatCurrency(value as number), 'Revenue']} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
          
          <ContentCard title="Revenue Streams">
            <div className="space-y-4">
              {revenueStreams.map((stream, index) => (
                <div key={index} className="p-4 border rounded-md">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-lg">{stream.name}</h3>
                    <Badge variant={stream.type === 'fixed' ? 'outline' : 'default'} className="capitalize">
                      {stream.type}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Base Value</p>
                      <p className="font-medium">{formatCurrency(stream.value)}</p>
                    </div>
                    
                    {stream.frequency && (
                      <div>
                        <p className="text-sm text-muted-foreground">Frequency</p>
                        <p className="font-medium capitalize">{stream.frequency}</p>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-sm text-muted-foreground">% of Total Revenue</p>
                      <p className="font-medium">{formatPercent(stream.value / totalRevenue * 100)}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {revenueStreams.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  No revenue streams defined for this product.
                </div>
              )}
            </div>
          </ContentCard>
        </TabsContent>
        
        <TabsContent value="costs" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartContainer
              title="Cost Breakdown"
              description="By cost category"
              height={300}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={val => formatCurrency(val)} />
                  <YAxis type="category" dataKey="name" width={150} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#EF4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
            
            <ChartContainer
              title="Cost Distribution by Type"
              description="Grouped by category"
              height={300}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costCategoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {costCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatCurrency(value as number), 'Cost']} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
          
          <ContentCard title="Cost Categories">
            <div className="space-y-4">
              {costs.map((cost, index) => (
                <div key={index} className="p-4 border rounded-md">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-lg">{cost.name}</h3>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="capitalize">
                        {cost.category || 'Other'}
                      </Badge>
                      <Badge 
                        variant={cost.type === 'fixed' ? 'outline' : 'destructive'}
                        className={cost.type !== 'fixed' ? 'bg-red-100 text-red-800 hover:bg-red-100' : ''}
                      >
                        {cost.type}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Base Value</p>
                      <p className="font-medium">{formatCurrency(cost.value)}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">% of Total Costs</p>
                      <p className="font-medium">{formatPercent(cost.value / totalCosts * 100)}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">% of Total Revenue</p>
                      <p className="font-medium">{formatPercent(cost.value / totalRevenue * 100)}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {costs.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  No cost categories defined for this product.
                </div>
              )}
            </div>
          </ContentCard>
        </TabsContent>
        
        <TabsContent value="breakdown" className="space-y-6">
          <ContentCard title="Detailed Financial Breakdown">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 px-4 text-left">Item</th>
                    <th className="py-2 px-4 text-right">Value</th>
                    <th className="py-2 px-4 text-right">% of Category</th>
                    <th className="py-2 px-4 text-right">% of Revenue</th>
                    <th className="py-2 px-4 text-center">Type</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-gray-50 font-medium">
                    <td className="py-3 px-4" colSpan={5}>Revenue</td>
                  </tr>
                  
                  {revenueStreams.map((stream, index) => (
                    <tr key={`revenue-${index}`} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4">{stream.name}</td>
                      <td className="py-2 px-4 text-right">{formatCurrency(stream.value)}</td>
                      <td className="py-2 px-4 text-right">{formatPercent(stream.value / totalRevenue * 100)}</td>
                      <td className="py-2 px-4 text-right">{formatPercent(stream.value / totalRevenue * 100)}</td>
                      <td className="py-2 px-4 text-center">
                        <Badge variant="outline" className="capitalize">{stream.type}</Badge>
                      </td>
                    </tr>
                  ))}
                  
                  <tr className="bg-fortress-emerald/10 font-medium">
                    <td className="py-2 px-4">Total Revenue</td>
                    <td className="py-2 px-4 text-right">{formatCurrency(totalRevenue)}</td>
                    <td className="py-2 px-4 text-right">100%</td>
                    <td className="py-2 px-4 text-right">100%</td>
                    <td className="py-2 px-4 text-center">-</td>
                  </tr>
                  
                  <tr className="bg-gray-50 font-medium">
                    <td className="py-3 px-4" colSpan={5}>Costs</td>
                  </tr>
                  
                  {costs.map((cost, index) => (
                    <tr key={`cost-${index}`} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4">{cost.name}</td>
                      <td className="py-2 px-4 text-right">{formatCurrency(cost.value)}</td>
                      <td className="py-2 px-4 text-right">{formatPercent(cost.value / totalCosts * 100)}</td>
                      <td className="py-2 px-4 text-right">{formatPercent(cost.value / totalRevenue * 100)}</td>
                      <td className="py-2 px-4 text-center">
                        <Badge 
                          variant={cost.type === 'fixed' ? 'outline' : 'destructive'}
                          className={cost.type !== 'fixed' ? 'bg-red-100 text-red-800 hover:bg-red-100' : ''}
                        >
                          {cost.type}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  
                  <tr className="bg-red-100 font-medium">
                    <td className="py-2 px-4">Total Costs</td>
                    <td className="py-2 px-4 text-right">{formatCurrency(totalCosts)}</td>
                    <td className="py-2 px-4 text-right">100%</td>
                    <td className="py-2 px-4 text-right">{formatPercent(totalCosts / totalRevenue * 100)}</td>
                    <td className="py-2 px-4 text-center">-</td>
                  </tr>
                  
                  <tr className="bg-gray-50 font-medium">
                    <td className="py-3 px-4" colSpan={5}>Profit</td>
                  </tr>
                  
                  <tr className={`font-medium ${totalProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                    <td className="py-2 px-4">Total Profit</td>
                    <td className="py-2 px-4 text-right">{formatCurrency(totalProfit)}</td>
                    <td className="py-2 px-4 text-right">-</td>
                    <td className="py-2 px-4 text-right">{formatPercent(profitMargin)}</td>
                    <td className="py-2 px-4 text-center">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </ContentCard>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductInputs;
