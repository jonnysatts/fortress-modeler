/**
 * useCategories - React hooks for category management
 * Provides reactive access to event types, cost categories, and frequencies
 * Part of Phase 2: Configurable Event Categories System
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CategoryService, EventType, CostCategory, Frequency, CategoryOption } from '@/services/CategoryService';
import { toast } from 'sonner';

// =====================================================================
// QUERY KEYS
// =====================================================================

export const CATEGORY_KEYS = {
  eventTypes: ['event_types'] as const,
  eventTypesActive: ['event_types', 'active'] as const,
  costCategories: ['cost_categories'] as const,
  costCategoriesActive: ['cost_categories', 'active'] as const,
  frequencies: ['frequencies'] as const,
  frequenciesActive: ['frequencies', 'active'] as const,
  allActive: ['categories', 'all_active'] as const,
};

// =====================================================================
// EVENT TYPES HOOKS
// =====================================================================

/**
 * Get active event types for dropdowns
 * This is the most common use case - just getting options for a select
 */
export function useActiveEventTypes() {
  return useQuery({
    queryKey: CATEGORY_KEYS.eventTypesActive,
    queryFn: () => CategoryService.getActiveEventTypes(),
    staleTime: 5 * 60 * 1000, // 5 minutes - categories don't change often
    gcTime: 10 * 60 * 1000,   // 10 minutes cache
  });
}

/**
 * Get all event types (for admin management)
 */
export function useAllEventTypes() {
  return useQuery({
    queryKey: CATEGORY_KEYS.eventTypes,
    queryFn: () => CategoryService.getAllEventTypes(),
    staleTime: 1 * 60 * 1000, // 1 minute for admin view
  });
}

/**
 * Create new event type
 */
export function useCreateEventType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventType: Partial<EventType>) => CategoryService.createEventType(eventType),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.eventTypes });
      queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.eventTypesActive });
      toast.success('Event type created', {
        description: `"${data.label}" has been created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to create event type', {
        description: error.message,
      });
    },
  });
}

/**
 * Update existing event type
 */
export function useUpdateEventType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<EventType> }) =>
      CategoryService.updateEventType(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.eventTypes });
      queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.eventTypesActive });
      toast.success('Event type updated', {
        description: `"${data.label}" has been updated successfully.`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to update event type', {
        description: error.message,
      });
    },
  });
}

/**
 * Delete event type (soft delete)
 */
export function useDeleteEventType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => CategoryService.deleteEventType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.eventTypes });
      queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.eventTypesActive });
      toast.success('Event type deleted', {
        description: 'The event type has been removed.',
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to delete event type', {
        description: error.message,
      });
    },
  });
}

// =====================================================================
// COST CATEGORIES HOOKS
// =====================================================================

/**
 * Get active cost categories for dropdowns
 */
export function useActiveCostCategories() {
  return useQuery({
    queryKey: CATEGORY_KEYS.costCategoriesActive,
    queryFn: () => CategoryService.getActiveCostCategories(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Get all cost categories (for admin management)
 */
export function useAllCostCategories() {
  return useQuery({
    queryKey: CATEGORY_KEYS.costCategories,
    queryFn: () => CategoryService.getAllCostCategories(),
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Create new cost category
 */
export function useCreateCostCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (category: Partial<CostCategory>) => CategoryService.createCostCategory(category),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.costCategories });
      queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.costCategoriesActive });
      toast.success('Cost category created', {
        description: `"${data.label}" has been created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to create cost category', {
        description: error.message,
      });
    },
  });
}

/**
 * Update existing cost category
 */
export function useUpdateCostCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CostCategory> }) =>
      CategoryService.updateCostCategory(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.costCategories });
      queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.costCategoriesActive });
      toast.success('Cost category updated', {
        description: `"${data.label}" has been updated successfully.`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to update cost category', {
        description: error.message,
      });
    },
  });
}

/**
 * Delete cost category (soft delete)
 */
export function useDeleteCostCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => CategoryService.deleteCostCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.costCategories });
      queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.costCategoriesActive });
      toast.success('Cost category deleted', {
        description: 'The cost category has been removed.',
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to delete cost category', {
        description: error.message,
      });
    },
  });
}

// =====================================================================
// FREQUENCIES HOOKS
// =====================================================================

/**
 * Get active frequencies for dropdowns
 */
export function useActiveFrequencies() {
  return useQuery({
    queryKey: CATEGORY_KEYS.frequenciesActive,
    queryFn: () => CategoryService.getActiveFrequencies(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Get all frequencies (for admin management)
 */
export function useAllFrequencies() {
  return useQuery({
    queryKey: CATEGORY_KEYS.frequencies,
    queryFn: () => CategoryService.getAllFrequencies(),
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Create new frequency
 */
export function useCreateFrequency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (frequency: Partial<Frequency>) => CategoryService.createFrequency(frequency),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.frequencies });
      queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.frequenciesActive });
      toast.success('Frequency created', {
        description: `"${data.label}" has been created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to create frequency', {
        description: error.message,
      });
    },
  });
}

/**
 * Update existing frequency
 */
export function useUpdateFrequency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Frequency> }) =>
      CategoryService.updateFrequency(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.frequencies });
      queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.frequenciesActive });
      toast.success('Frequency updated', {
        description: `"${data.label}" has been updated successfully.`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to update frequency', {
        description: error.message,
      });
    },
  });
}

/**
 * Delete frequency (soft delete)
 */
export function useDeleteFrequency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => CategoryService.deleteFrequency(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.frequencies });
      queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.frequenciesActive });
      toast.success('Frequency deleted', {
        description: 'The frequency has been removed.',
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to delete frequency', {
        description: error.message,
      });
    },
  });
}

// =====================================================================
// BATCH OPERATIONS
// =====================================================================

/**
 * Get all active categories at once (for app initialization)
 * Useful for preloading all category data
 */
export function useAllActiveCategories() {
  return useQuery({
    queryKey: CATEGORY_KEYS.allActive,
    queryFn: () => CategoryService.getAllActiveCategories(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
}
