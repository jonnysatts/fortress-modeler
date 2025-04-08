import { StateCreator } from 'zustand';
import { BaseState, createInitialBaseState } from '../types';

// Define the UI Store slice
export interface UIState extends BaseState {
  // State
  isSidebarCollapsed: boolean;
  activeTab: string;
  toasts: Toast[];
  
  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveTab: (tab: string) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

// Toast interface
export interface Toast {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

// Create the UI store slice
export const createUISlice: StateCreator<UIState> = (set, get) => ({
  // Initial state
  ...createInitialBaseState(),
  isSidebarCollapsed: false,
  activeTab: 'summary',
  toasts: [],
  
  // Actions
  toggleSidebar: () => {
    set(state => ({ isSidebarCollapsed: !state.isSidebarCollapsed }));
  },
  
  setSidebarCollapsed: (collapsed: boolean) => {
    set({ isSidebarCollapsed: collapsed });
  },
  
  setActiveTab: (tab: string) => {
    set({ activeTab: tab });
  },
  
  addToast: (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration || 5000 // Default duration of 5 seconds
    };
    
    set(state => ({
      toasts: [...state.toasts, newToast]
    }));
    
    // Automatically remove the toast after its duration
    if (newToast.duration !== Infinity) {
      setTimeout(() => {
        get().removeToast(id);
      }, newToast.duration);
    }
  },
  
  removeToast: (id: string) => {
    set(state => ({
      toasts: state.toasts.filter(toast => toast.id !== id)
    }));
  }
});
