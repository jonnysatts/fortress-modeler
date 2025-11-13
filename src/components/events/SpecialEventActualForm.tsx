// Enhanced SpecialEventActualForm.tsx with comprehensive COGS tracking
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { sanitizeNumericInput, sanitizeTextInput } from '@/lib/security';
import { toast } from 'sonner';
import { 
  DollarSign, 
  Megaphone, 
  Calculator, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle,
  BarChart3,
  Target,
  Star,
  MessageSquare,
  Users
} from 'lucide-react';

interface SpecialEventActualFormProps {
  projectId: string;
}

// Enhanced schema for comprehensive actuals tracking with COGS
const actualSchema = z.object({
  // Actual revenue streams
  actual_ticket_sales: z.number().min(0).optional(),
  actual_fnb_revenue: z.number().min(0).optional(),
  actual_merch_revenue: z.number().min(0).optional(),
  actual_sponsorship_income: z.number().min(0).optional(),
  actual_other_income: z.number().min(0).optional(),
  
  // COGS configuration
  use_forecast_fnb_cogs_pct: z.boolean().default(true),
  use_forecast_merch_cogs_pct: z.boolean().default(true),
  
  // Manual COGS override
  manual_fnb_cogs: z.number().min(0).optional(),
  manual_merch_cogs: z.number().min(0).optional(),
  
  // Actual cost breakdown
  actual_staffing_costs: z.number().min(0).optional(),
  actual_venue_costs: z.number().min(0).optional(),
  actual_vendor_costs: z.number().min(0).optional(),
  actual_marketing_costs: z.number().min(0).optional(),
  actual_production_costs: z.number().min(0).optional(),
  actual_other_costs: z.number().min(0).optional(),
  
  // Event metrics
  actual_attendance: z.number().min(0),
  average_ticket_price: z.number().min(0).optional(),
  
  // Performance tracking
  success_rating: z.number().min(1).max(10).optional(),
  key_success_factors: z.string().max(1000).optional(),
  challenges_faced: z.string().max(1000).optional(),
  lessons_learned: z.string().max(1000).optional(),
  recommendations_future: z.string().max(1000).optional(),
  
  // Marketing performance
  marketing_email_performance: z.string().max(500).optional(),
  marketing_social_performance: z.string().max(500).optional(),
  marketing_influencer_performance: z.string().max(500).optional(),
  marketing_paid_ads_performance: z.string().max(500).optional(),
  marketing_content_performance: z.string().max(500).optional(),
  marketing_roi_notes: z.string().max(1000).optional(),
  
  // Post-event analysis
  customer_feedback_summary: z.string().max(1000).optional(),
  team_feedback: z.string().max(1000).optional(),
  vendor_feedback: z.string().max(1000).optional(),
  
  // Variance notes
  revenue_variance_notes: z.string().max(500).optional(),
  cost_variance_notes: z.string().max(500).optional(),
  general_notes: z.string().max(1000).optional(),
});

type ActualFormData = z.infer<typeof actualSchema>;

// Helper functions for COGS calculation
const calculateCOGSFromForecast = (revenue: number, forecastPercentage: number): number => {
  return Math.round(revenue * (forecastPercentage / 100));
};

const calculateGrossMargin = (revenue: number, cogs: number): number => {
  return revenue > 0 ? ((revenue - cogs) / revenue) * 100 : 0;
};

const calculateVariance = (actual: number, forecast: number): { amount: number; percentage: number } => {
  const amount = actual - forecast;
  const percentage = forecast > 0 ? (amount / forecast) * 100 : 0;
  return { amount, percentage };
};

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
    defaultValues: {
      use_forecast_fnb_cogs_pct: true,
      use_forecast_merch_cogs_pct: true,
    },
  });

  const watchedValues = form.watch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Calculate actuals and metrics
  const totalActualRevenue = (watchedValues.actual_ticket_sales || 0) +
    (watchedValues.actual_fnb_revenue || 0) +
    (watchedValues.actual_merch_revenue || 0) +
    (watchedValues.actual_sponsorship_income || 0) +
    (watchedValues.actual_other_income || 0);

  // Calculate COGS based on configuration
  const calculatedFnBCogs = watchedValues.use_forecast_fnb_cogs_pct && forecast ? 
    calculateCOGSFromForecast(watchedValues.actual_fnb_revenue || 0, forecast.forecast_fnb_cogs_pct || 30) :
    (watchedValues.manual_fnb_cogs || 0);
  
  const calculatedMerchCogs = watchedValues.use_forecast_merch_cogs_pct && forecast ? 
    calculateCOGSFromForecast(watchedValues.actual_merch_revenue || 0, forecast.forecast_merch_cogs_pct || 50) :
    (watchedValues.manual_merch_cogs || 0);

  const totalActualCosts = (watchedValues.actual_staffing_costs || 0) +
    (watchedValues.actual_venue_costs || 0) +
    (watchedValues.actual_vendor_costs || 0) +
    (watchedValues.actual_marketing_costs || 0) +
    (watchedValues.actual_production_costs || 0) +
    (watchedValues.actual_other_costs || 0) +
    calculatedFnBCogs +
    calculatedMerchCogs;

  const actualNetProfit = totalActualRevenue - totalActualCosts;
  const actualProfitMargin = totalActualRevenue > 0 ? (actualNetProfit / totalActualRevenue) * 100 : 0;

  // Calculate per-attendee metrics
  const revenuePerAttendee = watchedValues.actual_attendance > 0 ? 
    totalActualRevenue / watchedValues.actual_attendance : 0;
  const costPerAttendee = watchedValues.actual_attendance > 0 ? 
    totalActualCosts / watchedValues.actual_attendance : 0;
  const profitPerAttendee = revenuePerAttendee - costPerAttendee;

  // Calculate marketing efficiency
  const marketingROI = watchedValues.actual_marketing_costs > 0 ? 
    ((totalActualRevenue - watchedValues.actual_marketing_costs) / watchedValues.actual_marketing_costs) * 100 : 0;
  
  const customerAcquisitionCost = watchedValues.actual_marketing_costs > 0 && watchedValues.actual_attendance > 0 ?
    watchedValues.actual_marketing_costs / watchedValues.actual_attendance : 0;

  // Calculate gross margins
  const fnbGrossMargin = calculateGrossMargin(watchedValues.actual_fnb_revenue || 0, calculatedFnBCogs);
  const merchGrossMargin = calculateGrossMargin(watchedValues.actual_merch_revenue || 0, calculatedMerchCogs);

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
    (forecast.forecast_other_costs || 0) +
    (forecast.calculated_fnb_cogs || 0) +
    (forecast.calculated_merch_cogs || 0)
  ) : 0;

  const forecastNetProfit = forecastRevenue - forecastCosts;

  // Variance calculations
  const revenueVariance = calculateVariance(totalActualRevenue, forecastRevenue);
  const costVariance = calculateVariance(totalActualCosts, forecastCosts);
  const profitVariance = calculateVariance(actualNetProfit, forecastNetProfit);
  const attendanceVariance = forecast?.estimated_attendance ? 
    calculateVariance(watchedValues.actual_attendance, forecast.estimated_attendance) : 
    { amount: 0, percentage: 0 };

  // COGS variance calculations
  const fnbCogsVariance = forecast?.calculated_fnb_cogs ? 
    calculateVariance(calculatedFnBCogs, forecast.calculated_fnb_cogs) : 
    { amount: 0, percentage: 0 };
  
  const merchCogsVariance = forecast?.calculated_merch_cogs ? 
    calculateVariance(calculatedMerchCogs, forecast.calculated_merch_cogs) : 
    { amount: 0, percentage: 0 };

  // Load existing data
  useEffect(() => {
    if (existing && !hasInitialized) {
      const resetData = {
        actual_ticket_sales: existing.actual_ticket_sales || undefined,
        actual_fnb_revenue: existing.actual_fnb_revenue || undefined,
        actual_merch_revenue: existing.actual_merch_revenue || undefined,
        actual_sponsorship_income: existing.actual_sponsorship_income || undefined,
        actual_other_income: existing.actual_other_income || undefined,
        
        use_forecast_fnb_cogs_pct: existing.use_forecast_fnb_cogs_pct ?? true,
        use_forecast_merch_cogs_pct: existing.use_forecast_merch_cogs_pct ?? true,
        manual_fnb_cogs: existing.manual_fnb_cogs || undefined,
        manual_merch_cogs: existing.manual_merch_cogs || undefined,
        
        actual_staffing_costs: existing.actual_staffing_costs || undefined,
        actual_venue_costs: existing.actual_venue_costs || undefined,
        actual_vendor_costs: existing.actual_vendor_costs || undefined,
        actual_marketing_costs: existing.actual_marketing_costs || undefined,
        actual_production_costs: existing.actual_production_costs || undefined,
        actual_other_costs: existing.actual_other_costs || undefined,
        
        actual_attendance: existing.actual_attendance || 0,
        average_ticket_price: existing.average_ticket_price || undefined,
        
        success_rating: existing.success_rating || undefined,
        key_success_factors: existing.key_success_factors || undefined,
        challenges_faced: existing.challenges_faced || undefined,
        lessons_learned: existing.lessons_learned || undefined,
        recommendations_future: existing.recommendations_future || undefined,
        
        marketing_email_performance: existing.marketing_email_performance || undefined,
        marketing_social_performance: existing.marketing_social_performance || undefined,
        marketing_influencer_performance: existing.marketing_influencer_performance || undefined,
        marketing_paid_ads_performance: existing.marketing_paid_ads_performance || undefined,
        marketing_content_performance: existing.marketing_content_performance || undefined,
        marketing_roi_notes: existing.marketing_roi_notes || undefined,
        
        customer_feedback_summary: existing.customer_feedback_summary || undefined,
        team_feedback: existing.team_feedback || undefined,
        vendor_feedback: existing.vendor_feedback || undefined,
        
        revenue_variance_notes: existing.revenue_variance_notes || undefined,
        cost_variance_notes: existing.cost_variance_notes || undefined,
        general_notes: existing.general_notes || undefined,
      };

      form.reset(resetData);
      setHasInitialized(true);
    }
  }, [existing, form, hasInitialized]);

  const handleSubmit = async (data: ActualFormData) => {
    try {
      setIsSubmitting(true);

      // Prepare data with calculated metrics
      const submitData = {
        ...data,
        calculated_fnb_cogs: calculatedFnBCogs,
        calculated_merch_cogs: calculatedMerchCogs,
        revenue_per_attendee: revenuePerAttendee,
        cost_per_attendee: costPerAttendee,
        profit_per_attendee: profitPerAttendee,
        marketing_roi: marketingROI,
        fnb_gross_margin_percentage: fnbGrossMargin,
        merchandise_gross_margin_percentage: merchGrossMargin,
        fnb_cogs_variance: fnbCogsVariance.amount,
        merch_cogs_variance: merchCogsVariance.amount,
      };

      if (existing) {
        await updateActual.mutateAsync({
          actualId: existing.id,
          data: submitData,
        });
        toast.success('Actuals updated successfully');
      } else {
        await createActual.mutateAsync({
          projectId,
          data: submitData,
        });
        toast.success('Actuals created successfully');
      }
    } catch (error) {
      console.error('Error saving actuals:', error);
      toast.error('Failed to save actuals');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Enhanced KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">${totalActualRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-2">
              <Badge variant={revenueVariance.percentage > 0 ? 'default' : 'destructive'}>
                {revenueVariance.percentage > 0 ? '+' : ''}{revenueVariance.percentage.toFixed(1)}% vs forecast
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Net Profit</p>
                <p className={`text-2xl font-bold ${actualNetProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${actualNetProfit.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-2">
              <Badge variant="outline">
                {actualProfitMargin.toFixed(1)}% margin
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Revenue/Attendee</p>
                <p className="text-2xl font-bold text-blue-600">${revenuePerAttendee.toFixed(0)}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
            <div className="mt-2">
              <Badge variant={attendanceVariance.percentage > -10 ? 'default' : 'destructive'}>
                {attendanceVariance.percentage > 0 ? '+' : ''}{attendanceVariance.percentage.toFixed(1)}% attendance
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Marketing ROI</p>
                <p className={`text-2xl font-bold ${marketingROI > 100 ? 'text-green-600' : marketingROI > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {marketingROI.toFixed(0)}%
                </p>
              </div>
              <Megaphone className="w-8 h-8 text-orange-500" />
            </div>
            <div className="mt-2">
              <Badge variant="outline">
                ${customerAcquisitionCost.toFixed(0)} CAC
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="cogs">COGS</TabsTrigger>
            <TabsTrigger value="costs">Costs</TabsTrigger>
            <TabsTrigger value="marketing">Marketing</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Event Performance Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Key Event Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="actual_attendance">Actual Attendance *</Label>
                    <Input
                      id="actual_attendance"
                      type="number"
                      {...form.register('actual_attendance', { 
                        setValueAs: v => v === '' ? 0 : Number(v) 
                      })}
                      className="text-right"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="average_ticket_price">Average Ticket Price</Label>
                    <Input
                      id="average_ticket_price"
                      type="number"
                      step="0.01"
                      {...form.register('average_ticket_price', { 
                        setValueAs: v => v === '' ? undefined : Number(v) 
                      })}
                      className="text-right"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="success_rating">Success Rating (1-10)</Label>
                    <Input
                      id="success_rating"
                      type="number"
                      min="1"
                      max="10"
                      {...form.register('success_rating', { 
                        setValueAs: v => v === '' ? undefined : Number(v) 
                      })}
                      className="text-right"
                    />
                  </div>
                </div>

                {/* Performance Metrics Display */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Financial Performance</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Revenue per attendee:</span>
                        <span className="font-medium">${revenuePerAttendee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cost per attendee:</span>
                        <span className="font-medium">${costPerAttendee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Profit per attendee:</span>
                        <span className={`font-medium ${profitPerAttendee >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${profitPerAttendee.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total COGS:</span>
                        <span className="font-medium">${(calculatedFnBCogs + calculatedMerchCogs).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Variance vs Forecast</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Revenue variance:</span>
                        <Badge variant={revenueVariance.percentage >= 0 ? 'default' : 'destructive'}>
                          {revenueVariance.percentage > 0 ? '+' : ''}{revenueVariance.percentage.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cost variance:</span>
                        <Badge variant={costVariance.percentage <= 0 ? 'default' : 'destructive'}>
                          {costVariance.percentage > 0 ? '+' : ''}{costVariance.percentage.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Profit variance:</span>
                        <Badge variant={profitVariance.percentage >= 0 ? 'default' : 'destructive'}>
                          {profitVariance.percentage > 0 ? '+' : ''}{profitVariance.percentage.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Attendance variance:</span>
                        <Badge variant={attendanceVariance.percentage >= -5 ? 'default' : 'destructive'}>
                          {attendanceVariance.percentage > 0 ? '+' : ''}{attendanceVariance.percentage.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Actual Revenue Streams</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="actual_ticket_sales">Actual Ticket Sales</Label>
                    <Input
                      id="actual_ticket_sales"
                      type="number"
                      {...form.register('actual_ticket_sales', { 
                        setValueAs: v => v === '' ? undefined : Number(v) 
                      })}
                      className="text-right"
                    />
                    {forecast?.forecast_ticket_sales && (
                      <p className="text-xs text-gray-500">
                        Forecast: ${forecast.forecast_ticket_sales.toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="actual_fnb_revenue">Actual F&B Revenue</Label>
                    <Input
                      id="actual_fnb_revenue"
                      type="number"
                      {...form.register('actual_fnb_revenue', { 
                        setValueAs: v => v === '' ? undefined : Number(v) 
                      })}
                      className="text-right"
                    />
                    {forecast?.forecast_fnb_revenue && (
                      <p className="text-xs text-gray-500">
                        Forecast: ${forecast.forecast_fnb_revenue.toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="actual_merch_revenue">Actual Merchandise Revenue</Label>
                    <Input
                      id="actual_merch_revenue"
                      type="number"
                      {...form.register('actual_merch_revenue', { 
                        setValueAs: v => v === '' ? undefined : Number(v) 
                      })}
                      className="text-right"
                    />
                    {forecast?.forecast_merch_revenue && (
                      <p className="text-xs text-gray-500">
                        Forecast: ${forecast.forecast_merch_revenue.toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="actual_sponsorship_income">Actual Sponsorship Income</Label>
                    <Input
                      id="actual_sponsorship_income"
                      type="number"
                      {...form.register('actual_sponsorship_income', { 
                        setValueAs: v => v === '' ? undefined : Number(v) 
                      })}
                      className="text-right"
                    />
                    {forecast?.forecast_sponsorship_income && (
                      <p className="text-xs text-gray-500">
                        Forecast: ${forecast.forecast_sponsorship_income.toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="actual_other_income">Actual Other Income</Label>
                    <Input
                      id="actual_other_income"
                      type="number"
                      {...form.register('actual_other_income', { 
                        setValueAs: v => v === '' ? undefined : Number(v) 
                      })}
                      className="text-right"
                    />
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-800">Total Actual Revenue</h4>
                    <p className="text-2xl font-bold text-green-600">${totalActualRevenue.toLocaleString()}</p>
                    {forecastRevenue > 0 && (
                      <Badge variant={revenueVariance.percentage >= 0 ? 'default' : 'destructive'} className="mt-2">
                        {revenueVariance.percentage > 0 ? '+' : ''}{revenueVariance.percentage.toFixed(1)}% vs forecast
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="revenue_variance_notes">Revenue Variance Notes</Label>
                  <Textarea
                    id="revenue_variance_notes"
                    {...form.register('revenue_variance_notes')}
                    placeholder="Explain any significant revenue variances from forecast..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cogs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cost of Goods Sold (COGS) Tracking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* F&B COGS */}
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">F&B COGS</h4>
                    <Badge variant={fnbGrossMargin > 60 ? 'default' : fnbGrossMargin > 45 ? 'secondary' : 'destructive'}>
                      {fnbGrossMargin.toFixed(1)}% gross margin
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={watchedValues.use_forecast_fnb_cogs_pct}
                      onCheckedChange={(checked) => form.setValue('use_forecast_fnb_cogs_pct', checked)}
                    />
                    <Label>Use forecast percentage ({forecast?.forecast_fnb_cogs_pct || 30}%)</Label>
                  </div>

                  {watchedValues.use_forecast_fnb_cogs_pct ? (
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-gray-600">F&B Revenue: </span>
                        <span className="font-medium">${(watchedValues.actual_fnb_revenue || 0).toLocaleString()}</span>
                        <span className="text-gray-600 ml-4">COGS Percentage: </span>
                        <span className="font-medium">{forecast?.forecast_fnb_cogs_pct || 30}%</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Calculated COGS: </span>
                        <span className="font-medium text-orange-600">${calculatedFnBCogs.toLocaleString()}</span>
                      </div>
                      {fnbCogsVariance.amount !== 0 && (
                        <div className="text-sm">
                          <span className="text-gray-600">Variance vs forecast: </span>
                          <Badge variant={fnbCogsVariance.percentage <= 5 ? 'default' : 'destructive'}>
                            {fnbCogsVariance.percentage > 0 ? '+' : ''}{fnbCogsVariance.percentage.toFixed(1)}%
                          </Badge>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Manual F&B COGS</Label>
                      <Input
                        type="number"
                        {...form.register('manual_fnb_cogs', { 
                          setValueAs: v => v === '' ? undefined : Number(v) 
                        })}
                        className="text-right"
                        placeholder="Enter actual F&B COGS"
                      />
                    </div>
                  )}
                </div>

                {/* Merchandise COGS */}
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Merchandise COGS</h4>
                    <Badge variant={merchGrossMargin > 45 ? 'default' : merchGrossMargin > 30 ? 'secondary' : 'destructive'}>
                      {merchGrossMargin.toFixed(1)}% gross margin
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={watchedValues.use_forecast_merch_cogs_pct}
                      onCheckedChange={(checked) => form.setValue('use_forecast_merch_cogs_pct', checked)}
                    />
                    <Label>Use forecast percentage ({forecast?.forecast_merch_cogs_pct || 50}%)</Label>
                  </div>

                  {watchedValues.use_forecast_merch_cogs_pct ? (
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-gray-600">Merchandise Revenue: </span>
                        <span className="font-medium">${(watchedValues.actual_merch_revenue || 0).toLocaleString()}</span>
                        <span className="text-gray-600 ml-4">COGS Percentage: </span>
                        <span className="font-medium">{forecast?.forecast_merch_cogs_pct || 50}%</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Calculated COGS: </span>
                        <span className="font-medium text-orange-600">${calculatedMerchCogs.toLocaleString()}</span>
                      </div>
                      {merchCogsVariance.amount !== 0 && (
                        <div className="text-sm">
                          <span className="text-gray-600">Variance vs forecast: </span>
                          <Badge variant={merchCogsVariance.percentage <= 5 ? 'default' : 'destructive'}>
                            {merchCogsVariance.percentage > 0 ? '+' : ''}{merchCogsVariance.percentage.toFixed(1)}%
                          </Badge>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Manual Merchandise COGS</Label>
                      <Input
                        type="number"
                        {...form.register('manual_merch_cogs', { 
                          setValueAs: v => v === '' ? undefined : Number(v) 
                        })}
                        className="text-right"
                        placeholder="Enter actual merchandise COGS"
                      />
                    </div>
                  )}
                </div>

                {/* COGS Summary */}
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-medium text-orange-800 mb-2">Total COGS Summary</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">F&B COGS:</span>
                      <p className="font-medium">${calculatedFnBCogs.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{fnbGrossMargin.toFixed(1)}% margin</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Merchandise COGS:</span>
                      <p className="font-medium">${calculatedMerchCogs.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{merchGrossMargin.toFixed(1)}% margin</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Total COGS:</span>
                      <p className="font-bold text-orange-600">${(calculatedFnBCogs + calculatedMerchCogs).toLocaleString()}</p>
                      <p className="text-xs text-gray-500">
                        {totalActualRevenue > 0 ? ((calculatedFnBCogs + calculatedMerchCogs) / totalActualRevenue * 100).toFixed(1) : 0}% of revenue
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="costs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Actual Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <h4 className="font-medium">Operational Costs</h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="actual_staffing_costs">Actual Staffing Costs</Label>
                      <Input
                        id="actual_staffing_costs"
                        type="number"
                        {...form.register('actual_staffing_costs', { 
                          setValueAs: v => v === '' ? undefined : Number(v) 
                        })}
                        className="text-right"
                      />
                      {forecast?.forecast_staffing_costs && (
                        <p className="text-xs text-gray-500">
                          Forecast: ${forecast.forecast_staffing_costs.toLocaleString()}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="actual_venue_costs">Actual Venue & Setup Costs</Label>
                      <Input
                        id="actual_venue_costs"
                        type="number"
                        {...form.register('actual_venue_costs', { 
                          setValueAs: v => v === '' ? undefined : Number(v) 
                        })}
                        className="text-right"
                      />
                      {forecast?.forecast_venue_costs && (
                        <p className="text-xs text-gray-500">
                          Forecast: ${forecast.forecast_venue_costs.toLocaleString()}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="actual_vendor_costs">Actual External Vendor Costs</Label>
                      <Input
                        id="actual_vendor_costs"
                        type="number"
                        {...form.register('actual_vendor_costs', { 
                          setValueAs: v => v === '' ? undefined : Number(v) 
                        })}
                        className="text-right"
                      />
                      {forecast?.forecast_vendor_costs && (
                        <p className="text-xs text-gray-500">
                          Forecast: ${forecast.forecast_vendor_costs.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Additional Costs</h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="actual_marketing_costs">Actual Marketing Costs</Label>
                      <Input
                        id="actual_marketing_costs"
                        type="number"
                        {...form.register('actual_marketing_costs', { 
                          setValueAs: v => v === '' ? undefined : Number(v) 
                        })}
                        className="text-right"
                      />
                      {forecast?.forecast_marketing_costs && (
                        <p className="text-xs text-gray-500">
                          Forecast: ${forecast.forecast_marketing_costs.toLocaleString()}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="actual_production_costs">Actual Production Costs</Label>
                      <Input
                        id="actual_production_costs"
                        type="number"
                        {...form.register('actual_production_costs', { 
                          setValueAs: v => v === '' ? undefined : Number(v) 
                        })}
                        className="text-right"
                      />
                      {forecast?.forecast_production_costs && (
                        <p className="text-xs text-gray-500">
                          Forecast: ${forecast.forecast_production_costs.toLocaleString()}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="actual_other_costs">Actual Other Costs</Label>
                      <Input
                        id="actual_other_costs"
                        type="number"
                        {...form.register('actual_other_costs', { 
                          setValueAs: v => v === '' ? undefined : Number(v) 
                        })}
                        className="text-right"
                      />
                      {forecast?.forecast_other_costs && (
                        <p className="text-xs text-gray-500">
                          Forecast: ${forecast.forecast_other_costs.toLocaleString()}
                        </p>
                      )}
                    </div>

                    <div className="bg-red-50 p-4 rounded-lg">
                      <h4 className="font-medium text-red-800">Total Actual Costs</h4>
                      <p className="text-sm text-gray-600 mb-1">Including COGS</p>
                      <p className="text-2xl font-bold text-red-600">${totalActualCosts.toLocaleString()}</p>
                      {forecastCosts > 0 && (
                        <Badge variant={costVariance.percentage <= 0 ? 'default' : 'destructive'} className="mt-2">
                          {costVariance.percentage > 0 ? '+' : ''}{costVariance.percentage.toFixed(1)}% vs forecast
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_variance_notes">Cost Variance Notes</Label>
                  <Textarea
                    id="cost_variance_notes"
                    {...form.register('cost_variance_notes')}
                    placeholder="Explain any significant cost variances..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="marketing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Marketing Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Marketing ROI Summary */}
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <h4 className="font-medium text-blue-800 mb-2">Marketing Efficiency Summary</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Marketing ROI:</span>
                      <p className={`text-xl font-bold ${marketingROI > 200 ? 'text-green-600' : marketingROI > 100 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {marketingROI.toFixed(0)}%
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Customer Acquisition Cost:</span>
                      <p className="text-xl font-bold text-blue-600">${customerAcquisitionCost.toFixed(0)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Marketing Cost per Attendee:</span>
                      <p className="text-xl font-bold text-purple-600">
                        ${watchedValues.actual_attendance > 0 ? ((watchedValues.actual_marketing_costs || 0) / watchedValues.actual_attendance).toFixed(0) : 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Marketing Channel Performance */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="marketing_email_performance">Email Marketing Performance</Label>
                    <Textarea
                      id="marketing_email_performance"
                      {...form.register('marketing_email_performance')}
                      placeholder="Open rates, click rates, conversions..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="marketing_social_performance">Social Media Performance</Label>
                    <Textarea
                      id="marketing_social_performance"
                      {...form.register('marketing_social_performance')}
                      placeholder="Reach, engagement, conversions..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="marketing_influencer_performance">Influencer Marketing Performance</Label>
                    <Textarea
                      id="marketing_influencer_performance"
                      {...form.register('marketing_influencer_performance')}
                      placeholder="Reach, engagement, attributed sales..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="marketing_paid_ads_performance">Paid Advertising Performance</Label>
                    <Textarea
                      id="marketing_paid_ads_performance"
                      {...form.register('marketing_paid_ads_performance')}
                      placeholder="CTR, CPC, conversions, ROAS..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="marketing_content_performance">Content Performance</Label>
                    <Textarea
                      id="marketing_content_performance"
                      {...form.register('marketing_content_performance')}
                      placeholder="Views, shares, engagement..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="marketing_roi_notes">Marketing ROI Notes</Label>
                    <Textarea
                      id="marketing_roi_notes"
                      {...form.register('marketing_roi_notes')}
                      placeholder="Overall marketing insights and learnings..."
                      rows={2}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Post-Event Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Performance Indicators */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 border rounded-lg">
                    <h4 className="font-medium text-sm text-gray-600">Revenue vs Forecast</h4>
                    <p className={`text-2xl font-bold ${revenueVariance.percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {revenueVariance.percentage > 0 ? '+' : ''}{revenueVariance.percentage.toFixed(1)}%
                    </p>
                    <Progress 
                      value={Math.min(Math.abs(revenueVariance.percentage), 100)} 
                      className="mt-2"
                    />
                  </div>

                  <div className="text-center p-4 border rounded-lg">
                    <h4 className="font-medium text-sm text-gray-600">Profit Margin</h4>
                    <p className={`text-2xl font-bold ${actualProfitMargin >= 20 ? 'text-green-600' : actualProfitMargin >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {actualProfitMargin.toFixed(1)}%
                    </p>
                    <Progress 
                      value={Math.min(actualProfitMargin, 100)} 
                      className="mt-2"
                    />
                  </div>

                  <div className="text-center p-4 border rounded-lg">
                    <h4 className="font-medium text-sm text-gray-600">Marketing ROI</h4>
                    <p className={`text-2xl font-bold ${marketingROI >= 200 ? 'text-green-600' : marketingROI >= 100 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {marketingROI.toFixed(0)}%
                    </p>
                    <Progress 
                      value={Math.min(marketingROI / 4, 100)} 
                      className="mt-2"
                    />
                  </div>
                </div>

                {/* Success Factors and Learnings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="key_success_factors">Key Success Factors</Label>
                      <Textarea
                        id="key_success_factors"
                        {...form.register('key_success_factors')}
                        placeholder="What went well? What drove success?"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lessons_learned">Lessons Learned</Label>
                      <Textarea
                        id="lessons_learned"
                        {...form.register('lessons_learned')}
                        placeholder="Key insights and takeaways..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="recommendations_future">Recommendations for Future Events</Label>
                      <Textarea
                        id="recommendations_future"
                        {...form.register('recommendations_future')}
                        placeholder="What would you do differently next time?"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="challenges_faced">Challenges Faced</Label>
                      <Textarea
                        id="challenges_faced"
                        {...form.register('challenges_faced')}
                        placeholder="What obstacles or issues arose?"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customer_feedback_summary">Customer Feedback Summary</Label>
                      <Textarea
                        id="customer_feedback_summary"
                        {...form.register('customer_feedback_summary')}
                        placeholder="Key themes from customer feedback..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="team_feedback">Team Feedback</Label>
                      <Textarea
                        id="team_feedback"
                        {...form.register('team_feedback')}
                        placeholder="Feedback from staff and team members..."
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vendor_feedback">Vendor Feedback</Label>
                      <Textarea
                        id="vendor_feedback"
                        {...form.register('vendor_feedback')}
                        placeholder="Feedback from vendors and partners..."
                        rows={2}
                      />
                    </div>
                  </div>
                </div>

                {/* Performance Insights */}
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Performance Insights:</strong>
                    <ul className="mt-2 space-y-1 list-disc list-inside text-sm">
                      {actualProfitMargin > 25 && <li>Excellent profit margin indicates strong pricing strategy and cost control</li>}
                      {revenueVariance.percentage > 10 && <li>Revenue significantly exceeded forecast - consider scaling successful strategies</li>}
                      {marketingROI > 300 && <li>Outstanding marketing ROI - current channels are highly effective</li>}
                      {fnbGrossMargin > 65 && <li>Strong F&B margins suggest good supplier management</li>}
                      {merchGrossMargin > 50 && <li>Healthy merchandise margins indicate good product mix</li>}
                      {customerAcquisitionCost < 20 && <li>Low customer acquisition cost indicates efficient marketing</li>}
                      {profitPerAttendee > 50 && <li>Strong per-attendee profitability suggests good event economics</li>}
                    </ul>
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="general_notes">General Notes</Label>
                  <Textarea
                    id="general_notes"
                    {...form.register('general_notes')}
                    placeholder="Any additional notes or observations..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          
          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-w-32"
          >
            {isSubmitting ? 'Saving...' : existing ? 'Update Actuals' : 'Submit Actuals'}
          </Button>
        </div>
      </form>
    </div>
  );
};