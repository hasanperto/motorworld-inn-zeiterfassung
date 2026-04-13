export type ShiftType = 'normal' | 'nacht' | 'sonntag' | 'nacht+sonntag';

export interface Shift {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string | null; // HH:mm or null if active
  pauseMinutes: number;
  type: ShiftType;
}

export interface Employee {
  id: string;
  name: string;
  position: string;
  team: string;
  hourlyRate: number;
  shifts: Shift[];
}

export interface ActiveShift {
  startTime: Date;
  pauseStartTime: Date | null;
  totalPauseMs: number;
  alarmTime: Date | null;
}

export interface DayStats {
  date: string;
  totalMinutes: number;
  normalMinutes: number;
  nachtMinutes: number;
  sonntagMinutes: number;
  earnings: number;
}
