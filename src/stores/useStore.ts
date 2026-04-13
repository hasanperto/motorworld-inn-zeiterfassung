import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Shift, Employee, ActiveShift, DayStats, ShiftType } from '../types';

interface Store {
  activeShift: ActiveShift | null;
  currentEmployeeId: string | null;
  isPaused: boolean;
  employees: Employee[];
  
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
  persist(
    (set, get) => ({
      activeShift: null,
      currentEmployeeId: null,
      isPaused: false,
      employees: [
        { id: '1', name: 'Perto', position: 'Spülküche', team: 'B', hourlyRate: 15, shifts: [] },
        { id: '2', name: 'Max', position: 'Saucier', team: 'B', hourlyRate: 16, shifts: [] },
        { id: '3', name: 'Anna', position: 'Pizza', team: 'B', hourlyRate: 14, shifts: [] },
      ],
      
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
          
          const s = stats[shift.date];
          const hourlyRate = emp.hourlyRate;
          
          if (shift.type === 'normal') {
            s.normalMinutes += shift.pauseMinutes > 0 ? Math.max(0, shift.pauseMinutes) : 0;
          } else if (shift.type === 'nacht') {
            s.nachtMinutes += shift.pauseMinutes > 0 ? Math.max(0, shift.pauseMinutes) : 0;
          } else if (shift.type === 'sonntag') {
            s.sonntagMinutes += shift.pauseMinutes > 0 ? Math.max(0, shift.pauseMinutes) : 0;
          } else {
            s.nachtMinutes += shift.pauseMinutes > 0 ? Math.max(0, shift.pauseMinutes) : 0;
          }
          
          s.totalMinutes = s.normalMinutes + s.nachtMinutes + s.sonntagMinutes;
          s.earnings = get().calculateEarnings(s.normalMinutes, 'normal', hourlyRate) +
                      get().calculateEarnings(s.nachtMinutes, 'nacht', hourlyRate) +
                      get().calculateEarnings(s.sonntagMinutes, 'sonntag', hourlyRate);
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
    }),
    {
      name: 'motorworld-storage',
    }
  )
);
