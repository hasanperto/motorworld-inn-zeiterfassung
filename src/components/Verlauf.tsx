import { useStore } from '../stores/useStore';
import type { ShiftType } from '../types';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' });
}

function getShiftTypeLabel(type: ShiftType): string {
  switch (type) {
    case 'normal': return 'Normal';
    case 'nacht': return '🌙 Nacht (+25%)';
    case 'sonntag': return '📅 Sonntag (+50%)';
    case 'nacht+sonntag': return '🌙📅 Nacht+Sonntag (+75%)';
  }
}

function getShiftTypeColor(type: ShiftType): string {
  switch (type) {
    case 'normal': return 'text-success';
    case 'nacht': return 'text-blue-400';
    case 'sonntag': return 'text-yellow-400';
    case 'nacht+sonntag': return 'text-purple-400';
  }
}

export default function Verlauf() {
  const { employees, currentEmployeeId, calculateEarnings } = useStore();
  const currentEmployee = employees.find(e => e.id === currentEmployeeId);
  
  if (!currentEmployee) {
    return (
      <div className="p-4 text-center text-gray-400">
        Bitte zuerst Mitarbeiter auswählen
      </div>
    );
  }

  // Get last 30 days of shifts
  const today = new Date();
  
  // Get all shifts sorted by date
  const allShifts = [...currentEmployee.shifts]
    .filter(s => {
      const shiftDate = new Date(s.date);
      const daysDiff = (today.getTime() - shiftDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 30;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calculate totals
  const totalMinutes = allShifts.reduce((acc, s) => {
    // Calculate worked minutes from start/end time
    const [startH, startM] = s.startTime.split(':').map(Number);
    const [endH, endM] = (s.endTime || '00:00').split(':').map(Number);
    const workedMinutes = (endH * 60 + endM) - (startH * 60 + startM) - s.pauseMinutes;
    return acc + Math.max(0, workedMinutes);
  }, 0);

  const normalMinutes = allShifts.filter(s => s.type === 'normal').reduce((acc, s) => {
    const [startH, startM] = s.startTime.split(':').map(Number);
    const [endH, endM] = (s.endTime || '00:00').split(':').map(Number);
    return acc + Math.max(0, (endH * 60 + endM) - (startH * 60 + startM) - s.pauseMinutes);
  }, 0);

  const nachtMinutes = allShifts.filter(s => s.type === 'nacht' || s.type === 'nacht+sonntag').reduce((acc, s) => {
    const [startH, startM] = s.startTime.split(':').map(Number);
    const [endH, endM] = (s.endTime || '00:00').split(':').map(Number);
    return acc + Math.max(0, (endH * 60 + endM) - (startH * 60 + startM) - s.pauseMinutes);
  }, 0);

  const sonntagMinutes = allShifts.filter(s => s.type === 'sonntag' || s.type === 'nacht+sonntag').reduce((acc, s) => {
    const [startH, startM] = s.startTime.split(':').map(Number);
    const [endH, endM] = (s.endTime || '00:00').split(':').map(Number);
    return acc + Math.max(0, (endH * 60 + endM) - (startH * 60 + startM) - s.pauseMinutes);
  }, 0);

  const hourlyRate = currentEmployee.hourlyRate;
  const totalEarnings = calculateEarnings(normalMinutes, 'normal', hourlyRate) +
                       calculateEarnings(nachtMinutes, 'nacht', hourlyRate) +
                       calculateEarnings(sonntagMinutes, 'sonntag', hourlyRate);

  return (
    <div className="p-4 flex flex-col gap-4 max-w-md mx-auto w-full">
      <h2 className="text-xl font-bold text-text">📋 Verlauf</h2>
      
      {/* Summary Card */}
      <div className="bg-secondary rounded-xl p-4">
        <div className="text-sm text-gray-400 mb-2">Letzte 30 Tage</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500">Stunden</div>
            <div className="text-2xl font-bold text-text">
              {(totalMinutes / 60).toFixed(1)}h
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Verdienst</div>
            <div className="text-2xl font-bold text-success">
              {totalEarnings.toFixed(2)}€
            </div>
          </div>
        </div>
        
        {/* Breakdown */}
        <div className="mt-4 pt-4 border-t border-border space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Normal</span>
            <span className="text-text">{(normalMinutes / 60).toFixed(1)}h</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-blue-400">Nacht (+25%)</span>
            <span className="text-blue-400">{(nachtMinutes / 60).toFixed(1)}h</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-yellow-400">Sonntag (+50%)</span>
            <span className="text-yellow-400">{(sonntagMinutes / 60).toFixed(1)}h</span>
          </div>
        </div>
      </div>

      {/* Shifts List */}
      <div className="bg-secondary rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-bold text-text">Schichten</h3>
        </div>
        
        {allShifts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Keine Schichten in den letzten 30 Tagen
          </div>
        ) : (
          <div className="divide-y divide-border">
            {allShifts.map((shift) => {
              const [startH, startM] = shift.startTime.split(':').map(Number);
              const [endH, endM] = (shift.endTime || '00:00').split(':').map(Number);
              const workedMinutes = (endH * 60 + endM) - (startH * 60 + startM) - shift.pauseMinutes;
              const earnings = calculateEarnings(Math.max(0, workedMinutes), shift.type, hourlyRate);
              
              return (
                <div key={shift.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-text">{formatDate(shift.date)}</div>
                    <div className={`text-sm ${getShiftTypeColor(shift.type)}`}>
                      {getShiftTypeLabel(shift.type)}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="font-mono text-sm text-gray-400">
                      {shift.startTime} → {shift.endTime || 'offen'}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-text">{(Math.max(0, workedMinutes) / 60).toFixed(1)}h</div>
                      <div className="text-xs text-success">{earnings.toFixed(2)}€</div>
                    </div>
                  </div>
                  {shift.pauseMinutes > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      Pause: {shift.pauseMinutes}min
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
