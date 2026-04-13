import Dexie, { type Table } from 'dexie';
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

// Sync functions
export async function syncToSupabase() {
  const { supabase } = await import('./supabase');
  
  // Get unsynced employees
  const unsyncedEmployees = await db.employees.where('isSynced').equals(0).toArray();
  
  for (const emp of unsyncedEmployees) {
    const { error } = await supabase.from('employees').upsert({
      id: emp.id,
      name: emp.name,
      position: emp.position,
      team: emp.team,
      hourly_rate: emp.hourlyRate
    });
    
    if (!error) {
      await db.employees.update(emp.id, { isSynced: true });
    }
  }
  
  // Get unsynced shifts
  const unsyncedShifts = await db.shifts.where('isSynced').equals(0).toArray();
  
  for (const shift of unsyncedShifts) {
    const { error } = await supabase.from('shifts').upsert({
      id: shift.id,
      employee_id: shift.employeeId,
      date: shift.date,
      start_time: shift.startTime,
      end_time: shift.endTime,
      pause_minutes: shift.pauseMinutes,
      type: shift.type
    });
    
    if (!error) {
      await db.shifts.update(shift.id, { isSynced: true });
    }
  }
}

export async function loadFromSupabase() {
  const { supabase } = await import('./supabase');
  
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;
  if (!user) return;

  // Load employees
  const { data: supaEmployees } = await supabase
    .from('employees')
    .select('*')
    .eq('user_id', user.id);
    
  // Load shifts
  const { data: supaShifts } = await supabase
    .from('shifts')
    .select('*')
    .eq('user_id', user.id);
  
  // Clear local DB
  await db.employees.clear();
  await db.shifts.clear();
  
  // Insert employees
  if (supaEmployees) {
    for (const emp of supaEmployees) {
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
  }
  
  // Insert shifts
  if (supaShifts) {
    for (const shift of supaShifts) {
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
