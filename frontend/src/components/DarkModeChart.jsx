import { useTheme } from '../context/ThemeContext';

/**
 * Get theme-aware colors for Recharts
 */
export const useChartTheme = () => {
  const { theme } = useTheme();
  
  const isDark = theme === 'dark';
  
  return {
    // Chart colors
    colors: [
      '#8b5cf6', // purple
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // amber
      '#ef4444', // red
      '#ec4899', // pink
      '#14b8a6', // teal
      '#f97316', // orange
    ],
    
    // Text colors
    textColor: isDark ? '#e5e7eb' : '#374151',
    subtextColor: isDark ? '#9ca3af' : '#6b7280',
    
    // Grid and axis
    gridColor: isDark ? '#374151' : '#e5e7eb',
    axisColor: isDark ? '#4b5563' : '#d1d5db',
    
    // Tooltip
    tooltipBg: isDark ? '#1f2937' : '#ffffff',
    tooltipBorder: isDark ? '#374151' : '#e5e7eb',
    tooltipText: isDark ? '#f3f4f6' : '#111827',
    
    // Card backgrounds
    cardBg: isDark ? 'rgba(31, 41, 55, 0.9)' : '#ffffff',
    
    // Gradients
    gradient1: isDark ? '#8b5cf6' : '#667eea',
    gradient2: isDark ? '#a78bfa' : '#764ba2',
  };
};

export default useChartTheme;










