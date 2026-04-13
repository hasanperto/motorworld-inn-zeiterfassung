import { useEffect } from 'react';
import { useAuthStore } from './stores/useAuthStore';
import { useStore } from './stores/useStore';
import AuthPage from './pages/Auth';
import SchichtApp from './components/SchichtApp';

function App() {
  const { isAuthenticated, isDemoMode } = useAuthStore();
  const loadData = useStore((state) => state.loadFromServer);

  // Load data from server when authenticated (skip in demo mode)
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  // Save data to server periodically when authenticated (skip in demo mode)
  useEffect(() => {
    if (!isAuthenticated || isDemoMode) return;

    const saveInterval = setInterval(() => {
      useStore.getState().saveToServer();
    }, 30000); // Save every 30 seconds

    // Save on unmount
    return () => {
      clearInterval(saveInterval);
      useStore.getState().saveToServer();
    };
  }, [isAuthenticated, isDemoMode]);

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="bg-yellow-600 text-black text-xs p-2 text-center font-bold">
          🎬 Demo Mode - Veriler kaydedilmez
        </div>
      )}
      <SchichtApp />
    </div>
  );
}

export default App;