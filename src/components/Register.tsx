import { useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';

interface RegisterProps {
  onSwitchToLogin: () => void;
}

export default function Register({ onSwitchToLogin }: RegisterProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const register = useAuthStore((state) => state.register);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein');
      return;
    }
    
    if (password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen haben');
      return;
    }
    
    setLoading(true);
    const success = await register(name, email, password);
    if (!success) {
      setError('Registrierung fehlgeschlagen. E-Mail bereits vergeben?');
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dein Name"
            required
            className="w-full bg-primary text-text rounded-lg p-3 border border-border focus:border-accent outline-none"
          />
        </div>
        
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
        
        <div>
          <label className="text-xs text-gray-400 block mb-1">Passwort bestätigen</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
          {loading ? 'Wird geladen...' : 'Registrieren'}
        </button>
      </form>
      
      <button
        onClick={onSwitchToLogin}
        className="text-gray-400 text-sm hover:text-text transition-colors"
      >
        Bereits ein Konto? <span className="text-accent">Anmelden</span>
      </button>
    </div>
  );
}
