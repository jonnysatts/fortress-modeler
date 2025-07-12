import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useSpecialEventActuals,
  useCreateSpecialEventActual,
  useUpdateSpecialEventActual,
} from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { sanitizeNumericInput, sanitizeTextInput } from '@/lib/security';

interface SpecialEventActualFormProps {
  projectId: string;
}

const actualSchema = z.object({
  actual_fnb_revenue: z.number().min(0).optional(),
  actual_fnb_cogs: z.number().min(0).optional(),
  actual_merch_revenue: z.number().min(0).optional(),
  actual_merch_cogs: z.number().min(0).optional(),
  actual_sponsorship_income: z.number().min(0).optional(),
  actual_ticket_sales: z.number().min(0).optional(),
  actual_other_income: z.number().min(0).optional(),
  actual_total_costs: z.number().min(0).optional(),
  attendance: z.number().min(0).optional(),
  success_rating: z.number().min(0).max(5).optional(),
  notes: z.string().max(500).optional(),
});

type ActualFormData = z.infer<typeof actualSchema>;

export const SpecialEventActualForm: React.FC<SpecialEventActualFormProps> = ({ projectId }) => {
  const { data: actuals = [] } = useSpecialEventActuals(projectId);
  const createActual = useCreateSpecialEventActual();
  const updateActual = useUpdateSpecialEventActual();

  const existing = actuals[0];

  const form = useForm<ActualFormData>({
    resolver: zodResolver(actualSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (existing) {
      form.reset({
        ...existing,
      });
    }
  }, [existing, form]);

  const onSubmit = (data: ActualFormData) => {
    const sanitized: Partial<ActualFormData> = {
      actual_fnb_revenue: data.actual_fnb_revenue ? sanitizeNumericInput(data.actual_fnb_revenue) : undefined,
      actual_fnb_cogs: data.actual_fnb_cogs ? sanitizeNumericInput(data.actual_fnb_cogs) : undefined,
      actual_merch_revenue: data.actual_merch_revenue ? sanitizeNumericInput(data.actual_merch_revenue) : undefined,
      actual_merch_cogs: data.actual_merch_cogs ? sanitizeNumericInput(data.actual_merch_cogs) : undefined,
      actual_sponsorship_income: data.actual_sponsorship_income ? sanitizeNumericInput(data.actual_sponsorship_income) : undefined,
      actual_ticket_sales: data.actual_ticket_sales ? sanitizeNumericInput(data.actual_ticket_sales) : undefined,
      actual_other_income: data.actual_other_income ? sanitizeNumericInput(data.actual_other_income) : undefined,
      actual_total_costs: data.actual_total_costs ? sanitizeNumericInput(data.actual_total_costs) : undefined,
      attendance: data.attendance ? sanitizeNumericInput(data.attendance) : undefined,
      success_rating: data.success_rating ? sanitizeNumericInput(data.success_rating) : undefined,
      notes: data.notes ? sanitizeTextInput(data.notes) : undefined,
    };

    if (existing) {
      updateActual.mutate({ id: existing.id, data: sanitized });
    } else {
      createActual.mutate({ project_id: projectId, ...sanitized });
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} aria-label="actual-form">
      <Card>
        <CardHeader>
          <CardTitle>Special Event Actuals</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm" htmlFor="actual_fnb_revenue">F&B Revenue</label>
            <Input id="actual_fnb_revenue" type="number" step="any" {...form.register('actual_fnb_revenue', { valueAsNumber: true })} />
          </div>
          <div>
            <label className="text-sm" htmlFor="actual_fnb_cogs">F&B COGS</label>
            <Input id="actual_fnb_cogs" type="number" step="any" {...form.register('actual_fnb_cogs', { valueAsNumber: true })} />
          </div>
          <div>
            <label className="text-sm" htmlFor="actual_merch_revenue">Merch Revenue</label>
            <Input id="actual_merch_revenue" type="number" step="any" {...form.register('actual_merch_revenue', { valueAsNumber: true })} />
          </div>
          <div>
            <label className="text-sm" htmlFor="actual_merch_cogs">Merch COGS</label>
            <Input id="actual_merch_cogs" type="number" step="any" {...form.register('actual_merch_cogs', { valueAsNumber: true })} />
          </div>
          <div>
            <label className="text-sm" htmlFor="actual_sponsorship_income">Sponsorship Income</label>
            <Input id="actual_sponsorship_income" type="number" step="any" {...form.register('actual_sponsorship_income', { valueAsNumber: true })} />
          </div>
          <div>
            <label className="text-sm" htmlFor="actual_ticket_sales">Ticket Sales</label>
            <Input id="actual_ticket_sales" type="number" step="any" {...form.register('actual_ticket_sales', { valueAsNumber: true })} />
          </div>
          <div>
            <label className="text-sm" htmlFor="actual_other_income">Other Income</label>
            <Input id="actual_other_income" type="number" step="any" {...form.register('actual_other_income', { valueAsNumber: true })} />
          </div>
          <div>
            <label className="text-sm" htmlFor="actual_total_costs">Total Costs</label>
            <Input id="actual_total_costs" type="number" step="any" {...form.register('actual_total_costs', { valueAsNumber: true })} />
          </div>
          <div>
            <label className="text-sm" htmlFor="attendance">Attendance</label>
            <Input id="attendance" type="number" step="any" {...form.register('attendance', { valueAsNumber: true })} />
          </div>
          <div>
            <label className="text-sm" htmlFor="success_rating">Success Rating (0-5)</label>
            <Input id="success_rating" type="number" step="any" {...form.register('success_rating', { valueAsNumber: true })} />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm" htmlFor="actual_notes">Notes</label>
            <Textarea id="actual_notes" {...form.register('notes')} />
          </div>
        </CardContent>
      </Card>
      <div className="mt-4">
        <Button type="submit" disabled={createActual.isPending || updateActual.isPending}>Save Actuals</Button>
      </div>
    </form>
  );
};

export default SpecialEventActualForm;
