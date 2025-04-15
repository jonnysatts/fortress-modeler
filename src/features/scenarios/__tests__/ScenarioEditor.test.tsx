/**
 * ScenarioEditor Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ScenarioEditor from '../components/ScenarioEditor';
import { Scenario } from '../types/scenarioTypes';
import { FinancialModel } from '@/lib/db';

// Mock the hooks
vi.mock('../hooks', () => ({
  useScenarioEditor: () => ({
    localDeltas: {
      marketingSpendPercent: 0,
      marketingSpendByChannel: {},
      pricingPercent: 0,
      attendanceGrowthPercent: 0,
      cogsMultiplier: 0
    },
    isDirty: false,
    isSaving: false,
    activeTab: 'marketing',
    hasUnsavedChanges: false,
    handleParamChange: vi.fn(),
    handleChannelParamChange: vi.fn(),
    handleSave: vi.fn(),
    handleReset: vi.fn(),
    handleCancel: vi.fn(),
    setActiveTab: vi.fn()
  })
}));

// Mock the chart component
vi.mock('../components/ScenarioChart', () => ({
  default: () => <div data-testid="scenario-chart">Chart Mock</div>
}));

// Mock the summary table component
vi.mock('../components/ScenarioSummaryTable', () => ({
  default: () => <div data-testid="scenario-summary">Summary Mock</div>
}));

describe('ScenarioEditor', () => {
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

  const mockBaseModel: FinancialModel = {
    id: 1,
    projectId: 1,
    name: 'Test Model',
    assumptions: {
      revenue: [],
      costs: [],
      growthModel: {
        type: 'exponential',
        rate: 0.05
      },
      metadata: {
        type: 'WeeklyEvent',
        weeks: 12,
        initialWeeklyAttendance: 100,
        perCustomer: {
          ticketPrice: 10,
          fbSpend: 5,
          merchandiseSpend: 2
        },
        growth: {
          attendanceGrowthRate: 5,
          useCustomerSpendGrowth: true,
          ticketPriceGrowth: 2,
          fbSpendGrowth: 2,
          merchandiseSpendGrowth: 2
        },
        costs: {
          fbCOGSPercent: 30,
          merchandiseCogsPercent: 50,
          staffCount: 5,
          staffCostPerPerson: 100
        }
      },
      marketing: {
        allocationMode: 'highLevel',
        channels: [],
        totalBudget: 1000
      }
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockBaselineForecastData = [
    { period: 1, point: 'Week 1', revenue: 1000, cost: 500, profit: 500, cumulativeRevenue: 1000, cumulativeCost: 500, cumulativeProfit: 500 },
    { period: 2, point: 'Week 2', revenue: 1100, cost: 550, profit: 550, cumulativeRevenue: 2100, cumulativeCost: 1050, cumulativeProfit: 1050 }
  ];

  const mockScenarioForecastData = [
    { period: 1, point: 'Week 1', revenue: 1100, cost: 550, profit: 550, cumulativeRevenue: 1100, cumulativeCost: 550, cumulativeProfit: 550 },
    { period: 2, point: 'Week 2', revenue: 1210, cost: 605, profit: 605, cumulativeRevenue: 2310, cumulativeCost: 1155, cumulativeProfit: 1155 }
  ];

  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  it('renders the editor with scenario data', () => {
    render(
      <BrowserRouter>
        <ScenarioEditor
          scenario={mockScenario}
          baseModel={mockBaseModel}
          baselineForecastData={mockBaselineForecastData}
          scenarioForecastData={mockScenarioForecastData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      </BrowserRouter>
    );

    // Check that the component renders with the scenario name
    expect(screen.getByText('Edit Scenario')).toBeInTheDocument();
    
    // Check that the tabs are rendered
    expect(screen.getByRole('tab', { name: /marketing/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /pricing/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /attendance/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /costs/i })).toBeInTheDocument();
    
    // Check that the chart and summary components are rendered
    expect(screen.getByTestId('scenario-chart')).toBeInTheDocument();
    expect(screen.getByTestId('scenario-summary')).toBeInTheDocument();
  });

  it('renders nothing when scenario or baseModel is null', () => {
    const { container } = render(
      <BrowserRouter>
        <ScenarioEditor
          scenario={null}
          baseModel={mockBaseModel}
          baselineForecastData={mockBaselineForecastData}
          scenarioForecastData={mockScenarioForecastData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      </BrowserRouter>
    );

    // The component should not render anything
    expect(container.firstChild).toBeNull();
  });
});
