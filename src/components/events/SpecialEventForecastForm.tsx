// Enhanced SpecialEventForecastForm.tsx with automatic COGS calculation
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { sanitizeNumericInput, sanitizeTextInput } from '@/lib/security';
import { toast } from 'sonner';
import { 
  DollarSign, 
  Users, 
  Megaphone, 
  Calculator, 
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface SpecialEventForecastFormProps {
  projectId: string;
}

// Enhanced schema with automatic COGS calculation support
const forecastSchema = z.object({
  // Revenue streams
  forecast_ticket_sales: z.union([z.number().min(0), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  forecast_fnb_revenue: z.union([z.number().min(0), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  forecast_merch_revenue: z.union([z.number().min(0), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  forecast_sponsorship_income: z.union([z.number().min(0), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  forecast_other_income: z.union([z.number().min(0), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  
  // COGS configuration - NEW
  use_automatic_fnb_cogs: z.boolean().default(true),
  forecast_fnb_cogs_pct: z.union([z.number().min(0).max(100), z.nan()]).optional().transform(val => isNaN(val as number) ? 30 : val).default(30),
  
  use_automatic_merch_cogs: z.boolean().default(true),
  forecast_merch_cogs_pct: z.union([z.number().min(0).max(100), z.nan()]).optional().transform(val => isNaN(val as number) ? 50 : val).default(50),
  
  // Cost breakdown
  forecast_staffing_costs: z.union([z.number().min(0), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  forecast_venue_costs: z.union([z.number().min(0), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  forecast_vendor_costs: z.union([z.number().min(0), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  forecast_marketing_costs: z.union([z.number().min(0), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  forecast_production_costs: z.union([z.number().min(0), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  forecast_other_costs: z.union([z.number().min(0), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  
  // Marketing budget breakdown
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
}).refine((data) => {
  // Validate COGS percentages are reasonable
  const fnbCogsValid = data.forecast_fnb_cogs_pct >= 15 && data.forecast_fnb_cogs_pct <= 50;
  const merchCogsValid = data.forecast_merch_cogs_pct >= 30 && data.forecast_merch_cogs_pct <= 70;
  
  return fnbCogsValid && merchCogsValid;
}, {
  message: "COGS percentages should be within reasonable ranges (F&B: 15-50%, Merchandise: 30-70%)"
});

type ForecastFormData = z.infer<typeof forecastSchema>;

// COGS calculation helper functions
const calculateFnBCogs = (revenue: number, percentage: number): number => {
  return Math.round(revenue * (percentage / 100));
};

const calculateMerchCogs = (revenue: number, percentage: number): number => {
  return Math.round(revenue * (percentage / 100));
};

const validateCOGSPercentage = (percentage: number, type: 'fnb' | 'merchandise'): { isValid: boolean; warning?: string } => {
  if (type === 'fnb') {
    if (percentage > 40) return { isValid: false, warning: `F&B COGS percentage (${percentage}%) is high - typical range is 25-35%` };
    if (percentage < 20) return { isValid: false, warning: `F&B COGS percentage (${percentage}%) is low - typical range is 25-35%` };
  } else {
    if (percentage > 60) return { isValid: false, warning: `Merchandise COGS percentage (${percentage}%) is high - typical range is 40-55%` };
    if (percentage < 35) return { isValid: false, warning: `Merchandise COGS percentage (${percentage}%) is low - typical range is 40-55%` };
  }
  return { isValid: true };
};

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
    defaultValues: {
      use_automatic_fnb_cogs: true,
      forecast_fnb_cogs_pct: 30,
      use_automatic_merch_cogs: true,
      forecast_merch_cogs_pct: 50,
    },
  });

  const watchedValues = form.watch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Calculate totals and COGS
  const totalRevenue = (watchedValues.forecast_ticket_sales || 0) +
    (watchedValues.forecast_fnb_revenue || 0) +
    (watchedValues.forecast_merch_revenue || 0) +
    (watchedValues.forecast_sponsorship_income || 0) +
    (watchedValues.forecast_other_income || 0);

  // Calculate automatic COGS
  const calculatedFnBCogs = watchedValues.use_automatic_fnb_cogs ? 
    calculateFnBCogs(watchedValues.forecast_fnb_revenue || 0, watchedValues.forecast_fnb_cogs_pct || 30) : 0;
  
  const calculatedMerchCogs = watchedValues.use_automatic_merch_cogs ? 
    calculateMerchCogs(watchedValues.forecast_merch_revenue || 0, watchedValues.forecast_merch_cogs_pct || 50) : 0;

  const totalCosts = (watchedValues.forecast_staffing_costs || 0) +
    (watchedValues.forecast_venue_costs || 0) +
    (watchedValues.forecast_vendor_costs || 0) +
    (watchedValues.forecast_marketing_costs || 0) +
    (watchedValues.forecast_production_costs || 0) +
    (watchedValues.forecast_other_costs || 0) +
    calculatedFnBCogs +
    calculatedMerchCogs;

  const totalMarketingBudget = (watchedValues.marketing_email_budget || 0) +
    (watchedValues.marketing_social_budget || 0) +
    (watchedValues.marketing_influencer_budget || 0) +
    (watchedValues.marketing_paid_ads_budget || 0) +
    (watchedValues.marketing_content_budget || 0);

  const netProfit = totalRevenue - totalCosts;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // COGS validation
  const fnbCogsValidation = validateCOGSPercentage(watchedValues.forecast_fnb_cogs_pct || 30, 'fnb');
  const merchCogsValidation = validateCOGSPercentage(watchedValues.forecast_merch_cogs_pct || 50, 'merchandise');

  // Load existing data
  useEffect(() => {
    if (existing && !hasInitialized) {
      const resetData = {
        forecast_ticket_sales: existing.forecast_ticket_sales || undefined,
        forecast_fnb_revenue: existing.forecast_fnb_revenue || undefined,
        forecast_merch_revenue: existing.forecast_merch_revenue || undefined,
        forecast_sponsorship_income: existing.forecast_sponsorship_income || undefined,
        forecast_other_income: existing.forecast_other_income || undefined,
        
        // Load COGS settings (with defaults if not present)
        use_automatic_fnb_cogs: existing.use_automatic_fnb_cogs ?? true,
        forecast_fnb_cogs_pct: existing.forecast_fnb_cogs_pct || 30,
        use_automatic_merch_cogs: existing.use_automatic_merch_cogs ?? true,
        forecast_merch_cogs_pct: existing.forecast_merch_cogs_pct || 50,
        
        forecast_staffing_costs: existing.forecast_staffing_costs || undefined,
        forecast_venue_costs: existing.forecast_venue_costs || undefined,
        forecast_vendor_costs: existing.forecast_vendor_costs || undefined,
        forecast_marketing_costs: existing.forecast_marketing_costs || undefined,
        forecast_production_costs: existing.forecast_production_costs || undefined,
        forecast_other_costs: existing.forecast_other_costs || undefined,
        
        marketing_email_budget: existing.marketing_email_budget || undefined,
        marketing_social_budget: existing.marketing_social_budget || undefined,
        marketing_influencer_budget: existing.marketing_influencer_budget || undefined,
        marketing_paid_ads_budget: existing.marketing_paid_ads_budget || undefined,
        marketing_content_budget: existing.marketing_content_budget || undefined,
        marketing_strategy: existing.marketing_strategy || undefined,
        
        estimated_attendance: existing.estimated_attendance || undefined,
        ticket_price: existing.ticket_price || undefined,
        
        revenue_notes: existing.revenue_notes || undefined,
        cost_notes: existing.cost_notes || undefined,
        marketing_notes: existing.marketing_notes || undefined,
        general_notes: existing.general_notes || undefined,
      };

      form.reset(resetData);
      setHasInitialized(true);
    }
  }, [existing, form, hasInitialized]);

  const handleSubmit = async (data: ForecastFormData) => {
    try {
      setIsSubmitting(true);

      // Prepare data with calculated COGS
      const submitData = {
        ...data,
        calculated_fnb_cogs: calculatedFnBCogs,
        calculated_merch_cogs: calculatedMerchCogs,
      };

      if (existing) {
        await updateForecast.mutateAsync({ 
          id: existing.id, 
          data: submitData 
        });
        toast.success('Forecast updated successfully');
      } else {
        await createForecast.mutateAsync({
          project_id: projectId,
          ...submitData,
        });
        toast.success('Forecast created successfully');
      }
    } catch (error) {
      console.error('Error saving forecast:', error);
      toast.error('Failed to save forecast');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">${totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Net Profit</p>
                <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${netProfit.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Profit Margin</p>
                <p className={`text-2xl font-bold ${profitMargin >= 20 ? 'text-green-600' : profitMargin >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {profitMargin.toFixed(1)}%
                </p>
              </div>
              <Calculator className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total COGS</p>
                <p className="text-2xl font-bold text-orange-600">
                  ${(calculatedFnBCogs + calculatedMerchCogs).toLocaleString()}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
            <div className="mt-2">
              <Badge variant="outline">
                Auto-calculated
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="cogs">COGS & Margins</TabsTrigger>
            <TabsTrigger value="costs">Costs</TabsTrigger>
            <TabsTrigger value="marketing">Marketing</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Event Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="estimated_attendance">Estimated Attendance</Label>
                    <Input
                      id="estimated_attendance"
                      type="number"
                      {...form.register('estimated_attendance', { 
                        setValueAs: v => v === '' ? undefined : Number(v) 
                      })}
                      className="text-right"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ticket_price">Average Ticket Price</Label>
                    <Input
                      id="ticket_price"
                      type="number"
                      step="0.01"
                      {...form.register('ticket_price', { 
                        setValueAs: v => v === '' ? undefined : Number(v) 
                      })}
                      className="text-right"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="general_notes">General Notes & Assumptions</Label>
                  <Textarea
                    id="general_notes"
                    {...form.register('general_notes')}
                    placeholder="Any additional notes, assumptions, or considerations for this event forecast..."
                    rows={3}
                  />
                </div>

                {/* Key Ratios Display */}
                {watchedValues.estimated_attendance && totalRevenue > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Key Ratios</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Revenue per attendee:</span>
                        <span className="font-medium ml-2">
                          ${(totalRevenue / watchedValues.estimated_attendance).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Cost per attendee:</span>
                        <span className="font-medium ml-2">
                          ${(totalCosts / watchedValues.estimated_attendance).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Profit per attendee:</span>
                        <span className="font-medium ml-2">
                          ${(netProfit / watchedValues.estimated_attendance).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Forecasts</CardTitle>
                <p className="text-sm text-gray-600">All fields are optional. Only fill in the revenue streams that apply to your event.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Primary Revenue Streams</h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="forecast_ticket_sales">Ticket Sales</Label>
                      <Input
                        id="forecast_ticket_sales"
                        type="number"
                        {...form.register('forecast_ticket_sales', { 
                          setValueAs: v => v === '' ? undefined : Number(v) 
                        })}
                        className="text-right"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="forecast_fnb_revenue">F&B Revenue</Label>
                      <Input
                        id="forecast_fnb_revenue"
                        type="number"
                        {...form.register('forecast_fnb_revenue', { 
                          setValueAs: v => v === '' ? undefined : Number(v) 
                        })}
                        className="text-right"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="forecast_merch_revenue">Merchandise Revenue</Label>
                      <Input
                        id="forecast_merch_revenue"
                        type="number"
                        {...form.register('forecast_merch_revenue', { 
                          setValueAs: v => v === '' ? undefined : Number(v) 
                        })}
                        className="text-right"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Additional Revenue</h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="forecast_sponsorship_income">Sponsorship Income</Label>
                      <Input
                        id="forecast_sponsorship_income"
                        type="number"
                        {...form.register('forecast_sponsorship_income', { 
                          setValueAs: v => v === '' ? undefined : Number(v) 
                        })}
                        className="text-right"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="forecast_other_income">Other Income</Label>
                      <Input
                        id="forecast_other_income"
                        type="number"
                        {...form.register('forecast_other_income', { 
                          setValueAs: v => v === '' ? undefined : Number(v) 
                        })}
                        className="text-right"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-medium text-green-800">Total Revenue</h4>
                      <p className="text-2xl font-bold text-green-600">${totalRevenue.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="revenue_notes">Revenue Notes</Label>
                  <Textarea
                    id="revenue_notes"
                    {...form.register('revenue_notes')}
                    placeholder="Notes about revenue assumptions..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cogs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cost of Goods Sold (COGS)</CardTitle>
                <p className="text-sm text-gray-600">Automatic COGS calculation based on revenue percentages</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* F&B COGS */}
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">F&B COGS</h4>
                    <Badge variant={fnbCogsValidation.isValid ? 'default' : 'destructive'}>
                      {(watchedValues.forecast_fnb_cogs_pct || 30).toFixed(1)}% of F&B Revenue
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={watchedValues.use_automatic_fnb_cogs}
                      onCheckedChange={(checked) => form.setValue('use_automatic_fnb_cogs', checked)}
                    />
                    <Label>Automatic calculation</Label>
                  </div>

                  {watchedValues.use_automatic_fnb_cogs && (
                    <div className="space-y-2">
                      <Label>COGS Percentage</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          {...form.register('forecast_fnb_cogs_pct', { 
                            setValueAs: v => v === '' ? 30 : Number(v) 
                          })}
                          className="w-32"
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">F&B Revenue: </span>
                        <span className="font-medium">${(watchedValues.forecast_fnb_revenue || 0).toLocaleString()}</span>
                        <span className="text-gray-600 ml-4">Calculated COGS: </span>
                        <span className="font-medium text-orange-600">${calculatedFnBCogs.toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  {!fnbCogsValidation.isValid && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {fnbCogsValidation.warning}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Merchandise COGS */}
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Merchandise COGS</h4>
                    <Badge variant={merchCogsValidation.isValid ? 'default' : 'destructive'}>
                      {(watchedValues.forecast_merch_cogs_pct || 50).toFixed(1)}% of Merch Revenue
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={watchedValues.use_automatic_merch_cogs}
                      onCheckedChange={(checked) => form.setValue('use_automatic_merch_cogs', checked)}
                    />
                    <Label>Automatic calculation</Label>
                  </div>

                  {watchedValues.use_automatic_merch_cogs && (
                    <div className="space-y-2">
                      <Label>COGS Percentage</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          {...form.register('forecast_merch_cogs_pct', { 
                            setValueAs: v => v === '' ? 50 : Number(v) 
                          })}
                          className="w-32"
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Merchandise Revenue: </span>
                        <span className="font-medium">${(watchedValues.forecast_merch_revenue || 0).toLocaleString()}</span>
                        <span className="text-gray-600 ml-4">Calculated COGS: </span>
                        <span className="font-medium text-orange-600">${calculatedMerchCogs.toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  {!merchCogsValidation.isValid && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {merchCogsValidation.warning}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* COGS Summary */}
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-medium text-orange-800 mb-2">Total COGS Summary</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">F&B COGS:</span>
                      <p className="font-medium">${calculatedFnBCogs.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Merchandise COGS:</span>
                      <p className="font-medium">${calculatedMerchCogs.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Total COGS:</span>
                      <p className="font-bold text-orange-600">${(calculatedFnBCogs + calculatedMerchCogs).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="costs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cost Forecasts</CardTitle>
                <p className="text-sm text-gray-600">All fields are optional. Only fill in the cost categories that apply to your event.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Operational Costs</h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="forecast_staffing_costs">Staffing Costs</Label>
                      <Input
                        id="forecast_staffing_costs"
                        type="number"
                        {...form.register('forecast_staffing_costs', { 
                          setValueAs: v => v === '' ? undefined : Number(v) 
                        })}
                        className="text-right"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500">Wages, contractors, security, etc.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="forecast_venue_costs">Venue & Setup Costs</Label>
                      <Input
                        id="forecast_venue_costs"
                        type="number"
                        {...form.register('forecast_venue_costs', { 
                          setValueAs: v => v === '' ? undefined : Number(v) 
                        })}
                        className="text-right"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500">Rental, AV, fixtures, signage</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="forecast_vendor_costs">External Vendor Costs</Label>
                      <Input
                        id="forecast_vendor_costs"
                        type="number"
                        {...form.register('forecast_vendor_costs', { 
                          setValueAs: v => v === '' ? undefined : Number(v) 
                        })}
                        className="text-right"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500">DJs, equipment rental, catering</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Additional Costs</h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="forecast_marketing_costs">Marketing Costs</Label>
                      <Input
                        id="forecast_marketing_costs"
                        type="number"
                        {...form.register('forecast_marketing_costs', { 
                          setValueAs: v => v === '' ? undefined : Number(v) 
                        })}
                        className="text-right"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500">Should match marketing budget total</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="forecast_production_costs">Production Costs</Label>
                      <Input
                        id="forecast_production_costs"
                        type="number"
                        {...form.register('forecast_production_costs', { 
                          setValueAs: v => v === '' ? undefined : Number(v) 
                        })}
                        className="text-right"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500">Content creation, photography, etc.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="forecast_other_costs">Other Fixed Costs</Label>
                      <Input
                        id="forecast_other_costs"
                        type="number"
                        {...form.register('forecast_other_costs', { 
                          setValueAs: v => v === '' ? undefined : Number(v) 
                        })}
                        className="text-right"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="bg-red-50 p-4 rounded-lg">
                      <h4 className="font-medium text-red-800">Total Costs</h4>
                      <p className="text-sm text-gray-600 mb-1">Including COGS</p>
                      <p className="text-2xl font-bold text-red-600">${totalCosts.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_notes">Cost Notes</Label>
                  <Textarea
                    id="cost_notes"
                    {...form.register('cost_notes')}
                    placeholder="Notes about cost assumptions..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="marketing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Marketing Budget Allocation</CardTitle>
                <p className="text-sm text-gray-600">Break down your marketing spend by channel</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="marketing_email_budget">Email Marketing</Label>
                    <Input
                      id="marketing_email_budget"
                      type="number"
                      {...form.register('marketing_email_budget', { 
                        setValueAs: v => v === '' ? undefined : Number(v) 
                      })}
                      className="text-right"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="marketing_social_budget">Social Media</Label>
                    <Input
                      id="marketing_social_budget"
                      type="number"
                      {...form.register('marketing_social_budget', { 
                        setValueAs: v => v === '' ? undefined : Number(v) 
                      })}
                      className="text-right"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="marketing_influencer_budget">Influencer Marketing</Label>
                    <Input
                      id="marketing_influencer_budget"
                      type="number"
                      {...form.register('marketing_influencer_budget', { 
                        setValueAs: v => v === '' ? undefined : Number(v) 
                      })}
                      className="text-right"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="marketing_paid_ads_budget">Paid Advertising</Label>
                    <Input
                      id="marketing_paid_ads_budget"
                      type="number"
                      {...form.register('marketing_paid_ads_budget', { 
                        setValueAs: v => v === '' ? undefined : Number(v) 
                      })}
                      className="text-right"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="marketing_content_budget">Content Creation</Label>
                    <Input
                      id="marketing_content_budget"
                      type="number"
                      {...form.register('marketing_content_budget', { 
                        setValueAs: v => v === '' ? undefined : Number(v) 
                      })}
                      className="text-right"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-800">Total Marketing Budget</h4>
                    <p className="text-2xl font-bold text-blue-600">${totalMarketingBudget.toLocaleString()}</p>
                    {Math.abs(totalMarketingBudget - (watchedValues.forecast_marketing_costs || 0)) > 1 && (
                      <Badge variant="destructive" className="mt-2">
                        Doesn't match marketing costs
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marketing_strategy">Marketing Strategy</Label>
                  <Textarea
                    id="marketing_strategy"
                    {...form.register('marketing_strategy')}
                    placeholder="Describe your overall marketing strategy and approach..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marketing_notes">Marketing Notes</Label>
                  <Textarea
                    id="marketing_notes"
                    {...form.register('marketing_notes')}
                    placeholder="Additional marketing notes and assumptions..."
                    rows={2}
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
            {isSubmitting ? 'Saving...' : existing ? 'Update Forecast' : 'Create Forecast'}
          </Button>
        </div>
      </form>
    </div>
  );
};
export default SpecialEventForecastForm;
