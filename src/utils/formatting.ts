import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (date: string): string => {
  return format(parseISO(date), 'MMM dd, yyyy');
};

export const formatDateShort = (date: string): string => {
  return format(parseISO(date), 'MMM dd');
};

export const getCurrentMonth = (): string => {
  return format(new Date(), 'yyyy-MM');
};

export const getMonthRange = (month: string) => {
  const date = parseISO(`${month}-01`);
  return { start: startOfMonth(date), end: endOfMonth(date) };
};

export const isInCurrentMonth = (dateStr: string): boolean => {
  const date = parseISO(dateStr);
  const now = new Date();
  return isWithinInterval(date, {
    start: startOfMonth(now),
    end: endOfMonth(now),
  });
};

export const formatPercentage = (value: number): string => {
  return `${Math.round(value * 100)}%`;
};
