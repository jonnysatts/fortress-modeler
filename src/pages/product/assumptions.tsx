import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FinancialModel } from '@/lib/db';
import useStore from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TypographyH4, TypographyMuted } from '@/components/ui/typography';
import ContentCard from '@/components/common/ContentCard';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';

const ProductAssumptions: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentProject, loadModelsForProject } = useStore();
  const [models, setModels] = useState<FinancialModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  
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
    return <div className="py-8 text-center">Loading product assumptions...</div>;
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
          This product doesn't have any forecasts yet. Create a forecast to see assumptions.
        </TypographyMuted>
      </div>
    );
  }
  
  const { assumptions } = latestModel;
  const metadata = assumptions.metadata || {};
  const isWeeklyEvent = metadata.type === 'WeeklyEvent';
  const growthModel = assumptions.growthModel || { type: 'linear', rate: 0 };
  
  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="general">General Assumptions</TabsTrigger>
          <TabsTrigger value="growth">Growth Model</TabsTrigger>
          {isWeeklyEvent && <TabsTrigger value="attendance">Attendance</TabsTrigger>}
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-6">
          <ContentCard title="Basic Assumptions">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Product Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label className="text-muted-foreground">Product Type</Label>
                    <span className="font-medium">{currentProject.productType}</span>
                  </div>
                  <div className="flex justify-between">
                    <Label className="text-muted-foreground">Target Audience</Label>
                    <span className="font-medium">{currentProject.targetAudience || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <Label className="text-muted-foreground">Forecast Name</Label>
                    <span className="font-medium">{latestModel.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <Label className="text-muted-foreground">Time Period</Label>
                    <span className="font-medium">
                      {isWeeklyEvent 
                        ? `${metadata.weeks || 12} Weeks` 
                        : '12 Months'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Financial Assumptions</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label className="text-muted-foreground">Growth Model</Label>
                    <span className="font-medium capitalize">{growthModel.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <Label className="text-muted-foreground">Growth Rate</Label>
                    <span className="font-medium">{formatPercent(growthModel.rate * 100)}</span>
                  </div>
                  <div className="flex justify-between">
                    <Label className="text-muted-foreground">Revenue Streams</Label>
                    <span className="font-medium">{assumptions.revenue?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <Label className="text-muted-foreground">Cost Categories</Label>
                    <span className="font-medium">{assumptions.costs?.length || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </ContentCard>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ContentCard title="Revenue Assumptions">
              <div className="space-y-4">
                {assumptions.revenue?.map((stream, index) => (
                  <div key={index} className="p-3 border rounded-md">
                    <div className="flex justify-between mb-1">
                      <h4 className="font-medium">{stream.name}</h4>
                      <Badge variant={stream.type === 'fixed' ? 'outline' : 'default'}>
                        {stream.type}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Base Value</span>
                      <span className="font-medium">{formatCurrency(stream.value)}</span>
                    </div>
                    {stream.frequency && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Frequency</span>
                        <span className="font-medium capitalize">{stream.frequency}</span>
                      </div>
                    )}
                  </div>
                ))}
                
                {(!assumptions.revenue || assumptions.revenue.length === 0) && (
                  <div className="text-center py-4 text-muted-foreground">
                    No revenue streams defined
                  </div>
                )}
              </div>
            </ContentCard>
            
            <ContentCard title="Cost Assumptions">
              <div className="space-y-4">
                {assumptions.costs?.map((cost, index) => (
                  <div key={index} className="p-3 border rounded-md">
                    <div className="flex justify-between mb-1">
                      <h4 className="font-medium">{cost.name}</h4>
                      <Badge 
                        variant={cost.type === 'fixed' ? 'outline' : 'destructive'}
                        className={cost.type !== 'fixed' ? 'bg-red-100 text-red-800 hover:bg-red-100' : ''}
                      >
                        {cost.type}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Base Value</span>
                      <span className="font-medium">{formatCurrency(cost.value)}</span>
                    </div>
                    {cost.category && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Category</span>
                        <span className="font-medium capitalize">{cost.category}</span>
                      </div>
                    )}
                  </div>
                ))}
                
                {(!assumptions.costs || assumptions.costs.length === 0) && (
                  <div className="text-center py-4 text-muted-foreground">
                    No cost categories defined
                  </div>
                )}
              </div>
            </ContentCard>
          </div>
        </TabsContent>
        
        <TabsContent value="growth" className="space-y-6">
          <ContentCard title="Growth Model Details">
            <div className="space-y-6">
              <div className="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-md">
                <Info className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
                <p className="text-blue-700 text-sm">
                  The growth model determines how revenue and other metrics change over time in your forecast.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Growth Model Configuration</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label className="text-muted-foreground">Model Type</Label>
                      <span className="font-medium capitalize">{growthModel.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <Label className="text-muted-foreground">Base Growth Rate</Label>
                      <span className="font-medium">{formatPercent(growthModel.rate * 100)}</span>
                    </div>
                    
                    {growthModel.type === 'seasonal' && growthModel.seasonalFactors && (
                      <div>
                        <Label className="text-muted-foreground block mb-2">Seasonal Factors</Label>
                        <div className="grid grid-cols-4 gap-2">
                          {growthModel.seasonalFactors.map((factor, index) => (
                            <div key={index} className="text-center p-2 border rounded-md">
                              <div className="text-xs text-muted-foreground">Period {index + 1}</div>
                              <div className="font-medium">{factor.toFixed(2)}x</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {isWeeklyEvent && metadata.growth && (
                  <div>
                    <h3 className="text-lg font-medium mb-4">Weekly Event Growth</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <Label className="text-muted-foreground">Attendance Growth</Label>
                        <span className="font-medium">{formatPercent(metadata.growth.attendanceGrowthRate)}</span>
                      </div>
                      
                      {metadata.growth.useCustomerSpendGrowth && (
                        <>
                          <div className="flex justify-between">
                            <Label className="text-muted-foreground">F&B Spend Growth</Label>
                            <span className="font-medium">{formatPercent(metadata.growth.fbSpendGrowth || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <Label className="text-muted-foreground">Merchandise Spend Growth</Label>
                            <span className="font-medium">{formatPercent(metadata.growth.merchandiseSpendGrowth || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <Label className="text-muted-foreground">Ticket Price Growth</Label>
                            <span className="font-medium">{formatPercent(metadata.growth.ticketPriceGrowth || 0)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-4">Growth Model Explanation</h3>
                <div className="space-y-4">
                  <div className="p-3 border rounded-md">
                    <h4 className="font-medium mb-2">Linear Growth</h4>
                    <p className="text-sm text-muted-foreground">
                      Linear growth adds a fixed percentage to the base value each period. For example, with a 5% growth rate, 
                      a $100 value would become $105 in period 2, $110 in period 3, and so on.
                    </p>
                  </div>
                  
                  <div className="p-3 border rounded-md">
                    <h4 className="font-medium mb-2">Exponential Growth</h4>
                    <p className="text-sm text-muted-foreground">
                      Exponential growth compounds each period. With a 5% growth rate, a $100 value would become $105 in period 2, 
                      $110.25 in period 3, and so on, as each period's growth is calculated on the previous period's value.
                    </p>
                  </div>
                  
                  <div className="p-3 border rounded-md">
                    <h4 className="font-medium mb-2">Seasonal Growth</h4>
                    <p className="text-sm text-muted-foreground">
                      Seasonal growth applies different multipliers to different periods to account for seasonal variations in your business.
                      This is useful for businesses with predictable busy and slow seasons.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ContentCard>
        </TabsContent>
        
        {isWeeklyEvent && (
          <TabsContent value="attendance" className="space-y-6">
            <ContentCard title="Attendance Assumptions">
              <div className="space-y-6">
                <div className="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <Info className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
                  <p className="text-blue-700 text-sm">
                    Attendance assumptions are used to calculate revenue for weekly events based on per-customer spending.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Attendance Metrics</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <Label className="text-muted-foreground">Initial Weekly Attendance</Label>
                        <span className="font-medium">{metadata.initialWeeklyAttendance?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <Label className="text-muted-foreground">Attendance Growth Rate</Label>
                        <span className="font-medium">{formatPercent(metadata.growth?.attendanceGrowthRate || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <Label className="text-muted-foreground">Number of Weeks</Label>
                        <span className="font-medium">{metadata.weeks || 12}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Per-Customer Spending</h3>
                    <div className="space-y-3">
                      {metadata.perCustomer?.ticketPrice && (
                        <div className="flex justify-between">
                          <Label className="text-muted-foreground">Ticket Price</Label>
                          <span className="font-medium">{formatCurrency(metadata.perCustomer.ticketPrice)}</span>
                        </div>
                      )}
                      {metadata.perCustomer?.fbSpend && (
                        <div className="flex justify-between">
                          <Label className="text-muted-foreground">F&B Spend</Label>
                          <span className="font-medium">{formatCurrency(metadata.perCustomer.fbSpend)}</span>
                        </div>
                      )}
                      {metadata.perCustomer?.merchandiseSpend && (
                        <div className="flex justify-between">
                          <Label className="text-muted-foreground">Merchandise Spend</Label>
                          <span className="font-medium">{formatCurrency(metadata.perCustomer.merchandiseSpend)}</span>
                        </div>
                      )}
                      {metadata.perCustomer?.onlineSpend && (
                        <div className="flex justify-between">
                          <Label className="text-muted-foreground">Online Spend</Label>
                          <span className="font-medium">{formatCurrency(metadata.perCustomer.onlineSpend)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Cost Assumptions</h3>
                  <div className="space-y-3">
                    {metadata.costs?.fbCOGSPercent && (
                      <div className="flex justify-between">
                        <Label className="text-muted-foreground">F&B COGS Percentage</Label>
                        <span className="font-medium">{formatPercent(metadata.costs.fbCOGSPercent)}</span>
                      </div>
                    )}
                    {metadata.costs?.staffCount && (
                      <div className="flex justify-between">
                        <Label className="text-muted-foreground">Staff Count</Label>
                        <span className="font-medium">{metadata.costs.staffCount}</span>
                      </div>
                    )}
                    {metadata.costs?.staffCostPerPerson && (
                      <div className="flex justify-between">
                        <Label className="text-muted-foreground">Staff Cost Per Person</Label>
                        <span className="font-medium">{formatCurrency(metadata.costs.staffCostPerPerson)}</span>
                      </div>
                    )}
                    {metadata.costs?.managementCosts && (
                      <div className="flex justify-between">
                        <Label className="text-muted-foreground">Management Costs</Label>
                        <span className="font-medium">{formatCurrency(metadata.costs.managementCosts)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ContentCard>
          </TabsContent>
        )}
        
        <TabsContent value="marketing" className="space-y-6">
          <ContentCard title="Marketing Assumptions">
            <div className="space-y-6">
              <div className="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-md">
                <Info className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
                <p className="text-blue-700 text-sm">
                  Marketing assumptions define how marketing budget is allocated and spent over the forecast period.
                </p>
              </div>
              
              {assumptions.marketing ? (
                <div>
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-4">Marketing Budget Allocation</h3>
                    <div className="p-3 border rounded-md">
                      <div className="flex justify-between mb-2">
                        <Label className="text-muted-foreground">Allocation Mode</Label>
                        <Badge variant="outline" className="capitalize">
                          {assumptions.marketing.allocationMode}
                        </Badge>
                      </div>
                      
                      {assumptions.marketing.allocationMode === 'highLevel' && (
                        <>
                          <div className="flex justify-between mb-2">
                            <Label className="text-muted-foreground">Total Budget</Label>
                            <span className="font-medium">{formatCurrency(assumptions.marketing.totalBudget || 0)}</span>
                          </div>
                          
                          {assumptions.marketing.budgetApplication && (
                            <div className="flex justify-between mb-2">
                              <Label className="text-muted-foreground">Budget Application</Label>
                              <span className="font-medium capitalize">{assumptions.marketing.budgetApplication.replace(/([A-Z])/g, ' $1')}</span>
                            </div>
                          )}
                          
                          {assumptions.marketing.spreadDuration && (
                            <div className="flex justify-between">
                              <Label className="text-muted-foreground">Spread Duration</Label>
                              <span className="font-medium">{assumptions.marketing.spreadDuration} periods</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  
                  {assumptions.marketing.allocationMode === 'channels' && assumptions.marketing.channels.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-4">Marketing Channels</h3>
                      <div className="space-y-3">
                        {assumptions.marketing.channels.map((channel, index) => (
                          <div key={index} className="p-3 border rounded-md">
                            <div className="flex justify-between mb-1">
                              <h4 className="font-medium">{channel.name}</h4>
                              <Badge variant="outline" className="capitalize">
                                {channel.channelType}
                              </Badge>
                            </div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground">Weekly Budget</span>
                              <span className="font-medium">{formatCurrency(channel.weeklyBudget)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Target Audience</span>
                              <span className="font-medium">{channel.targetAudience}</span>
                            </div>
                            {channel.description && (
                              <p className="text-sm text-muted-foreground mt-2">{channel.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                  <TypographyH4>No Marketing Assumptions</TypographyH4>
                  <TypographyMuted className="mt-2">
                    This product doesn't have any marketing assumptions defined.
                  </TypographyMuted>
                </div>
              )}
            </div>
          </ContentCard>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductAssumptions;
