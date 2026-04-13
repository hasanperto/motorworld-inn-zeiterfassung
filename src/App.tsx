import { useEffect } from 'react';
import { useAuthStore } from './stores/useAuthStore';
import { useStore } from './stores/useStore';
import AuthPage from './pages/Auth';
import SchichtApp from './components/SchichtApp';

function App() {
  const { isAuthenticated } = useAuthStore();
  const loadData = useStore((state) => state.loadFromServer);

  // Load data from server when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  // Save data to server periodically when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const saveInterval = setInterval(() => {
      useStore.getState().saveToServer();
    }, 30000); // Save every 30 seconds

    // Save on unmount
    return () => {
      clearInterval(saveInterval);
      useStore.getState().saveToServer();
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return <SchichtApp />;
}

export default App;
