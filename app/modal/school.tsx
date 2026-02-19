import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { AppAlert } from '@/lib/alert';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSchoolTasks, useAddSchoolTask, useToggleTaskStatus, useDeleteSchoolTask } from '@/hooks/useSchoolTasks';
import { useEvents, useEventAttendances, useSetAttendance, useFamilyMembers } from '@/hooks/useFamily';
import { useChildren } from '@/hooks/useFamily';
import { useAuth } from '@/lib/auth';
import { TASK_PRIORITY_LABELS, ATTENDANCE_STATUS_LABELS, type TaskPriority, type SchoolTask, type AttendanceStatus, type Event } from '@/types';
import { formatDayMonth } from '@/lib/date-utils';
import { COLORS } from '@/lib/constants';
import { useResponsive } from '@/hooks/useResponsive';

export default function SchoolModal() {
  const { contentMaxWidth } = useResponsive();
  const { user } = useAuth();
  const { data: tasks } = useSchoolTasks();
  const { data: children } = useChildren();
  const { data: events } = useEvents();
  const { data: members } = useFamilyMembers();
  const addTask = useAddSchoolTask();
  const toggleTask = useToggleTaskStatus();
  const deleteTask = useDeleteSchoolTask();
  const setAttendance = useSetAttendance();

  const [showAddTask, setShowAddTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [taskDueDate, setTaskDueDate] = useState('');

  // Filter school events
  const schoolEvents = events?.filter((e) => e.category === 'school') ?? [];

  // Filter pending and completed tasks
  const pendingTasks = tasks?.filter((t) => t.status === 'pending') ?? [];
  const completedTasks = tasks?.filter((t) => t.status === 'completed') ?? [];

  async function handleAddTask() {
    if (!taskTitle.trim()) {
      AppAlert.alert('Fehler', 'Bitte einen Titel eingeben.');
      return;
    }

    try {
      await addTask.mutateAsync({
        title: taskTitle.trim(),
        description: taskDescription.trim() || null,
        priority: taskPriority,
        status: 'pending',
        child_id: selectedChild,
        due_date: taskDueDate || null,
      });
      setTaskTitle('');
      setTaskDescription('');
      setTaskPriority('medium');
      setSelectedChild(null);
      setTaskDueDate('');
      setShowAddTask(false);
    } catch (error: any) {
      AppAlert.alert('Fehler', error.message || 'Aufgabe konnte nicht erstellt werden.');
    }
  }

  async function handleToggleTask(task: SchoolTask) {
    const newStatus = task.status === 'pending' ? 'completed' : 'pending';
    try {
      await toggleTask.mutateAsync({ taskId: task.id, status: newStatus });
    } catch (error: any) {
      AppAlert.alert('Fehler', error.message || 'Status konnte nicht geändert werden.');
    }
  }

  async function handleDeleteTask(taskId: string) {
    AppAlert.alert('Aufgabe löschen', 'Möchtest du diese Aufgabe wirklich löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTask.mutateAsync(taskId);
          } catch (error: any) {
            AppAlert.alert('Fehler', error.message || 'Aufgabe konnte nicht gelöscht werden.');
          }
        },
      },
    ]);
  }

  const childName = (childId: string | null) => {
    if (!childId) return 'Alle Kinder';
    const child = children?.find((c) => c.id === childId);
    return child?.name ?? 'Unbekannt';
  };

  const priorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F59E0B';
      case 'low':
        return '#10B981';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Schule</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
        {/* Tasks Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Aufgaben</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddTask(!showAddTask)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={showAddTask ? 'close' : 'plus'}
                size={20}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Add Task Form */}
          {showAddTask && (
            <View style={styles.addTaskForm}>
              <TextInput
                style={styles.input}
                placeholder="Aufgabe (z.B. Hausaufgaben machen)"
                value={taskTitle}
                onChangeText={setTaskTitle}
                placeholderTextColor="#9CA3AF"
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Beschreibung (optional)"
                value={taskDescription}
                onChangeText={setTaskDescription}
                multiline
                numberOfLines={2}
                placeholderTextColor="#9CA3AF"
              />
              <TextInput
                style={styles.input}
                placeholder="Fälligkeitsdatum (YYYY-MM-DD)"
                value={taskDueDate}
                onChangeText={setTaskDueDate}
                placeholderTextColor="#9CA3AF"
              />

              {/* Priority Selection */}
              <Text style={styles.label}>Priorität</Text>
              <View style={styles.priorityContainer}>
                {(['low', 'medium', 'high'] as TaskPriority[]).map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setTaskPriority(p)}
                    style={[
                      styles.priorityChip,
                      taskPriority === p && { backgroundColor: priorityColor(p) + '20', borderColor: priorityColor(p) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.priorityText,
                        taskPriority === p && { color: priorityColor(p), fontWeight: '600' },
                      ]}
                    >
                      {TASK_PRIORITY_LABELS[p]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Child Selection */}
              {children && children.length > 0 && (
                <>
                  <Text style={styles.label}>Kind</Text>
                  <View style={styles.childContainer}>
                    <TouchableOpacity
                      onPress={() => setSelectedChild(null)}
                      style={[
                        styles.childChip,
                        !selectedChild && styles.childChipSelected,
                      ]}
                    >
                      <Text style={[styles.childText, !selectedChild && styles.childTextSelected]}>
                        Alle
                      </Text>
                    </TouchableOpacity>
                    {children.map((child) => (
                      <TouchableOpacity
                        key={child.id}
                        onPress={() => setSelectedChild(child.id)}
                        style={[
                          styles.childChip,
                          selectedChild === child.id && styles.childChipSelected,
                        ]}
                      >
                        <Text
                          style={[styles.childText, selectedChild === child.id && styles.childTextSelected]}
                        >
                          {child.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddTask}
                disabled={addTask.isPending}
              >
                <Text style={styles.saveButtonText}>
                  {addTask.isPending ? 'Wird gespeichert...' : 'Aufgabe hinzufügen'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Pending Tasks */}
          {pendingTasks.length > 0 ? (
            pendingTasks.map((task) => (
              <View key={task.id} style={styles.taskCard}>
                <TouchableOpacity
                  onPress={() => handleToggleTask(task)}
                  style={styles.taskRow}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="checkbox-blank-circle-outline"
                    size={24}
                    color={priorityColor(task.priority)}
                  />
                  <View style={styles.taskContent}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    {task.description && <Text style={styles.taskDescription}>{task.description}</Text>}
                    <View style={styles.taskMeta}>
                      {task.due_date && (
                        <Text style={styles.taskMetaText}>
                          📅 {formatDayMonth(new Date(task.due_date + 'T00:00:00'))}
                        </Text>
                      )}
                      <Text style={styles.taskMetaText}>👤 {childName(task.child_id)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteTask(task.id)} style={styles.deleteButton}>
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Keine offenen Aufgaben</Text>
            </View>
          )}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <>
              <Text style={styles.completedHeader}>Erledigt</Text>
              {completedTasks.map((task) => (
                <View key={task.id} style={[styles.taskCard, styles.taskCardCompleted]}>
                  <TouchableOpacity
                    onPress={() => handleToggleTask(task)}
                    style={styles.taskRow}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name="checkbox-marked-circle"
                      size={24}
                      color="#10B981"
                    />
                    <View style={styles.taskContent}>
                      <Text style={[styles.taskTitle, styles.taskTitleCompleted]}>{task.title}</Text>
                      {task.description && (
                        <Text style={styles.taskDescription}>{task.description}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteTask(task.id)} style={styles.deleteButton}>
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
        </View>

        {/* School Events Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schul-Termine</Text>
          {schoolEvents.length > 0 ? (
            schoolEvents.map((event) => (
              <EventCardWithRSVP
                key={event.id}
                event={event}
                userId={user?.id ?? ''}
                members={members ?? []}
                onSetAttendance={(status) => setAttendance.mutate({ eventId: event.id, status })}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Keine Schul-Termine</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.addEventButton}
            onPress={() => {
              router.back();
              router.push('/modal/add-event');
            }}
          >
            <MaterialCommunityIcons name="plus" size={16} color={COLORS.primary} />
            <Text style={styles.addEventButtonText}>Termin hinzufügen</Text>
          </TouchableOpacity>
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function EventCardWithRSVP({
  event,
  userId,
  members,
  onSetAttendance,
}: {
  event: Event;
  userId: string;
  members: any[];
  onSetAttendance: (status: AttendanceStatus) => void;
}) {
  const { data: attendances } = useEventAttendances(event.id);
  const myAttendance = attendances?.find((a) => a.user_id === userId);

  const attendeeNames = attendances
    ?.filter((a) => a.status === 'yes')
    .map((a) => {
      const member = members.find((m) => m.user_id === a.user_id);
      return member?.profile?.display_name ?? 'Unbekannt';
    });

  return (
    <View style={styles.eventCard}>
      <View style={styles.eventIconContainer}>
        <MaterialCommunityIcons name="school" size={24} color={COLORS.primary} />
      </View>
      <View style={styles.eventContent}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.eventDetails}>
          📅 {formatDayMonth(new Date(event.date + 'T00:00:00'))}
          {event.time && ` • ${event.time.substring(0, 5)}`}
        </Text>
        {event.location && (
          <Text style={styles.eventDetails}>📍 {event.location}</Text>
        )}

        {/* Attendees */}
        {attendeeNames && attendeeNames.length > 0 && (
          <Text style={styles.attendeesText}>
            ✓ {attendeeNames.join(', ')}
          </Text>
        )}

        {/* RSVP Buttons */}
        <View style={styles.rsvpContainer}>
          {(['yes', 'no', 'maybe'] as AttendanceStatus[]).map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() => onSetAttendance(status)}
              style={[
                styles.rsvpButton,
                myAttendance?.status === status && styles.rsvpButtonSelected,
              ]}
            >
              <Text
                style={[
                  styles.rsvpButtonText,
                  myAttendance?.status === status && styles.rsvpButtonTextSelected,
                ]}
              >
                {status === 'yes' ? '✓' : status === 'no' ? '✗' : '?'}{' '}
                {ATTENDANCE_STATUS_LABELS[status]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTaskForm: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111',
    marginBottom: 12,
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  priorityChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  priorityText: {
    fontSize: 14,
    color: '#6B7280',
  },
  childContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  childChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  childChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#EEF2FF',
  },
  childText: {
    fontSize: 14,
    color: '#6B7280',
  },
  childTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  taskCardCompleted: {
    opacity: 0.6,
  },
  taskRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  taskDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  taskMetaText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  deleteButton: {
    padding: 4,
  },
  completedHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  eventIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  eventDetails: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  addEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    backgroundColor: '#EEF2FF',
    marginTop: 8,
  },
  addEventButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  attendeesText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 8,
  },
  rsvpContainer: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  rsvpButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  rsvpButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#EEF2FF',
  },
  rsvpButtonText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  rsvpButtonTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
