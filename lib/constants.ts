export const COLORS = {
  primary: '#4F46E5',
  primaryLight: '#818CF8',
  primaryDark: '#3730A3',
  parentA: '#3B82F6',
  parentB: '#A855F7',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
};

export const PARENT_COLORS = {
  parent_a: '#3B82F6',
  parent_b: '#A855F7',
} as const;

export const EXCEPTION_COLORS = {
  proposed: '#FBBF24',  // GELB (Yellow)
  accepted: '#10B981',  // GRÜN (Green)
  rejected: '#EF4444',  // ROT (Red)
} as const;

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I/O/0/1 for readability
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
