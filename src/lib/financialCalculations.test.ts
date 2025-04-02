import { describe, it, expect, vi } from 'vitest';
import { calculateTotalRevenue, calculateTotalCosts } from './financialCalculations';
import { FinancialModel } from './db';

// Mock console.error to prevent test output pollution
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('Financial Calculations', () => {
  // Create a mock financial model for testing
  const createMockModel = (overrides = {}): FinancialModel => {
    const defaultModel: FinancialModel = {
      id: 1,
      projectId: 1,
      name: 'Test Model',
      assumptions: {
        revenue: [],
        costs: [
          { name: 'Setup Costs', value: 1000, type: 'fixed', category: 'operations' }
        ],
        growthModel: { type: 'linear', rate: 0.1 },
        metadata: {
          type: 'WeeklyEvent',
          weeks: 4,
          initialWeeklyAttendance: 100,
          perCustomer: {
            ticketPrice: 20,
            fbSpend: 10,
            merchandiseSpend: 5,
            onlineSpend: 2,
            miscSpend: 1
          },
          growth: {
            attendanceGrowthRate: 10, // 10%
            useCustomerSpendGrowth: false,
            ticketPriceGrowth: 0,
            fbSpendGrowth: 0,
            merchandiseSpendGrowth: 0,
            onlineSpendGrowth: 0,
            miscSpendGrowth: 0
          },
          costs: {
            fbCOGSPercent: 30,
            staffCount: 5,
            staffCostPerPerson: 100,
            managementCosts: 500
          }
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return { ...defaultModel, ...overrides };
  };

  describe('calculateTotalRevenue', () => {
    it('should return 0 if model is not a WeeklyEvent type', () => {
      const model = createMockModel({
        assumptions: {
          ...createMockModel().assumptions,
          metadata: { type: 'OtherType' }
        }
      });
      
      expect(calculateTotalRevenue(model)).toBe(0);
    });

    it('should calculate revenue correctly for a simple model', () => {
      const model = createMockModel();
      
      // Expected calculation:
      // Week 1: 100 attendees * (20 + 10 + 5 + 2 + 1) = 100 * 38 = 3800
      // Week 2: 110 attendees * 38 = 4180
      // Week 3: 121 attendees * 38 = 4598
      // Week 4: 133 attendees * 38 = 5054
      // Total: 3800 + 4180 + 4598 + 5054 = 17632
      
      expect(calculateTotalRevenue(model)).toBe(17632);
    });

    it('should handle customer spend growth correctly', () => {
      const model = createMockModel({
        assumptions: {
          ...createMockModel().assumptions,
          metadata: {
            ...createMockModel().assumptions.metadata,
            growth: {
              attendanceGrowthRate: 10,
              useCustomerSpendGrowth: true,
              ticketPriceGrowth: 5,
              fbSpendGrowth: 5,
              merchandiseSpendGrowth: 5,
              onlineSpendGrowth: 5,
              miscSpendGrowth: 5
            }
          }
        }
      });
      
      // With 5% growth on all spend categories
      const result = calculateTotalRevenue(model);
      expect(result).toBeGreaterThan(17632); // Should be higher than without growth
    });

    it('should handle errors gracefully', () => {
      const model = createMockModel({
        assumptions: null as any
      });
      
      expect(calculateTotalRevenue(model)).toBe(0);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('calculateTotalCosts', () => {
    it('should return 0 if model is not a WeeklyEvent type', () => {
      const model = createMockModel({
        assumptions: {
          ...createMockModel().assumptions,
          metadata: { type: 'OtherType' }
        }
      });
      
      expect(calculateTotalCosts(model)).toBe(0);
    });

    it('should calculate costs correctly for a simple model', () => {
      const model = createMockModel();
      
      // Expected calculation:
      // Setup costs: 1000 (one-time)
      // Week 1: FB COGS (100 * 10 * 0.3) + Staff (5 * 100) + Management (500) = 300 + 500 + 500 = 1300
      // Week 2: FB COGS (110 * 10 * 0.3) + Staff (5 * 100) + Management (500) = 330 + 500 + 500 = 1330
      // Week 3: FB COGS (121 * 10 * 0.3) + Staff (5 * 100) + Management (500) = 363 + 500 + 500 = 1363
      // Week 4: FB COGS (133 * 10 * 0.3) + Staff (5 * 100) + Management (500) = 399 + 500 + 500 = 1399
      // Total: 1000 + 1300 + 1330 + 1363 + 1399 = 6392
      
      const result = calculateTotalCosts(model);
      expect(result).toBeCloseTo(6392, 0); // Allow for rounding differences
    });

    it('should handle errors gracefully', () => {
      const model = createMockModel({
        assumptions: null as any
      });
      
      expect(calculateTotalCosts(model)).toBe(0);
      expect(console.error).toHaveBeenCalled();
    });
  });
});
