import { differenceInCalendarDays } from 'date-fns';
import type { Parent, PatternType, CustodyPattern, DayCustody, CustodyException } from '@/types';

// Predefined pattern sequences (one full cycle, A-first)
const PATTERN_SEQUENCES: Record<Exclude<PatternType, 'custom'>, ('A' | 'B')[]> = {
  // 3 days A, 3 days B = 6 day cycle
  '3_3': ['A','A','A','B','B','B'],
  // 5 days A, 5 days B = 10 day cycle
  '5_5': ['A','A','A','A','A','B','B','B','B','B'],
  // 7 days A, 7 days B = 14 day cycle
  '7_7': ['A','A','A','A','A','A','A','B','B','B','B','B','B','B'],
  // 14 days A, 14 days B = 28 day cycle
  '14_14': ['A','A','A','A','A','A','A','A','A','A','A','A','A','A','B','B','B','B','B','B','B','B','B','B','B','B','B','B'],
};

/**
 * Returns which parent has custody on a given date.
 * Exceptions take priority over the regular pattern.
 */
export function getCustodyForDate(
  pattern: CustodyPattern,
  date: Date,
  exceptions: Map<string, Parent>,
): Parent {
  const dateKey = formatDateKey(date);

  // Exceptions override the pattern
  if (exceptions.has(dateKey)) {
    return exceptions.get(dateKey)!;
  }

  const startDate = new Date(pattern.start_date + 'T00:00:00');

  // If handover_day is configured, adjust the start date to the first occurrence
  // of that weekday on or after the original start_date
  let effectiveStartDate = startDate;
  if (pattern.handover_day !== null && pattern.handover_day !== undefined) {
    const startWeekday = startDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const targetWeekday = pattern.handover_day;

    // Calculate days to add to reach the target weekday
    let daysToAdd = (targetWeekday - startWeekday + 7) % 7;

    effectiveStartDate = new Date(startDate);
    effectiveStartDate.setDate(startDate.getDate() + daysToAdd);
  }

  const daysDiff = differenceInCalendarDays(date, effectiveStartDate);

  let sequence: ('A' | 'B')[];
  if (pattern.pattern_type === 'custom' && pattern.custom_sequence) {
    sequence = pattern.custom_sequence.map(p => p === 'parent_a' ? 'A' : 'B');
  } else if (pattern.pattern_type !== 'custom') {
    sequence = PATTERN_SEQUENCES[pattern.pattern_type];
  } else {
    // Fallback: alternating weeks
    sequence = PATTERN_SEQUENCES['7_7'];
  }

  const cycleLength = sequence.length;
  // Handle negative daysDiff (dates before pattern start) correctly
  const index = ((daysDiff % cycleLength) + cycleLength) % cycleLength;
  const assignedLetter = sequence[index];

  // Map A/B to actual parents based on starting_parent
  if (pattern.starting_parent === 'parent_a') {
    return assignedLetter === 'A' ? 'parent_a' : 'parent_b';
  } else {
    return assignedLetter === 'A' ? 'parent_b' : 'parent_a';
  }
}

/**
 * Returns custody info for a range of dates.
 */
export function getCustodyForRange(
  pattern: CustodyPattern,
  startDate: Date,
  endDate: Date,
  exceptions: CustodyException[],
): DayCustody[] {
  const exceptionMap = buildExceptionMap(exceptions);
  const result: DayCustody[] = [];

  const current = new Date(startDate);
  while (current <= endDate) {
    const dateKey = formatDateKey(current);
    const exception = exceptions.find(e => e.date === dateKey && e.status === 'accepted');

    result.push({
      date: new Date(current),
      parent: getCustodyForDate(pattern, current, exceptionMap),
      isException: !!exception,
      exceptionReason: exception?.reason,
    });

    current.setDate(current.getDate() + 1);
  }

  return result;
}

/**
 * Builds a Map<dateString, Parent> from accepted exceptions.
 */
export function buildExceptionMap(exceptions: CustodyException[]): Map<string, Parent> {
  const map = new Map<string, Parent>();
  for (const ex of exceptions) {
    if (ex.status === 'accepted') {
      map.set(ex.date, ex.new_parent);
    }
  }
  return map;
}

/**
 * Formats a Date as YYYY-MM-DD string.
 */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns the cycle length for a given pattern type.
 */
export function getCycleLength(patternType: PatternType, customSequence?: Parent[]): number {
  if (patternType === 'custom' && customSequence) {
    return customSequence.length;
  }
  if (patternType !== 'custom') {
    return PATTERN_SEQUENCES[patternType].length;
  }
  return 14; // default fallback
}

/**
 * Generates a human-readable description of the pattern.
 */
export function getPatternDescription(patternType: PatternType): string {
  switch (patternType) {
    case '3_3':
      return '3 Tage bei einem Elternteil, dann 3 Tage beim anderen.';
    case '5_5':
      return '5 Tage bei einem Elternteil, dann 5 Tage beim anderen.';
    case '7_7':
      return 'Jede Woche wechselnd: 7 Tage bei einem Elternteil, dann 7 Tage beim anderen.';
    case '14_14':
      return '2 Wochen bei einem Elternteil, dann 2 Wochen beim anderen.';
    case 'custom':
      return 'Individuelles Muster, frei konfigurierbar.';
  }
}
