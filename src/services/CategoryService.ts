/**
 * CategoryService - CRUD operations for configurable categories
 * Manages event types, cost categories, and frequencies from database
 * Part of Phase 2: Configurable Event Categories System
 */

import { supabase } from '@/lib/supabase';

// =====================================================================
// TypeScript Interfaces for Category Tables
// =====================================================================

export interface EventType {
  id: string;
  value: string;              // 'weekly', 'special', 'monthly', etc.
  label: string;              // 'Weekly Event', 'Special Event', etc.
  description?: string;
  is_recurring: boolean;
  requires_forecast: boolean;
  requires_actuals: boolean;
  icon_name?: string;
  color_scheme?: string;
  is_active: boolean;
  is_system: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CostCategory {
  id: string;
  value: string;              // 'staffing', 'marketing', etc.
  label: string;              // 'Staffing', 'Marketing', etc.
  description?: string;
  category_type: string;      // 'expense', 'cogs', 'capital'
  is_cogs: boolean;
  icon_name?: string;
  color_scheme?: string;
  is_active: boolean;
  is_system: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Frequency {
  id: string;
  value: string;              // 'weekly', 'monthly', etc.
  label: string;              // 'Weekly', 'Monthly', etc.
  description?: string;
  interval_type?: string;     // 'day', 'week', 'month', 'quarter', 'year'
  interval_count: number;     // 1 for weekly, 3 for quarterly
  is_recurring: boolean;
  icon_name?: string;
  color_scheme?: string;
  is_active: boolean;
  is_system: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Simplified types for dropdowns (value + label only)
export interface CategoryOption {
  value: string;
  label: string;
  description?: string;
  color_scheme?: string;
}

// =====================================================================
// CategoryService Class
// =====================================================================

export class CategoryService {

  // ===================================================================
  // EVENT TYPES
  // ===================================================================

  /**
   * Get all active event types for dropdowns
   */
  static async getActiveEventTypes(): Promise<CategoryOption[]> {
    const { data, error } = await supabase
      .rpc('get_active_event_types');

    if (error) {
      console.error('Error fetching active event types:', error);
      // Return fallback defaults if database query fails
      return [
        { value: 'weekly', label: 'Weekly Event' },
        { value: 'special', label: 'Special Event' },
      ];
    }

    return data || [];
  }

  /**
   * Get all event types (for admin management)
   */
  static async getAllEventTypes(): Promise<EventType[]> {
    const { data, error } = await supabase
      .from('event_types')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('label', { ascending: true });

    if (error) {
      console.error('Error fetching all event types:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Create new event type
   */
  static async createEventType(eventType: Partial<EventType>): Promise<EventType> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('event_types')
      .insert({
        ...eventType,
        created_by: user?.id,
        updated_by: user?.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating event type:', error);
      throw error;
    }

    return data;
  }

  /**
   * Update existing event type
   */
  static async updateEventType(id: string, updates: Partial<EventType>): Promise<EventType> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('event_types')
      .update({
        ...updates,
        updated_by: user?.id,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating event type:', error);
      throw error;
    }

    return data;
  }

  /**
   * Soft delete event type (set is_active = false)
   * System types cannot be deleted
   */
  static async deleteEventType(id: string): Promise<void> {
    const { error } = await supabase
      .from('event_types')
      .update({ is_active: false })
      .eq('id', id)
      .eq('is_system', false);  // Only allow deleting non-system types

    if (error) {
      console.error('Error deleting event type:', error);
      throw error;
    }
  }

  // ===================================================================
  // COST CATEGORIES
  // ===================================================================

  /**
   * Get all active cost categories for dropdowns
   */
  static async getActiveCostCategories(): Promise<CategoryOption[]> {
    const { data, error } = await supabase
      .rpc('get_active_cost_categories');

    if (error) {
      console.error('Error fetching active cost categories:', error);
      // Return fallback defaults if database query fails
      return [
        { value: 'staffing', label: 'Staffing' },
        { value: 'marketing', label: 'Marketing' },
        { value: 'operations', label: 'Operations' },
        { value: 'other', label: 'Other' },
      ];
    }

    return data || [];
  }

  /**
   * Get all cost categories (for admin management)
   */
  static async getAllCostCategories(): Promise<CostCategory[]> {
    const { data, error } = await supabase
      .from('cost_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('label', { ascending: true });

    if (error) {
      console.error('Error fetching all cost categories:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Create new cost category
   */
  static async createCostCategory(category: Partial<CostCategory>): Promise<CostCategory> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('cost_categories')
      .insert({
        ...category,
        created_by: user?.id,
        updated_by: user?.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating cost category:', error);
      throw error;
    }

    return data;
  }

  /**
   * Update existing cost category
   */
  static async updateCostCategory(id: string, updates: Partial<CostCategory>): Promise<CostCategory> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('cost_categories')
      .update({
        ...updates,
        updated_by: user?.id,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating cost category:', error);
      throw error;
    }

    return data;
  }

  /**
   * Soft delete cost category (set is_active = false)
   * System categories cannot be deleted
   */
  static async deleteCostCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('cost_categories')
      .update({ is_active: false })
      .eq('id', id)
      .eq('is_system', false);  // Only allow deleting non-system categories

    if (error) {
      console.error('Error deleting cost category:', error);
      throw error;
    }
  }

  // ===================================================================
  // FREQUENCIES
  // ===================================================================

  /**
   * Get all active frequencies for dropdowns
   */
  static async getActiveFrequencies(): Promise<CategoryOption[]> {
    const { data, error } = await supabase
      .rpc('get_active_frequencies');

    if (error) {
      console.error('Error fetching active frequencies:', error);
      // Return fallback defaults if database query fails
      return [
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'quarterly', label: 'Quarterly' },
        { value: 'annually', label: 'Annually' },
        { value: 'one-time', label: 'One-Time' },
      ];
    }

    return data || [];
  }

  /**
   * Get all frequencies (for admin management)
   */
  static async getAllFrequencies(): Promise<Frequency[]> {
    const { data, error } = await supabase
      .from('frequencies')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('label', { ascending: true });

    if (error) {
      console.error('Error fetching all frequencies:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Create new frequency
   */
  static async createFrequency(frequency: Partial<Frequency>): Promise<Frequency> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('frequencies')
      .insert({
        ...frequency,
        created_by: user?.id,
        updated_by: user?.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating frequency:', error);
      throw error;
    }

    return data;
  }

  /**
   * Update existing frequency
   */
  static async updateFrequency(id: string, updates: Partial<Frequency>): Promise<Frequency> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('frequencies')
      .update({
        ...updates,
        updated_by: user?.id,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating frequency:', error);
      throw error;
    }

    return data;
  }

  /**
   * Soft delete frequency (set is_active = false)
   * System frequencies cannot be deleted
   */
  static async deleteFrequency(id: string): Promise<void> {
    const { error } = await supabase
      .from('frequencies')
      .update({ is_active: false })
      .eq('id', id)
      .eq('is_system', false);  // Only allow deleting non-system frequencies

    if (error) {
      console.error('Error deleting frequency:', error);
      throw error;
    }
  }

  // ===================================================================
  // BATCH OPERATIONS
  // ===================================================================

  /**
   * Get all active categories at once (for app initialization)
   */
  static async getAllActiveCategories(): Promise<{
    eventTypes: CategoryOption[];
    costCategories: CategoryOption[];
    frequencies: CategoryOption[];
  }> {
    const [eventTypes, costCategories, frequencies] = await Promise.all([
      this.getActiveEventTypes(),
      this.getActiveCostCategories(),
      this.getActiveFrequencies(),
    ]);

    return {
      eventTypes,
      costCategories,
      frequencies,
    };
  }

  /**
   * Reorder items within a category
   */
  static async reorderItems(
    table: 'event_types' | 'cost_categories' | 'frequencies',
    items: Array<{ id: string; sort_order: number }>
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    const updates = items.map(item =>
      supabase
        .from(table)
        .update({
          sort_order: item.sort_order,
          updated_by: user?.id,
        })
        .eq('id', item.id)
    );

    await Promise.all(updates);
  }
}

export default CategoryService;
