import React from 'react';
import {
  Alert,
  AlertDescription,
  AlertTitle
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ScenarioParameterDeltas } from '@/types/scenarios';
import { ArrowRight, Check } from 'lucide-react';
import { ParameterRelationship } from '@/lib/scenarioRelationships';
import DirectIgnoreButton from './DirectIgnoreButton';

interface ParameterSuggestionsProps {
  sourceParam: keyof ScenarioParameterDeltas;
  sourceValue: number;
  suggestedChanges: Partial<ScenarioParameterDeltas>;
  relationships: ParameterRelationship[];
  onAccept: (changes: Partial<ScenarioParameterDeltas>) => void;
  onDismiss: () => void;
}

/**
 * ParameterSuggestions Component
 * Displays suggested parameter changes based on relationships
 */
const ParameterSuggestions: React.FC<ParameterSuggestionsProps> = ({
  sourceParam,
  sourceValue,
  suggestedChanges,
  relationships,
  onAccept,
  onDismiss
}) => {
  if (Object.keys(suggestedChanges).length === 0) {
    return null;
  }

  // Format parameter name for display
  const formatParamName = (param: string) => {
    switch (param) {
      case 'marketingSpendPercent':
        return 'Marketing Budget';
      case 'pricingPercent':
        return 'Pricing';
      case 'attendanceGrowthPercent':
        return 'Attendance Growth';
      case 'cogsMultiplier':
        return 'COGS';
      default:
        return param.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    }
  };

  return (
    <Alert className="mb-4 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
      <AlertTitle className="flex items-center text-amber-800 dark:text-amber-300">
        <ArrowRight className="h-4 w-4 mr-2" />
        Suggested Parameter Changes
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="text-sm text-amber-800 dark:text-amber-300 mb-2">
          Based on your {formatParamName(sourceParam)} change to {sourceValue > 0 ? '+' : ''}{sourceValue}%,
          we suggest the following adjustments:
        </p>

        <div className="space-y-2 mb-3">
          {Object.entries(suggestedChanges).map(([param, value]) => {
            const relationship = relationships.find(r => r.targetParam === param);
            return (
              <div key={param} className="text-sm flex justify-between items-center">
                <div>
                  <span className="font-medium">{formatParamName(param)}:</span>{' '}
                  <span className={value >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {value > 0 ? '+' : ''}{value}%
                  </span>
                </div>
                {relationship && (
                  <span className="text-xs text-gray-500 max-w-[70%]">
                    {relationship.description}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end space-x-2">
          <DirectIgnoreButton
            sourceParam={sourceParam}
            sourceValue={sourceValue}
            onDismiss={onDismiss}
          />
          <Button
            variant="default"
            size="sm"
            onClick={() => onAccept(suggestedChanges)}
            className="h-8 px-2 text-xs bg-amber-600 hover:bg-amber-700"
          >
            <Check className="h-3 w-3 mr-1" />
            Apply Suggestions
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default ParameterSuggestions;
