import { differenceInCalendarDays } from 'date-fns';
import type { Parent, PatternType, CustodyPattern, DayCustody, CustodyException } from '@/types';

// Predefined pattern sequences (one full cycle, A-first)
const PATTERN_SEQUENCES: Record<Exclude<PatternType, 'custom'>, ('A' | 'B')[]> = {
  // 7 days A, 7 days B = 14 day cycle
  '7_7': ['A','A','A','A','A','A','A','B','B','B','B','B','B','B'],
  // 2A, 2B, 5A, 2B, 2A, 5B = 18 day cycle
  '2_2_5_5': ['A','A','B','B','A','A','A','A','A','B','B','A','A','B','B','B','B','B'],
  // 2A, 2B, 3A, 2B, 2A, 3B = 14 day cycle
  '2_2_3': ['A','A','B','B','A','A','A','B','B','A','A','B','B','B'],
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
  const daysDiff = differenceInCalendarDays(date, startDate);

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
    case '7_7':
      return 'Jede Woche wechselnd: 7 Tage bei einem Elternteil, dann 7 Tage beim anderen.';
    case '2_2_5_5':
      return '2 Tage bei A, 2 bei B, 5 bei A, dann 2 bei B, 2 bei A, 5 bei B.';
    case '2_2_3':
      return '2 Tage bei A, 2 bei B, 3 bei A, dann umgekehrt.';
    case 'custom':
      return 'Individuelles Muster, frei konfigurierbar.';
  }
}
