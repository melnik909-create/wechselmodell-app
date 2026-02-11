export type Parent = 'parent_a' | 'parent_b';
export type PatternType = '7_7' | '2_2_5_5' | '2_2_3' | '14_14' | 'custom';

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

export type EventCategory =
  | 'doctor'
  | 'school'
  | 'daycare'
  | 'sports'
  | 'music'
  | 'birthday'
  | 'vacation'
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
  parent_a_label: string | null; // Custom display name for Parent A
  parent_b_label: string | null; // Custom display name for Parent B
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
  passport_number: string | null; // Passport number for travel documentation
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
  handover_day: number | null; // 0=Sunday, 1=Monday, ..., 6=Saturday
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

export interface Event {
  id: string;
  family_id: string;
  child_id: string | null;
  title: string;
  description: string | null;
  date: string;
  time: string | null;
  category: EventCategory;
  location: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
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
  '14_14': '14/14 (2 Wochen/2 Wochen)',
  custom: 'Benutzerdefiniert',
};

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  doctor: 'Arzt',
  school: 'Schule',
  daycare: 'Kita',
  sports: 'Sport',
  music: 'Musik',
  birthday: 'Geburtstag',
  vacation: 'Urlaub',
  other: 'Sonstiges',
};

// SCHOOL TASKS
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'completed';

export interface SchoolTask {
  id: string;
  family_id: string;
  child_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  created_by: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Niedrig',
  medium: 'Mittel',
  high: 'Hoch',
};

// EVENT ATTENDANCES (RSVP)
export type AttendanceStatus = 'yes' | 'no' | 'maybe';

export interface EventAttendance {
  id: string;
  event_id: string;
  user_id: string;
  status: AttendanceStatus;
  created_at: string;
  updated_at: string;
}

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  yes: 'Nehme teil',
  no: 'Nehme nicht teil',
  maybe: 'Vielleicht',
};
