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
      setLocalDeltas(scenario.parameterDeltas);
      originalDeltasRef.current = JSON.parse(JSON.stringify(scenario.parameterDeltas));
      setIsDirty(false);
      setHasUnsavedChanges(false);
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
    // Update the local deltas
    const updatedDeltas = {
      ...localDeltas,
      [param]: value
    };
    
    setLocalDeltas(updatedDeltas);
    
    // Calculate related changes
    const relatedChanges = calculateRelatedChanges(param, value, updatedDeltas);
    
    // If there are related changes, update the local deltas again
    if (Object.keys(relatedChanges).length > 0) {
      setLocalDeltas(prev => ({
        ...prev,
        ...relatedChanges
      }));
    }
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
