/**
 * useScenarioEditor Hook
 *
 * Custom hook for managing scenario editor state and logic.
 */

import { useState, useEffect, useRef } from 'react';
import { Scenario, ScenarioParameterDeltas, ScenarioEditorState } from '../types/scenarioTypes';
import { calculateRelatedChanges } from '../utils/scenarioRelationships';
import { toast } from '@/components/ui/use-toast';

interface UseScenarioEditorProps {
  scenario: Scenario | null;
  onSave: (updatedScenario: Scenario) => Promise<void>;
  onCancel: () => void;
}

interface UseScenarioEditorReturn extends ScenarioEditorState {
  // Actions
  handleParamChange: (param: keyof ScenarioParameterDeltas, value: number) => void;
  handleChannelParamChange: (channelId: string, value: number) => void;
  handleSave: () => Promise<void>;
  handleReset: () => void;
  handleCancel: () => void;
  setActiveTab: (tab: string) => void;
}

/**
 * Custom hook for managing scenario editor state and logic
 */
export default function useScenarioEditor({
  scenario,
  onSave,
  onCancel
}: UseScenarioEditorProps): UseScenarioEditorReturn {
  // State
  const [localDeltas, setLocalDeltas] = useState<ScenarioParameterDeltas>({
    marketingSpendPercent: 0,
    marketingSpendByChannel: {},
    pricingPercent: 0,
    attendanceGrowthPercent: 0,
    cogsMultiplier: 0
  });
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('marketing');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Refs
  const originalDeltasRef = useRef<ScenarioParameterDeltas | null>(null);

  // Initialize local deltas from scenario
  useEffect(() => {
    if (scenario) {
      // Create a deep copy of the parameter deltas
      const deltaCopy = JSON.parse(JSON.stringify(scenario.parameterDeltas));

      // Ensure all required properties exist
      const completeDeltas = {
        marketingSpendPercent: 0,
        marketingSpendByChannel: {},
        pricingPercent: 0,
        attendanceGrowthPercent: 0,
        cogsMultiplier: 0,
        ...deltaCopy
      };

      // Set the local deltas
      setLocalDeltas(completeDeltas);

      // Store the original deltas for comparison
      originalDeltasRef.current = JSON.parse(JSON.stringify(completeDeltas));

      // Reset state
      setIsDirty(false);
      setHasUnsavedChanges(false);

      console.log('Initialized scenario editor with deltas:', completeDeltas);
    }
  }, [scenario]);

  // Check for unsaved changes
  useEffect(() => {
    if (originalDeltasRef.current) {
      const isEqual = JSON.stringify(localDeltas) === JSON.stringify(originalDeltasRef.current);
      setIsDirty(!isEqual);
      setHasUnsavedChanges(!isEqual);
    }
  }, [localDeltas]);

  // Handle parameter change
  const handleParamChange = (param: keyof ScenarioParameterDeltas, value: number) => {
    console.log(`Parameter change: ${param} = ${value}`);

    // Update the local deltas
    const updatedDeltas = {
      ...localDeltas,
      [param]: value
    };

    // Calculate related changes before updating state
    const relatedChanges = calculateRelatedChanges(param, value, updatedDeltas);
    console.log('Related changes:', relatedChanges);

    // Combine all changes into a single update to prevent flickering
    const finalDeltas = {
      ...updatedDeltas,
      ...relatedChanges
    };

    // Update state with all changes at once
    setLocalDeltas(finalDeltas);
    console.log('Updated deltas:', finalDeltas);
  };

  // Handle channel-specific parameter change
  const handleChannelParamChange = (channelId: string, value: number) => {
    setLocalDeltas(prev => ({
      ...prev,
      marketingSpendByChannel: {
        ...prev.marketingSpendByChannel,
        [channelId]: value
      }
    }));
  };

  // Handle save
  const handleSave = async () => {
    if (!scenario) return;

    try {
      setIsSaving(true);

      // Create updated scenario with new deltas
      const updatedScenario: Scenario = {
        ...scenario,
        parameterDeltas: { ...localDeltas },
        updatedAt: new Date()
      };

      // Call the onSave callback
      await onSave(updatedScenario);

      // Update the original deltas reference
      originalDeltasRef.current = JSON.parse(JSON.stringify(localDeltas));

      // Reset dirty state
      setIsDirty(false);
      setHasUnsavedChanges(false);

      toast({
        title: 'Success',
        description: 'Scenario saved successfully',
      });
    } catch (error) {
      console.error('Error saving scenario:', error);
      toast({
        title: 'Error',
        description: 'Failed to save scenario',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle reset
  const handleReset = () => {
    if (originalDeltasRef.current) {
      setLocalDeltas(JSON.parse(JSON.stringify(originalDeltasRef.current)));
      setIsDirty(false);
      setHasUnsavedChanges(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (isDirty) {
      // Confirm before discarding changes
      if (window.confirm('You have unsaved changes. Are you sure you want to discard them?')) {
        handleReset();
        onCancel();
      }
    } else {
      onCancel();
    }
  };

  return {
    localDeltas,
    isDirty,
    isSaving,
    activeTab,
    hasUnsavedChanges,
    handleParamChange,
    handleChannelParamChange,
    handleSave,
    handleReset,
    handleCancel,
    setActiveTab
  };
}
