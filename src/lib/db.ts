import Dexie, { type Table } from 'dexie';

// API URL - VPS Backend
export const API_URL = 'https://api.webotonom.de';
import type { ShiftType } from '../types';

export interface DBEmployee {
  id: string;
  name: string;
  position: string;
  team: string;
  hourlyRate: number;
  shifts: DBShift[];
  isSynced: boolean;
}

export interface DBShift {
  id: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  pauseMinutes: number;
  type: ShiftType;
  isSynced: boolean;
}

export interface DBSettings {
  key: string;
  value: any;
}

class MotorWorldDB extends Dexie {
  employees!: Table<DBEmployee>;
  shifts!: Table<DBShift>;
  settings!: Table<DBSettings>;
  
  constructor() {
    super('MotorWorldDB');
    this.version(1).stores({
      employees: 'id, name, team, isSynced',
      shifts: 'id, employeeId, date, isSynced',
      settings: 'key'
    });
  }
}

export const db = new MotorWorldDB();

// Sync functions - VPS Backend
import { useAuthStore } from '../stores/useAuthStore';

export async function saveToServer(employees: any[]) {
  const token = useAuthStore.getState().token;
  if (!token) return;

  const allShifts = employees.flatMap((emp: any) =>
    (emp.shifts || []).map((s: any) => ({
      id: s.id,
      employee_id: emp.id,
      date: s.date,
      start_time: s.startTime,
      end_time: s.endTime,
      pause_minutes: s.pauseMinutes,
      type: s.type
    }))
  );

  const empData = employees.map((e: any) => ({
    id: e.id,
    name: e.name,
    position: e.position,
    team: e.team,
    hourlyRate: e.hourlyRate
  }));

  const res = await fetch(`${API_URL}/api/data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ employees: empData, shifts: allShifts })
  });

  if (!res.ok) {
    throw new Error('Failed to save to server');
  }
}

export async function loadFromServer() {
  const token = useAuthStore.getState().token;
  if (!token) return;

  const res = await fetch(`${API_URL}/api/data`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) return;

  const data = await res.json();

  // Clear local DB
  await db.employees.clear();
  await db.shifts.clear();

  // Insert employees
  for (const emp of (data.employees || [])) {
    await db.employees.add({
      id: emp.id,
      name: emp.name,
      position: emp.position,
      team: emp.team,
      hourlyRate: emp.hourly_rate,
      shifts: [],
      isSynced: true
    });
  }

  // Insert shifts
  for (const shift of (data.shifts || [])) {
    await db.shifts.add({
      id: shift.id,
      employeeId: shift.employee_id,
      date: shift.date,
      startTime: shift.start_time,
      endTime: shift.end_time,
      pauseMinutes: shift.pause_minutes,
      type: shift.type,
      isSynced: true
    });
  }
}

// Helper: get all employees with their shifts from local DB
export async function getEmployeesWithShifts() {
  const employees = await db.employees.toArray();
  const shifts = await db.shifts.toArray();
  
  return employees.map(emp => ({
    ...emp,
    shifts: shifts.filter(s => s.employeeId === emp.id)
  }));
}

// Helper: save an employee (local + mark unsynced)
export async function saveEmployee(employee: Omit<DBEmployee, 'isSynced'>) {
  await db.employees.put({ ...employee, isSynced: false });
}

// Helper: save a shift (local + mark unsynced)
export async function saveShift(shift: Omit<DBShift, 'isSynced'>) {
  await db.shifts.put({ ...shift, isSynced: false });
}

// Helper: delete employee and their shifts
export async function deleteEmployee(id: string) {
  await db.shifts.where('employeeId').equals(id).delete();
  await db.employees.delete(id);
}
