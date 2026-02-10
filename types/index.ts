export type Parent = 'parent_a' | 'parent_b';
export type PatternType = '7_7' | '2_2_5_5' | '2_2_3' | 'custom';

export type ExceptionReason = 'vacation' | 'sick' | 'swap' | 'holiday' | 'other';
export type ExceptionStatus = 'proposed' | 'accepted' | 'rejected';

export type ExpenseCategory =
  | 'clothing'
  | 'medical'
  | 'school'
  | 'daycare'
  | 'sports'
  | 'music'
  | 'food'
  | 'transport'
  | 'vacation'
  | 'other';

export type HandoverItemCategory =
  | 'clothing'
  | 'medication'
  | 'homework'
  | 'document'
  | 'toy'
  | 'other';

export type FamilyRole = 'parent_a' | 'parent_b';

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Family {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: FamilyRole;
  joined_at: string;
}

export interface Child {
  id: string;
  family_id: string;
  name: string;
  date_of_birth: string | null;
  avatar_url: string | null;
  allergies: string | null;
  blood_type: string | null;
  doctor_name: string | null;
  doctor_phone: string | null;
  doctor_address: string | null;
  school_name: string | null;
  school_phone: string | null;
  school_address: string | null;
  daycare_name: string | null;
  daycare_phone: string | null;
  insurance_name: string | null;
  insurance_number: string | null;
  notes: string | null;
}

export interface EmergencyContact {
  id: string;
  child_id: string;
  name: string;
  relationship: string | null;
  phone: string;
  is_primary: boolean;
}

export interface CustodyPattern {
  id: string;
  family_id: string;
  pattern_type: PatternType;
  start_date: string;
  starting_parent: Parent;
  custom_sequence: Parent[] | null;
  is_active: boolean;
}

export interface CustodyException {
  id: string;
  family_id: string;
  date: string;
  original_parent: Parent;
  new_parent: Parent;
  reason: ExceptionReason;
  note: string | null;
  status: ExceptionStatus;
  proposed_by: string;
  responded_at: string | null;
}

export interface Handover {
  id: string;
  family_id: string;
  date: string;
  from_parent: string;
  to_parent: string;
  status: 'pending' | 'completed';
  notes: string | null;
}

export interface HandoverItem {
  id: string;
  handover_id: string;
  category: HandoverItemCategory;
  description: string;
  is_checked: boolean;
  photo_url: string | null;
  child_id: string | null;
  sort_order: number;
}

export interface Expense {
  id: string;
  family_id: string;
  child_id: string | null;
  amount: number;
  description: string;
  category: ExpenseCategory;
  paid_by: string;
  split_type: '50_50' | 'custom';
  split_percentage: number;
  receipt_url: string | null;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Settlement {
  id: string;
  family_id: string;
  settled_by: string;
  amount: number;
  period_start: string;
  period_end: string;
  settled_at: string;
}

// UI Helper Types
export interface DayCustody {
  date: Date;
  parent: Parent;
  isException: boolean;
  exceptionReason?: ExceptionReason;
}

// Category labels in German
export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  clothing: 'Kleidung',
  medical: 'Medizin',
  school: 'Schule',
  daycare: 'Kita',
  sports: 'Sport',
  music: 'Musik',
  food: 'Essen',
  transport: 'Transport',
  vacation: 'Urlaub',
  other: 'Sonstiges',
};

export const HANDOVER_CATEGORY_LABELS: Record<HandoverItemCategory, string> = {
  clothing: 'Kleidung',
  medication: 'Medikamente',
  homework: 'Hausaufgaben',
  document: 'Dokumente',
  toy: 'Spielzeug',
  other: 'Sonstiges',
};

export const EXCEPTION_REASON_LABELS: Record<ExceptionReason, string> = {
  vacation: 'Urlaub',
  sick: 'Krankheit',
  swap: 'Tauschtag',
  holiday: 'Feiertag',
  other: 'Sonstiges',
};

export const PATTERN_LABELS: Record<PatternType, string> = {
  '7_7': '7/7 (Woche/Woche)',
  '2_2_5_5': '2/2/5/5',
  '2_2_3': '2/2/3',
  custom: 'Benutzerdefiniert',
};
