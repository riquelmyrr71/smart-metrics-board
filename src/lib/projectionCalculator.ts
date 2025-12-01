import { differenceInDays, startOfMonth, endOfMonth, startOfDay } from 'date-fns';

export interface PeriodSettings {
  startDate: Date;
  endDate: Date;
  currentDate: Date;
}

export const getDefaultPeriodSettings = (): PeriodSettings => {
  const now = new Date();
  return {
    startDate: startOfMonth(now),
    endDate: endOfMonth(now),
    currentDate: startOfDay(now),
  };
};

/**
 * Calculate the number of days elapsed in the period
 */
export const getDaysElapsed = (settings: PeriodSettings): number => {
  const elapsed = differenceInDays(settings.currentDate, settings.startDate) + 1;
  return Math.max(1, elapsed); // At least 1 day
};

/**
 * Calculate the total number of days in the period
 */
export const getTotalDays = (settings: PeriodSettings): number => {
  const total = differenceInDays(settings.endDate, settings.startDate) + 1;
  return Math.max(1, total);
};

/**
 * Calculate remaining days in the period
 */
export const getRemainingDays = (settings: PeriodSettings): number => {
  const remaining = differenceInDays(settings.endDate, settings.currentDate);
  return Math.max(0, remaining);
};

/**
 * Calculate the progress percentage through the period
 */
export const getPeriodProgress = (settings: PeriodSettings): number => {
  const elapsed = getDaysElapsed(settings);
  const total = getTotalDays(settings);
  return Math.min(1, elapsed / total);
};

/**
 * Calculate projection based on current value and time elapsed
 * Formula: projection = currentValue + (dailyRate × remainingDays)
 * 
 * This projects what the final value will be if the current daily rate continues
 * dailyRate = currentValue / daysElapsed
 */
export const calculateProjection = (
  currentValue: number,
  settings: PeriodSettings
): number => {
  const daysElapsed = getDaysElapsed(settings);
  const remainingDays = getRemainingDays(settings);
  
  // Daily rate = current / days elapsed (average streamers recruited per day)
  const dailyRate = currentValue / daysElapsed;
  
  // Projection = current + (daily rate × remaining days)
  const projection = currentValue + (dailyRate * remainingDays);
  
  return Math.round(projection);
};

/**
 * Calculate achievement percentage (atingimento)
 * Formula: (current / meta) * 100
 */
export const calculateAchievement = (
  currentValue: number,
  metaValue: number
): number => {
  if (metaValue === 0) return 0;
  return (currentValue / metaValue) * 100;
};

/**
 * Calculate projected achievement percentage
 * Formula: (projection / meta) * 100
 */
export const calculateProjectedAchievement = (
  projectionValue: number,
  metaValue: number
): number => {
  if (metaValue === 0) return 0;
  return (projectionValue / metaValue) * 100;
};

/**
 * Format percentage for display
 */
export const formatPercentage = (value: number, decimalPlaces: number = 0): string => {
  return `${value.toFixed(decimalPlaces)}%`;
};

/**
 * Get color class based on achievement percentage
 */
export const getAchievementColor = (percentage: number): 'success' | 'warning' | 'destructive' | 'over100' => {
  if (percentage >= 100) return 'over100';
  if (percentage >= 80) return 'success';
  if (percentage >= 50) return 'warning';
  return 'destructive';
};
