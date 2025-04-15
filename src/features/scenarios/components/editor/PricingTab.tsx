/**
 * Pricing Tab Component
 * 
 * This component handles the pricing-related parameters in the scenario editor.
 */

import React from 'react';
import { Slider } from '@/components/ui/slider';
import { ScenarioParameterDeltas } from '../../types/scenarioTypes';
import { FinancialModel } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';

interface PricingTabProps {
  baseModel: FinancialModel | null;
  localDeltas: ScenarioParameterDeltas;
  onParamChange: (param: keyof ScenarioParameterDeltas, value: number) => void;
}

const PricingTab: React.FC<PricingTabProps> = ({
  baseModel,
  localDeltas,
  onParamChange
}) => {
  // Extract per-customer values from the base model
  const perCustomer = baseModel?.assumptions.metadata?.perCustomer || {};
  
  // Calculate adjusted values
  const ticketPrice = perCustomer.ticketPrice || 0;
  const adjustedTicketPrice = ticketPrice * (1 + localDeltas.pricingPercent / 100);
  
  const fbSpend = perCustomer.fbSpend || 0;
  const adjustedFbSpend = fbSpend * (1 + localDeltas.pricingPercent / 100);
  
  const merchSpend = perCustomer.merchandiseSpend || 0;
  const adjustedMerchSpend = merchSpend * (1 + localDeltas.pricingPercent / 100);

  return (
    <div className="space-y-6">
      <div>
        <div className="font-medium mb-2">
          Pricing Adjustment
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Slider
              id="pricingPercent"
              min={-50}
              max={100}
              step={1}
              value={[localDeltas.pricingPercent]}
              onValueChange={values => onParamChange('pricingPercent', values[0])}
              className="flex-1"
            />
          </div>
          <div className="w-12 text-right">
            {localDeltas.pricingPercent}
          </div>
          <div className="w-6 text-left">%</div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Adjust all prices by percentage (ticket, F&B, merchandise).
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <div className="font-medium">Price Impact</div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-sm font-medium">Ticket Price</div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Original:</span>
              <span className="text-sm">{formatCurrency(ticketPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Adjusted:</span>
              <span className="text-sm font-medium">{formatCurrency(adjustedTicketPrice)}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium">F&B Spend</div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Original:</span>
              <span className="text-sm">{formatCurrency(fbSpend)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Adjusted:</span>
              <span className="text-sm font-medium">{formatCurrency(adjustedFbSpend)}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium">Merchandise Spend</div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Original:</span>
              <span className="text-sm">{formatCurrency(merchSpend)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Adjusted:</span>
              <span className="text-sm font-medium">{formatCurrency(adjustedMerchSpend)}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium">Total Per Customer</div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Original:</span>
              <span className="text-sm">{formatCurrency(ticketPrice + fbSpend + merchSpend)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Adjusted:</span>
              <span className="text-sm font-medium">{formatCurrency(adjustedTicketPrice + adjustedFbSpend + adjustedMerchSpend)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingTab;
