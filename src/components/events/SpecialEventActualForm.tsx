import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import {
  useSpecialEventActuals,
  useCreateSpecialEventActual,
  useUpdateSpecialEventActual,
  useSpecialEventForecasts,
} from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { sanitizeNumericInput, sanitizeTextInput } from '@/lib/security';
import { toast } from 'sonner';
import { 
  DollarSign, 
  Users, 
  Megaphone, 
  Calculator, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle,
  BarChart3,
  Target,
  Star,
  Calendar,
  MessageSquare
} from 'lucide-react';

interface SpecialEventActualFormProps {
  projectId: string;
}

// Enhanced schema for comprehensive actuals tracking
const actualSchema = z.object({
  // Actual revenue streams
  actual_ticket_sales: z.number().min(0).optional(),
  actual_fnb_revenue: z.number().min(0).optional(),
  actual_fnb_cogs: z.number().min(0).optional(),
  actual_merch_revenue: z.number().min(0).optional(),
  actual_merch_cogs: z.number().min(0).optional(),
  actual_sponsorship_income: z.number().min(0).optional(),
  actual_other_income: z.number().min(0).optional(),
  
  // Actual cost breakdown
  actual_staffing_costs: z.number().min(0).optional(),
  actual_venue_costs: z.number().min(0).optional(),
  actual_vendor_costs: z.number().min(0).optional(),
  actual_marketing_costs: z.number().min(0).optional(),
  actual_production_costs: z.number().min(0).optional(),
  actual_other_costs: z.number().min(0).optional(),
  
  // Marketing performance
  marketing_email_performance: z.string().max(500).optional(),
  marketing_social_performance: z.string().max(500).optional(),
  marketing_influencer_performance: z.string().max(500).optional(),
  marketing_paid_ads_performance: z.string().max(500).optional(),
  marketing_content_performance: z.string().max(500).optional(),
  marketing_roi_notes: z.string().max(1000).optional(),
  
  // Event metrics
  actual_attendance: z.number().min(0).optional(),
  attendance_breakdown: z.string().max(500).optional(),
  average_ticket_price: z.number().min(0).optional(),
  
  // Success indicators
  success_rating: z.number().min(1).max(10).optional(),
  event_success_indicators: z.string().max(1000).optional(),
  challenges_faced: z.string().max(1000).optional(),
  lessons_learned: z.string().max(1000).optional(),
  recommendations_future: z.string().max(1000).optional(),
  
  // Post-event analysis
  customer_feedback_summary: z.string().max(1000).optional(),
  team_feedback: z.string().max(1000).optional(),
  vendor_feedback: z.string().max(1000).optional(),
  
  // Additional metrics
  social_media_engagement: z.string().max(500).optional(),
  press_coverage: z.string().max(500).optional(),
  brand_impact_assessment: z.string().max(1000).optional(),
  
  // Notes
  revenue_variance_notes: z.string().max(500).optional(),
  cost_variance_notes: z.string().max(500).optional(),
  general_notes: z.string().max(1000).optional(),
});

type ActualFormData = z.infer<typeof actualSchema>;

export const SpecialEventActualForm: React.FC<SpecialEventActualFormProps> = ({
  projectId,
}) => {
  const navigate = useNavigate();
  const { data: actuals = [] } = useSpecialEventActuals(projectId);
  const { data: forecasts = [] } = useSpecialEventForecasts(projectId);
  const createActual = useCreateSpecialEventActual();
  const updateActual = useUpdateSpecialEventActual();
  const [activeTab, setActiveTab] = useState('overview');

  const existing = actuals[0];
  const forecast = forecasts[0];

  const form = useForm<ActualFormData>({
    resolver: zodResolver(actualSchema),
    defaultValues: {},
  });

  const watchedValues = form.watch();
  const [hasInitialized, setHasInitialized] = useState(false);
  const [lastResetData, setLastResetData] = useState<any>(null);

  // Calculate actuals
  const totalActualRevenue = (watchedValues.actual_ticket_sales || 0) +
    (watchedValues.actual_fnb_revenue || 0) +
    (watchedValues.actual_merch_revenue || 0) +
    (watchedValues.actual_sponsorship_income || 0) +
    (watchedValues.actual_other_income || 0);

  const totalActualCosts = (watchedValues.actual_staffing_costs || 0) +
    (watchedValues.actual_venue_costs || 0) +
    (watchedValues.actual_vendor_costs || 0) +
    (watchedValues.actual_marketing_costs || 0) +
    (watchedValues.actual_production_costs || 0) +
    (watchedValues.actual_other_costs || 0);

  const actualNetProfit = totalActualRevenue - totalActualCosts;
  const actualProfitMargin = totalActualRevenue > 0 ? (actualNetProfit / totalActualRevenue) * 100 : 0;

  // Calculate forecast comparison if available
  const forecastRevenue = forecast ? (
    (forecast.forecast_ticket_sales || 0) +
    (forecast.forecast_fnb_revenue || 0) +
    (forecast.forecast_merch_revenue || 0) +
    (forecast.forecast_sponsorship_income || 0) +
    (forecast.forecast_other_income || 0)
  ) : 0;

  const forecastCosts = forecast ? (
    (forecast.forecast_staffing_costs || 0) +
    (forecast.forecast_venue_costs || 0) +
    (forecast.forecast_vendor_costs || 0) +
    (forecast.forecast_marketing_costs || 0) +
    (forecast.forecast_production_costs || 0) +
    (forecast.forecast_other_costs || 0)
  ) : 0;

  const forecastNetProfit = forecastRevenue - forecastCosts;

  // Variance calculations
  const revenueVariance = totalActualRevenue - forecastRevenue;
  const costVariance = totalActualCosts - forecastCosts;
  const profitVariance = actualNetProfit - forecastNetProfit;

  const revenueVariancePercent = forecastRevenue > 0 ? (revenueVariance / forecastRevenue) * 100 : 0;
  const costVariancePercent = forecastCosts > 0 ? (costVariance / forecastCosts) * 100 : 0;
  const profitVariancePercent = forecastNetProfit !== 0 ? (profitVariance / Math.abs(forecastNetProfit)) * 100 : 0;

  // Only reset form when we have new data that's different from what we last reset with
  useEffect(() => {
    if (existing && (!hasInitialized || (existing.id !== lastResetData?.id))) {
      const formData = { ...existing };
      form.reset(formData);
      setHasInitialized(true);
      setLastResetData(formData);
    }
  }, [existing, form, hasInitialized, lastResetData]);

  // Reset initialization flag on project change
  useEffect(() => {
    setHasInitialized(false);
    setLastResetData(null);
  }, [projectId]);

  const onSubmit = async (data: ActualFormData) => {
    try {
      const sanitized: Partial<ActualFormData> = Object.entries(data).reduce(
        (acc, [key, value]) => {
          if (typeof value === 'number') {
            acc[key as keyof ActualFormData] = sanitizeNumericInput(value) as any;
          } else if (typeof value === 'string') {
            acc[key as keyof ActualFormData] = sanitizeTextInput(value) as any;
          }
          return acc;
        },
        {} as Partial<ActualFormData>
      );

      if (existing) {
        const result = await updateActual.mutateAsync({ id: existing.id, data: sanitized });
        // Update our tracking data so we don't reset the form when the cache updates
        setLastResetData({ ...result });
        toast.success('Actuals updated successfully!');
      } else {
        const result = await createActual.mutateAsync({ project_id: projectId, ...sanitized });
        setLastResetData({ ...result });
        toast.success('Actuals submitted successfully!');
      }
      
      navigate(`/projects/${projectId}`);
    } catch (error) {
      console.error('Error saving actuals:', error);
      toast.error('Failed to save actuals', {
        description: 'There was an error saving the special event actuals.',
      });
    }
  };

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;
  const formatVariance = (variance: number, percent: number) => {
    const sign = variance >= 0 ? '+' : '';
    const color = variance >= 0 ? 'text-green-600' : 'text-red-600';
    return (
      <span className={color}>
        {sign}{formatCurrency(variance)} ({sign}{percent.toFixed(1)}%)
      </span>
    );
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (variance < 0) return <AlertTriangle className="w-4 h-4 text-red-600" />;
    return <CheckCircle className="w-4 h-4 text-blue-600" />;
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {existing && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Actuals have been submitted for this event. You can still update them if needed.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-1">
            <BarChart3 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="revenue" className="flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="costs" className="flex items-center gap-1">
            <Calculator className="w-4 h-4" />
            Costs
          </TabsTrigger>
          <TabsTrigger value="marketing" className="flex items-center gap-1">
            <Megaphone className="w-4 h-4" />
            Marketing
          </TabsTrigger>
          <TabsTrigger value="success" className="flex items-center gap-1">
            <Target className="w-4 h-4" />
            Success
          </TabsTrigger>
          <TabsTrigger value="feedback" className="flex items-center gap-1">
            <MessageSquare className="w-4 h-4" />
            Feedback
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Event Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalActualRevenue)}
                  </div>
                  <div className="text-sm text-green-600">Actual Revenue</div>
                  {forecast && (
                    <div className="text-xs text-gray-600 mt-1">
                      vs {formatCurrency(forecastRevenue)} forecast
                    </div>
                  )}
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(totalActualCosts)}
                  </div>
                  <div className="text-sm text-red-600">Actual Costs</div>
                  {forecast && (
                    <div className="text-xs text-gray-600 mt-1">
                      vs {formatCurrency(forecastCosts)} forecast
                    </div>
                  )}
                </div>
                <div className={`text-center p-4 rounded-lg ${actualNetProfit >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                  <div className={`text-2xl font-bold ${actualNetProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {formatCurrency(actualNetProfit)}
                  </div>
                  <div className={`text-sm ${actualNetProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    Net Profit
                  </div>
                  {forecast && (
                    <div className="text-xs text-gray-600 mt-1">
                      vs {formatCurrency(forecastNetProfit)} forecast
                    </div>
                  )}
                </div>
              </div>

              {forecast && (
                <>
                  <Separator className="my-6" />
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Forecast vs Actual Analysis</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          {getVarianceIcon(revenueVariance)}
                          <h4 className="font-semibold">Revenue Variance</h4>
                        </div>
                        <div className="text-lg">
                          {formatVariance(revenueVariance, revenueVariancePercent)}
                        </div>
                        <Progress 
                          value={Math.min(Math.abs(revenueVariancePercent), 100)} 
                          className="mt-2"
                        />
                      </Card>
                      
                      <Card className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          {getVarianceIcon(-costVariance)}
                          <h4 className="font-semibold">Cost Variance</h4>
                        </div>
                        <div className="text-lg">
                          {formatVariance(costVariance, costVariancePercent)}
                        </div>
                        <Progress 
                          value={Math.min(Math.abs(costVariancePercent), 100)} 
                          className="mt-2"
                        />
                      </Card>
                      
                      <Card className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          {getVarianceIcon(profitVariance)}
                          <h4 className="font-semibold">Profit Variance</h4>
                        </div>
                        <div className="text-lg">
                          {formatVariance(profitVariance, profitVariancePercent)}
                        </div>
                        <Progress 
                          value={Math.min(Math.abs(profitVariancePercent), 100)} 
                          className="mt-2"
                        />
                      </Card>
                    </div>
                  </div>
                </>
              )}

              <Separator className="my-6" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Event Metrics</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Actual Attendance:</span>
                      <Badge variant="secondary">
                        {watchedValues.actual_attendance || 0} people
                      </Badge>
                    </div>
                    {forecast?.estimated_attendance && (
                      <div className="flex justify-between">
                        <span>Attendance vs Forecast:</span>
                        <Badge variant={
                          (watchedValues.actual_attendance || 0) >= forecast.estimated_attendance 
                            ? "default" 
                            : "destructive"
                        }>
                          {((watchedValues.actual_attendance || 0) - forecast.estimated_attendance)} people
                        </Badge>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Profit Margin:</span>
                      <Badge variant="outline">{actualProfitMargin.toFixed(1)}%</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Revenue per Attendee:</span>
                      <Badge variant="secondary">
                        {watchedValues.actual_attendance ? formatCurrency(totalActualRevenue / watchedValues.actual_attendance) : '$0'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-4">Success Rating</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium" htmlFor="success_rating">
                        Overall Success Rating (1-10)
                      </label>
                      <Input 
                        id="success_rating" 
                        type="number" 
                        min="1" 
                        max="10"
                        step="1"
                        placeholder="Rate from 1-10"
                        {...form.register('success_rating', { valueAsNumber: true })} 
                      />
                    </div>
                    {watchedValues.success_rating && (
                      <div className="flex items-center gap-2">
                        {[...Array(10)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-5 h-5 ${
                              i < watchedValues.success_rating! 
                                ? 'text-yellow-400 fill-yellow-400' 
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Actual Revenue Streams
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Primary Revenue</h3>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="actual_ticket_sales">
                      Actual Ticket Sales
                    </label>
                    <Input 
                      id="actual_ticket_sales" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      {...form.register('actual_ticket_sales', { valueAsNumber: true })} 
                    />
                    {forecast?.forecast_ticket_sales && (
                      <p className="text-xs text-gray-500 mt-1">
                        Forecast: {formatCurrency(forecast.forecast_ticket_sales)}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="actual_fnb_revenue">
                      Actual F&B Revenue
                    </label>
                    <Input 
                      id="actual_fnb_revenue" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      {...form.register('actual_fnb_revenue', { valueAsNumber: true })} 
                    />
                    {forecast?.forecast_fnb_revenue && (
                      <p className="text-xs text-gray-500 mt-1">
                        Forecast: {formatCurrency(forecast.forecast_fnb_revenue)}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="actual_fnb_cogs">
                      Actual F&B COGS
                    </label>
                    <Input 
                      id="actual_fnb_cogs" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      {...form.register('actual_fnb_cogs', { valueAsNumber: true })} 
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="actual_merch_revenue">
                      Actual Merchandise Revenue
                    </label>
                    <Input 
                      id="actual_merch_revenue" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      {...form.register('actual_merch_revenue', { valueAsNumber: true })} 
                    />
                    {forecast?.forecast_merch_revenue && (
                      <p className="text-xs text-gray-500 mt-1">
                        Forecast: {formatCurrency(forecast.forecast_merch_revenue)}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="actual_merch_cogs">
                      Actual Merchandise COGS
                    </label>
                    <Input 
                      id="actual_merch_cogs" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      {...form.register('actual_merch_cogs', { valueAsNumber: true })} 
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Additional Revenue</h3>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="actual_sponsorship_income">
                      Actual Sponsorship Income
                    </label>
                    <Input 
                      id="actual_sponsorship_income" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      {...form.register('actual_sponsorship_income', { valueAsNumber: true })} 
                    />
                    {forecast?.forecast_sponsorship_income && (
                      <p className="text-xs text-gray-500 mt-1">
                        Forecast: {formatCurrency(forecast.forecast_sponsorship_income)}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="actual_other_income">
                      Other Actual Income
                    </label>
                    <Input 
                      id="actual_other_income" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      {...form.register('actual_other_income', { valueAsNumber: true })} 
                    />
                    {forecast?.forecast_other_income && (
                      <p className="text-xs text-gray-500 mt-1">
                        Forecast: {formatCurrency(forecast.forecast_other_income)}
                      </p>
                    )}
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-800">Total Actual Revenue</h4>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(totalActualRevenue)}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="revenue_variance_notes">
                      Revenue Variance Notes
                    </label>
                    <Textarea 
                      id="revenue_variance_notes" 
                      placeholder="Explain any significant variances from forecast..."
                      {...form.register('revenue_variance_notes')} 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Actual Costs Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Operational Costs</h3>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="actual_staffing_costs">
                      Actual Staffing Costs
                    </label>
                    <Input 
                      id="actual_staffing_costs" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      {...form.register('actual_staffing_costs', { valueAsNumber: true })} 
                    />
                    {forecast?.forecast_staffing_costs && (
                      <p className="text-xs text-gray-500 mt-1">
                        Forecast: {formatCurrency(forecast.forecast_staffing_costs)}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="actual_venue_costs">
                      Actual Venue & Setup Costs
                    </label>
                    <Input 
                      id="actual_venue_costs" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      {...form.register('actual_venue_costs', { valueAsNumber: true })} 
                    />
                    {forecast?.forecast_venue_costs && (
                      <p className="text-xs text-gray-500 mt-1">
                        Forecast: {formatCurrency(forecast.forecast_venue_costs)}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="actual_vendor_costs">
                      Actual External Vendor Costs
                    </label>
                    <Input 
                      id="actual_vendor_costs" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      {...form.register('actual_vendor_costs', { valueAsNumber: true })} 
                    />
                    {forecast?.forecast_vendor_costs && (
                      <p className="text-xs text-gray-500 mt-1">
                        Forecast: {formatCurrency(forecast.forecast_vendor_costs)}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Additional Costs</h3>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="actual_marketing_costs">
                      Actual Marketing Costs
                    </label>
                    <Input 
                      id="actual_marketing_costs" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      {...form.register('actual_marketing_costs', { valueAsNumber: true })} 
                    />
                    {forecast?.forecast_marketing_costs && (
                      <p className="text-xs text-gray-500 mt-1">
                        Forecast: {formatCurrency(forecast.forecast_marketing_costs)}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="actual_production_costs">
                      Actual Production Costs
                    </label>
                    <Input 
                      id="actual_production_costs" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      {...form.register('actual_production_costs', { valueAsNumber: true })} 
                    />
                    {forecast?.forecast_production_costs && (
                      <p className="text-xs text-gray-500 mt-1">
                        Forecast: {formatCurrency(forecast.forecast_production_costs)}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="actual_other_costs">
                      Other Actual Costs
                    </label>
                    <Input 
                      id="actual_other_costs" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      {...form.register('actual_other_costs', { valueAsNumber: true })} 
                    />
                  </div>
                  
                  <div className="p-4 bg-red-50 rounded-lg">
                    <h4 className="font-semibold text-red-800">Total Actual Costs</h4>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(totalActualCosts)}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="cost_variance_notes">
                      Cost Variance Notes
                    </label>
                    <Textarea 
                      id="cost_variance_notes" 
                      placeholder="Explain any significant cost variances..."
                      {...form.register('cost_variance_notes')} 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Marketing Tab */}
        <TabsContent value="marketing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="w-5 h-5" />
                Marketing Performance Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Channel Performance</h3>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="marketing_email_performance">
                      Email Marketing Performance
                    </label>
                    <Textarea 
                      id="marketing_email_performance" 
                      placeholder="Open rates, click rates, conversions..."
                      {...form.register('marketing_email_performance')} 
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="marketing_social_performance">
                      Social Media Performance
                    </label>
                    <Textarea 
                      id="marketing_social_performance" 
                      placeholder="Reach, engagement, shares, comments..."
                      {...form.register('marketing_social_performance')} 
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="marketing_paid_ads_performance">
                      Paid Advertising Performance
                    </label>
                    <Textarea 
                      id="marketing_paid_ads_performance" 
                      placeholder="CTR, CPC, conversions, ROAS..."
                      {...form.register('marketing_paid_ads_performance')} 
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="marketing_influencer_performance">
                      Influencer Campaign Performance
                    </label>
                    <Textarea 
                      id="marketing_influencer_performance" 
                      placeholder="Reach, engagement, attribution..."
                      {...form.register('marketing_influencer_performance')} 
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Content & ROI Analysis</h3>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="marketing_content_performance">
                      Content Performance
                    </label>
                    <Textarea 
                      id="marketing_content_performance" 
                      placeholder="Video views, photo engagement, content virality..."
                      {...form.register('marketing_content_performance')} 
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="social_media_engagement">
                      Social Media Engagement Summary
                    </label>
                    <Textarea 
                      id="social_media_engagement" 
                      placeholder="Overall social media metrics and highlights..."
                      {...form.register('social_media_engagement')} 
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="press_coverage">
                      Press & Media Coverage
                    </label>
                    <Textarea 
                      id="press_coverage" 
                      placeholder="Media mentions, coverage value, key stories..."
                      {...form.register('press_coverage')} 
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="marketing_roi_notes">
                      Marketing ROI & Attribution Notes
                    </label>
                    <Textarea 
                      id="marketing_roi_notes" 
                      rows={4}
                      placeholder="Overall marketing effectiveness, attribution analysis, recommendations..."
                      {...form.register('marketing_roi_notes')} 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Success Tab */}
        <TabsContent value="success" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Success Metrics & Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Event Metrics</h3>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="actual_attendance">
                      Actual Attendance
                    </label>
                    <Input 
                      id="actual_attendance" 
                      type="number" 
                      step="1" 
                      min="0"
                      placeholder="0"
                      {...form.register('actual_attendance', { valueAsNumber: true })} 
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="attendance_breakdown">
                      Attendance Breakdown
                    </label>
                    <Textarea 
                      id="attendance_breakdown" 
                      placeholder="Demographics, ticket types, VIP vs general admission..."
                      {...form.register('attendance_breakdown')} 
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="average_ticket_price">
                      Average Ticket Price Achieved
                    </label>
                    <Input 
                      id="average_ticket_price" 
                      type="number" 
                      step="0.01" 
                      min="0"
                      placeholder="0.00"
                      {...form.register('average_ticket_price', { valueAsNumber: true })} 
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Success Evaluation</h3>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="event_success_indicators">
                      Event Success Indicators
                    </label>
                    <Textarea 
                      id="event_success_indicators" 
                      rows={4}
                      placeholder="What made this event successful? Key achievements, milestones hit..."
                      {...form.register('event_success_indicators')} 
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="brand_impact_assessment">
                      Brand Impact Assessment
                    </label>
                    <Textarea 
                      id="brand_impact_assessment" 
                      rows={4}
                      placeholder="How did this event impact the brand? Reputation, awareness, community..."
                      {...form.register('brand_impact_assessment')} 
                    />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Challenges & Learnings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium" htmlFor="challenges_faced">
                      Challenges Faced
                    </label>
                    <Textarea 
                      id="challenges_faced" 
                      rows={4}
                      placeholder="What challenges arose during planning or execution?"
                      {...form.register('challenges_faced')} 
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="lessons_learned">
                      Lessons Learned
                    </label>
                    <Textarea 
                      id="lessons_learned" 
                      rows={4}
                      placeholder="Key takeaways and insights for future events"
                      {...form.register('lessons_learned')} 
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium" htmlFor="recommendations_future">
                    Recommendations for Future Events
                  </label>
                  <Textarea 
                    id="recommendations_future" 
                    rows={4}
                    placeholder="Specific recommendations and improvements for future special events"
                    {...form.register('recommendations_future')} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Feedback & Post-Event Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Stakeholder Feedback</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium" htmlFor="customer_feedback_summary">
                      Customer Feedback Summary
                    </label>
                    <Textarea 
                      id="customer_feedback_summary" 
                      rows={5}
                      placeholder="Summary of attendee feedback, reviews, surveys..."
                      {...form.register('customer_feedback_summary')} 
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="team_feedback">
                      Team Feedback
                    </label>
                    <Textarea 
                      id="team_feedback" 
                      rows={5}
                      placeholder="Feedback from staff, volunteers, internal team..."
                      {...form.register('team_feedback')} 
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium" htmlFor="vendor_feedback">
                    Vendor & Partner Feedback
                  </label>
                  <Textarea 
                    id="vendor_feedback" 
                    rows={4}
                    placeholder="Feedback from vendors, sponsors, external partners..."
                    {...form.register('vendor_feedback')} 
                  />
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Final Notes</h3>
                <div>
                  <label className="text-sm font-medium" htmlFor="general_notes">
                    General Post-Event Notes
                  </label>
                  <Textarea 
                    id="general_notes" 
                    rows={6}
                    placeholder="Any additional observations, thoughts, or notes about the event..."
                    {...form.register('general_notes')} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4 pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(`/projects/${projectId}`)}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={createActual.isPending || updateActual.isPending}
          className="bg-fortress-emerald hover:bg-fortress-emerald/90"
        >
          {createActual.isPending || updateActual.isPending 
            ? 'Saving...' 
            : existing 
              ? 'Update Actuals' 
              : 'Submit Actuals'
          }
        </Button>
      </div>
    </form>
  );
};

export default SpecialEventActualForm;
