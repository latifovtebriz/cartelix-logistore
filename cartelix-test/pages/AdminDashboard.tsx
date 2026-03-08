
import React from 'react';
import { AdminStats } from '../types';
import { GlassCard } from '../components/GlassComponents';
import { DollarSign, ShoppingBag, Users, TrendingUp, Box } from 'lucide-react';

interface Props {
  stats: AdminStats;
}

const AdminDashboard: React.FC<Props> = ({ stats }) => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard className="p-5 flex items-center gap-4 border-l-4 border-l-emerald-500 bg-white dark:bg-slate-800">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-500/20 rounded-full text-emerald-600 dark:text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-white/50 uppercase font-bold">Ümumi Gəlir</p>
            <p className="text-2xl font-bold">{stats.totalRevenue.toFixed(2)} ₼</p>
          </div>
        </GlassCard>

        <GlassCard className="p-5 flex items-center gap-4 border-l-4 border-l-blue-500 bg-white dark:bg-slate-800">
          <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-full text-blue-600 dark:text-blue-400">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-white/50 uppercase font-bold">Sifarişlər</p>
            <p className="text-2xl font-bold">{stats.totalOrders}</p>
          </div>
        </GlassCard>

        <GlassCard className="p-5 flex items-center gap-4 border-l-4 border-l-purple-500 bg-white dark:bg-slate-800">
          <div className="p-3 bg-purple-100 dark:bg-purple-500/20 rounded-full text-purple-600 dark:text-purple-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-white/50 uppercase font-bold">Aktiv Müştərilər</p>
            <p className="text-2xl font-bold">{stats.activeUsers}</p>
          </div>
        </GlassCard>

        <GlassCard className="p-5 flex items-center gap-4 border-l-4 border-l-orange-500 bg-white dark:bg-slate-800">
          <div className="p-3 bg-orange-100 dark:bg-orange-500/20 rounded-full text-orange-600 dark:text-orange-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-white/50 uppercase font-bold">Bugünkü Gəlir</p>
            <p className="text-2xl font-bold">{stats.todaysRevenue.toFixed(2)} ₼</p>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/10 p-5">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Box className="w-5 h-5 text-indigo-500" /> Ən Çox Satılanlar</h3>
          <ul className="space-y-3">
            {stats.topSellingProducts.map((p, i) => (
              <li key={i} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-white/5 last:border-0">
                <span className="text-sm font-medium">{p.name}</span>
                <span className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded text-xs font-bold">{p.count} ədəd</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Quick Stats Summary */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/10 p-5">
          <h3 className="font-bold text-lg mb-4">Xülasə</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl text-center">
              <p className="text-2xl font-bold text-emerald-600">{stats.totalOrders}</p>
              <p className="text-xs text-slate-500">Ümumi Sifariş</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.activeUsers}</p>
              <p className="text-xs text-slate-500">Aktiv İstifadəçi</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.topSellingProducts.length}</p>
              <p className="text-xs text-slate-500">Populyar Məhsul</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl text-center">
              <p className="text-2xl font-bold text-orange-600">{((stats.todaysRevenue / stats.totalRevenue) * 100).toFixed(1)}%</p>
              <p className="text-xs text-slate-500">Bugünkü Pay</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
