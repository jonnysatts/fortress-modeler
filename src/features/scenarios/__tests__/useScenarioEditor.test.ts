/**
 * useScenarioEditor Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import useScenarioEditor from '../hooks/useScenarioEditor';
import { Scenario } from '../types/scenarioTypes';

// Mock the scenarioRelationships module
vi.mock('../utils/scenarioRelationships', () => ({
  calculateRelatedChanges: vi.fn().mockReturnValue({})
}));

describe('useScenarioEditor', () => {
  const mockScenario: Scenario = {
    id: 1,
    name: 'Test Scenario',
    description: 'Test Description',
    baseModelId: 1,
    projectId: 1,
    parameterDeltas: {
      marketingSpendPercent: 0,
      marketingSpendByChannel: {},
      pricingPercent: 0,
      attendanceGrowthPercent: 0,
      cogsMultiplier: 0
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with scenario data', () => {
    const { result } = renderHook(() => useScenarioEditor({
      scenario: mockScenario,
      onSave: mockOnSave,
      onCancel: mockOnCancel
    }));

    // Check that the hook initializes with the correct values
    expect(result.current.localDeltas).toEqual(mockScenario.parameterDeltas);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.activeTab).toBe('marketing');
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('updates localDeltas when handleParamChange is called', () => {
    const { result } = renderHook(() => useScenarioEditor({
      scenario: mockScenario,
      onSave: mockOnSave,
      onCancel: mockOnCancel
    }));

    // Call handleParamChange
    act(() => {
      result.current.handleParamChange('marketingSpendPercent', 10);
    });

    // Check that localDeltas was updated
    expect(result.current.localDeltas.marketingSpendPercent).toBe(10);
    expect(result.current.isDirty).toBe(true);
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('updates localDeltas when handleChannelParamChange is called', () => {
    const { result } = renderHook(() => useScenarioEditor({
      scenario: mockScenario,
      onSave: mockOnSave,
      onCancel: mockOnCancel
    }));

    // Call handleChannelParamChange
    act(() => {
      result.current.handleChannelParamChange('channel1', 20);
    });

    // Check that localDeltas was updated
    expect(result.current.localDeltas.marketingSpendByChannel.channel1).toBe(20);
    expect(result.current.isDirty).toBe(true);
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('calls onSave with updated scenario when handleSave is called', async () => {
    const { result } = renderHook(() => useScenarioEditor({
      scenario: mockScenario,
      onSave: mockOnSave,
      onCancel: mockOnCancel
    }));

    // Update localDeltas
    act(() => {
      result.current.handleParamChange('marketingSpendPercent', 10);
    });

    // Call handleSave
    await act(async () => {
      await result.current.handleSave();
    });

    // Check that onSave was called with the updated scenario
    expect(mockOnSave).toHaveBeenCalledWith({
      ...mockScenario,
      parameterDeltas: {
        ...mockScenario.parameterDeltas,
        marketingSpendPercent: 10
      },
      updatedAt: expect.any(Date)
    });

    // Check that isDirty and hasUnsavedChanges were reset
    expect(result.current.isDirty).toBe(false);
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('resets localDeltas when handleReset is called', () => {
    const { result } = renderHook(() => useScenarioEditor({
      scenario: mockScenario,
      onSave: mockOnSave,
      onCancel: mockOnCancel
    }));

    // Update localDeltas
    act(() => {
      result.current.handleParamChange('marketingSpendPercent', 10);
    });

    // Check that localDeltas was updated
    expect(result.current.localDeltas.marketingSpendPercent).toBe(10);
    expect(result.current.isDirty).toBe(true);

    // Call handleReset
    act(() => {
      result.current.handleReset();
    });

    // Check that localDeltas was reset
    expect(result.current.localDeltas.marketingSpendPercent).toBe(0);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('updates activeTab when setActiveTab is called', () => {
    const { result } = renderHook(() => useScenarioEditor({
      scenario: mockScenario,
      onSave: mockOnSave,
      onCancel: mockOnCancel
    }));

    // Call setActiveTab
    act(() => {
      result.current.setActiveTab('pricing');
    });

    // Check that activeTab was updated
    expect(result.current.activeTab).toBe('pricing');
  });
});
