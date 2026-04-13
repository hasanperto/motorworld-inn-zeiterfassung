import { create } from 'zustand';

interface Store {
  activeShift: ActiveShift | null;
  currentEmployeeId: string | null;
  isPaused: boolean;
  employees: Employee[];
  
  // Server sync methods
  loadFromServer: (token: string) => Promise<void>;
  saveToServer: (token: string) => Promise<void>;
  
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
    
    loadFromServer: async (token: string) => {
      try {
        const res = await fetch('/api/data', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          // Map server employees to include shifts
          const employeesWithShifts = data.employees.map((emp: any) => {
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
              id: emp.id,
              name: emp.name,
              position: emp.position,
              team: emp.team,
              hourlyRate: emp.hourlyRate,
              shifts: empShifts,
            };
          });
          set({ employees: employeesWithShifts });
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    },
    
    saveToServer: async (token: string) => {
      try {
        const { employees } = get();
        // Flatten employees and shifts for server
        const flatEmployees = employees.map(({ id, name, position, team, hourlyRate }) => ({
          id, name, position, team, hourlyRate
        }));
        const allShifts = employees.flatMap(emp => 
          emp.shifts.map(shift => ({
            ...shift,
            employeeId: emp.id,
          }))
        );
        
        await fetch('/api/data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ employees: flatEmployees, shifts: allShifts }),
        });
      } catch (err) {
        console.error('Failed to save data:', err);
      }
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
