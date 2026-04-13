import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Employee, Shift, ActiveShift, DayStats, ShiftType } from '../types';

// Load data from Supabase
const loadFromServer = async (): Promise<{ employees: Employee[]; shifts: any[] } | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;
  
  const { data: employees } = await supabase
    .from('employees')
    .select('*')
    .eq('user_id', user.id);
    
  const { data: shifts } = await supabase
    .from('shifts')
    .select('*')
    .eq('user_id', user.id);
    
  return {
    employees: (employees || []).map((e: any) => ({
      id: e.id,
      name: e.name,
      position: e.position,
      team: e.team,
      hourlyRate: e.hourly_rate,
      shifts: []
    })),
    shifts: (shifts || []).map((s: any) => ({
      id: s.id,
      employee_id: s.employee_id,
      date: s.date,
      startTime: s.start_time,
      endTime: s.end_time,
      pauseMinutes: s.pause_minutes,
      type: s.type
    }))
  };
};

// Save data to Supabase
const saveToServer = async (employees: Employee[]) => {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return;
  
  // Delete old
  await supabase.from('shifts').delete().eq('user_id', user.id);
  await supabase.from('employees').delete().eq('user_id', user.id);
  
  // Insert employees
  if (employees.length > 0) {
    const empData = employees.map(e => ({
      id: e.id,
      user_id: user.id,
      name: e.name,
      position: e.position,
      team: e.team,
      hourly_rate: e.hourlyRate
    }));
    await supabase.from('employees').insert(empData);
  }
  
  // Insert shifts  
  const allShifts = employees.flatMap(emp => 
    emp.shifts.map(shift => ({
      id: shift.id,
      user_id: user.id,
      employee_id: emp.id,
      date: shift.date,
      start_time: shift.startTime,
      end_time: shift.endTime,
      pause_minutes: shift.pauseMinutes,
      type: shift.type
    }))
  );
  if (allShifts.length > 0) {
    await supabase.from('shifts').insert(allShifts);
  }
};

interface Store {
  activeShift: ActiveShift | null;
  currentEmployeeId: string | null;
  isPaused: boolean;
  employees: Employee[];
  
  // Server sync methods
  loadFromServer: () => Promise<void>;
  saveToServer: () => Promise<void>;
  
  // Existing methods
  startShift: (employeeId: string) => void;
  endShift: () => void;
  togglePause: () => void;
  setAlarm: (time: Date | null) => void;
  addEmployee: (employee: Omit<Employee, 'id' | 'shifts'>) => void;
  removeEmployee: (id: string) => void;
  setCurrentEmployee: (id: string | null) => void;
  getEmployee: (id: string) => Employee | undefined;
  getTodayShifts: (employeeId: string) => Shift[];
  getMonthStats: (employeeId: string, year: number, month: number) => DayStats[];
  calculateEarnings: (minutes: number, type: ShiftType, hourlyRate: number) => number;
}

export const useStore = create<Store>()(
  (set, get) => ({
    activeShift: null,
    currentEmployeeId: null,
    isPaused: false,
    employees: [],
    
    loadFromServer: async () => {
      const data = await loadFromServer();
      if (!data) return;
      
      // Map shifts to their employees
      const employeesWithShifts = data.employees.map(emp => {
        const empShifts = data.shifts
          .filter((s: any) => s.employee_id === emp.id)
          .map((s: any) => ({
            id: s.id,
            date: s.date,
            startTime: s.startTime,
            endTime: s.endTime,
            pauseMinutes: s.pauseMinutes,
            type: s.type,
          }));
        return {
          ...emp,
          shifts: empShifts,
        };
      });
      set({ employees: employeesWithShifts });
    },
    
    saveToServer: async () => {
      const { employees } = get();
      await saveToServer(employees);
    },
    
    startShift: (employeeId: string) => set({
      activeShift: {
        startTime: new Date(),
        pauseStartTime: null,
        totalPauseMs: 0,
        alarmTime: null,
      },
      currentEmployeeId: employeeId,
      isPaused: false,
    }),
    
    endShift: () => {
      const { activeShift, currentEmployeeId, employees } = get();
      if (!activeShift || !currentEmployeeId) return;
      
      const endTime = new Date();
      let totalPauseMs = activeShift.totalPauseMs;
      
      if (activeShift.pauseStartTime) {
        totalPauseMs += endTime.getTime() - activeShift.pauseStartTime.getTime();
      }
      
      const startHour = activeShift.startTime.getHours();
      const isSonntag = activeShift.startTime.getDay() === 0;
      let shiftType: ShiftType = 'normal';
      const isNacht = startHour >= 22 || startHour < 6;
      if (isNacht && isSonntag) shiftType = 'nacht+sonntag';
      else if (isNacht) shiftType = 'nacht';
      else if (isSonntag) shiftType = 'sonntag';
      
      const newShift: Shift = {
        id: Date.now().toString(),
        date: activeShift.startTime.toISOString().split('T')[0],
        startTime: activeShift.startTime.toTimeString().slice(0, 5),
        endTime: endTime.toTimeString().slice(0, 5),
        pauseMinutes: Math.round(totalPauseMs / 60000),
        type: shiftType,
      };
      
      set({
        activeShift: null,
        isPaused: false,
        employees: employees.map((emp: Employee) => 
          emp.id === currentEmployeeId 
            ? { ...emp, shifts: [...emp.shifts, newShift] }
            : emp
        ),
      });
    },
    
    togglePause: () => {
      const { activeShift, isPaused } = get();
      if (!activeShift) return;
      
      if (isPaused) {
        const pauseStart = activeShift.pauseStartTime;
        const additionalPause = pauseStart ? Date.now() - pauseStart.getTime() : 0;
        set({
          isPaused: false,
          activeShift: {
            ...activeShift,
            pauseStartTime: null,
            totalPauseMs: activeShift.totalPauseMs + additionalPause,
          },
        });
      } else {
        set({
          isPaused: true,
          activeShift: {
            ...activeShift,
            pauseStartTime: new Date(),
          },
        });
      }
    },
    
    setAlarm: (time: Date | null) => {
      const { activeShift } = get();
      if (!activeShift) return;
      set({
        activeShift: {
          ...activeShift,
          alarmTime: time,
        },
      });
    },
    
    addEmployee: (employee: Omit<Employee, 'id' | 'shifts'>) => {
      const id = Date.now().toString();
      set((state: Store) => ({
        employees: [...state.employees, { ...employee, id, shifts: [] }],
      }));
    },
    
    removeEmployee: (id: string) => {
      set((state: Store) => ({
        employees: state.employees.filter((e: Employee) => e.id !== id),
      }));
    },
    
    setCurrentEmployee: (id: string | null) => set({ currentEmployeeId: id }),
    
    getEmployee: (id: string) => get().employees.find((e: Employee) => e.id === id),
    
    getTodayShifts: (employeeId: string) => {
      const today = new Date().toISOString().split('T')[0];
      const emp = get().employees.find((e: Employee) => e.id === employeeId);
      return emp?.shifts.filter((s: Shift) => s.date === today) || [];
    },
    
    getMonthStats: (employeeId: string, year: number, month: number) => {
      const emp = get().employees.find((e: Employee) => e.id === employeeId);
      if (!emp) return [];
      
      const stats: Record<string, DayStats> = {};
      
      emp.shifts.forEach((shift: Shift) => {
        const [y, m] = shift.date.split('-').map(Number);
        if (y !== year || m !== month + 1) return;
        
        if (!stats[shift.date]) {
          stats[shift.date] = {
            date: shift.date,
            totalMinutes: 0,
            normalMinutes: 0,
            nachtMinutes: 0,
            sonntagMinutes: 0,
            earnings: 0,
          };
        }
        
        // Calculate worked minutes correctly from start/end time
        const [startH, startM] = shift.startTime.split(':').map(Number);
        let [endH, endM] = (shift.endTime || '00:00').split(':').map(Number);
        
        let workedMinutes = (endH * 60 + endM) - (startH * 60 + startM) - shift.pauseMinutes;
        
        // Handle overnight shifts (end time < start time means next day)
        if (workedMinutes < 0) {
          workedMinutes += 24 * 60;
        }
        
        const hourlyRate = emp.hourlyRate;
        const shiftEarnings = get().calculateEarnings(Math.max(0, workedMinutes), shift.type, hourlyRate);
        
        // Assign minutes to correct category based on SHIFT TYPE, not time
        if (shift.type === 'normal') {
          stats[shift.date].normalMinutes += Math.max(0, workedMinutes);
        } else if (shift.type === 'nacht') {
          stats[shift.date].nachtMinutes += Math.max(0, workedMinutes);
        } else if (shift.type === 'sonntag') {
          stats[shift.date].sonntagMinutes += Math.max(0, workedMinutes);
        } else if (shift.type === 'nacht+sonntag') {
          stats[shift.date].nachtMinutes += Math.max(0, workedMinutes);
        }
        
        stats[shift.date].totalMinutes += Math.max(0, workedMinutes);
        stats[shift.date].earnings += shiftEarnings;
      });
      
      return Object.values(stats);
    },
    
    calculateEarnings: (minutes: number, type: ShiftType, hourlyRate: number) => {
      const hours = minutes / 60;
      let multiplier = 1;
      if (type === 'nacht') multiplier = 1.25;
      else if (type === 'sonntag') multiplier = 1.5;
      else if (type === 'nacht+sonntag') multiplier = 1.75;
      return Math.round(hours * hourlyRate * multiplier * 100) / 100;
    },
  })
);
