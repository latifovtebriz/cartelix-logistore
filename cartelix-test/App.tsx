
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { LiquidBackground } from './components/GlassComponents';
import Login from './pages/Login';
import { User, ThemeMode } from './types';
import { api } from './services/api';

// Lazy load heavy components for better initial load performance
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const CashierDashboard = lazy(() => import('./pages/CashierDashboard'));
const CustomerApp = lazy(() => import('./pages/CustomerApp'));

// Loading fallback component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0f172a] text-emerald-500">
    <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin" />
  </div>
);

const App: React.FC = () => {
  // Global Theme Management
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => (localStorage.getItem('logi_theme') as ThemeMode) || 'system');

  useEffect(() => {
    localStorage.setItem('logi_theme', themeMode);
    const root = window.document.documentElement;
    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    };
    if (themeMode === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(media.matches);
      const listener = (e: MediaQueryListEvent) => applyTheme(e.matches);
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    } else {
      applyTheme(themeMode === 'dark');
    }
  }, [themeMode]);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('logi_token');
      if (token) {
        // First, try to get saved user from localStorage (for admin/cashier mock login)
        const savedUser = localStorage.getItem('logi_user');
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            if (parsedUser && parsedUser.role) {
              setUser(parsedUser);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error('Failed to parse saved user:', e);
          }
        }

        // Fallback: try to get user from API (for regular user logins)
        try {
          const foundUser = await api.getCurrentUser();
          if (foundUser) {
            setUser(foundUser);
            localStorage.setItem('logi_user', JSON.stringify(foundUser)); // Cache it
          }
        } catch (e) {
          console.error("Session restore failed", e);
          localStorage.removeItem('logi_token');
          localStorage.removeItem('logi_user');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    await api.logout();
    // Clear all user session data including navigation state and filters
    localStorage.removeItem('logi_current_route');
    localStorage.removeItem('logi_selected_product');
    localStorage.removeItem('logi_category_state');
    localStorage.removeItem('logi_user');
    localStorage.removeItem('logi_token');
    setUser(null);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0f172a] text-emerald-500">
        <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 1. Not Logged In -> Login Screen
  if (!user) {
    return (
      <div className="min-h-screen relative text-slate-900 dark:text-white w-full max-w-[100vw] overflow-x-hidden transition-colors duration-500 bg-slate-50 dark:bg-[#0f172a]">
        <LiquidBackground />
        <div className="relative z-10">
          <Login onLogin={handleLogin} />
        </div>
      </div>
    );
  }

  // 2. Admin Logic -> Independent App
  if (user.role === 'ADMIN') {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <AdminPanel onLogout={handleLogout} themeMode={themeMode} setThemeMode={setThemeMode} />
      </Suspense>
    );
  }

  // 3. Cashier Logic -> Independent App
  if (user.role === 'CASHIER') {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <CashierDashboard onLogout={handleLogout} cashierId={user.id} />
      </Suspense>
    );
  }

  // 4. Default: Customer Logic -> Independent App
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <div className="min-h-screen relative text-slate-900 dark:text-white w-full max-w-[100vw] overflow-x-hidden transition-colors duration-500 bg-slate-50 dark:bg-[#0f172a]">
        <LiquidBackground />
        <div className="relative z-10">
          <CustomerApp
            user={user}
            onLogout={handleLogout}
            onUpdateUser={handleUpdateUser}
            themeMode={themeMode}
            setThemeMode={setThemeMode}
          />
        </div>
      </div>
    </Suspense>
  );
};

export default App;
