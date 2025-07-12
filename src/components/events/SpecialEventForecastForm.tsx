import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useSpecialEventForecasts,
  useCreateSpecialEventForecast,
  useUpdateSpecialEventForecast,
} from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { sanitizeNumericInput, sanitizeTextInput } from '@/lib/security';

interface SpecialEventForecastFormProps {
  projectId: string;
}

const forecastSchema = z.object({
  forecast_fnb_revenue: z.number().min(0).optional(),
  forecast_fnb_cogs_pct: z.number().min(0).optional(),
  forecast_merch_revenue: z.number().min(0).optional(),
  forecast_merch_cogs_pct: z.number().min(0).optional(),
  forecast_sponsorship_income: z.number().min(0).optional(),
  forecast_ticket_sales: z.number().min(0).optional(),
  forecast_other_income: z.number().min(0).optional(),
  forecast_total_costs: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

type ForecastFormData = z.infer<typeof forecastSchema>;

export const SpecialEventForecastForm: React.FC<SpecialEventForecastFormProps> = ({
  projectId,
}) => {
  const { data: forecasts = [] } = useSpecialEventForecasts(projectId);
  const createForecast = useCreateSpecialEventForecast();
  const updateForecast = useUpdateSpecialEventForecast();

  const existing = forecasts[0];

  const form = useForm<ForecastFormData>({
    resolver: zodResolver(forecastSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (existing) {
      form.reset({
        ...existing,
      });
    }
  }, [existing, form]);

  const onSubmit = (data: ForecastFormData) => {
    const sanitized: Partial<ForecastFormData> = {
      forecast_fnb_revenue: data.forecast_fnb_revenue
        ? sanitizeNumericInput(data.forecast_fnb_revenue)
        : undefined,
      forecast_fnb_cogs_pct: data.forecast_fnb_cogs_pct
        ? sanitizeNumericInput(data.forecast_fnb_cogs_pct)
        : undefined,
      forecast_merch_revenue: data.forecast_merch_revenue
        ? sanitizeNumericInput(data.forecast_merch_revenue)
        : undefined,
      forecast_merch_cogs_pct: data.forecast_merch_cogs_pct
        ? sanitizeNumericInput(data.forecast_merch_cogs_pct)
        : undefined,
      forecast_sponsorship_income: data.forecast_sponsorship_income
        ? sanitizeNumericInput(data.forecast_sponsorship_income)
        : undefined,
      forecast_ticket_sales: data.forecast_ticket_sales
        ? sanitizeNumericInput(data.forecast_ticket_sales)
        : undefined,
      forecast_other_income: data.forecast_other_income
        ? sanitizeNumericInput(data.forecast_other_income)
        : undefined,
      forecast_total_costs: data.forecast_total_costs
        ? sanitizeNumericInput(data.forecast_total_costs)
        : undefined,
      notes: data.notes ? sanitizeTextInput(data.notes) : undefined,
    };

    if (existing) {
      updateForecast.mutate({ id: existing.id, data: sanitized });
    } else {
      createForecast.mutate({ project_id: projectId, ...sanitized });
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} aria-label="forecast-form">
      <Card>
        <CardHeader>
          <CardTitle>Special Event Forecast</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm" htmlFor="forecast_fnb_revenue">F&B Revenue</label>
            <Input id="forecast_fnb_revenue" type="number" step="any" {...form.register('forecast_fnb_revenue', { valueAsNumber: true })} />
          </div>
          <div>
            <label className="text-sm" htmlFor="forecast_fnb_cogs_pct">F&B COGS %</label>
            <Input id="forecast_fnb_cogs_pct" type="number" step="any" {...form.register('forecast_fnb_cogs_pct', { valueAsNumber: true })} />
          </div>
          <div>
            <label className="text-sm" htmlFor="forecast_merch_revenue">Merch Revenue</label>
            <Input id="forecast_merch_revenue" type="number" step="any" {...form.register('forecast_merch_revenue', { valueAsNumber: true })} />
          </div>
          <div>
            <label className="text-sm" htmlFor="forecast_merch_cogs_pct">Merch COGS %</label>
            <Input id="forecast_merch_cogs_pct" type="number" step="any" {...form.register('forecast_merch_cogs_pct', { valueAsNumber: true })} />
          </div>
          <div>
            <label className="text-sm" htmlFor="forecast_sponsorship_income">Sponsorship Income</label>
            <Input id="forecast_sponsorship_income" type="number" step="any" {...form.register('forecast_sponsorship_income', { valueAsNumber: true })} />
          </div>
          <div>
            <label className="text-sm" htmlFor="forecast_ticket_sales">Ticket Sales</label>
            <Input id="forecast_ticket_sales" type="number" step="any" {...form.register('forecast_ticket_sales', { valueAsNumber: true })} />
          </div>
          <div>
            <label className="text-sm" htmlFor="forecast_other_income">Other Income</label>
            <Input id="forecast_other_income" type="number" step="any" {...form.register('forecast_other_income', { valueAsNumber: true })} />
          </div>
          <div>
            <label className="text-sm" htmlFor="forecast_total_costs">Total Costs</label>
            <Input id="forecast_total_costs" type="number" step="any" {...form.register('forecast_total_costs', { valueAsNumber: true })} />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm" htmlFor="forecast_notes">Notes</label>
            <Textarea id="forecast_notes" {...form.register('notes')} />
          </div>
        </CardContent>
      </Card>
      <div className="mt-4">
        <Button type="submit" disabled={createForecast.isPending || updateForecast.isPending}>
          Save Forecast
        </Button>
      </div>
    </form>
  );
};

export default SpecialEventForecastForm;
