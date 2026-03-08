
import React from 'react';
import { AppRoute } from '../types';
import { House, LayoutGrid, Scan, ShoppingCart, QrCode } from 'lucide-react';

interface NavbarProps {
  activeRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  cartCount: number;
}

const Navbar: React.FC<NavbarProps> = ({ activeRoute, onNavigate, cartCount }) => {
  const navItems = [
    { id: AppRoute.HOME, icon: House, label: 'Ana Səhifə' },
    { id: AppRoute.CATEGORIES, icon: LayoutGrid, label: 'Kataloq' },
    { id: AppRoute.SCAN, icon: Scan, label: 'Scan', isPrimary: true },
    { id: AppRoute.CART, icon: ShoppingCart, label: 'Səbət', hasBadge: true },
    { id: AppRoute.REWARDS, icon: QrCode, label: 'Bonus' }, 
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 w-full pointer-events-none">
      {/* Wrapper for positioning */}
      <div className="pointer-events-auto absolute bottom-0 w-full 
          bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-2xl border-t border-white/40 dark:border-white/10 
          rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.2)] 
          px-6 pb-3 pt-2 flex justify-between items-end safe-area-bottom transition-all duration-300">
        
        {navItems.map((item) => {
          const isActive = activeRoute === item.id;
          const Icon = item.icon;
          
          if (item.isPrimary) {
            return (
              <button 
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="relative -top-5 group"
              >
                <div className="bg-gradient-to-tr from-emerald-400 to-emerald-600 w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(16,185,129,0.4)] border-4 border-white/80 dark:border-[#0f172a] transition-transform duration-300 group-active:scale-95">
                  <Icon className="text-white w-6 h-6" />
                </div>
              </button>
            );
          }

          return (
            <button 
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`relative flex flex-col items-center gap-1 py-1 px-1 min-w-[56px] transition-all duration-300 
                  ${isActive ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-slate-400 dark:text-white/50 hover:text-slate-600 dark:hover:text-white/80'}`}
            >
              <Icon className={`w-6 h-6`} strokeWidth={isActive ? 2.5 : 2} />
              
              <span className="text-[10px] font-medium">{item.label}</span>
              
              {item.hasBadge && cartCount > 0 && (
                <span className="absolute -top-1 right-1 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center border border-white dark:border-[#0f172a] animate-bounce-short">
                  {cartCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Navbar;
