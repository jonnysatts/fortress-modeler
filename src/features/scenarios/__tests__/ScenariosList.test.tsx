/**
 * ScenariosList Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import ScenariosList from '../components/ScenariosList';
import { Scenario } from '../types/scenarioTypes';

describe('ScenariosList', () => {
  const mockScenarios: Scenario[] = [
    {
      id: 1,
      name: 'Test Scenario 1',
      description: 'Test Description 1',
      baseModelId: 1,
      projectId: 1,
      parameterDeltas: {
        marketingSpendPercent: 10,
        marketingSpendByChannel: {},
        pricingPercent: 5,
        attendanceGrowthPercent: 2,
        cogsMultiplier: 0
      },
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-02')
    },
    {
      id: 2,
      name: 'Test Scenario 2',
      description: 'Test Description 2',
      baseModelId: 1,
      projectId: 1,
      parameterDeltas: {
        marketingSpendPercent: 0,
        marketingSpendByChannel: {},
        pricingPercent: -5,
        attendanceGrowthPercent: 0,
        cogsMultiplier: 10
      },
      createdAt: new Date('2023-01-03'),
      updatedAt: new Date('2023-01-04')
    }
  ];

  const mockProps = {
    scenarios: mockScenarios,
    loading: false,
    onSelect: vi.fn(),
    onCreate: vi.fn(),
    onDuplicate: vi.fn(),
    onDelete: vi.fn(),
    projectId: 1,
    baseModelId: 1
  };

  it('renders the list of scenarios', () => {
    render(<ScenariosList {...mockProps} />);

    // Check that the component renders with the correct title
    expect(screen.getByText('Scenarios')).toBeInTheDocument();
    
    // Check that both scenarios are rendered
    expect(screen.getByText('Test Scenario 1')).toBeInTheDocument();
    expect(screen.getByText('Test Scenario 2')).toBeInTheDocument();
    
    // Check that descriptions are rendered
    expect(screen.getByText('Test Description 1')).toBeInTheDocument();
    expect(screen.getByText('Test Description 2')).toBeInTheDocument();
  });

  it('shows loading state when loading is true', () => {
    render(<ScenariosList {...mockProps} loading={true} />);

    // Check that the loading indicator is shown
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows empty state when no scenarios are available', () => {
    render(<ScenariosList {...mockProps} scenarios={[]} />);

    // Check that the empty state message is shown
    expect(screen.getByText('No scenarios found')).toBeInTheDocument();
    expect(screen.getByText('Create Your First Scenario')).toBeInTheDocument();
  });

  it('calls onSelect when a scenario is clicked', () => {
    render(<ScenariosList {...mockProps} />);

    // Click on the first scenario
    fireEvent.click(screen.getByText('Test Scenario 1'));
    
    // Check that onSelect was called with the correct scenario
    expect(mockProps.onSelect).toHaveBeenCalledWith(mockScenarios[0]);
  });

  it('calls onCreate when the create button is clicked', () => {
    render(<ScenariosList {...mockProps} />);

    // Click on the create button
    fireEvent.click(screen.getByText('Create New Scenario'));
    
    // Check that onCreate was called
    expect(mockProps.onCreate).toHaveBeenCalled();
  });
});
