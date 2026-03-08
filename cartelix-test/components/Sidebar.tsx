
import React, { useEffect, useState } from 'react';
import { User, AppRoute } from '../types';
import { X, User as UserIcon, History, Settings, LogOut, ChevronRight, QrCode, Bell, HelpCircle, ScanLine } from 'lucide-react';
import { api } from '../services/api';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onNavigate: (route: AppRoute) => void;
  onLogout: () => void;
  onProfileNav: (tab: 'info' | 'history') => void;
  onShowBonusCard: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, user, onNavigate, onLogout, onProfileNav, onShowBonusCard }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      api.getUnreadNotificationCount().then(setUnreadCount);
    }
  }, [isOpen]);

  const handleProfileLink = (tab: 'info' | 'history') => {
    onProfileNav(tab);
    onClose();
  };

  const handleBonusCardClick = () => {
    onShowBonusCard();
    onClose();
  };

  const handleNavigation = (route: AppRoute) => {
    onNavigate(route);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Content */}
      <div className={`fixed top-0 left-0 bottom-0 w-[80%] max-w-xs z-[70] 
          bg-slate-50 dark:bg-[#0f172a] border-r border-slate-200 dark:border-white/10 
          shadow-2xl transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        <div className="p-6 h-full flex flex-col">

          {/* Header / User Info */}
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center border-2 border-white/20 shadow-lg">
                {user && user.name ? (
                  <span className="text-lg font-bold text-white">{user.name.charAt(0)}</span>
                ) : (
                  <UserIcon className="text-white/80" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">{user?.name || 'Qonaq'}</h3>
                <p className="text-xs text-slate-500 dark:text-white/50">{user?.phone || 'Giriş edilməyib'}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-black/5 dark:bg-white/5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/70">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Menu Items */}
          <div className="space-y-2 flex-1 overflow-y-auto">
            <h4 className="text-xs font-bold text-slate-400 dark:text-white/30 uppercase tracking-wider mb-2 ml-2">Hesab</h4>

            <button onClick={() => handleProfileLink('info')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white dark:hover:bg-white/5 hover:shadow-sm transition-all text-slate-700 dark:text-white/80">
              <UserIcon className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
              <span className="flex-1 text-left font-medium">Şəxsi Məlumatlar</span>
              <ChevronRight className="w-4 h-4 text-slate-400 dark:text-white/30" />
            </button>

            <button onClick={() => handleProfileLink('history')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white dark:hover:bg-white/5 hover:shadow-sm transition-all text-slate-700 dark:text-white/80">
              <History className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              <span className="flex-1 text-left font-medium">Alış Tarixçəsi</span>
              <ChevronRight className="w-4 h-4 text-slate-400 dark:text-white/30" />
            </button>

            {user && (
              <button onClick={handleBonusCardClick} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white dark:hover:bg-white/5 hover:shadow-sm transition-all text-slate-700 dark:text-white/80 group">
                <div className="bg-emerald-500/20 p-1.5 rounded-lg group-hover:bg-emerald-500/30 transition">
                  <ScanLine className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="flex-1 text-left font-medium">Bonus Kartım (Barkod)</span>
                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-white/30" />
              </button>
            )}

            <h4 className="text-xs font-bold text-slate-400 dark:text-white/30 uppercase tracking-wider mb-2 mt-6 ml-2">Tətbiq</h4>

            <button onClick={() => handleNavigation(AppRoute.NOTIFICATIONS)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white dark:hover:bg-white/5 hover:shadow-sm transition-all text-slate-700 dark:text-white/80">
              <Bell className="w-5 h-5 text-orange-500 dark:text-orange-400" />
              <span className="flex-1 text-left font-medium">Bildirişlər</span>
              {unreadCount > 0 && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>}
            </button>

            <button onClick={() => handleNavigation(AppRoute.SETTINGS)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white dark:hover:bg-white/5 hover:shadow-sm transition-all text-slate-700 dark:text-white/80">
              <Settings className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              <span className="flex-1 text-left font-medium">Ayarlar</span>
            </button>

            <button onClick={() => handleNavigation(AppRoute.SUPPORT)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white dark:hover:bg-white/5 hover:shadow-sm transition-all text-slate-700 dark:text-white/80">
              <HelpCircle className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              <span className="flex-1 text-left font-medium">Dəstək</span>
            </button>
          </div>

          {/* Footer / Logout */}
          <div className="pt-6 border-t border-slate-200 dark:border-white/10">
            {user ? (
              <button onClick={() => { onLogout(); onClose(); }} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-500 hover:bg-red-200 dark:hover:bg-red-500/20 transition-colors font-medium">
                <LogOut className="w-5 h-5" />
                Çıxış et
              </button>
            ) : (
              <button onClick={() => onNavigate(AppRoute.LOGIN)} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-500 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition-colors font-medium">
                <LogOut className="w-5 h-5 rotate-180" />
                Giriş et
              </button>
            )}
            <p className="text-center text-[10px] text-slate-400 dark:text-white/20 mt-4">Versiya 2.1.0 • LogiStore</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
