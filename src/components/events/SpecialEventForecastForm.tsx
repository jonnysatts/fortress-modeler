import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import {
  useSpecialEventForecasts,
  useCreateSpecialEventForecast,
  useUpdateSpecialEventForecast,
} from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { sanitizeNumericInput, sanitizeTextInput } from '@/lib/security';
import { toast } from 'sonner';
import { DollarSign, Users, Megaphone, Calculator, TrendingUp } from 'lucide-react';

interface SpecialEventForecastFormProps {
  projectId: string;
}

// Enhanced schema with separated categories - all fields are optional
const forecastSchema = z.object({
  // Revenue streams
  forecast_ticket_sales: z.union([z.number().min(0), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  forecast_fnb_revenue: z.union([z.number().min(0), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  forecast_fnb_cogs_pct: z.union([z.number().min(0).max(100), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  forecast_merch_revenue: z.union([z.number().min(0), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  forecast_merch_cogs_pct: z.union([z.number().min(0).max(100), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  forecast_sponsorship_income: z.union([z.number().min(0), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  forecast_other_income: z.union([z.number().min(0), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  
  // Cost breakdown
  forecast_staffing_costs: z.union([z.number().min(0), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  forecast_venue_costs: z.union([z.number().min(0), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  forecast_vendor_costs: z.union([z.number().min(0), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  forecast_marketing_costs: z.union([z.number().min(0), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  forecast_production_costs: z.union([z.number().min(0), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  forecast_other_costs: z.union([z.number().min(0), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  
  // Marketing details
  marketing_email_budget: z.union([z.number().min(0), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  marketing_social_budget: z.union([z.number().min(0), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  marketing_influencer_budget: z.union([z.number().min(0), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  marketing_paid_ads_budget: z.union([z.number().min(0), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  marketing_content_budget: z.union([z.number().min(0), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  marketing_strategy: z.string().max(1000).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  
  // Event details
  estimated_attendance: z.union([z.number().min(0), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  ticket_price: z.union([z.number().min(0), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  
  // Notes
  revenue_notes: z.string().max(500).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  cost_notes: z.string().max(500).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  marketing_notes: z.string().max(500).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  general_notes: z.string().max(500).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
});

type ForecastFormData = z.infer<typeof forecastSchema>;

export const SpecialEventForecastForm: React.FC<SpecialEventForecastFormProps> = ({
  projectId,
}) => {
  const navigate = useNavigate();
  const { data: forecasts = [] } = useSpecialEventForecasts(projectId);
  const createForecast = useCreateSpecialEventForecast();
  const updateForecast = useUpdateSpecialEventForecast();
  const [activeTab, setActiveTab] = useState('overview');

  const existing = forecasts[0];

  const form = useForm<ForecastFormData>({
    resolver: zodResolver(forecastSchema),
    defaultValues: {},
  });

  const watchedValues = form.watch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [lastResetData, setLastResetData] = useState<any>(null);

  // Calculate totals
  const totalRevenue = (watchedValues.forecast_ticket_sales || 0) +
    (watchedValues.forecast_fnb_revenue || 0) +
    (watchedValues.forecast_merch_revenue || 0) +
    (watchedValues.forecast_sponsorship_income || 0) +
    (watchedValues.forecast_other_income || 0);

  const totalCosts = (watchedValues.forecast_staffing_costs || 0) +
    (watchedValues.forecast_venue_costs || 0) +
    (watchedValues.forecast_vendor_costs || 0) +
    (watchedValues.forecast_marketing_costs || 0) +
    (watchedValues.forecast_production_costs || 0) +
    (watchedValues.forecast_other_costs || 0);

  const totalMarketingBudget = (watchedValues.marketing_email_budget || 0) +
    (watchedValues.marketing_social_budget || 0) +
    (watchedValues.marketing_influencer_budget || 0) +
    (watchedValues.marketing_paid_ads_budget || 0) +
    (watchedValues.marketing_content_budget || 0);

  const netProfit = totalRevenue - totalCosts;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

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
    setIsSubmitting(false);
  }, [projectId]);

  const onSubmit = async (data: ForecastFormData) => {
    try {
      setIsSubmitting(true);
      
      console.log('🔄 [SpecialEventForecastForm] Starting manual save...', { projectId, hasExisting: !!existing });
      
      const sanitized: Partial<ForecastFormData> = Object.entries(data).reduce(
        (acc, [key, value]) => {
          if (typeof value === 'number') {
            acc[key as keyof ForecastFormData] = sanitizeNumericInput(value) as any;
          } else if (typeof value === 'string') {
            acc[key as keyof ForecastFormData] = sanitizeTextInput(value) as any;
          }
          return acc;
        },
        {} as Partial<ForecastFormData>
      );

      if (existing) {
        console.log('🔄 [SpecialEventForecastForm] Updating existing forecast...', existing.id);
        const result = await updateForecast.mutateAsync({ id: existing.id, data: sanitized });
        // Update our tracking data so we don't reset the form when the cache updates
        setLastResetData({ ...result });
        console.log('✅ [SpecialEventForecastForm] Forecast updated successfully');
        toast.success('Forecast updated successfully!');
      } else {
        console.log('🔄 [SpecialEventForecastForm] Creating new forecast...');
        const result = await createForecast.mutateAsync({ project_id: projectId, ...sanitized });
        setLastResetData({ ...result });
        console.log('✅ [SpecialEventForecastForm] Forecast created successfully');
        toast.success('Forecast created successfully!');
      }
      
      navigate(`/projects/${projectId}`);
    } catch (error) {
      console.error('❌ [SpecialEventForecastForm] Manual save failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        projectId,
        hasExisting: !!existing
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast.error('Failed to save forecast', {
        description: errorMessage,
        action: {
          label: 'Retry',
          onClick: () => {
            // Retry the save
            onSubmit(data);
          },
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="revenue" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="costs" className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Costs
          </TabsTrigger>
          <TabsTrigger value="marketing" className="flex items-center gap-2">
            <Megaphone className="w-4 h-4" />
            Marketing
          </TabsTrigger>
          <TabsTrigger value="details" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Details
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Financial Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalRevenue)}
                  </div>
                  <div className="text-sm text-green-600">Total Revenue</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(totalCosts)}
                  </div>
                  <div className="text-sm text-red-600">Total Costs</div>
                </div>
                <div className={`text-center p-4 rounded-lg ${netProfit >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                  <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {formatCurrency(netProfit)}
                  </div>
                  <div className={`text-sm ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    Net Profit
                  </div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {profitMargin.toFixed(1)}%
                  </div>
                  <div className="text-sm text-purple-600">Profit Margin</div>
                </div>
              </div>
              
              <Separator className="my-6" />
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Revenue Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Ticket Sales', value: watchedValues.forecast_ticket_sales || 0 },
                    { label: 'F&B Revenue', value: watchedValues.forecast_fnb_revenue || 0 },
                    { label: 'Merchandise', value: watchedValues.forecast_merch_revenue || 0 },
                    { label: 'Sponsorships', value: watchedValues.forecast_sponsorship_income || 0 },
                    { label: 'Other Income', value: watchedValues.forecast_other_income || 0 },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm">{label}</span>
                      <Badge variant="secondary">{formatCurrency(value)}</Badge>
                    </div>
                  ))}
                </div>
                
                <h3 className="text-lg font-semibold mt-6">Cost Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Staffing', value: watchedValues.forecast_staffing_costs || 0 },
                    { label: 'Venue', value: watchedValues.forecast_venue_costs || 0 },
                    { label: 'Vendors', value: watchedValues.forecast_vendor_costs || 0 },
                    { label: 'Marketing', value: watchedValues.forecast_marketing_costs || 0 },
                    { label: 'Production', value: watchedValues.forecast_production_costs || 0 },
                    { label: 'Other', value: watchedValues.forecast_other_costs || 0 },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm">{label}</span>
                      <Badge variant="outline">{formatCurrency(value)}</Badge>
                    </div>
                  ))}
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
                Revenue Forecasts
              </CardTitle>
              <p className="text-sm text-gray-500">
                All fields are optional. Only fill in the revenue streams that apply to your event.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Primary Revenue Streams</h3>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="forecast_ticket_sales">
                      Ticket Sales <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <Input 
                      id="forecast_ticket_sales" 
                      type="number" 
                      step="0.01" 
                      placeholder="Leave blank if not applicable"
                      {...form.register('forecast_ticket_sales', { 
                        valueAsNumber: true,
                        setValueAs: (value) => value === '' ? undefined : Number(value)
                      })} 
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="forecast_fnb_revenue">
                      F&B Revenue
                    </label>
                    <Input 
                      id="forecast_fnb_revenue" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      {...form.register('forecast_fnb_revenue', { valueAsNumber: true })} 
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="forecast_fnb_cogs_pct">
                      F&B COGS (%)
                    </label>
                    <Input 
                      id="forecast_fnb_cogs_pct" 
                      type="number" 
                      step="0.1" 
                      min="0" 
                      max="100"
                      placeholder="0.0"
                      {...form.register('forecast_fnb_cogs_pct', { valueAsNumber: true })} 
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="forecast_merch_revenue">
                      Merchandise Revenue
                    </label>
                    <Input 
                      id="forecast_merch_revenue" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      {...form.register('forecast_merch_revenue', { valueAsNumber: true })} 
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="forecast_merch_cogs_pct">
                      Merchandise COGS (%)
                    </label>
                    <Input 
                      id="forecast_merch_cogs_pct" 
                      type="number" 
                      step="0.1" 
                      min="0" 
                      max="100"
                      placeholder="0.0"
                      {...form.register('forecast_merch_cogs_pct', { valueAsNumber: true })} 
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Additional Revenue</h3>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="forecast_sponsorship_income">
                      Sponsorship Income
                    </label>
                    <Input 
                      id="forecast_sponsorship_income" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      {...form.register('forecast_sponsorship_income', { valueAsNumber: true })} 
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="forecast_other_income">
                      Other Income
                    </label>
                    <Input 
                      id="forecast_other_income" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      {...form.register('forecast_other_income', { valueAsNumber: true })} 
                    />
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-800">Total Revenue</h4>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(totalRevenue)}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="revenue_notes">
                      Revenue Notes
                    </label>
                    <Textarea 
                      id="revenue_notes" 
                      placeholder="Notes about revenue assumptions..."
                      {...form.register('revenue_notes')} 
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
                Cost Forecasts
              </CardTitle>
              <p className="text-sm text-gray-500">
                All fields are optional. Only fill in the cost categories that apply to your event.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Operational Costs</h3>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="forecast_staffing_costs">
                      Staffing Costs
                    </label>
                    <Input 
                      id="forecast_staffing_costs" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      {...form.register('forecast_staffing_costs', { valueAsNumber: true })} 
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Wages, contractors, security, etc.
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="forecast_venue_costs">
                      Venue & Setup Costs
                    </label>
                    <Input 
                      id="forecast_venue_costs" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      {...form.register('forecast_venue_costs', { valueAsNumber: true })} 
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Rental, AV, fixtures, signage
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="forecast_vendor_costs">
                      External Vendor Costs
                    </label>
                    <Input 
                      id="forecast_vendor_costs" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      {...form.register('forecast_vendor_costs', { valueAsNumber: true })} 
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      DJs, equipment rental, catering
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Additional Costs</h3>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="forecast_marketing_costs">
                      Marketing Costs
                    </label>
                    <Input 
                      id="forecast_marketing_costs" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      {...form.register('forecast_marketing_costs', { valueAsNumber: true })} 
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Should match marketing budget total
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="forecast_production_costs">
                      Production Costs
                    </label>
                    <Input 
                      id="forecast_production_costs" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      {...form.register('forecast_production_costs', { valueAsNumber: true })} 
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Content creation, photography, etc.
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="forecast_other_costs">
                      Other Fixed Costs
                    </label>
                    <Input 
                      id="forecast_other_costs" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      {...form.register('forecast_other_costs', { valueAsNumber: true })} 
                    />
                  </div>
                  
                  <div className="p-4 bg-red-50 rounded-lg">
                    <h4 className="font-semibold text-red-800">Total Costs</h4>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(totalCosts)}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="cost_notes">
                      Cost Notes
                    </label>
                    <Textarea 
                      id="cost_notes" 
                      placeholder="Notes about cost assumptions..."
                      {...form.register('cost_notes')} 
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
                Marketing Strategy & Budget
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Channel Budgets</h3>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="marketing_email_budget">
                      Email Marketing
                    </label>
                    <Input 
                      id="marketing_email_budget" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      {...form.register('marketing_email_budget', { valueAsNumber: true })} 
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="marketing_social_budget">
                      Organic Social Media
                    </label>
                    <Input 
                      id="marketing_social_budget" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      {...form.register('marketing_social_budget', { valueAsNumber: true })} 
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="marketing_paid_ads_budget">
                      Paid Advertising
                    </label>
                    <Input 
                      id="marketing_paid_ads_budget" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      {...form.register('marketing_paid_ads_budget', { valueAsNumber: true })} 
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="marketing_influencer_budget">
                      Influencer Partnerships
                    </label>
                    <Input 
                      id="marketing_influencer_budget" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      {...form.register('marketing_influencer_budget', { valueAsNumber: true })} 
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="marketing_content_budget">
                      Content Creation
                    </label>
                    <Input 
                      id="marketing_content_budget" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      {...form.register('marketing_content_budget', { valueAsNumber: true })} 
                    />
                  </div>
                  
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-semibold text-purple-800">Total Marketing Budget</h4>
                    <div className="text-2xl font-bold text-purple-600">
                      {formatCurrency(totalMarketingBudget)}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Strategy & Planning</h3>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="marketing_strategy">
                      Marketing Strategy
                    </label>
                    <Textarea 
                      id="marketing_strategy" 
                      rows={8}
                      placeholder="Describe your marketing approach, target audience, key messages, timeline, and success metrics..."
                      {...form.register('marketing_strategy')} 
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="marketing_notes">
                      Marketing Notes
                    </label>
                    <Textarea 
                      id="marketing_notes" 
                      placeholder="Additional marketing notes and considerations..."
                      {...form.register('marketing_notes')} 
                    />
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-800">Marketing ROI Target</h4>
                    <div className="text-sm text-blue-600">
                      Budget: {formatCurrency(totalMarketingBudget)}<br/>
                      Expected Revenue: {formatCurrency(totalRevenue)}<br/>
                      ROI: {totalMarketingBudget > 0 ? ((totalRevenue / totalMarketingBudget) * 100).toFixed(1) : '0'}%
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Event Details & Assumptions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Event Metrics</h3>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="estimated_attendance">
                      Estimated Attendance
                    </label>
                    <Input 
                      id="estimated_attendance" 
                      type="number" 
                      step="1" 
                      min="0"
                      placeholder="0"
                      {...form.register('estimated_attendance', { valueAsNumber: true })} 
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="ticket_price">
                      Average Ticket Price
                    </label>
                    <Input 
                      id="ticket_price" 
                      type="number" 
                      step="0.01" 
                      min="0"
                      placeholder="0.00"
                      {...form.register('ticket_price', { valueAsNumber: true })} 
                    />
                  </div>
                  
                  {watchedValues.estimated_attendance && watchedValues.ticket_price && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-gray-800">Ticket Revenue Calculation</h4>
                      <div className="text-sm text-gray-600">
                        {watchedValues.estimated_attendance} attendees × {formatCurrency(watchedValues.ticket_price)} = {formatCurrency(watchedValues.estimated_attendance * watchedValues.ticket_price)}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Additional Notes</h3>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="general_notes">
                      General Notes & Assumptions
                    </label>
                    <Textarea 
                      id="general_notes" 
                      rows={6}
                      placeholder="Any additional notes, assumptions, or considerations for this event forecast..."
                      {...form.register('general_notes')} 
                    />
                  </div>
                  
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-semibold text-yellow-800">Key Ratios</h4>
                    <div className="text-sm text-yellow-700 space-y-1">
                      <div>Revenue per attendee: {watchedValues.estimated_attendance ? formatCurrency(totalRevenue / watchedValues.estimated_attendance) : '$0'}</div>
                      <div>Cost per attendee: {watchedValues.estimated_attendance ? formatCurrency(totalCosts / watchedValues.estimated_attendance) : '$0'}</div>
                      <div>Profit per attendee: {watchedValues.estimated_attendance ? formatCurrency(netProfit / watchedValues.estimated_attendance) : '$0'}</div>
                    </div>
                  </div>
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
          disabled={createForecast.isPending || updateForecast.isPending || isSubmitting}
          className="bg-fortress-emerald hover:bg-fortress-emerald/90"
        >
          {createForecast.isPending || updateForecast.isPending || isSubmitting
            ? 'Saving...' 
            : existing 
              ? 'Update Forecast' 
              : 'Save Forecast'
          }
        </Button>
      </div>
    </form>
  );
};

export default SpecialEventForecastForm;
