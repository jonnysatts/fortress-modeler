export const colors = {
  primary: {
    light: '#3E5C89',
    main: '#1A2942',
    dark: '#0F1A2A',
  },
  secondary: {
    light: '#4ADE80',
    main: '#10B981',
    dark: '#059669',
  },
  accent: {
    light: '#FDE68A',
    main: '#F59E0B',
    dark: '#D97706',
  },
  neutral: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
};

// Data visualization color system
export const dataColors = {
  // Core data types
  revenue: '#10B981',      // Emerald green
  cost: '#EF4444',         // Red
  profit: '#3B82F6',       // Blue
  attendance: '#8B5CF6',   // Purple

  // Forecast vs Actual
  forecast: '#1A2942',     // Dark blue
  actual: '#10B981',       // Emerald green
  target: '#F59E0B',       // Amber

  // Variance indicators
  positive: '#10B981',     // Emerald green
  negative: '#EF4444',     // Red
  neutral: '#64748B',      // Slate

  // Chart series (for consistent multi-series charts)
  series: [
    '#1A2942',  // Dark blue (primary)
    '#10B981',  // Emerald (secondary)
    '#3B82F6',  // Blue
    '#8B5CF6',  // Purple
    '#F59E0B',  // Amber
    '#EC4899',  // Pink
    '#14B8A6',  // Teal
    '#F43F5E',  // Rose
  ],

  // Category colors (for pie/donut charts)
  category: [
    '#10B981',  // Emerald
    '#3B82F6',  // Blue
    '#8B5CF6',  // Purple
    '#F59E0B',  // Amber
    '#EC4899',  // Pink
    '#14B8A6',  // Teal
    '#F43F5E',  // Rose
    '#64748B',  // Slate
  ],

  // Status colors
  status: {
    success: '#10B981',    // Emerald
    warning: '#F59E0B',    // Amber
    danger: '#EF4444',     // Red
    info: '#3B82F6',       // Blue
    default: '#64748B',    // Slate
  },

  // Chart elements
  grid: '#E2E8F0',         // Slate 200
  tooltip: {
    background: '#FFFFFF',
    border: '#E2E8F0',
    text: '#1E293B',
  }
};
