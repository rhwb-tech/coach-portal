/**
 * Chart Helper Utilities
 * Functions for data transformation, formatting, and responsive handling
 */

// Format numbers for display
export const formatNumber = (value, options = {}) => {
  const { 
    decimals = 0, 
    suffix = '', 
    prefix = '', 
    fallback = '0' 
  } = options;

  if (value === null || value === undefined || isNaN(value)) {
    return fallback;
  }

  const num = parseFloat(value);
  return `${prefix}${num.toFixed(decimals)}${suffix}`;
};

// Format percentage values
export const formatPercentage = (value, decimals = 1) => {
  return formatNumber(value, { decimals, suffix: '%' });
};

// Format currency values
export const formatCurrency = (value, currency = 'USD') => {
  if (value === null || value === undefined || isNaN(value)) {
    return '$0';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(parseFloat(value));
};

// Get responsive chart height based on screen size
export const getResponsiveHeight = (config, screenWidth) => {
  const { responsive } = config;
  
  if (!responsive?.height) {
    return 300; // default height
  }

  const { height } = responsive;
  
  if (screenWidth >= 1280) return height.xl || height.lg || height.md || height.sm || 300;
  if (screenWidth >= 1024) return height.lg || height.md || height.sm || 300;
  if (screenWidth >= 768) return height.md || height.sm || 300;
  return height.sm || 300;
};

// Get responsive aspect ratio
export const getResponsiveAspectRatio = (config, screenWidth) => {
  const { responsive } = config;
  
  if (!responsive?.aspectRatio) {
    return 2; // default aspect ratio
  }

  const { aspectRatio } = responsive;
  
  if (screenWidth >= 1280) return aspectRatio.xl || aspectRatio.lg || aspectRatio.md || aspectRatio.sm || 2;
  if (screenWidth >= 1024) return aspectRatio.lg || aspectRatio.md || aspectRatio.sm || 2;
  if (screenWidth >= 768) return aspectRatio.md || aspectRatio.sm || 2;
  return aspectRatio.sm || 1;
};

// Transform SQL results to chart data format
export const transformDataForChart = (rawData, config, avgData = null) => {
  try {
    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
      return null;
    }

    // Use the config's dataTransform function if available
    if (config.dataTransform && typeof config.dataTransform === 'function') {
      // Pass avgData for charts that need it (like feedback ratio)
      return config.dataTransform(rawData, avgData);
    }

    // Default transformation for simple cases
    return {
      labels: rawData.map(row => Object.values(row)[0]),
      datasets: [{
        data: rawData.map(row => Object.values(row)[1]),
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6'
      }]
    };
  } catch (error) {
    console.error('Error transforming chart data:', error);
    return null;
  }
};

// Generate color palette for multi-series data
export const generateColorPalette = (count, palette = 'primary') => {
  const palettes = {
    primary: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'],
    gradient: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'],
    performance: ['#22c55e', '#eab308', '#f97316', '#ef4444'],
    seasonal: ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e']
  };

  const colors = palettes[palette] || palettes.primary;
  
  // Repeat colors if we need more than available
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(colors[i % colors.length]);
  }
  
  return result;
};

// Add transparency to colors
export const addAlphaToColor = (color, alpha = 0.2) => {
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  
  // If already rgba, just return as is
  if (color.startsWith('rgba')) {
    return color;
  }
  
  // If rgb, convert to rgba
  if (color.startsWith('rgb')) {
    return color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
  }
  
  return color;
};

// Debounce function for resize events
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Check if device is mobile
export const isMobile = () => {
  return window.innerWidth < 768;
};

// Check if device is tablet
export const isTablet = () => {
  return window.innerWidth >= 768 && window.innerWidth < 1024;
};

// Check if device is desktop
export const isDesktop = () => {
  return window.innerWidth >= 1024;
};

// Get current screen size category
export const getScreenSize = () => {
  const width = window.innerWidth;
  if (width < 640) return 'xs';
  if (width < 768) return 'sm';
  if (width < 1024) return 'md';
  if (width < 1280) return 'lg';
  if (width < 1536) return 'xl';
  return '2xl';
};

// Truncate long labels for mobile display
export const truncateLabel = (label, maxLength = 12) => {
  if (typeof label !== 'string') return label;
  if (label.length <= maxLength) return label;
  return label.substring(0, maxLength - 3) + '...';
};

// Sort data by value (for charts that benefit from sorting)
export const sortChartData = (data, sortBy = 'value', direction = 'desc') => {
  if (!data || !Array.isArray(data)) return data;
  
  return [...data].sort((a, b) => {
    let aVal = sortBy === 'value' ? parseFloat(a.value) || 0 : a.label;
    let bVal = sortBy === 'value' ? parseFloat(b.value) || 0 : b.label;
    
    if (direction === 'desc') {
      return bVal > aVal ? 1 : -1;
    } else {
      return aVal > bVal ? 1 : -1;
    }
  });
};

// Calculate basic statistics from data
export const calculateStats = (data) => {
  if (!Array.isArray(data) || data.length === 0) {
    return { min: 0, max: 0, avg: 0, sum: 0, count: 0 };
  }
  
  const values = data.map(item => parseFloat(item) || 0);
  const sum = values.reduce((acc, val) => acc + val, 0);
  const count = values.length;
  const avg = count > 0 ? sum / count : 0;
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  return { min, max, avg, sum, count };
};

const chartHelpers = {
  formatNumber,
  formatPercentage,
  formatCurrency,
  getResponsiveHeight,
  getResponsiveAspectRatio,
  transformDataForChart,
  generateColorPalette,
  addAlphaToColor,
  debounce,
  isMobile,
  isTablet,
  isDesktop,
  getScreenSize,
  truncateLabel,
  sortChartData,
  calculateStats
};

export default chartHelpers;