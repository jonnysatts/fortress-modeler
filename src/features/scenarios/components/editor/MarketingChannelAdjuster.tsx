/**
 * Marketing Channel Adjuster Component
 * 
 * This component allows adjusting the budget for a specific marketing channel.
 */

import React from 'react';
import { Slider } from '@/components/ui/slider';
import { formatCurrency } from '@/lib/utils';

interface MarketingChannel {
  id: string;
  name?: string;
  channelType?: string;
  weeklyBudget: number;
  targetAudience?: string;
  description?: string;
}

interface MarketingChannelAdjusterProps {
  channel: MarketingChannel;
  value: number;
  onChange: (value: number) => void;
}

const MarketingChannelAdjuster: React.FC<MarketingChannelAdjusterProps> = ({
  channel,
  value,
  onChange
}) => {
  // Calculate adjusted budget
  const adjustedBudget = channel.weeklyBudget * (1 + value / 100);
  
  // Format channel name
  const channelName = channel.name || channel.channelType || `Channel ${channel.id}`;

  return (
    <div className="border rounded-md p-3">
      <div className="flex justify-between items-center mb-2">
        <div className="font-medium text-sm">{channelName}</div>
        <div className="text-xs text-muted-foreground">
          Base: {formatCurrency(channel.weeklyBudget)}/week
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Slider
            min={-100}
            max={200}
            step={5}
            value={[value]}
            onValueChange={values => onChange(values[0])}
            className="flex-1"
          />
        </div>
        <div className="w-12 text-right text-sm">
          {value}
        </div>
        <div className="w-6 text-left text-sm">%</div>
      </div>
      
      <div className="flex justify-between mt-2">
        <div className="text-xs text-muted-foreground">
          {channel.targetAudience && `Target: ${channel.targetAudience}`}
        </div>
        <div className="text-xs font-medium">
          Adjusted: {formatCurrency(adjustedBudget)}/week
        </div>
      </div>
    </div>
  );
};

export default MarketingChannelAdjuster;
