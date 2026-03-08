
import React, { useEffect, useState } from 'react';
import { GlassCard } from '../components/GlassComponents';
import { Bell, ChevronLeft, CheckCircle, AlertCircle, Info, Check, BellRing, BellOff, Percent } from 'lucide-react';
import { api } from '../services/api';
import { NotificationItem } from '../types';
import { pushNotificationService } from '../services/pushNotificationService';

interface Props {
  onBack: () => void;
}

const Notifications: React.FC<Props> = ({ onBack }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await api.getNotifications();
        setNotifications(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    // Check push notification permission
    setPushPermission(pushNotificationService.getPermissionStatus());
  }, []);

  const markAllRead = async () => {
    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await api.markNotificationsRead();
  };

  const requestPushPermission = async () => {
    const result = await pushNotificationService.requestPermission();
    setPushPermission(result);
    if (result === 'granted') {
      // Show test notification
      pushNotificationService.showNotification('🎉 Bildirişlər aktiv!', {
        body: 'Artıq endirim və kampaniya bildirişləri alacaqsınız.'
      });
    }
  };

  return (
    <div className="pb-32 pt-6 px-4 space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-10 h-10 bg-black/5 dark:bg-white/10 rounded-full flex items-center justify-center text-slate-800 dark:text-white hover:bg-black/10 dark:hover:bg-white/20 transition">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bildirişlər</h1>
        </div>
        {notifications.some(n => !n.read) && (
          <button onClick={markAllRead} className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold hover:underline active:scale-95 transition">
            <Check className="w-3 h-3" /> Hamısını oxu
          </button>
        )}
      </div>

      {/* Push Notification Permission Card */}
      <GlassCard className="p-4 mb-4">
        <div className="flex items-center gap-4">
          {pushPermission === 'granted' ? (
            <>
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                <BellRing className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 dark:text-white">Bildirişlər Aktiv</h3>
                <p className="text-xs text-slate-500 dark:text-white/60">Endirim və kampaniya bildirişləri alacaqsınız</p>
              </div>
            </>
          ) : pushPermission === 'denied' ? (
            <>
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                <BellOff className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 dark:text-white">Bildirişlər Bloklanıb</h3>
                <p className="text-xs text-slate-500 dark:text-white/60">Brauzer parametrlərindən icazə verin</p>
              </div>
            </>
          ) : pushPermission === 'unsupported' ? (
            <>
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-500/20 flex items-center justify-center">
                <BellOff className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 dark:text-white">Dəstəklənmir</h3>
                <p className="text-xs text-slate-500 dark:text-white/60">Bu brauzer bildirişləri dəstəkləmir</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                <Bell className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 dark:text-white">Bildirişləri Aktiv Et</h3>
                <p className="text-xs text-slate-500 dark:text-white/60">Endirim haqqında anında xəbər al</p>
              </div>
              <button
                onClick={requestPushPermission}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-lg transition active:scale-95"
              >
                Aktiv Et
              </button>
            </>
          )}
        </div>
      </GlassCard>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-200 dark:bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 text-slate-400 dark:text-white/30">
          <Bell className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p>Bildiriş yoxdur</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(item => (
            <GlassCard key={item.id} className={`p-4 flex gap-4 border-l-4 ${item.read ? 'opacity-60 grayscale-[0.5]' : 'opacity-100 shadow-md'} ${item.type === 'success' ? 'border-l-emerald-500' : item.type === 'warning' ? 'border-l-orange-500' : item.type === 'discount' ? 'border-l-purple-500' : 'border-l-blue-500'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.type === 'success' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : item.type === 'warning' ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400' : item.type === 'discount' ? 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'}`}>
                {item.type === 'success' ? <CheckCircle className="w-5 h-5" /> : item.type === 'warning' ? <AlertCircle className="w-5 h-5" /> : item.type === 'discount' ? <Percent className="w-5 h-5" /> : <Info className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h4 className={`font-bold text-sm ${item.read ? 'text-slate-600 dark:text-white/70' : 'text-slate-900 dark:text-white'}`}>{item.title}</h4>
                  <span className="text-[10px] text-slate-400 dark:text-white/40">{item.date}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-white/70 leading-relaxed">{item.message}</p>
              </div>
              {!item.read && <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1.5 animate-pulse"></div>}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
