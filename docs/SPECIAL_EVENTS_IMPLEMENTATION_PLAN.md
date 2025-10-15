# Special Events Implementation Plan

## Executive Summary

This document outlines a meticulous plan to implement Special Events functionality in the Fortress Modeler application. The implementation addresses the current dual-schema issue and provides a clear path forward for consolidating and completing the Special Events feature.

## Current State Analysis

### 1. Database Schema Status

The application currently has **two parallel implementations** for Special Events:

1. **Legacy Schema (projects table)**:
   - Uses `projects` table with `event_type`, `event_date`, `event_end_date` fields
   - Has dedicated tables: `special_event_forecasts`, `special_event_actuals`, `special_event_milestones`
   - Currently used by existing components

2. **New Schema (products table)**:
   - Migration `20250102_add_special_events_support.sql` extends `products` table
   - Adds `type` enum ('weekly', 'special'), `estimated_attendance`, `venue` fields
   - Extends `product_forecasts` and `product_actuals` tables
   - Enforces single actual entry for special events
   - **Not yet integrated with frontend**

### 2. Frontend Components Status

- ✅ `SpecialEventForecastForm.tsx` - exists but uses legacy schema
- ✅ `SpecialEventActualForm.tsx` - exists but uses legacy schema
- ✅ `MilestoneTracker.tsx` - tracks event milestones
- ❌ Components not integrated with new products-based schema
- ❌ No unified event creation flow

### 3. Service Layer Issues

- `SupabaseStorageService.ts` has type mismatches in `updateProject`
- Missing proper event field mapping
- No service methods for products-based special events

## Implementation Plan

### Phase 1: Schema Consolidation Decision

**Recommendation**: Adopt the **products-based schema** as the primary implementation.

**Rationale**:
- More flexible and extensible
- Aligns with modern architecture patterns
- Supports better type safety with enums
- Already has proper constraints for special events

### Phase 2: Database Migration

1. **Create transition migration** (`20250113_consolidate_special_events.sql`):
   ```sql
   -- Migrate existing special events from projects to products
   -- Copy data from special_event_forecasts to product_forecasts
   -- Copy data from special_event_actuals to product_actuals
   -- Add foreign key constraints
   ```

2. **Update database types**:
   - Regenerate `database.types.ts` with new schema
   - Add proper TypeScript enums for `event_type`

### Phase 3: Type System Updates

1. **Update `src/types/models.ts`**:
   ```typescript
   export interface SpecialEventMetadata {
     eventType: 'special';
     estimatedAttendance: number;
     venue: string;
     sponsorshipTarget?: number;
     eventScope?: string;
     successIndicators?: string[];
   }
   
   export interface SpecialEventForecast {
     productId: string;
     revenueTickets: number;
     revenueFnB: number;
     revenueMerchandise: number;
     sponsorshipIncome: number;
     eventStartDate: Date;
     eventEndDate: Date;
   }
   
   export interface SpecialEventActual {
     productId: string;
     actualRevenue: {
       tickets: number;
       fnb: number;
       merchandise: number;
       sponsorship: number;
     };
     actualAttendance: number;
     successIndicators: string;
     eventDate: Date;
   }
   ```

### Phase 4: Service Layer Implementation

1. **Create `SpecialEventService.ts`**:
   - CRUD operations for special events using products table
   - Forecast management methods
   - Actuals submission with single-entry enforcement
   - Validation logic for special events

2. **Update `SupabaseStorageService.ts`**:
   - Fix type mismatches in `updateProject`
   - Add proper event field mapping
   - Deprecate legacy special event methods

### Phase 5: Frontend Component Updates

1. **Create unified event creation flow**:
   - `NewEventModal.tsx` - handles both weekly and special events
   - Event type selector component
   - Conditional form fields based on event type

2. **Update existing components**:
   - Refactor `SpecialEventForecastForm.tsx` to use products schema
   - Refactor `SpecialEventActualForm.tsx` to use products schema
   - Create `SpecialEventDashboard.tsx` for post-event summary

3. **Update routing and navigation**:
   - Add special events section to sidebar
   - Create dedicated routes for special events

### Phase 6: UI/UX Implementation

1. **Forecast Entry Interface**:
   - Single-page forecast form (not weekly grid)
   - Revenue stream inputs: Tickets, F&B, Merchandise, Sponsorship
   - Cost projections with lump sum or per-attendee options
   - Clear visual distinction from weekly events

2. **Post-Event Actuals Flow**:
   - Automatic prompt after event date passes
   - Single submission form with validation
   - Lock mechanism after submission (admin override available)
   - Success indicators text area

3. **Calendar Integration**:
   - Show special events as single blocks (not recurring)
   - Different color coding for special vs weekly events
   - Hover preview with key metrics

### Phase 7: Reporting & Export

1. **Special Event Report Template**:
   - Single-page PDF format
   - Forecast vs Actuals comparison
   - ROI calculation
   - Success indicators summary
   - Event photos/media section (optional)

2. **Export Service Updates**:
   - Add special event export logic to `ReportService.ts`
   - Separate formatting for special vs weekly events
   - Batch export capability for multiple special events

### Phase 8: Testing & Validation

1. **Unit Tests**:
   - Service layer tests for all CRUD operations
   - Validation logic tests
   - Single-actual enforcement tests

2. **Integration Tests**:
   - End-to-end event creation flow
   - Forecast to actuals workflow
   - Export functionality

3. **UI Tests**:
   - Component rendering tests
   - Form validation tests
   - User interaction flows

## Implementation Timeline

### Week 1: Foundation (Days 1-7)
- Day 1-2: Schema consolidation and migration
- Day 3-4: Type system updates
- Day 5-7: Service layer implementation

### Week 2: Frontend Development (Days 8-14)
- Day 8-9: Unified event creation flow
- Day 10-11: Update existing components
- Day 12-14: UI/UX implementation

### Week 3: Integration & Testing (Days 15-21)
- Day 15-16: Calendar and dashboard integration
- Day 17-18: Reporting and export features
- Day 19-21: Testing and bug fixes

### Week 4: Polish & Deployment (Days 22-28)
- Day 22-23: Performance optimization
- Day 24-25: Documentation
- Day 26-27: User acceptance testing
- Day 28: Production deployment

## Key Implementation Details

### 1. Database Constraints

```sql
-- Ensure single actual for special events
CREATE UNIQUE INDEX idx_special_event_single_actual 
ON product_actuals (product_id) 
WHERE EXISTS (
  SELECT 1 FROM products 
  WHERE products.id = product_actuals.product_id 
  AND products.type = 'special'
);
```

### 2. Validation Rules

- Special events must have start and end dates
- End date cannot be before start date
- Actuals can only be submitted after event end date
- Estimated attendance is required for special events
- Venue is required for special events

### 3. UI State Management

```typescript
// Special event state shape
interface SpecialEventState {
  event: {
    id: string;
    name: string;
    type: 'special';
    venue: string;
    estimatedAttendance: number;
    startDate: Date;
    endDate: Date;
  };
  forecast: SpecialEventForecast;
  actual?: SpecialEventActual;
  isLocked: boolean;
  canSubmitActuals: boolean;
}
```

### 4. API Endpoints

- `POST /api/products` - Create special event
- `GET /api/products?type=special` - List special events
- `POST /api/products/:id/forecast` - Submit forecast
- `POST /api/products/:id/actual` - Submit actuals (one-time only)
- `GET /api/reports/special-event/:id` - Generate report

## Migration Strategy

### Step 1: Parallel Running
- Keep legacy system operational
- Implement new system alongside
- Add feature flag for gradual rollout

### Step 2: Data Migration
- Script to migrate existing special events
- Validate data integrity
- Maintain audit trail

### Step 3: Cutover
- Switch to new system for new events
- Migrate active events
- Archive legacy tables

### Step 4: Cleanup
- Remove legacy code
- Update documentation
- Final testing

## Risk Mitigation

1. **Data Loss Prevention**:
   - Full backup before migration
   - Rollback procedures documented
   - Data validation scripts

2. **User Disruption**:
   - Feature flags for gradual rollout
   - Clear communication plan
   - Training materials prepared

3. **Technical Debt**:
   - Clean removal of legacy code
   - Comprehensive documentation
   - Code review requirements

## Success Metrics

1. **Technical Metrics**:
   - Zero data loss during migration
   - < 2 second page load for event forms
   - 100% test coverage for critical paths

2. **User Metrics**:
   - < 5 minutes to create special event
   - < 3 minutes to submit actuals
   - 95% user satisfaction with new flow

3. **Business Metrics**:
   - Accurate forecast vs actual tracking
   - Improved reporting capabilities
   - Reduced manual data entry time

## Conclusion

This implementation plan provides a clear path to consolidate the dual-schema situation and deliver a robust Special Events feature. The phased approach minimizes risk while ensuring a high-quality user experience that aligns with Fortress's operational needs and creative culture.

The key to success will be:
1. Decisive schema consolidation
2. Careful data migration
3. Intuitive UI/UX design
4. Comprehensive testing
5. Clear documentation

By following this plan, the Special Events feature will become a powerful tool for Fortress to manage their one-off events with the same rigor and insight as their weekly operations.