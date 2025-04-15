/**
 * Marketing Tab Component
 * 
 * This component handles the marketing-related parameters in the scenario editor.
 */

import React from 'react';
import { Slider } from '@/components/ui/slider';
import { ScenarioParameterDeltas } from '../../types/scenarioTypes';
import { FinancialModel } from '@/lib/db';
import MarketingChannelAdjuster from './MarketingChannelAdjuster';

interface MarketingTabProps {
  baseModel: FinancialModel | null;
  localDeltas: ScenarioParameterDeltas;
  onParamChange: (param: keyof ScenarioParameterDeltas, value: number) => void;
  onChannelParamChange: (channelId: string, value: number) => void;
}

const MarketingTab: React.FC<MarketingTabProps> = ({
  baseModel,
  localDeltas,
  onParamChange,
  onChannelParamChange
}) => {
  // Extract marketing setup from the base model
  const marketing = baseModel?.assumptions.marketing || { 
    allocationMode: 'highLevel', 
    channels: [] 
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <div className="font-medium mb-2">
            Overall Marketing Budget Adjustment
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Slider
                id="marketingSpendPercent"
                min={-50}
                max={100}
                step={1}
                value={[localDeltas.marketingSpendPercent]}
                onValueChange={values => onParamChange('marketingSpendPercent', values[0])}
                className="flex-1"
              />
            </div>
            <div className="w-12 text-right">
              {localDeltas.marketingSpendPercent}
            </div>
            <div className="w-6 text-left">%</div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Adjust the overall marketing budget by percentage.
          </p>
        </div>
      </div>

      {marketing.allocationMode === 'channels' && marketing.channels.length > 0 && (
        <div className="space-y-4">
          <div className="font-medium">Channel-Specific Adjustments</div>
          <p className="text-xs text-muted-foreground">
            Fine-tune individual marketing channels (applied on top of the overall adjustment).
          </p>

          <div className="space-y-4 mt-4">
            {marketing.channels.map(channel => (
              <MarketingChannelAdjuster
                key={channel.id}
                channel={channel}
                value={localDeltas.marketingSpendByChannel[channel.id] || 0}
                onChange={value => onChannelParamChange(channel.id, value)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketingTab;
