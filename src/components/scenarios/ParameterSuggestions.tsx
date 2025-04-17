import React from 'react';
import { Button } from '@/components/ui/button';
import { ScenarioParameterDeltas } from '@/types/scenarios';
import { Lightbulb, ArrowRight, Check } from 'lucide-react';
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
    <div className="mb-4">
      <div className="border-l-4 border-amber-500 bg-white dark:bg-zinc-900 shadow-lg rounded-lg p-4 animate-fade-in">
        <div className="flex items-center mb-2">
          <Lightbulb className="text-amber-500 mr-2 h-6 w-6" />
          <span className="font-semibold text-lg text-amber-800 dark:text-amber-300">Suggestion</span>
        </div>
        <div className="mb-4 text-gray-700 dark:text-gray-200">
          Based on your <span className="font-medium">{formatParamName(sourceParam)}</span> change to <span className={sourceValue > 0 ? 'text-green-600' : 'text-red-600'}>{sourceValue > 0 ? '+' : ''}{sourceValue}%</span>, we suggest the following adjustments:
        </div>
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
        <div className="flex gap-2 justify-end mt-4">
          <Button
            variant="primary"
            className="bg-amber-600 hover:bg-amber-700 text-white flex items-center px-4 py-2 rounded shadow"
            size="sm"
            onClick={() => onAccept(suggestedChanges)}
          >
            <Check className="h-4 w-4 mr-1" /> Apply Suggestions
          </Button>
          <DirectIgnoreButton
            sourceParam={sourceParam}
            sourceValue={sourceValue}
            onDismiss={onDismiss}
          />
        </div>
      </div>
    </div>
  );
};

export default ParameterSuggestions;
