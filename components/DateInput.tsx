import { useState } from 'react';
import { TextInput, StyleSheet, TextInputProps } from 'react-native';
import { format, parse, isValid } from 'date-fns';
import { de } from 'date-fns/locale';

interface DateInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  value: string; // ISO format: yyyy-MM-dd
  onChangeText: (isoDate: string) => void;
  label?: string;
}

/**
 * DateInput component that displays German format (dd.MM.yyyy) but stores ISO format (yyyy-MM-dd)
 *
 * Usage:
 * <DateInput
 *   value={date}              // "2026-02-15" (ISO format)
 *   onChangeText={setDate}    // Receives ISO format
 *   placeholder="dd.MM.yyyy"
 * />
 */
export default function DateInput({ value, onChangeText, placeholder, ...props }: DateInputProps) {
  // Convert ISO (yyyy-MM-dd) to German display format (dd.MM.yyyy)
  const displayValue = value
    ? (() => {
        try {
          const parsedDate = parse(value, 'yyyy-MM-dd', new Date());
          return isValid(parsedDate) ? format(parsedDate, 'dd.MM.yyyy', { locale: de }) : value;
        } catch {
          return value;
        }
      })()
    : '';

  const handleTextChange = (text: string) => {
    // Allow partial input (user typing)
    if (text.length < 10) {
      // Store the partial German format temporarily
      onChangeText(text);
      return;
    }

    // Validate German format: dd.MM.yyyy
    const regex = /^(\d{2})\.(\d{2})\.(\d{4})$/;
    const match = text.match(regex);

    if (match) {
      try {
        // Parse German format and convert to ISO
        const parsedDate = parse(text, 'dd.MM.yyyy', new Date(), { locale: de });
        if (isValid(parsedDate)) {
          const isoDate = format(parsedDate, 'yyyy-MM-dd');
          onChangeText(isoDate);
        } else {
          // Invalid date, but keep the text for user to correct
          onChangeText(text);
        }
      } catch {
        onChangeText(text);
      }
    } else {
      // Not matching format yet, store as-is
      onChangeText(text);
    }
  };

  return (
    <TextInput
      {...props}
      value={displayValue}
      onChangeText={handleTextChange}
      placeholder={placeholder || 'dd.MM.yyyy'}
      keyboardType="numeric"
      maxLength={10}
      style={[styles.input, props.style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111',
    backgroundColor: '#fff',
  },
});
