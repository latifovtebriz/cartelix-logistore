
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { PosTerminal } from '../types';
import { GlassButton } from '../components/GlassComponents';
import { Monitor, Plus, QrCode, Trash2 } from 'lucide-react';
import { ToastMessage } from '../components/Toast';

interface Props {
  showToast: (message: string, type: ToastMessage['type']) => void;
}

const AdminInfrastructure: React.FC<Props> = ({ showToast }) => {
  const [terminals, setTerminals] = useState<PosTerminal[]>([]);
  const [form, setForm] = useState({ name: '', code: '' });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getPosTerminals();
      setTerminals(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.addPosTerminal(form.name, form.code);
    setForm({ name: '', code: '' });
    load();
    showToast("Terminal əlavə edildi", "success");
  };

  const deleteTerminal = async (id: string) => {
    if (window.confirm("Bu terminalı silmək istəyirsiniz?")) {
      await api.deletePosTerminal(Number(id));
      load();
      showToast("Terminal silindi", "success");
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <h2 className="text-2xl font-bold">POS İnfrastruktur</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-white/10 h-fit">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Plus className="w-5 h-5" /> Yeni Terminal</h3>
          <form onSubmit={add} className="space-y-4">
            <input className="w-full p-2 border rounded-lg bg-transparent dark:border-white/20" placeholder="Filial Adı (Məs: Maştağa)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            <input className="w-full p-2 border rounded-lg bg-transparent dark:border-white/20" placeholder="QR Kod (Məs: POS-MST-05)" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required />
            <GlassButton className="w-full">Əlavə Et</GlassButton>
          </form>
        </div>

        <div className="md:col-span-2">
          <h3 className="font-bold mb-4">Mövcud Terminaller ({terminals.length})</h3>
          {loading ? <p className="text-slate-400">Yüklənir...</p> : terminals.length === 0 ? <p className="text-slate-400">Terminal yoxdur</p> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {terminals.map(pos => (
                <div key={pos.id} className="bg-white dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10 flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                    <Monitor className="w-6 h-6 text-slate-600 dark:text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold truncate">{pos.marketName}</h4>
                    <p className="text-xs font-mono bg-slate-100 dark:bg-black/30 px-1 rounded inline-block mt-1 truncate max-w-full">{pos.qrString}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <QrCode className="w-6 h-6 text-slate-300" />
                    <button onClick={() => deleteTerminal(pos.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminInfrastructure;
