
import React from 'react';

interface GlassProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

// Improved GlassCard: True "Liquid Glass" feel in both Light and Dark modes
export const GlassCard: React.FC<GlassProps> = ({ children, className = '', onClick }) => (
  <div 
    onClick={onClick}
    className={`relative overflow-hidden 
      bg-white/60 backdrop-blur-xl border border-white/40 text-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.04)]
      dark:bg-slate-900/60 dark:backdrop-blur-xl dark:border-white/10 dark:text-white dark:shadow-xl
      rounded-2xl transition-all duration-300 ${className}`}
  >
    {children}
  </div>
);

export const GlassButton: React.FC<GlassProps & { variant?: 'primary' | 'secondary'; disabled?: boolean }> = ({ 
  children, 
  className = '', 
  onClick,
  variant = 'primary',
  disabled
}) => {
  const baseStyles = "px-6 py-3 rounded-xl font-semibold transition-all duration-300 active:scale-95 flex items-center justify-center backdrop-blur-md";
  const variants = {
    // Primary: Gradient green, readable on both backgrounds
    primary: "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 border border-white/20",
    // Secondary: Glassy gray in light mode, Glass in dark mode
    secondary: "bg-white/50 hover:bg-white/70 text-slate-800 border border-white/40 shadow-sm dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/20 dark:text-white"
  };

  const disabledStyles = disabled ? "opacity-50 cursor-not-allowed pointer-events-none grayscale" : "";

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className} ${disabledStyles}`}
    >
      {children}
    </button>
  );
};

export const LiquidBackground: React.FC = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden bg-slate-50 dark:bg-[#0f172a] transition-colors duration-500">
    {/* Light Mode Blobs (Vibrant & Visible through glass) */}
    <div className="blob bg-purple-300/40 w-96 h-96 rounded-full top-0 left-0 blur-3xl dark:hidden animate-blob"></div>
    <div className="blob bg-emerald-300/40 w-96 h-96 rounded-full top-0 right-0 blur-3xl dark:hidden animate-blob animation-delay-2000"></div>
    <div className="blob bg-orange-200/40 w-80 h-80 rounded-full -bottom-20 left-20 blur-3xl dark:hidden animate-blob animation-delay-4000"></div>
    
    {/* Dark Mode Blobs (Deep & Glowing) */}
    <div className="hidden dark:block blob bg-purple-600 w-96 h-96 rounded-full top-0 left-0 mix-blend-multiply blur-3xl opacity-20 animate-blob"></div>
    <div className="hidden dark:block blob bg-emerald-600 w-96 h-96 rounded-full top-0 right-0 mix-blend-multiply blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
    <div className="hidden dark:block blob bg-pink-600 w-96 h-96 rounded-full -bottom-32 left-20 mix-blend-multiply blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
  </div>
);
