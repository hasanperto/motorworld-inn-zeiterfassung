import { create } from 'zustand';
import { syncToSupabase, loadFromSupabase, getEmployeesWithShifts, saveEmployee, saveShift, deleteEmployee as dbDeleteEmployee, type DBShift } from '../lib/db';
import type { Employee, Shift, ActiveShift, DayStats, ShiftType } from '../types';
import { useAuthStore } from './useAuthStore';

// Demo employees with sample shifts
export const DEMO_EMPLOYEES: Employee[] = [
  {
    id: '1',
    name: 'Perto',
    position: 'Spülküche',
    team: 'B',
    hourlyRate: 15,
    shifts: [
      {
        id: 'demo-shift-1',
        date: new Date().toISOString().split('T')[0],
        startTime: '08:00',
        endTime: '16:30',
        pauseMinutes: 30,
        type: 'normal'
      },
      {
        id: 'demo-shift-2',
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        startTime: '22:00',
        endTime: '06:00',
        pauseMinutes: 0,
        type: 'nacht'
      }
    ]
  },
  {
    id: '2',
    name: 'Max',
    position: 'Saucier',
    team: 'B',
    hourlyRate: 16,
    shifts: [
      {
        id: 'demo-shift-3',
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        startTime: '14:00',
        endTime: '22:00',
        pauseMinutes: 0,
        type: 'normal'
      }
    ]
  },
  {
    id: '3',
    name: 'Anna',
    position: 'Pizza',
    team: 'B',
    hourlyRate: 14,
    shifts: []
  }
];

// Trigger sync to Supabase (fire and forget)
const triggerSync = () => {
  syncToSupabase().catch(console.error);
};

interface Store {
  activeShift: ActiveShift | null;
  currentEmployeeId: string | null;
  isPaused: boolean;
  employees: Employee[];
  isLoading: boolean;
  
  // Initialization
  initialize: () => Promise<void>;
  
  // Server sync methods (Dexie-based)
  syncToServer: () => Promise<void>;
  loadFromServer: () => Promise<void>;
  
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
    isLoading: true,
    
    initialize: async () => {
      set({ isLoading: true });
      
      // In demo mode, use demo data
      if (useAuthStore.getState().isDemoMode) {
        set({ employees: DEMO_EMPLOYEES, isLoading: false });
        return;
      }
      
      // Try to load from Dexie first
      const localData = await getEmployeesWithShifts();
      
      if (localData.length > 0) {
        // Use local data
        const employees: Employee[] = localData.map(e => ({
          id: e.id,
          name: e.name,
          position: e.position,
          team: e.team,
          hourlyRate: e.hourlyRate,
          shifts: e.shifts.map(s => ({
            id: s.id,
            date: s.date,
            startTime: s.startTime,
            endTime: s.endTime,
            pauseMinutes: s.pauseMinutes,
            type: s.type
          }))
        }));
        set({ employees, isLoading: false });
        
        // Try to sync with server in background
        triggerSync();
      } else {
        // No local data, try to load from Supabase
        try {
          await loadFromSupabase();
          const refreshedData = await getEmployeesWithShifts();
          if (refreshedData.length > 0) {
            const employees: Employee[] = refreshedData.map(e => ({
              id: e.id,
              name: e.name,
              position: e.position,
              team: e.team,
              hourlyRate: e.hourlyRate,
              shifts: e.shifts.map(s => ({
                id: s.id,
                date: s.date,
                startTime: s.startTime,
                endTime: s.endTime,
                pauseMinutes: s.pauseMinutes,
                type: s.type
              }))
            }));
            set({ employees });
          }
        } catch (e) {
          console.error('Failed to load from Supabase:', e);
        }
        set({ isLoading: false });
      }
    },
    
    syncToServer: async () => {
      if (useAuthStore.getState().isDemoMode) return;
      await syncToSupabase();
    },
    
    loadFromServer: async () => {
      if (useAuthStore.getState().isDemoMode) {
        set({ employees: DEMO_EMPLOYEES });
        return;
      }
      await loadFromSupabase();
      const localData = await getEmployeesWithShifts();
      const employees: Employee[] = localData.map(e => ({
        id: e.id,
        name: e.name,
        position: e.position,
        team: e.team,
        hourlyRate: e.hourlyRate,
        shifts: e.shifts.map(s => ({
          id: s.id,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          pauseMinutes: s.pauseMinutes,
          type: s.type
        }))
      }));
      set({ employees });
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
      
      // Update local state
      const updatedEmployees = employees.map((emp: Employee) => 
        emp.id === currentEmployeeId 
          ? { ...emp, shifts: [...emp.shifts, newShift] }
          : emp
      );
      
      // Save to Dexie
      if (currentEmployeeId !== null) {
        const shiftData: Omit<DBShift, 'isSynced'> = {
          id: newShift.id,
          employeeId: currentEmployeeId,
          date: newShift.date,
          startTime: newShift.startTime,
          endTime: newShift.endTime || '',
          pauseMinutes: newShift.pauseMinutes,
          type: newShift.type
        };
        saveShift(shiftData).then(() => triggerSync());
      }
      
      set({
        activeShift: null,
        isPaused: false,
        employees: updatedEmployees,
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
      const newEmployee: Employee = { ...employee, id, shifts: [] };
      
      // Save to Dexie
      saveEmployee({
        id,
        name: employee.name,
        position: employee.position,
        team: employee.team,
        hourlyRate: employee.hourlyRate,
        shifts: []
      }).then(() => triggerSync());
      
      set((state: Store) => ({
        employees: [...state.employees, newEmployee],
      }));
    },
    
    removeEmployee: (id: string) => {
      // Delete from Dexie
      dbDeleteEmployee(id).then(() => triggerSync());
      
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
        const endTimeStr = shift.endTime ?? '00:00';
        let [endH, endM] = endTimeStr.split(':').map(Number);
        
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
