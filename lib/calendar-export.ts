import { Platform } from 'react-native';
import { AppAlert } from './alert';

interface CalendarEvent {
  title: string;
  date: string;       // yyyy-MM-dd
  time?: string | null; // HH:mm or HH:mm:ss
  location?: string | null;
  description?: string | null;
  durationMinutes?: number;
}

function parseEventDates(event: CalendarEvent) {
  const [year, month, day] = event.date.split('-').map(Number);
  let hours = 0, minutes = 0;
  if (event.time) {
    const parts = event.time.split(':').map(Number);
    hours = parts[0] ?? 0;
    minutes = parts[1] ?? 0;
  }
  const start = new Date(year, month - 1, day, hours, minutes);
  const dur = event.durationMinutes ?? 60;
  const end = new Date(start.getTime() + dur * 60 * 1000);
  return { start, end, allDay: !event.time };
}

function toICSDateString(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function toICSDateOnly(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function generateICS(event: CalendarEvent): string {
  const { start, end, allDay } = parseEventDates(event);
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@wechselmodell`;
  const now = toICSDateString(new Date());

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Wechselmodell-Planer//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
  ];

  if (allDay) {
    lines.push(`DTSTART;VALUE=DATE:${toICSDateOnly(start)}`);
    const nextDay = new Date(start);
    nextDay.setDate(nextDay.getDate() + 1);
    lines.push(`DTEND;VALUE=DATE:${toICSDateOnly(nextDay)}`);
  } else {
    lines.push(`DTSTART:${toICSDateString(start)}`);
    lines.push(`DTEND:${toICSDateString(end)}`);
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-PT30M');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:${event.title} in 30 Minuten`);
    lines.push('END:VALARM');
  }

  lines.push(`SUMMARY:${event.title}`);
  if (event.description) lines.push(`DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`);
  if (event.location) lines.push(`LOCATION:${event.location}`);
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

async function exportToNativeCalendar(event: CalendarEvent): Promise<boolean> {
  try {
    const Calendar = require('expo-calendar');
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') {
      AppAlert.alert('Berechtigung fehlt', 'Bitte erlaube den Zugriff auf den Kalender in den Einstellungen.');
      return false;
    }

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const defaultCal = calendars.find(
      (c: any) => c.isPrimary || c.allowsModifications
    ) ?? calendars[0];

    if (!defaultCal) {
      AppAlert.alert('Fehler', 'Kein Kalender auf dem Gerät gefunden.');
      return false;
    }

    const { start, end, allDay } = parseEventDates(event);

    await Calendar.createEventAsync(defaultCal.id, {
      title: event.title,
      startDate: start,
      endDate: end,
      allDay,
      location: event.location ?? undefined,
      notes: event.description ?? undefined,
      alarms: event.time ? [{ relativeOffset: -30 }] : [],
    });

    return true;
  } catch (error: any) {
    console.error('[CalendarExport] Native error:', error);
    AppAlert.alert('Fehler', 'Termin konnte nicht zum Kalender hinzugefügt werden.');
    return false;
  }
}

function exportToWebCalendar(event: CalendarEvent): boolean {
  try {
    const icsContent = generateICS(event);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/[^a-zA-Z0-9äöüÄÖÜß\- ]/g, '')}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('[CalendarExport] Web error:', error);
    return false;
  }
}

export async function addEventToCalendar(event: CalendarEvent): Promise<void> {
  if (Platform.OS === 'web') {
    const ok = exportToWebCalendar(event);
    if (ok) {
      AppAlert.alert('Kalender-Datei', 'Die .ics-Datei wurde heruntergeladen. Öffne sie, um den Termin in deinen Kalender zu importieren.');
    }
  } else {
    const ok = await exportToNativeCalendar(event);
    if (ok) {
      AppAlert.alert('Termin hinzugefügt', `"${event.title}" wurde in deinen Kalender eingetragen.`);
    }
  }
}

export async function addMultipleEventsToCalendar(events: CalendarEvent[]): Promise<void> {
  if (events.length === 0) return;

  if (Platform.OS === 'web') {
    const allIcs = events.map(generateICS);
    const combined = allIcs.join('\r\n');
    try {
      const blob = new Blob([combined], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'termine-wechselmodell.ics';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      AppAlert.alert('Kalender-Datei', `${events.length} Termine als .ics-Datei heruntergeladen.`);
    } catch {
      AppAlert.alert('Fehler', 'Export fehlgeschlagen.');
    }
  } else {
    try {
      const Calendar = require('expo-calendar');
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        AppAlert.alert('Berechtigung fehlt', 'Bitte erlaube den Zugriff auf den Kalender.');
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCal = calendars.find(
        (c: any) => c.isPrimary || c.allowsModifications
      ) ?? calendars[0];

      if (!defaultCal) {
        AppAlert.alert('Fehler', 'Kein Kalender gefunden.');
        return;
      }

      let count = 0;
      for (const event of events) {
        const { start, end, allDay } = parseEventDates(event);
        await Calendar.createEventAsync(defaultCal.id, {
          title: event.title,
          startDate: start,
          endDate: end,
          allDay,
          location: event.location ?? undefined,
          notes: event.description ?? undefined,
          alarms: event.time ? [{ relativeOffset: -30 }] : [],
        });
        count++;
      }

      AppAlert.alert('Termine hinzugefügt', `${count} Termine wurden in deinen Kalender eingetragen.`);
    } catch (error) {
      console.error('[CalendarExport] Batch error:', error);
      AppAlert.alert('Fehler', 'Termine konnten nicht exportiert werden.');
    }
  }
}
