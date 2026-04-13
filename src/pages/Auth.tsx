import { useState } from 'react';
import Login from '../components/Login';
import Register from '../components/Register';

export default function AuthPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login');

  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      {/* Header */}
      <header className="bg-primary p-6 text-center border-b border-border">
        <h1 className="text-2xl font-bold text-text mb-1">MotorWorld Inn</h1>
        <p className="text-sm text-gray-400">Zeiterfassung</p>
      </header>

      {/* Auth Form */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Tab Switcher */}
          <div className="flex mb-6 bg-secondary rounded-xl p-1">
            <button
              onClick={() => setTab('login')}
              className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${
                tab === 'login' ? 'bg-accent text-white' : 'text-gray-400'
              }`}
            >
              Anmelden
            </button>
            <button
              onClick={() => setTab('register')}
              className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${
                tab === 'register' ? 'bg-accent text-white' : 'text-gray-400'
              }`}
            >
              Registrieren
            </button>
          </div>

          {/* Form */}
          <div className="bg-secondary rounded-xl p-6">
            {tab === 'login' ? (
              <Login onSwitchToRegister={() => setTab('register')} />
            ) : (
              <Register onSwitchToLogin={() => setTab('login')} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
