// Chart types supported by the system
export const CHART_TYPES = {
  BAR: 'bar',
  LINE: 'line', 
  PIE: 'pie',
  DOUGHNUT: 'doughnut',
  AREA: 'area',
  SCATTER: 'scatter'
};

// Default chart colors (RHWB brand colors)
export const DEFAULT_COLORS = {
  primary: '#2563eb',      // blue-600
  secondary: '#7c3aed',    // purple-600
  accent: '#059669',       // emerald-600
  warning: '#d97706',      // amber-600
  danger: '#dc2626',       // red-600
  success: '#16a34a',      // green-600
  info: '#0891b2',         // cyan-600
  gray: '#6b7280'          // gray-500
};

// Color palettes for multi-series charts
export const COLOR_PALETTES = {
  primary: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'],
  gradient: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'],
  performance: ['#22c55e', '#eab308', '#f97316', '#ef4444'],
  seasonal: ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e']
};

// Responsive breakpoints
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

// Default chart options
export const DEFAULT_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        padding: 20,
        usePointStyle: true,
        font: {
          size: 12,
          family: 'Inter, system-ui, sans-serif'
        }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      cornerRadius: 8,
      padding: 12,
      displayColors: true
    }
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(0, 0, 0, 0.05)',
        drawBorder: false
      },
      ticks: {
        font: {
          size: 11,
          family: 'Inter, system-ui, sans-serif'
        },
        color: '#6b7280'
      }
    },
    y: {
      grid: {
        color: 'rgba(0, 0, 0, 0.05)',
        drawBorder: false
      },
      ticks: {
        font: {
          size: 11,
          family: 'Inter, system-ui, sans-serif'
        },
        color: '#6b7280'
      }
    }
  }
};

// Grid layout configurations
export const GRID_LAYOUTS = {
  default: {
    charts: 4,
    cols: {
      sm: 1,
      md: 2,
      lg: 2,
      xl: 2
    }
  },
  expanded: {
    charts: 6,
    cols: {
      sm: 1,
      md: 2,
      lg: 3,
      xl: 3
    }
  }
};