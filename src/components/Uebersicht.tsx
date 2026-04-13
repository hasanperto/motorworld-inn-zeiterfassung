import { useStore } from '../stores/useStore';

export default function Uebersicht() {
  const { employees, currentEmployeeId, getMonthStats } = useStore();
  const currentEmployee = employees.find(e => e.id === currentEmployeeId);
  
  if (!currentEmployee) {
    return (
      <div className="p-4 text-center text-gray-400">
        Bitte zuerst Mitarbeiter auswählen
      </div>
    );
  }

  const today = new Date();
  const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
                      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  
  // Calculate monthly stats
  const monthStats = getMonthStats(currentEmployeeId!, today.getFullYear(), today.getMonth());
  
  const totalMinutes = monthStats.reduce((acc, s) => acc + s.totalMinutes, 0);
  const normalMinutes = monthStats.reduce((acc, s) => acc + s.normalMinutes, 0);
  const nachtMinutes = monthStats.reduce((acc, s) => acc + s.nachtMinutes, 0);
  const sonntagMinutes = monthStats.reduce((acc, s) => acc + s.sonntagMinutes, 0);
  const totalEarnings = monthStats.reduce((acc, s) => acc + s.earnings, 0);
  
  // Sollstunden (target hours) - assuming 40 hours per week * 4 weeks = 160h
  const sollstunden = 125.96; // From spec
  const geleistet = totalMinutes / 60;
  const stundensaldo = geleistet - sollstunden;
  const progress = Math.min(100, (geleistet / sollstunden) * 100);

  const hourlyRate = currentEmployee.hourlyRate;

  return (
    <div className="p-4 flex flex-col gap-4 max-w-md mx-auto w-full">
      <h2 className="text-xl font-bold text-text">📊 Übersicht</h2>
      
      {/* Month Header */}
      <div className="bg-secondary rounded-xl p-4">
        <div className="text-sm text-gray-400">{monthNames[today.getMonth()]} {today.getFullYear()}</div>
        <div className="text-2xl font-bold text-text mt-1">
          {currentEmployee.name}
        </div>
        <div className="text-sm text-gray-500">{currentEmployee.position}</div>
      </div>

      {/* Progress Bar */}
      <div className="bg-secondary rounded-xl p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">Sollstunden</span>
          <span className="font-bold text-text">{geleistet.toFixed(1)}h / {sollstunden}h</span>
        </div>
        <div className="w-full bg-primary rounded-full h-4">
          <div 
            className="bg-success h-4 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className={`text-sm font-bold ${stundensaldo >= 0 ? 'text-success' : 'text-accent'}`}>
            {stundensaldo >= 0 ? '+' : ''}{stundensaldo.toFixed(2)}h
          </span>
          <span className="text-xs text-gray-500">{progress.toFixed(0)}%</span>
        </div>
      </div>

      {/* Earnings Breakdown */}
      <div className="bg-secondary rounded-xl p-4">
        <h3 className="font-bold text-text mb-4">💰 Lohnaufschlüsselung</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="text-gray-400">Normal</span>
            </div>
            <div className="text-right">
              <span className="text-text">{(normalMinutes / 60).toFixed(1)}h</span>
              <span className="text-gray-500 mx-2">@</span>
              <span className="text-success">{hourlyRate.toFixed(2)}€</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-blue-400">Nacht (+25%)</span>
            </div>
            <div className="text-right">
              <span className="text-blue-400">{(nachtMinutes / 60).toFixed(1)}h</span>
              <span className="text-gray-500 mx-2">@</span>
              <span className="text-blue-400">{(hourlyRate * 1.25).toFixed(2)}€</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-yellow-400">Sonntag (+50%)</span>
            </div>
            <div className="text-right">
              <span className="text-yellow-400">{(sonntagMinutes / 60).toFixed(1)}h</span>
              <span className="text-gray-500 mx-2">@</span>
              <span className="text-yellow-400">{(hourlyRate * 1.5).toFixed(2)}€</span>
            </div>
          </div>
        </div>
        
        <div className="border-t border-border mt-4 pt-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-text">Brutto</span>
            <span className="text-xl font-bold text-success">{totalEarnings.toFixed(2)}€</span>
          </div>
          <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
            <span>Netto (~32% abzug)</span>
            <span>{(totalEarnings * 0.68).toFixed(2)}€</span>
          </div>
        </div>
      </div>

      {/* Daily Breakdown */}
      <div className="bg-secondary rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-bold text-text">Tägliche Übersicht</h3>
        </div>
        
        {monthStats.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Keine Daten für diesen Monat
          </div>
        ) : (
          <div className="divide-y divide-border max-h-64 overflow-y-auto">
            {monthStats.sort((a, b) => b.date.localeCompare(a.date)).map((stat) => {
              const date = new Date(stat.date + 'T00:00:00');
              return (
                <div key={stat.date} className="p-3 flex justify-between items-center">
                  <div>
                    <div className="font-medium text-text text-sm">
                      {date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit' })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm text-gray-400">
                      {(stat.totalMinutes / 60).toFixed(1)}h
                    </div>
                    <div className="text-xs text-success">{stat.earnings.toFixed(2)}€</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
