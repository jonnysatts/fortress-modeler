/**
 * Costs Tab Component
 * 
 * This component handles the cost-related parameters in the scenario editor.
 */

import React from 'react';
import { Slider } from '@/components/ui/slider';
import { ScenarioParameterDeltas } from '../../types/scenarioTypes';
import { FinancialModel } from '@/lib/db';
import { formatCurrency, formatPercent } from '@/lib/utils';

interface CostsTabProps {
  baseModel: FinancialModel | null;
  localDeltas: ScenarioParameterDeltas;
  onParamChange: (param: keyof ScenarioParameterDeltas, value: number) => void;
}

const CostsTab: React.FC<CostsTabProps> = ({
  baseModel,
  localDeltas,
  onParamChange
}) => {
  // Extract cost values from the base model
  const costs = baseModel?.assumptions.metadata?.costs || {};
  
  // Calculate adjusted values
  const fbCogsPercent = costs.fbCOGSPercent || 0;
  const adjustedFbCogsPercent = fbCogsPercent * (1 + localDeltas.cogsMultiplier / 100);
  
  const merchCogsPercent = costs.merchandiseCogsPercent || 0;
  const adjustedMerchCogsPercent = merchCogsPercent * (1 + localDeltas.cogsMultiplier / 100);
  
  const staffCostPerPerson = costs.staffCostPerPerson || 0;
  const adjustedStaffCostPerPerson = staffCostPerPerson * (1 + localDeltas.cogsMultiplier / 100);

  return (
    <div className="space-y-6">
      <div>
        <div className="font-medium mb-2">
          Cost Multiplier
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Slider
              id="cogsMultiplier"
              min={-50}
              max={100}
              step={1}
              value={[localDeltas.cogsMultiplier]}
              onValueChange={values => onParamChange('cogsMultiplier', values[0])}
              className="flex-1"
            />
          </div>
          <div className="w-12 text-right">
            {localDeltas.cogsMultiplier}
          </div>
          <div className="w-6 text-left">%</div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Adjust all cost factors by percentage (COGS, staff costs).
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <div className="font-medium">Cost Impact</div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-sm font-medium">F&B COGS Percentage</div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Original:</span>
              <span className="text-sm">{formatPercent(fbCogsPercent)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Adjusted:</span>
              <span className="text-sm font-medium">{formatPercent(adjustedFbCogsPercent)}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium">Merchandise COGS Percentage</div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Original:</span>
              <span className="text-sm">{formatPercent(merchCogsPercent)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Adjusted:</span>
              <span className="text-sm font-medium">{formatPercent(adjustedMerchCogsPercent)}</span>
            </div>
          </div>

          {staffCostPerPerson > 0 && (
            <div className="space-y-1">
              <div className="text-sm font-medium">Staff Cost Per Person</div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Original:</span>
                <span className="text-sm">{formatCurrency(staffCostPerPerson)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Adjusted:</span>
                <span className="text-sm font-medium">{formatCurrency(adjustedStaffCostPerPerson)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-muted/50 rounded-md">
        <div className="text-sm font-medium mb-2">Cost Adjustment Notes</div>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>Increasing costs will reduce profit margins</li>
          <li>Cost adjustments apply to all cost categories</li>
          <li>Consider the impact on break-even point</li>
        </ul>
      </div>
    </div>
  );
};

export default CostsTab;
