import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { MarketingChannel } from '@/types/models';

interface MarketingChannelAdjusterProps {
  channels: MarketingChannel[];
  channelAdjustments: Record<string, number>;
  onChannelAdjustmentChange: (channelId: string, percentChange: number) => void;
}

const MarketingChannelAdjuster: React.FC<MarketingChannelAdjusterProps> = ({
  channels,
  channelAdjustments,
  onChannelAdjustmentChange
}) => {
  if (!channels || channels.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-muted-foreground">No marketing channels available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {channels.map(channel => {
        const adjustment = channelAdjustments[channel.id] || 0;
        
        return (
          <div key={channel.id} className="space-y-2">
            <div className="flex justify-between">
              <div>
                <p className="font-medium">{channel.name}</p>
                <p className="text-sm text-muted-foreground">{channel.type}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">
                  {formatCurrency(channel.budget)} 
                  <span className="text-muted-foreground"> + </span>
                  <span className={adjustment >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatPercent(adjustment)}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  = {formatCurrency(channel.budget * (1 + adjustment / 100))}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Slider
                min={-50}
                max={100}
                step={1}
                value={[adjustment]}
                onValueChange={values => onChannelAdjustmentChange(channel.id, values[0])}
                className="flex-1"
              />
              <div className="w-20 flex-shrink-0">
                <Input
                  type="number"
                  value={adjustment}
                  onChange={e => onChannelAdjustmentChange(channel.id, Number(e.target.value))}
                  className="text-right"
                  min={-50}
                  max={100}
                />
              </div>
              <div className="w-6 text-right">%</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MarketingChannelAdjuster;
