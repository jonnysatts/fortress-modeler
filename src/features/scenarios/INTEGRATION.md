# Scenario Module Integration Guide

This guide explains how to integrate the refactored scenario module with the existing application.

## Overview

The scenario module has been refactored into a modular, feature-based structure. This guide provides step-by-step instructions for integrating the new module with the existing application.

## Integration Steps

### 1. Update the Store

The first step is to update the store to use the new scenario store slice:

1. Create a new store file that includes the scenario store slice:

```typescript
// src/store/useStoreRefactored.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { db, FinancialModel } from '@/lib/db';
import { createScenarioSlice, ScenarioState } from '@/features/scenarios/store';

// Define the store state
interface StoreState extends ScenarioState {
  // Include existing state...
}

// Create the store
const useStore = create<StoreState>()(
  devtools(
    persist(
      (set, get) => ({
        // Include the scenario slice
        ...createScenarioSlice(set, get),
        
        // Include existing actions...
      }),
      {
        name: 'fortress-modeler-store',
        partialize: (state) => ({
          // Only persist these parts of the state
          currentProject: state.currentProject,
          currentModel: state.currentModel
        })
      }
    )
  )
);

export default useStore;
```

2. Update imports in components to use the new store:

```typescript
// Old import
import useStore from '@/store/useStore';

// New import
import useStore from '@/store/useStoreRefactored';
```

### 2. Add Routes for the New Components

Update the routes in the application to include the new scenario components:

```tsx
// src/App.tsx
import ScenariosViewRefactored from '@/pages/product/ScenariosViewRefactored';

// In the routes section
<Route path="/projects/:projectId/*" element={<ProductLayout />}>
  {/* Other routes... */}
  <Route path="scenarios" element={<ScenariosViewRefactored />} />
  <Route path="scenarios/:scenarioId" element={<ScenariosViewRefactored />} />
</Route>
```

### 3. Create Integration Components

Create wrapper components that integrate the new module with the existing application:

```tsx
// src/pages/product/ScenariosViewRefactored.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '@/store/useStoreRefactored';
import { Scenario } from '@/features/scenarios/types/scenarioTypes';
import { ScenariosList, ScenarioEditor, ScenarioComparison } from '@/features/scenarios/components';

const ScenariosViewRefactored: React.FC = () => {
  const { projectId, scenarioId } = useParams<{ projectId: string; scenarioId: string }>();
  const navigate = useNavigate();
  
  // Get data and actions from store
  const {
    scenarios,
    currentScenario,
    baselineModel,
    scenarioForecastData,
    baselineForecastData,
    loadScenarios,
    // Other actions...
  } = useStore(state => ({
    // Get state and actions from store...
  }));
  
  // Load scenarios when the component mounts
  useEffect(() => {
    if (projectId) {
      loadScenarios(parseInt(projectId));
    }
  }, [projectId, loadScenarios]);
  
  // Render the appropriate view based on the current state
  // ...
};

export default ScenariosViewRefactored;
```

### 4. Update Imports Throughout the Codebase

Update imports throughout the codebase to use the new module:

```typescript
// Old imports
import { Scenario, ScenarioParameterDeltas } from '@/types/scenarios';
import ScenarioEditor from '@/components/scenarios/ScenarioEditor';
import ScenariosList from '@/components/scenarios/ScenariosList';

// New imports
import { Scenario, ScenarioParameterDeltas } from '@/features/scenarios/types';
import { ScenarioEditor, ScenariosList } from '@/features/scenarios/components';
```

### 5. Test the Integration

Test the integration thoroughly to ensure that the new module works correctly with the existing application:

1. Test creating a new scenario
2. Test editing an existing scenario
3. Test deleting a scenario
4. Test the scenario comparison view
5. Test the integration with the rest of the application

### 6. Remove Old Files

Once the integration is complete and thoroughly tested, remove the old files:

```bash
# Remove old components
rm -rf src/components/scenarios

# Remove old types
rm src/types/scenarios.ts

# Remove old store
rm src/store/modules/scenarioStore.ts
```

### 7. Update Documentation

Update the application documentation to reference the new module:

```markdown
# Scenarios

The scenario functionality is now provided by the `@/features/scenarios` module.
See the [Scenario Module Documentation](../features/scenarios/README.md) for more information.
```

## Troubleshooting

### Common Issues

1. **Store Integration**: If you encounter issues with the store integration, make sure that the new store slice is properly integrated with the existing store.
2. **Component Props**: If you encounter issues with component props, check that the props are correctly passed from the integration components to the new components.
3. **Route Parameters**: If you encounter issues with route parameters, check that the parameters are correctly extracted and passed to the components.

### Getting Help

If you encounter any issues during integration, please contact the development team for assistance.
