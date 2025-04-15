/**
 * Attendance Tab Component
 * 
 * This component handles the attendance-related parameters in the scenario editor.
 */

import React from 'react';
import { Slider } from '@/components/ui/slider';
import { ScenarioParameterDeltas } from '../../types/scenarioTypes';
import { FinancialModel } from '@/lib/db';
import { getRelationshipDescription } from '../../utils/scenarioRelationships';

interface AttendanceTabProps {
  baseModel: FinancialModel | null;
  localDeltas: ScenarioParameterDeltas;
  onParamChange: (param: keyof ScenarioParameterDeltas, value: number) => void;
}

const AttendanceTab: React.FC<AttendanceTabProps> = ({
  baseModel,
  localDeltas,
  onParamChange
}) => {
  // Extract attendance values from the base model
  const initialAttendance = baseModel?.assumptions.metadata?.initialWeeklyAttendance || 0;
  const baseGrowthRate = baseModel?.assumptions.metadata?.growth?.attendanceGrowthRate || 0;
  const adjustedGrowthRate = baseGrowthRate + localDeltas.attendanceGrowthPercent;
  
  // Get relationship descriptions
  const marketingRelationship = getRelationshipDescription('marketingSpendPercent', 'attendanceGrowthPercent');
  const pricingRelationship = getRelationshipDescription('pricingPercent', 'attendanceGrowthPercent');

  return (
    <div className="space-y-6">
      <div>
        <div className="font-medium mb-2">
          Attendance Growth Rate Adjustment
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Slider
              id="attendanceGrowthPercent"
              min={-10}
              max={20}
              step={0.5}
              value={[localDeltas.attendanceGrowthPercent]}
              onValueChange={values => onParamChange('attendanceGrowthPercent', values[0])}
              className="flex-1"
            />
          </div>
          <div className="w-12 text-right">
            {localDeltas.attendanceGrowthPercent}
          </div>
          <div className="w-12 text-left">points</div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Adjust the attendance growth rate by percentage points.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <div className="font-medium">Growth Rate Impact</div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Base Growth Rate:</span>
            <span className="text-sm">{baseGrowthRate.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Adjustment:</span>
            <span className="text-sm">{localDeltas.attendanceGrowthPercent > 0 ? '+' : ''}{localDeltas.attendanceGrowthPercent.toFixed(1)} points</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Adjusted Growth Rate:</span>
            <span className="text-sm font-medium">{adjustedGrowthRate.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="font-medium">Related Parameters</div>
        <div className="space-y-4">
          {marketingRelationship && (
            <div className="p-3 bg-muted/50 rounded-md">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="text-sm">Marketing Budget: {localDeltas.marketingSpendPercent}%</div>
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-4">
                {marketingRelationship}
              </p>
            </div>
          )}
          
          {pricingRelationship && (
            <div className="p-3 bg-muted/50 rounded-md">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="text-sm">Pricing: {localDeltas.pricingPercent}%</div>
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-4">
                {pricingRelationship}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceTab;
