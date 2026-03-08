
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassComponents';
import { Settings as SettingsIcon, Bell, Moon, Globe, Shield, ChevronLeft, LogOut, Trash2, Check, Sun, Smartphone, Laptop } from 'lucide-react';
import { ThemeMode } from '../types';

interface Props {
  onBack: () => void;
  onLogout: () => void;
  currentTheme: ThemeMode;
  onSetTheme: (theme: ThemeMode) => void;
}

const Settings: React.FC<Props> = ({ onBack, onLogout, currentTheme, onSetTheme }) => {
  const [notifications, setNotifications] = useState(() => localStorage.getItem('logi_notifications') !== 'false');
  const [language, setLanguage] = useState(() => localStorage.getItem('logi_language') || 'az');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    localStorage.setItem('logi_notifications', String(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('logi_language', language);
  }, [language]);

  const handleToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleClearCache = () => {
    if (window.confirm("Bütün keşlənmiş məlumatlar silinəcək və tətbiq yenidən başladılacaq. Davam edirsiniz?")) {
      localStorage.clear();
      handleToast("Keş təmizləndi...");
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  const renderThemeButton = (mode: ThemeMode, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => { onSetTheme(mode); handleToast(`${label} rejimi seçildi`); }}
      className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all border ${currentTheme === mode
          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
          : 'bg-black/5 dark:bg-white/5 border-transparent text-slate-500 dark:text-white/50 hover:bg-black/10 dark:hover:bg-white/10'
        }`}
    >
      {icon}
      <span className="text-[10px] font-bold mt-1">{label}</span>
    </button>
  );

  return (
    <div className="pb-32 pt-6 px-4 space-y-6 animate-fadeIn relative">

      {/* Toast Notification */}
      <div className={`fixed top-6 left-0 right-0 flex justify-center z-50 transition-all duration-300 ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'}`}>
        <div className="bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium">
          <Check className="w-4 h-4" /> {toastMessage}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="w-10 h-10 bg-black/5 dark:bg-white/10 rounded-full flex items-center justify-center text-slate-800 dark:text-white hover:bg-black/10 dark:hover:bg-white/20 transition">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Ayarlar</h1>
      </div>

      {/* Theme Selection */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-3 text-slate-800 dark:text-white">
          <Moon className="w-5 h-5 text-purple-500" />
          <span className="font-bold">Görünüş</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {renderThemeButton('light', <Sun className="w-5 h-5" />, 'İşıqlı')}
          {renderThemeButton('dark', <Moon className="w-5 h-5" />, 'Qaranlıq')}
          {renderThemeButton('system', <Smartphone className="w-5 h-5" />, 'Sistem')}
        </div>
      </GlassCard>

      {/* General Settings */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="p-4 border-b border-black/5 dark:border-white/5">
          <h3 className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-wider">Ümumi</h3>
        </div>

        <div className="divide-y divide-black/5 dark:divide-white/5">
          {/* Language */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 text-slate-800 dark:text-white">
              <Globe className="w-5 h-5 text-blue-400" />
              <span>Dil</span>
            </div>
            <div className="flex bg-black/5 dark:bg-black/30 p-1 rounded-lg">
              <button
                onClick={() => { setLanguage('az'); handleToast("Dil dəyişdirildi: Azərbaycan"); }}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${language === 'az' ? 'bg-white shadow text-black dark:bg-white/20 dark:text-white' : 'text-slate-500 dark:text-white/40'}`}
              >
                AZ
              </button>
              <button
                onClick={() => { setLanguage('en'); handleToast("Language changed: English"); }}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${language === 'en' ? 'bg-white shadow text-black dark:bg-white/20 dark:text-white' : 'text-slate-500 dark:text-white/40'}`}
              >
                EN
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 text-slate-800 dark:text-white">
              <Bell className="w-5 h-5 text-orange-400" />
              <span>Push Bildirişlər</span>
            </div>
            <div
              onClick={() => { setNotifications(!notifications); handleToast(notifications ? "Bildirişlər söndürüldü" : "Bildirişlər aktivdir"); }}
              className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${notifications ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${notifications ? 'translate-x-5' : ''}`}></div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Data & Privacy */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="p-4 border-b border-black/5 dark:border-white/5">
          <h3 className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-wider">Məxfilik</h3>
        </div>

        <div className="divide-y divide-black/5 dark:divide-white/5">
          <button className="w-full p-4 flex items-center gap-3 text-slate-800 dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left" onClick={() => handleToast("Səhifə hazırlanır...")}>
            <Shield className="w-5 h-5 text-emerald-500" />
            <span>Məxfilik Siyasəti</span>
          </button>
          <button
            onClick={handleClearCache}
            className="w-full p-4 flex items-center gap-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left"
          >
            <Trash2 className="w-5 h-5" />
            <span>Keşi Təmizlə (Sıfırla)</span>
          </button>
        </div>
      </GlassCard>

      <button onClick={onLogout} className="w-full py-4 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-200 dark:hover:bg-red-500/20 transition-colors active:scale-95">
        <LogOut className="w-5 h-5" /> Çıxış Et
      </button>

      <p className="text-center text-xs text-slate-400 dark:text-white/20 mt-4">LogiStore Digital v2.1.2</p>
    </div>
  );
};

export default Settings;
