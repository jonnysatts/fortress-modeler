# Financial Calculation Centralization Plan

## Overview

This document outlines the plan for centralizing all financial calculations in the application. The goal is to create a single source of truth for all calculations, eliminating duplicate logic and ensuring consistency throughout the application.

## Background

Currently, financial calculations are spread across multiple files and components, leading to potential inconsistencies and making maintenance difficult. By centralizing all calculations in a single module, we can ensure that all parts of the application use the same calculation logic, making the application more maintainable and reliable.

## Implementation Plan

### Phase 1: Preparation and Analysis

#### 1.1 Create a Comprehensive Inventory
- **Action**: Document every calculation function across the codebase
- **Details**:
  - Create a spreadsheet with columns for:
    - File path
    - Function name
    - Input parameters
    - Output format
    - Current implementation approach
    - Usage locations
    - Priority for centralization (High/Medium/Low)
  - Tag each function as "Already Centralized", "Partially Centralized", or "Not Centralized"
- **Status**: Completed (see [financial-calculations-inventory.md](./financial-calculations-inventory.md))

#### 1.2 Establish Test Coverage
- **Action**: Create comprehensive test cases for all calculation functions
- **Details**:
  - Write unit tests for all existing centralized functions if not already covered
  - Create test cases with known inputs and expected outputs for legacy functions
  - Document edge cases and boundary conditions
  - Ensure tests cover all calculation paths

#### 1.3 Create a Versioning Strategy
- **Action**: Implement versioning for the calculation engine
- **Details**:
  - Add version tracking to the calculation engine
  - Create a mechanism to log calculation results with version information
  - Establish a strategy for handling version differences during transition

### Phase 2: Extend the Centralized Engine

#### 2.1 Add Missing Core Functions
- **Action**: Implement all missing calculation functions in the centralized engine
- **Details**:
  - Create new functions for:
    - Variance calculations (actual vs. forecast)
    - Breakdown calculations (revenue and cost components)
    - Percentage and ratio calculations
    - Any other specialized calculations identified in Phase 1
  - Ensure all new functions have:
    - Clear documentation
    - Comprehensive unit tests
    - Consistent parameter naming
    - Proper error handling

#### 2.2 Create Adapter Functions
- **Action**: Create adapter functions to bridge legacy implementations
- **Details**:
  - Implement adapter functions that match the signature of legacy functions
  - Make adapters call the centralized functions internally
  - Add deprecation warnings to adapters
  - Document migration path for each adapter

#### 2.3 Enhance Logging and Debugging
- **Action**: Add robust logging to the calculation engine
- **Details**:
  - Implement detailed logging for all calculation steps
  - Create a toggle for verbose calculation logging
  - Add performance metrics to identify slow calculations
  - Create a calculation audit trail for debugging

### Phase 3: Incremental Migration (Low-Risk First)

#### 3.1 Update Low-Risk Components
- **Action**: Migrate low-risk, isolated components first
- **Details**:
  - Identify components with minimal dependencies
  - Update imports to use the centralized engine
  - Replace direct calculations with calls to centralized functions
  - Run comprehensive tests after each component update

#### 3.2 Update Worker Implementation
- **Action**: Refactor the financial calculations worker
- **Details**:
  - Replace custom implementations with calls to centralized functions
  - Ensure worker correctly handles all calculation scenarios
  - Add comprehensive error handling
  - Test worker performance with large datasets

#### 3.3 Update Visualization Components
- **Action**: Refactor chart and visualization components
- **Details**:
  - Update data preparation functions to use centralized calculations
  - Ensure consistent data formatting for visualizations
  - Test all chart types with various data scenarios

### Phase 4: High-Risk Migration

#### 4.1 Update Core Financial Functions
- **Action**: Replace legacy core financial functions
- **Details**:
  - Implement feature flags to toggle between old and new implementations
  - Create parallel calculation paths for validation
  - Compare results between old and new implementations
  - Document and resolve any discrepancies

#### 4.2 Update Scenario Modeling
- **Action**: Refactor scenario modeling to use centralized calculations
- **Details**:
  - Update delta calculations to use centralized functions
  - Ensure proper application of scenario parameters
  - Test with various scenario configurations
  - Verify real-time UI updates work correctly

#### 4.3 Update Financial Reporting
- **Action**: Refactor financial reporting components
- **Details**:
  - Update summary calculations to use centralized functions
  - Ensure consistent formatting and rounding
  - Test with various reporting periods
  - Verify totals match across all views

### Phase 5: Validation and Cleanup

#### 5.1 Comprehensive Testing
- **Action**: Perform end-to-end testing of all financial flows
- **Details**:
  - Create test scenarios covering all business cases
  - Compare results before and after centralization
  - Document and explain any legitimate differences
  - Get stakeholder sign-off on calculation changes

#### 5.2 Performance Optimization
- **Action**: Optimize calculation performance
- **Details**:
  - Identify and fix performance bottlenecks
  - Implement caching for expensive calculations
  - Add memoization for frequently used results
  - Benchmark performance before and after optimization

#### 5.3 Code Cleanup
- **Action**: Remove deprecated functions and duplicate code
- **Details**:
  - Remove legacy calculation functions
  - Update all imports to use centralized functions
  - Remove adapter functions when no longer needed
  - Clean up unused variables and imports

#### 5.4 Documentation Update
- **Action**: Update documentation for the calculation engine
- **Details**:
  - Document all available calculation functions
  - Create usage examples for common scenarios
  - Update API documentation
  - Create a migration guide for future developers

## Implementation Timeline

| Phase | Estimated Duration | Risk Level | Dependencies |
|-------|-------------------|------------|--------------|
| 1. Preparation | 1-2 weeks | Low | None |
| 2. Extend Engine | 2-3 weeks | Medium | Phase 1 |
| 3. Low-Risk Migration | 2-3 weeks | Medium | Phase 2 |
| 4. High-Risk Migration | 3-4 weeks | High | Phase 3 |
| 5. Validation | 2-3 weeks | Medium | Phase 4 |

## Risk Mitigation Strategies

1. **Feature Flags**
   - Implement toggles to switch between old and new implementations
   - Allow gradual rollout and easy rollback

2. **Parallel Calculations**
   - Run both old and new calculations in parallel
   - Log differences for analysis
   - Alert on significant discrepancies

3. **Incremental Deployment**
   - Deploy changes in small, manageable chunks
   - Test thoroughly after each deployment
   - Monitor production usage after each change

4. **Comprehensive Logging**
   - Add detailed logging for all calculations
   - Create audit trails for debugging
   - Implement alerts for calculation errors

5. **Automated Testing**
   - Create extensive test suites for all calculations
   - Implement regression tests
   - Add performance benchmarks

## Success Criteria

1. All financial calculations are performed through the centralized engine
2. No duplicate calculation logic exists in the codebase
3. All tests pass with the new implementation
4. Performance meets or exceeds the previous implementation
5. All UI components update correctly in real-time
6. Documentation is complete and up-to-date

## Current Progress

- ✅ Phase 1.1: Create a Comprehensive Inventory - **Completed**
- ✅ Phase 1.2: Establish Test Coverage - **Completed**
- ✅ Phase 1.3: Create a Versioning Strategy - **Completed**
- ✅ Phase 2.1: Add Missing Core Functions - **Completed**
- ✅ Phase 2.2: Create Adapter Functions - **Completed**
- ✅ Phase 2.3: Enhance Logging and Debugging - **Completed**
- ✅ Phase 3.1: Update Low-Risk Components - **Completed**
- ✅ Phase 3.2: Update Worker Implementation - **Completed**
- ✅ Phase 3.3: Update Visualization Components - **Completed**
- ✅ Phase 4.1: Update Core Financial Functions - **Completed**
- ✅ Phase 4.2: Update Scenario Modeling - **Completed**
- ✅ Phase 4.3: Update Financial Reporting - **Completed**
- ⬜ Phase 5.1: Comprehensive Testing - **Not Started**
- ⬜ Phase 5.2: Performance Optimization - **Not Started**
- ⬜ Phase 5.3: Code Cleanup - **Not Started**
- ⬜ Phase 5.4: Documentation Update - **Not Started**
