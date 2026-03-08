
import React, { useState, useRef, useEffect } from 'react';
import { GlassCard, GlassButton } from '../components/GlassComponents';
import { User } from '../types';
import { api } from '../services/api';
import { User as UserIcon, Mail, Calendar, Phone, Lock, ShieldAlert, Monitor, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
    onLogin: (user: User) => void;
}

type AuthTab = 'login' | 'signup' | 'admin';

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [activeTab, setActiveTab] = useState<AuthTab>('login');

    // Login State
    const [loginPhone, setLoginPhone] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // Signup State
    const [signupPhone, setSignupPhone] = useState('');
    const [signupName, setSignupName] = useState('');
    const [signupSurname, setSignupSurname] = useState('');
    const [signupEmail, setSignupEmail] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
    const [signupDob, setSignupDob] = useState('');

    // Admin Login State
    const [adminUser, setAdminUser] = useState('');
    const [adminPass, setAdminPass] = useState('');

    // UI State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const formatPhone = (p: string) => {
        let clean = p.replace(/\s+|[^0-9]/g, '');
        if (clean.startsWith('0')) clean = clean.substring(1);
        if (!clean.startsWith('994')) clean = '994' + clean;
        return '+' + clean;
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const formattedPhone = formatPhone(loginPhone);
        if (formattedPhone.length !== 13) {
            setError("Nömrəni düzgün daxil edin (050...)");
            setLoading(false);
            return;
        }

        if (loginPassword.length < 6) {
            setError("Şifrə ən azı 6 simvol olmalıdır");
            setLoading(false);
            return;
        }

        try {
            const { user } = await api.login(formattedPhone, loginPassword);
            if (user) onLogin(user);
        } catch (e: any) {
            setError(e.message || "Giriş xətası baş verdi");
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const formattedPhone = formatPhone(signupPhone);
        if (formattedPhone.length !== 13) {
            setError("Nömrəni düzgün daxil edin (050...)");
            setLoading(false);
            return;
        }

        if (signupName.length < 2) {
            setError("Ad ən azı 2 simvol olmalıdır");
            setLoading(false);
            return;
        }

        if (signupPassword.length < 6) {
            setError("Şifrə ən azı 6 simvol olmalıdır");
            setLoading(false);
            return;
        }

        if (signupPassword !== signupConfirmPassword) {
            setError("Şifrələr uyğun gəlmir");
            setLoading(false);
            return;
        }

        try {
            const { user } = await api.signup(
                formattedPhone,
                signupName,
                signupSurname,
                signupEmail,
                signupPassword,
                signupDob || undefined
            );
            if (user) onLogin(user);
        } catch (e: any) {
            setError(e.message || "Qeydiyyat xətası baş verdi");
        } finally {
            setLoading(false);
        }
    };

    const handleAdminLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Check mock credentials first (prevents unnecessary API call with invalid phone format)
        if (adminUser === 'admin' && adminPass === '123') {
            const mockAdmin: User = {
                id: 'admin-1', phone: 'admin', name: 'Admin', surname: 'User',
                email: 'admin@logistore.az', birthDate: '2000-01-01', points: 0,
                role: 'ADMIN', isScanGoBlocked: false, purchaseHistory: [],
                ageGroup: 'young_adult', verifiedReceipts: [], receiptHistory: []
            };
            localStorage.setItem('logi_token', 'admin');
            localStorage.setItem('logi_user', JSON.stringify(mockAdmin));
            onLogin(mockAdmin);
            setLoading(false);
            return;
        } else if (adminUser === 'kassir' && adminPass === '123') {
            const mockCashier: User = {
                id: 'cashier-1', phone: 'cashier', name: 'Kassir', surname: 'User',
                email: 'cashier@logistore.az', birthDate: '2000-01-01', points: 0,
                role: 'CASHIER', isScanGoBlocked: false, purchaseHistory: [],
                ageGroup: 'young_adult', verifiedReceipts: [], receiptHistory: []
            };
            localStorage.setItem('logi_token', 'cashier');
            localStorage.setItem('logi_user', JSON.stringify(mockCashier));
            onLogin(mockCashier);
            setLoading(false);
            return;
        }

        // If not mock credentials, try real API login
        try {
            const { user } = await api.login(adminUser, adminPass);
            if (user && (user.role === 'ADMIN' || user.role === 'CASHIER')) {
                onLogin(user);
            } else {
                setError("Bu hesab admin/kassir deyil");
            }
        } catch (e: any) {
            setError(e.message || "Yanlış məlumat (Demo: admin/123, kassir/123)");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8">
            <GlassCard className="w-full max-w-md p-6 sm:p-8 animate-fadeIn !bg-white/70 dark:!bg-slate-900/80 backdrop-blur-2xl border border-white/30 dark:border-white/10 shadow-2xl">

                {/* Header */}
                <div className="text-center mb-6">
                    <img src="/logistore-logo.svg" alt="LogiStore" className="w-20 h-20 mx-auto mb-3 rounded-full" />
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">LogiStore</h1>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl mb-6">
                    <button
                        onClick={() => { setActiveTab('login'); setError(''); }}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'login' ? 'bg-white dark:bg-emerald-600 text-emerald-600 dark:text-white shadow' : 'text-slate-500 dark:text-white/50'}`}
                    >
                        Giriş
                    </button>
                    <button
                        onClick={() => { setActiveTab('signup'); setError(''); }}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'signup' ? 'bg-white dark:bg-emerald-600 text-emerald-600 dark:text-white shadow' : 'text-slate-500 dark:text-white/50'}`}
                    >
                        Qeydiyyat
                    </button>
                </div>

                {/* Login Form */}
                {activeTab === 'login' && (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-white/50 mb-1 ml-1">Telefon</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="tel"
                                    value={loginPhone}
                                    onChange={(e) => setLoginPhone(e.target.value)}
                                    placeholder="050 123 45 67"
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-white/50 mb-1 ml-1">Şifrə</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={loginPassword}
                                    onChange={(e) => setLoginPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-10 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {error && <p className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-500/10 p-2 rounded-lg">{error}</p>}

                        <GlassButton className="w-full py-3.5 !bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700" disabled={loading}>
                            {loading ? 'Giriş edilir...' : 'Daxil Ol'}
                        </GlassButton>

                        <button type="button" onClick={() => setActiveTab('admin')} className="w-full text-center text-xs text-slate-400 hover:text-emerald-500 transition flex items-center justify-center gap-1 py-2">
                            <ShieldAlert className="w-3 h-3" /> İşçi Girişi
                        </button>
                    </form>
                )}

                {/* Signup Form */}
                {activeTab === 'signup' && (
                    <form onSubmit={handleSignup} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-white/50 mb-1 ml-1">Ad *</label>
                                <input value={signupName} onChange={e => setSignupName(e.target.value)} placeholder="Ad" className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-white/50 mb-1 ml-1">Soyad</label>
                                <input value={signupSurname} onChange={e => setSignupSurname(e.target.value)} placeholder="Soyad" className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-white/50 mb-1 ml-1">Telefon *</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input type="tel" value={signupPhone} onChange={e => setSignupPhone(e.target.value)} placeholder="050 123 45 67" className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" required />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-white/50 mb-1 ml-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} placeholder="email@example.com" className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-white/50 mb-1 ml-1">Şifrə *</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input type="password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} placeholder="Ən azı 6 simvol" className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" required />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-white/50 mb-1 ml-1">Şifrə Təkrarı *</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input type="password" value={signupConfirmPassword} onChange={e => setSignupConfirmPassword(e.target.value)} placeholder="Şifrəni təkrar daxil edin" className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" required />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-white/50 mb-1 ml-1">Doğum Tarixi</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input type="date" value={signupDob} onChange={e => setSignupDob(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" />
                            </div>
                        </div>

                        {error && <p className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-500/10 p-2 rounded-lg">{error}</p>}

                        <GlassButton className="w-full py-3 !bg-gradient-to-r from-emerald-500 to-emerald-600" disabled={loading}>
                            {loading ? 'Qeydiyyat...' : 'Qeydiyyatdan Keç'}
                        </GlassButton>
                    </form>
                )}

                {/* Admin Login */}
                {activeTab === 'admin' && (
                    <form onSubmit={handleAdminLogin} className="space-y-4">
                        <div className="bg-slate-100 dark:bg-white/5 p-3 rounded-xl flex items-center gap-2 text-slate-600 dark:text-white/70 text-xs">
                            <Monitor className="w-5 h-5" />
                            Admin və Kassir girişi
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-white/50 mb-1 ml-1">İstifadəçi adı / Telefon</label>
                            <input value={adminUser} onChange={e => setAdminUser(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" placeholder="admin / kassir" />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-white/50 mb-1 ml-1">Şifrə</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" placeholder="••••••" />
                            </div>
                        </div>

                        {error && <p className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-500/10 p-2 rounded-lg">{error}</p>}

                        <GlassButton className="w-full py-3 !bg-slate-800 dark:!bg-white dark:!text-black hover:!bg-slate-900" disabled={loading}>
                            {loading ? 'Yoxlanılır...' : 'Daxil Ol'}
                        </GlassButton>

                        <button type="button" onClick={() => setActiveTab('login')} className="w-full text-center text-sm text-slate-500 hover:text-emerald-500 transition">
                            ← Müştəri Girişi
                        </button>
                    </form>
                )}

            </GlassCard>
        </div>
    );
};

export default Login;
