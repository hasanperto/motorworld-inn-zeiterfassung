import { useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';

interface LoginProps {
  onSwitchToRegister: () => void;
}

export default function Login({ onSwitchToRegister }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const success = await login(email, password);
    if (!success) {
      setError('Ungültige E-Mail oder Passwort');
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">E-Mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            required
            className="w-full bg-primary text-text rounded-lg p-3 border border-border focus:border-accent outline-none"
          />
        </div>
        
        <div>
          <label className="text-xs text-gray-400 block mb-1">Passwort</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
            required
            className="w-full bg-primary text-text rounded-lg p-3 border border-border focus:border-accent outline-none"
          />
        </div>
        
        {error && (
          <div className="text-accent text-sm text-center">{error}</div>
        )}
        
        <button
          type="submit"
          disabled={loading}
          className="bg-success hover:bg-green-600 disabled:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors"
        >
          {loading ? 'Wird geladen...' : 'Anmelden'}
        </button>
      </form>
      
      <button
        onClick={onSwitchToRegister}
        className="text-gray-400 text-sm hover:text-text transition-colors"
      >
        Noch kein Konto? <span className="text-accent">Registrieren</span>
      </button>
    </div>
  );
}
