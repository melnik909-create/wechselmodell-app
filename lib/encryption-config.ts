/**
 * Configuration: Which fields need encryption in each table
 *
 * CHILDREN: 11 sensitive fields
 * EMERGENCY_CONTACTS: 1 sensitive field
 * CONTACTS: 5 sensitive fields
 *
 * Total: 17 encrypted fields across 3 tables
 */

export const ENCRYPTED_FIELDS = {
  children: [
    'passport_number',      // KRITISCH - Reisepassnummer
    'insurance_number',     // KRITISCH - Versicherungsnummer
    'allergies',           // Gesundheit - Allergien
    'blood_type',          // Gesundheit - Blutgruppe
    'doctor_phone',        // Kontakt - Arzttelefon
    'doctor_address',      // Kontakt - Arztadresse
    'doctor_name',         // Kontakt - Arztname
    'school_phone',        // Kontakt - Schultelefon
    'school_address',      // Kontakt - Schuladresse
    'daycare_phone',       // Kontakt - Kitatelefon
    'notes',               // Privat - Notizen
  ] as const,

  emergency_contacts: [
    'phone',               // KRITISCH - Notfalltelefonnummer
  ] as const,

  contacts: [
    'phone',               // KRITISCH - Telefonnummer
    'mobile',              // KRITISCH - Mobilnummer
    'email',               // Kontakt - E-Mail
    'address',             // Adresse - Wohnadresse
    'notes',               // Privat - Notizen
  ] as const,
};

/**
 * Map plaintext column name to encrypted column name
 * Example: 'passport_number' → 'passport_number_enc'
 */
export function getEncryptedColumnName(field: string): string {
  return `${field}_enc`;
}

/**
 * Type helper: Extract field names for a specific table
 */
export type ChildrenEncryptedField = typeof ENCRYPTED_FIELDS.children[number];
export type EmergencyContactsEncryptedField = typeof ENCRYPTED_FIELDS.emergency_contacts[number];
export type ContactsEncryptedField = typeof ENCRYPTED_FIELDS.contacts[number];
