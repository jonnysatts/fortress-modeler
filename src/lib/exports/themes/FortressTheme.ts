import { colord } from 'colord';

export const FORTRESS_COLORS = {
  // Brand colors
  fortress: {
    blue: '#1A2942',
    emerald: '#10B981',
  },
  
  // Semantic colors (from CSS variables)
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  
  // Status colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  
  warning: {
    50: '#fefce8',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  
  // Neutral colors
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
} as const;

export const SCENARIO_COLORS = {
  Conservative: {
    bg: FORTRESS_COLORS.danger[50],
    text: FORTRESS_COLORS.danger[600],
    border: FORTRESS_COLORS.danger[200],
  },
  Realistic: {
    bg: FORTRESS_COLORS.primary[50],
    text: FORTRESS_COLORS.primary[600],
    border: FORTRESS_COLORS.primary[200],
  },
  Optimistic: {
    bg: FORTRESS_COLORS.success[50],
    text: FORTRESS_COLORS.success[600],
    border: FORTRESS_COLORS.success[200],
  },
  Custom: {
    bg: FORTRESS_COLORS.gray[50],
    text: FORTRESS_COLORS.gray[700],
    border: FORTRESS_COLORS.gray[200],
  },
} as const;

export const FORTRESS_TYPOGRAPHY = {
  fontFamily: {
    sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
    mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
  },
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const FORTRESS_LAYOUT = {
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px
    '3xl': '4rem',    // 64px
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
} as const;

export function getScenarioColor(scenario: string) {
  const scenarioKey = scenario as keyof typeof SCENARIO_COLORS;
  return SCENARIO_COLORS[scenarioKey] || SCENARIO_COLORS.Custom;
}

export function adjustColorOpacity(color: string, opacity: number) {
  return colord(color).alpha(opacity).toHslString();
}

export function getContrastColor(backgroundColor: string) {
  const luminance = colord(backgroundColor).luminance();
  return luminance > 0.5 ? FORTRESS_COLORS.gray[900] : FORTRESS_COLORS.gray[50];
}

export const FORTRESS_CHART_CONFIG = {
  colors: {
    primary: FORTRESS_COLORS.fortress.emerald,
    secondary: FORTRESS_COLORS.fortress.blue,
    accent: FORTRESS_COLORS.primary[500],
    success: FORTRESS_COLORS.success[500],
    warning: FORTRESS_COLORS.warning[500],
    danger: FORTRESS_COLORS.danger[500],
  },
  fonts: {
    family: FORTRESS_TYPOGRAPHY.fontFamily.sans[0],
    size: {
      small: 11,
      normal: 12,
      large: 14,
    },
  },
  grid: {
    color: FORTRESS_COLORS.gray[200],
    lineWidth: 1,
  },
  legend: {
    fontSize: FORTRESS_TYPOGRAPHY.fontSize.sm,
    fontWeight: FORTRESS_TYPOGRAPHY.fontWeight.medium,
  },
} as const;