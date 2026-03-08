
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SystemSetting } from '../types';
import { GlassButton } from '../components/GlassComponents';
import { Save, AlertTriangle, Settings } from 'lucide-react';
import { ToastMessage } from '../components/Toast';

interface Props {
    showToast: (message: string, type: ToastMessage['type']) => void;
}

const AdminSettings: React.FC<Props> = ({ showToast }) => {
    const [settings, setSettings] = useState<SystemSetting[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.getSystemSettings();
            setSettings(res);
        } catch (e) {
            console.error(e);
            showToast("Tənzimləmələri yükləmək mümkün olmadı", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleChange = (id: number, newValue: string) => {
        setSettings(prev => prev.map(s => s.id === id ? { ...s, settingValue: newValue } : s));
    };

    const handleSave = async (setting: SystemSetting) => {
        try {
            await api.updateSystemSetting(setting.settingKey, setting.settingValue);
            showToast("Yadda saxlanıldı", "success");
        } catch (e) {
            console.error(e);
            showToast("Xəta baş verdi", "error");
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                    <Settings className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold">Sistem Tənzimləmələri</h2>
                    <p className="text-slate-500 text-sm">Qlobal limitləri və parametrləri idarə edin.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-white/5 uppercase text-xs text-slate-500">
                        <tr>
                            <th className="px-6 py-4">Parametr (Key)</th>
                            <th className="px-6 py-4">Təsvir</th>
                            <th className="px-6 py-4">Dəyər</th>
                            <th className="px-6 py-4">Tip</th>
                            <th className="px-6 py-4 text-right">Əməliyyat</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                        {settings.length === 0 && !loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                                    Heç bir tənzimləmə tapılmadı.
                                </td>
                            </tr>
                        ) : (
                            settings.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                                        {s.settingKey}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                        {s.description || '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <input
                                            value={s.settingValue}
                                            onChange={e => handleChange(s.id, e.target.value)}
                                            className="w-full max-w-[200px] px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/20 rounded-lg focus:outline-none focus:border-indigo-500"
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">
                                        {s.type || 'STRING'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <GlassButton onClick={() => handleSave(s)} className="bg-indigo-600 text-white hover:bg-indigo-700">
                                            <Save className="w-4 h-4 mr-1" /> Yadda Saxla
                                        </GlassButton>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {loading && (
                    <div className="p-8 text-center text-slate-500">Yüklənir...</div>
                )}
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 p-4 rounded-xl flex gap-3 text-sm text-yellow-800 dark:text-yellow-200">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <p>
                    <strong>Diqqət:</strong> Bu dəyişikliklər bütün sistemə dərhal təsir edə bilər.
                    Loyallıq xalları və endirim faizlərini dəyişərkən diqqətli olun.
                </p>
            </div>
        </div>
    );
};

export default AdminSettings;
