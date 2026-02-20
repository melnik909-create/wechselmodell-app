import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet, TextInputProps } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, parse, isValid, addMonths, subMonths, startOfMonth, getDay, getDaysInMonth, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';

interface DateInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  value: string;
  onChangeText: (isoDate: string) => void;
  label?: string;
}

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export default function DateInput({ value, onChangeText, placeholder }: DateInputProps) {
  const [visible, setVisible] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    if (value) {
      try {
        const d = parse(value, 'yyyy-MM-dd', new Date());
        if (isValid(d)) return startOfMonth(d);
      } catch {}
    }
    return startOfMonth(new Date());
  });

  const displayValue = value
    ? (() => {
        try {
          const d = parse(value, 'yyyy-MM-dd', new Date());
          return isValid(d) ? format(d, 'dd.MM.yyyy', { locale: de }) : '';
        } catch {
          return '';
        }
      })()
    : '';

  const selectedDate = value
    ? (() => {
        try {
          const d = parse(value, 'yyyy-MM-dd', new Date());
          return isValid(d) ? d : null;
        } catch {
          return null;
        }
      })()
    : null;

  const days = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewMonth);
    const firstDay = getDay(viewMonth);
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const cells: (Date | null)[] = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
    }
    return cells;
  }, [viewMonth]);

  const handleSelect = (day: Date) => {
    onChangeText(format(day, 'yyyy-MM-dd'));
    setVisible(false);
  };

  const today = new Date();

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setVisible(true)} activeOpacity={0.7}>
        <MaterialCommunityIcons name="calendar" size={20} color="#6B7280" />
        <Text style={[styles.triggerText, !displayValue && styles.triggerPlaceholder]}>
          {displayValue || placeholder || 'Datum wählen'}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color="#9CA3AF" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={() => setViewMonth(subMonths(viewMonth, 1))} style={styles.navBtn}>
                <MaterialCommunityIcons name="chevron-left" size={24} color="#374151" />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>
                {format(viewMonth, 'MMMM yyyy', { locale: de })}
              </Text>
              <TouchableOpacity onPress={() => setViewMonth(addMonths(viewMonth, 1))} style={styles.navBtn}>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <View style={styles.weekdayRow}>
              {WEEKDAYS.map((wd) => (
                <Text key={wd} style={styles.weekdayText}>{wd}</Text>
              ))}
            </View>

            <View style={styles.daysGrid}>
              {days.map((day, i) => {
                if (!day) return <View key={`e-${i}`} style={styles.dayCell} />;
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isToday = isSameDay(day, today);
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.dayCell, isSelected && styles.dayCellSelected, isToday && !isSelected && styles.dayCellToday]}
                    onPress={() => handleSelect(day)}
                    activeOpacity={0.6}
                  >
                    <Text style={[styles.dayText, isSelected && styles.dayTextSelected, isToday && !isSelected && styles.dayTextToday]}>
                      {day.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setVisible(false)}>
              <Text style={styles.closeBtnText}>Schließen</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  triggerText: {
    flex: 1,
    fontSize: 15,
    color: '#111',
  },
  triggerPlaceholder: {
    color: '#9CA3AF',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBtn: {
    padding: 4,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    textTransform: 'capitalize',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    paddingVertical: 4,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  dayCellSelected: {
    backgroundColor: '#4F46E5',
  },
  dayCellToday: {
    backgroundColor: '#EEF2FF',
  },
  dayText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  dayTextToday: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  closeBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  closeBtnText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
  },
});
