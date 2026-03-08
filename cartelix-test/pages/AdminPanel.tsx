
import React, { useState, useCallback } from 'react';
import { LogOut, LayoutDashboard, Users, ShoppingBag, Gift, MessageSquare, Monitor, Menu, X, Sun, Moon, Smartphone, Settings, BarChart3 } from 'lucide-react';
import AdminDashboard from './AdminDashboard';
import AdminProducts from './AdminProducts';
import AdminUsers from './AdminUsers';
import AdminMarketing from './AdminMarketing';
import AdminFeedback from './AdminFeedback';
import AdminInfrastructure from './AdminInfrastructure';
import AdminSettings from './AdminSettings';
import AdminScanAnalytics from './AdminScanAnalytics';
import { api } from '../services/api';
import { AdminStats, ThemeMode } from '../types';
import { ToastContainer, ToastMessage } from '../components/Toast';

interface Props {
   onLogout: () => void;
   themeMode: ThemeMode;
   setThemeMode: (mode: ThemeMode) => void;
}

const AdminPanel: React.FC<Props> = ({ onLogout, themeMode, setThemeMode }) => {
   const [activePage, setActivePage] = useState<'dashboard' | 'products' | 'users' | 'marketing' | 'scan-analytics' | 'feedback' | 'infrastructure' | 'settings'>('dashboard');
   const [stats, setStats] = useState<AdminStats | null>(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
   const [toasts, setToasts] = useState<ToastMessage[]>([]);

   // Theme Toggle Component
   const ThemeToggle = () => (
      <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl mb-4">
         {(['light', 'dark', 'system'] as ThemeMode[]).map(mode => (
            <button
               key={mode}
               onClick={() => setThemeMode(mode)}
               className={`flex-1 p-2 rounded-lg flex justify-center transition-all ${themeMode === mode ? 'bg-white dark:bg-white/10 shadow text-emerald-600 dark:text-emerald-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
               title={mode === 'light' ? 'İşıqlı' : mode === 'dark' ? 'Qaranlıq' : 'Sistem'}
            >
               {mode === 'light' ? <Sun size={18} /> : mode === 'dark' ? <Moon size={18} /> : <Smartphone size={18} />}
            </button>
         ))}
      </div>
   );

   // Toast helper
   const showToast = useCallback((message: string, type: ToastMessage['type']) => {
      const id = Date.now().toString();
      setToasts(prev => [...prev, { id, message, type }]);
   }, []);

   const closeToast = useCallback((id: string) => {
      setToasts(prev => prev.filter(t => t.id !== id));
   }, []);

   // Initial data load for dashboard
   React.useEffect(() => {
      const loadStats = async () => {
         setLoading(true);
         try {
            const data = await api.getAdminStats();
            setStats(data);
            setError(null);
         } catch (e) {
            console.error('Admin stats error:', e);
            setError('Statistika yüklənmədi');
            // Provide fallback stats so dashboard can still render
            setStats({
               totalRevenue: 0,
               totalOrders: 0,
               activeUsers: 0,
               todaysRevenue: 0,
               recentOrders: [],
               logs: [],
               topSellingProducts: []
            });
         } finally {
            setLoading(false);
         }
      };
      loadStats();
   }, []);

   const renderContent = () => {
      if (loading) return <div className="text-center py-10">Yüklənir...</div>;
      if (error) return <div className="text-center py-10 text-red-500">{error}</div>;
      switch (activePage) {
         case 'dashboard': return stats ? <AdminDashboard stats={stats} /> : <div>Xəta baş verdi.</div>;
         case 'products': return <AdminProducts showToast={showToast} />;
         case 'users': return <AdminUsers showToast={showToast} />;
         case 'marketing': return <AdminMarketing showToast={showToast} />;
         case 'scan-analytics': return <AdminScanAnalytics showToast={showToast} />;
         case 'feedback': return <AdminFeedback showToast={showToast} />;
         case 'infrastructure': return <AdminInfrastructure showToast={showToast} />;
         case 'settings': return <AdminSettings showToast={showToast} />;
         default: return null;
      }
   };

   const navItemClass = (id: string) => `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activePage === id ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 font-bold' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`;

   const handleNavClick = (page: typeof activePage) => {
      setActivePage(page);
      setMobileMenuOpen(false);
   };

   const navItems = [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { id: 'products', icon: ShoppingBag, label: 'Məhsullar' },
      { id: 'users', icon: Users, label: 'İstifadəçilər' },
      { id: 'marketing', icon: Gift, label: 'Marketinq' },
      { id: 'scan-analytics', icon: BarChart3, label: 'Scan Analitika' },
      { id: 'infrastructure', icon: Monitor, label: 'İnfrastruktur' },
      { id: 'settings', icon: Settings, label: 'Tənzimləmələr' },
      { id: 'feedback', icon: MessageSquare, label: 'Rəylər' },
   ];

   return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white flex">

         {/* Desktop Sidebar */}
         <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-white/10 flex-col p-6 hidden md:flex shrink-0">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-2">
               <img src="/logistore-logo.svg" alt="LogiStore" className="w-8 h-8 rounded-full" /> LogiStore Admin
            </h1>

            <ThemeToggle />
            <nav className="space-y-1 flex-1">
               {navItems.map(item => (
                  <button key={item.id} onClick={() => handleNavClick(item.id as typeof activePage)} className={navItemClass(item.id)}>
                     <item.icon className="w-5 h-5" /> {item.label}
                  </button>
               ))}
            </nav>

            <button onClick={onLogout} className="flex items-center gap-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 px-4 py-3 rounded-xl transition mt-auto">
               <LogOut className="w-5 h-5" /> Çıxış
            </button>
         </div>

         {/* Mobile Header */}
         <div className="md:hidden fixed top-0 w-full bg-white dark:bg-slate-900 z-50 p-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
            <div className="flex items-center gap-2">
               <button onClick={() => setMobileMenuOpen(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg">
                  <Menu className="w-5 h-5" />
               </button>
               <span className="font-bold">LogiStore Admin</span>
            </div>
            <button onClick={onLogout} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg">
               <LogOut className="w-5 h-5" />
            </button>
         </div>

         {/* Mobile Sidebar Overlay */}
         {mobileMenuOpen && (
            <div className="md:hidden fixed inset-0 z-50 flex">
               {/* Backdrop */}
               <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />

               {/* Sidebar */}
               <div className="relative w-72 max-w-[80vw] bg-white dark:bg-slate-900 h-full flex flex-col p-6 animate-slideIn">
                  <div className="flex items-center justify-between mb-8">
                     <h1 className="text-xl font-bold flex items-center gap-2">
                        <img src="/logistore-logo.svg" alt="LogiStore" className="w-8 h-8 rounded-full" /> LogiStore Admin
                     </h1>
                     <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg">
                        <X className="w-5 h-5" />
                     </button>
                  </div>

                  <ThemeToggle />
                  <nav className="space-y-1 flex-1">
                     {navItems.map(item => (
                        <button key={item.id} onClick={() => handleNavClick(item.id as typeof activePage)} className={navItemClass(item.id)}>
                           <item.icon className="w-5 h-5" /> {item.label}
                        </button>
                     ))}
                  </nav>

                  <button onClick={onLogout} className="flex items-center gap-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 px-4 py-3 rounded-xl transition mt-auto">
                     <LogOut className="w-5 h-5" /> Çıxış
                  </button>
               </div>
            </div>
         )}

         {/* Content Area */}
         <div className="flex-1 p-4 sm:p-6 md:p-10 mt-16 md:mt-0 overflow-y-auto h-screen">
            {renderContent()}
         </div>

         {/* Toast Container */}
         <ToastContainer toasts={toasts} onClose={closeToast} />
      </div>
   );
};

export default AdminPanel;
