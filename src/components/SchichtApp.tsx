import { useState, useEffect } from 'react';
import { useStore } from '../stores/useStore';
import type { ShiftType } from '../types';
import Verlauf from './Verlauf';
import Uebersicht from './Uebersicht';
import Mitarbeiter from './Mitarbeiter';
import { useAuthStore } from '../stores/useAuthStore';

type Tab = 'schicht' | 'verlauf' | 'uebersicht' | 'mitarbeiter';

function formatTime(date: Date): string {
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' });
}

function getShiftType(startHour: number, isSonntag: boolean): ShiftType {
  const isNacht = startHour >= 22 || startHour < 6;
  if (isNacht && isSonntag) return 'nacht+sonntag';
  if (isNacht) return 'nacht';
  if (isSonntag) return 'sonntag';
  return 'normal';
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

export default function SchichtApp() {
  const [currentTab, setCurrentTab] = useState<Tab>('schicht');
  const [currentTime, setCurrentTime] = useState(new Date());
  const {
    activeShift,
    currentEmployeeId,
    isPaused,
    employees,
    startShift,
    endShift,
    togglePause,
    setAlarm,
    setCurrentEmployee,
    getTodayShifts,
  } = useStore();

  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentEmployee = employees.find(e => e.id === currentEmployeeId);
  const todayShifts = currentEmployeeId ? getTodayShifts(currentEmployeeId) : [];
  
  const getActiveDuration = () => {
    if (!activeShift) return 0;
    let totalMs = Date.now() - activeShift.startTime.getTime() - activeShift.totalPauseMs;
    if (isPaused && activeShift.pauseStartTime) {
      totalMs -= Date.now() - activeShift.pauseStartTime.getTime();
    }
    return Math.floor(totalMs / 1000);
  };
  
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  useEffect(() => {
    if (!activeShift || isPaused) {
      setElapsedSeconds(getActiveDuration());
      return;
    }
    
    const timer = setInterval(() => {
      setElapsedSeconds(getActiveDuration());
    }, 1000);
    
    return () => clearInterval(timer);
  }, [activeShift, isPaused]);

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartShift = () => {
    if (!currentEmployeeId) return;
    startShift(currentEmployeeId);
  };

  const handleEndShift = () => {
    endShift();
  };

  const handleSetAlarm = () => {
    const hours = prompt('Çıkış saati (saat)?:', '22');
    if (!hours) return;
    const mins = prompt('Dakika?:', '00');
    
    const alarmTime = new Date();
    alarmTime.setHours(parseInt(hours), parseInt(mins || '0'), 0, 0);
    
    if (alarmTime <= new Date()) {
      alarmTime.setDate(alarmTime.getDate() + 1);
    }
    
    setAlarm(alarmTime);
  };

  // Render active tab content
  const renderContent = () => {
    switch (currentTab) {
      case 'schicht':
        return (
          <div className="p-4 flex flex-col gap-4 flex-1 max-w-md mx-auto w-full">
            {/* Employee Selector */}
            <div className="bg-secondary rounded-xl p-4">
              <label className="text-xs text-gray-400 mb-2 block">Mitarbeiter</label>
              <select
                value={currentEmployeeId || ''}
                onChange={(e) => setCurrentEmployee(e.target.value || null)}
                className="w-full bg-primary text-text rounded-lg p-3 border border-border focus:border-accent outline-none"
              >
                <option value="">-- Auswählen --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id} style={{ fontWeight: emp.id === currentEmployeeId ? 'bold' : 'normal', color: emp.id === currentEmployeeId ? '#4ade80' : 'inherit' }}>
                    {emp.name} ({emp.position})
                  </option>
                ))}
              </select>
            </div>

            {/* Clock Display */}
            <div className="bg-secondary rounded-xl p-6 text-center">
              <div className={`text-5xl font-mono font-bold mb-2 ${currentEmployee ? 'text-success' : 'text-text'}`}>
                {formatTime(currentTime)}
              </div>
              <div className="text-gray-400 capitalize">
                {formatDate(currentTime)}
              </div>
              {activeShift && (
                <div className={`mt-2 text-sm ${getShiftTypeColor(getShiftType(currentTime.getHours(), currentTime.getDay() === 0))}`}>
                  {getShiftTypeLabel(getShiftType(currentTime.getHours(), currentTime.getDay() === 0))}
                </div>
              )}
            </div>

            {/* Control Buttons */}
            <div className="flex flex-col gap-3">
              {!activeShift ? (
                <button
                  onClick={handleStartShift}
                  disabled={!currentEmployeeId}
                  className="bg-success hover:bg-green-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl text-lg transition-colors flex items-center justify-center gap-2"
                >
                  <span className="text-2xl">▶</span>
                  SCHICHT STARTEN
                </button>
              ) : (
                <>
                  <button
                    onClick={handleEndShift}
                    className="bg-accent hover:bg-red-600 text-white font-bold py-4 px-6 rounded-xl text-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="text-2xl">■</span>
                    SCHICHT ENDE
                  </button>
                  
                  <button
                    onClick={togglePause}
                    className={`font-bold py-3 px-6 rounded-xl text-lg transition-colors flex items-center justify-center gap-2 ${
                      isPaused 
                        ? 'bg-warning text-black' 
                        : 'bg-gray-700 text-white'
                    }`}
                  >
                    <span className="text-xl">{isPaused ? '▶' : '⏸'}</span>
                    {isPaused ? 'FORTSETZEN' : 'PAUSE'}
                  </button>
                </>
              )}
            </div>

            {/* Alarm */}
            {activeShift && (
              <button
                onClick={handleSetAlarm}
                className="bg-primary border border-border text-text py-3 px-6 rounded-xl text-sm flex items-center justify-center gap-2 hover:border-accent transition-colors"
              >
                <span>⏰</span>
                ALARM SETZEN
              </button>
            )}

            {/* Active Shift Info */}
            {activeShift && (
              <div className="bg-secondary rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <div className="text-xs text-gray-400">Gestartet um</div>
                    <div className="text-lg font-mono">{formatTime(activeShift.startTime)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Pause</div>
                    <div className="text-lg font-mono">
                      {formatDuration(Math.floor(activeShift.totalPauseMs / 1000))}
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-border pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Aktive Dauer</span>
                    <span className={`text-3xl font-mono font-bold ${isPaused ? 'text-yellow-400' : 'text-success'}`}>
                      {formatDuration(elapsedSeconds)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Today's Summary */}
            {todayShifts.length > 0 && (
              <div className="bg-secondary rounded-xl p-4">
                <h3 className="text-sm text-gray-400 mb-3">Heute ({todayShifts.length} Schicht)</h3>
                {todayShifts.map((shift) => (
                  <div key={shift.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                    <div>
                      <span className="font-mono">{shift.startTime}</span>
                      <span className="text-gray-500 mx-2">→</span>
                      <span className="font-mono">{shift.endTime || '--:--'}</span>
                    </div>
                    <div className={`text-sm ${getShiftTypeColor(shift.type)}`}>
                      {getShiftTypeLabel(shift.type)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      case 'verlauf':
        return <Verlauf />;
      
      case 'uebersicht':
        return <Uebersicht />;
      
      case 'mitarbeiter':
        return <Mitarbeiter />;
    }
  };

  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      {/* Header */}
      <header className="bg-primary p-4 text-center border-b border-border flex flex-row justify-between items-center">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-text mb-1">MotorWorld Inn</h1>
          <p className="text-sm text-gray-400">Zeiterfassung</p>
        </div>
        <button
          onClick={logout}
          className="text-gray-400 hover:text-accent p-2 text-sm"
          title="Abmelden"
        >
          🚪
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {renderContent()}
      </main>

      {/* Footer Navigation */}
      <footer className="bg-primary border-t border-border p-2 fixed bottom-0 left-0 right-0">
        <nav className="flex justify-around max-w-md mx-auto">
          <button 
            className={`flex flex-col items-center p-2 transition-colors ${
              currentTab === 'schicht' ? 'text-accent' : 'text-gray-500'
            }`}
            onClick={() => setCurrentTab('schicht')}
          >
            <span className="text-xl">⏱</span>
            <span className="text-xs">Schicht</span>
          </button>
          <button 
            className={`flex flex-col items-center p-2 transition-colors ${
              currentTab === 'verlauf' ? 'text-accent' : 'text-gray-500'
            }`}
            onClick={() => setCurrentTab('verlauf')}
          >
            <span className="text-xl">📋</span>
            <span className="text-xs">Verlauf</span>
          </button>
          <button 
            className={`flex flex-col items-center p-2 transition-colors ${
              currentTab === 'uebersicht' ? 'text-accent' : 'text-gray-500'
            }`}
            onClick={() => setCurrentTab('uebersicht')}
          >
            <span className="text-xl">📊</span>
            <span className="text-xs">Übersicht</span>
          </button>
          <button 
            className={`flex flex-col items-center p-2 transition-colors ${
              currentTab === 'mitarbeiter' ? 'text-accent' : 'text-gray-500'
            }`}
            onClick={() => setCurrentTab('mitarbeiter')}
          >
            <span className="text-xl">👥</span>
            <span className="text-xs">Team</span>
          </button>
        </nav>
      </footer>
    </div>
  );
}
