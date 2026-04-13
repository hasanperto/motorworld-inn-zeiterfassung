import { useState } from 'react';
import { useStore } from '../stores/useStore';


const POSITIONS = ['Spülküche', 'Saucier', 'Entremetier', 'Gardemanger', 'Pizza', 'Conference', 'Andere'];
const TEAMS = ['A', 'B', 'C'];

export default function Mitarbeiter() {
  const { employees, currentEmployeeId, addEmployee, removeEmployee, setCurrentEmployee } = useStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPosition, setNewPosition] = useState(POSITIONS[0]);
  const [newTeam, setNewTeam] = useState(TEAMS[0]);
  const [newHourlyRate, setNewHourlyRate] = useState('15');

  const handleAdd = () => {
    if (!newName.trim()) return;
    addEmployee({
      name: newName,
      position: newPosition,
      team: newTeam,
      hourlyRate: parseFloat(newHourlyRate) || 15,
    });
    setNewName('');
    setShowAddForm(false);
  };

  return (
    <div className="p-4 flex flex-col gap-4 max-w-md mx-auto w-full">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-text">👥 Mitarbeiter</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-accent hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm"
        >
          {showAddForm ? 'Abbrechen' : '+ Neu'}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-secondary rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-text">Neuer Mitarbeiter</h3>
          
          <div>
            <label className="text-xs text-gray-400 block mb-1">Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name eingeben"
              className="w-full bg-primary text-text rounded-lg p-3 border border-border focus:border-accent outline-none"
            />
          </div>
          
          <div>
            <label className="text-xs text-gray-400 block mb-1">Position</label>
            <select
              value={newPosition}
              onChange={(e) => setNewPosition(e.target.value)}
              className="w-full bg-primary text-text rounded-lg p-3 border border-border focus:border-accent outline-none"
            >
              {POSITIONS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Team</label>
              <select
                value={newTeam}
                onChange={(e) => setNewTeam(e.target.value)}
                className="w-full bg-primary text-text rounded-lg p-3 border border-border focus:border-accent outline-none"
              >
                {TEAMS.map(t => (
                  <option key={t} value={t}>Team {t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Stundenlohn (€)</label>
              <input
                type="number"
                value={newHourlyRate}
                onChange={(e) => setNewHourlyRate(e.target.value)}
                step="0.5"
                className="w-full bg-primary text-text rounded-lg p-3 border border-border focus:border-accent outline-none"
              />
            </div>
          </div>
          
          <button
            onClick={handleAdd}
            className="w-full bg-success hover:bg-green-600 text-white font-bold py-3 rounded-lg"
          >
            Hinzufügen
          </button>
        </div>
      )}

      {/* Employee List */}
      <div className="bg-secondary rounded-xl overflow-hidden">
        {employees.map((emp) => (
          <div 
            key={emp.id} 
            className={`p-4 border-b border-border last:border-0 flex justify-between items-center cursor-pointer transition-colors ${
              currentEmployeeId === emp.id ? 'bg-primary' : ''
            }`}
            onClick={() => setCurrentEmployee(emp.id)}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                currentEmployeeId === emp.id 
                  ? 'bg-accent text-white' 
                  : 'bg-gray-700 text-gray-400'
              }`}>
                {emp.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-text">{emp.name}</div>
                <div className="text-sm text-gray-500">{emp.position} • Team {emp.team}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-bold text-success">{emp.hourlyRate}€/h</div>
                <div className="text-xs text-gray-500">{emp.shifts.length} Schichten</div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`${emp.name} wirklich löschen?`)) {
                    removeEmployee(emp.id);
                    if (currentEmployeeId === emp.id) {
                      setCurrentEmployee(null);
                    }
                  }
                }}
                className="text-accent hover:text-red-500 p-2"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
