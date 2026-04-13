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

  // Sync data to server periodically when authenticated (skip in demo mode)
  useEffect(() => {
    if (!isAuthenticated || isDemoMode) return;

    const syncInterval = setInterval(() => {
      useStore.getState().syncToServer();
    }, 30000); // Sync every 30 seconds

    // Sync on unmount
    return () => {
      clearInterval(syncInterval);
      useStore.getState().syncToServer();
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