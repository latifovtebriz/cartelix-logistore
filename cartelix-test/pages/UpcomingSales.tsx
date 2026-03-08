
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassComponents';
import { UpcomingSale } from '../types';
import { api } from '../services/api';
import { Clock, BellRing, Menu } from 'lucide-react';

interface Props {
  onOpenSidebar: () => void;
}

const UpcomingSales: React.FC<Props> = ({ onOpenSidebar }) => {
  const [sales, setSales] = useState<UpcomingSale[]>([]);
  const [timers, setTimers] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const data = await api.getUpcomingSales();
        setSales(data);
      } catch (e) {
        console.error("Failed to fetch upcoming sales", e);
      }
    };
    fetchSales();
  }, []);

  useEffect(() => {
    if (sales.length === 0) return;

    const interval = setInterval(() => {
      const newTimers: { [key: number]: string } = {};

      sales.forEach(sale => {
        const now = new Date().getTime();
        const target = new Date(sale.discountStart).getTime();
        const diff = target - now;

        if (diff > 0) {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          newTimers[sale.id] = `${days}g ${hours}s ${minutes}d ${seconds}san`;
        } else {
          newTimers[sale.id] = "Başladı!";
        }
      });
      setTimers(newTimers);
    }, 1000);

    return () => clearInterval(interval);
  }, [sales]);

  return (
    <div className="pb-32 pt-6 px-4 space-y-6">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/20 active:scale-95 transition-all border border-slate-200 dark:border-white/10"
        >
          <Menu className="w-6 h-6 text-slate-900 dark:text-white" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Gələcək Endirimlər</h1>
          <p className="text-slate-500 dark:text-white/60 text-sm">Qaçırmamaq üçün xatırlatma qurun!</p>
        </div>
      </div>

      <div className="space-y-4">
        {sales.map(sale => (
          <GlassCard key={sale.id} className="overflow-hidden border-slate-200 dark:border-white/10">
            <div className="relative h-48">
              <img src={sale.image} alt={sale.productName} className="w-full h-full object-cover opacity-90" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent"></div>

              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                <div>
                  <h3 className="text-xl font-bold text-white">{sale.productName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold text-emerald-400">{sale.futurePrice.toFixed(2)} ₼</span>
                    <span className="text-sm text-white/60 line-through">{sale.originalPrice.toFixed(2)} ₼</span>
                  </div>
                </div>
                <button className="w-10 h-10 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-white hover:bg-emerald-500 transition-colors">
                  <BellRing className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-white/5 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-2 text-orange-500 dark:text-orange-300">
                <Clock className="w-5 h-5" />
                <span className="font-mono font-bold tracking-wider">
                  {timers[sale.id] || "Yüklənir..."}
                </span>
              </div>
              <span className="text-xs text-slate-400 dark:text-white/40 uppercase tracking-widest">Başlama vaxtı</span>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};

export default UpcomingSales;
