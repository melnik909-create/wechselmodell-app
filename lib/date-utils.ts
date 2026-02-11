import { format, startOfWeek, endOfWeek, addDays, startOfMonth, endOfMonth, isToday, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';

export function formatDE(date: Date, formatStr: string): string {
  return format(date, formatStr, { locale: de });
}

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function getMonthDays(date: Date): Date[] {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const days: Date[] = [];

  // Pad with days from previous month to start on Monday
  const weekStart = startOfWeek(start, { weekStartsOn: 1 });
  let current = weekStart;

  while (current <= end || current.getDay() !== 1) {
    days.push(new Date(current));
    current = addDays(current, 1);
    if (days.length >= 42) break; // Max 6 weeks
  }

  return days;
}

export function getNext7Days(fromDate: Date = new Date()): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(fromDate, i));
}

export function formatShortDay(date: Date): string {
  return formatDE(date, 'EEE');
}

export function formatDayMonth(date: Date): string {
  return formatDE(date, 'dd.MM.');
}

export function formatFullDate(date: Date): string {
  return formatDE(date, 'dd.MM.yyyy');
}

export function formatMonthYear(date: Date): string {
  return formatDE(date, 'MMMM yyyy');
}

export { isToday, isSameDay, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek };
