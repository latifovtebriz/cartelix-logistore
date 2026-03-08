import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { User, Receipt } from '../types';
import { Search, Ban, CheckCircle, Smartphone, ChevronLeft, ChevronRight, Eye, X, UserPlus, ShoppingBag, Download, Send, Edit2, Save, Trash2 } from 'lucide-react';
import { ToastMessage } from '../components/Toast';

// Azerbaijani date formatter
const formatDateAZ = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}, ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } catch {
        return dateStr;
    }
};

interface Props {
    showToast?: (message: string, type: ToastMessage['type']) => void;
}

const ReceiptItem: React.FC<{ receipt: Receipt }> = ({ receipt }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg overflow-hidden">
            <div
                onClick={() => setExpanded(!expanded)}
                className="p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors flex justify-between items-center"
            >
                <div>
                    <div className="text-sm font-mono">#{receipt.fiscalId || receipt.id}</div>
                    <div className="text-[10px] text-slate-500">{formatDateAZ(receipt.date)}</div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold text-sm">{receipt.total?.toFixed(2)} ₼</span>
                    {expanded ? <ChevronLeft className="w-4 h-4 rotate-90 transition-transform" /> : <ChevronLeft className="w-4 h-4 -rotate-90 transition-transform" />}
                </div>
            </div>

            {expanded && (
                <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-white/5 animate-fadeIn">
                    <div className="space-y-2">
                        {receipt.items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs">
                                <span>{item.name || 'Məhsul'} <span className="text-slate-400">x{item.quantity}</span></span>
                                <span>{((item.price || 0) * item.quantity).toFixed(2)} ₼</span>
                            </div>
                        ))}
                    </div>
                    {(receipt as any).bonusEarned && (
                        <div className="mt-2 pt-2 border-t border-dashed border-slate-200 dark:border-white/10 flex justify-between text-xs font-bold text-emerald-600">
                            <span>Qazanılan Bonus</span>
                            <span>+{(receipt as any).bonusEarned}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const AdminUsers: React.FC<Props> = ({ showToast }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(false);

    // Modal states
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showUserModal, setShowUserModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showNotifyModal, setShowNotifyModal] = useState(false);
    const [userReceipts, setUserReceipts] = useState<Receipt[]>([]);
    const [receiptsLoading, setReceiptsLoading] = useState(false);

    // Create admin form
    const [newAdmin, setNewAdmin] = useState({ phone: '', name: '', surname: '', role: 'ADMIN' });

    // Notification form
    const [notifyForm, setNotifyForm] = useState({ title: '', message: '', type: 'info' });

    // Edit mode
    const [editMode, setEditMode] = useState(false);
    const [editData, setEditData] = useState<Partial<User>>({});

    const load = useCallback(async (pageNum: number = 0) => {
        setLoading(true);
        try {
            const response = await api.getAllUsers(pageNum, 10);
            if (response.content) {
                setUsers(response.content);
                setTotalPages(response.totalPages || 1);
                setTotalElements((response as any).totalElements || response.content.length);
            } else if (Array.isArray(response)) {
                setUsers(response as User[]);
                setTotalPages(1);
            }
        } catch (e) {
            console.error('Error loading users:', e);
            showToast?.('İstifadəçiləri yükləmək mümkün olmadı', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { load(page); }, [page, load]);

    const toggleBlock = async (user: User) => {
        const newBlockedState = !user.isBlocked;
        // Optimistic Update
        setUsers(users.map(u => u.id === user.id ? { ...u, isBlocked: newBlockedState } : u));

        try {
            await api.blockUser(user.id, newBlockedState);
            showToast?.(newBlockedState ? 'İstifadəçi bloklandı' : 'İstifadəçi blokdan çıxarıldı', 'success');
            // Background refresh
            load(page);
        } catch (e) {
            console.error('Error toggling block:', e);
            // Revert on error
            setUsers(users.map(u => u.id === user.id ? { ...u, isBlocked: !newBlockedState } : u));
            showToast?.('Əməliyyat uğursuz oldu', 'error');
        }
    };

    const toggleScanGo = async (user: User) => {
        const newBlockedState = !user.isScanGoBlocked;
        // Optimistic Update
        setUsers(users.map(u => u.id === user.id ? { ...u, isScanGoBlocked: newBlockedState } : u));

        try {
            await api.toggleScanGoBlock(user.id, newBlockedState);
            showToast?.(newBlockedState ? 'Scan&Go qadağan edildi' : 'Scan&Go icazə verildi', 'success');
            // Background refresh
            load(page);
        } catch (e) {
            console.error('Error toggling scan&go:', e);
            // Revert
            setUsers(users.map(u => u.id === user.id ? { ...u, isScanGoBlocked: !newBlockedState } : u));
            showToast?.('Əməliyyat uğursuz oldu', 'error');
        }
    };

    const openUserDetails = async (user: User) => {
        setSelectedUser(user);
        setEditData({ name: user.name, surname: user.surname, email: user.email, points: user.points });
        setShowUserModal(true);
        setReceiptsLoading(true);
        try {
            const receipts = await api.getUserReceipts(user.id);
            setUserReceipts((receipts as any).content || receipts || []);
        } catch (e) {
            setUserReceipts([]);
        } finally {
            setReceiptsLoading(false);
        }
    };

    const deleteUser = async (user: User) => {
        if (!window.confirm(`"${user.name}" istifadəçisini silmək istədiyinizə əminsiniz? \n\nBu əməliyyat geri qaytarıla bilməz və istifadəçiyə aid bütün məlumatlar (qəbzlər, bonuslar) silinəcək!`)) return;

        try {
            await api.deleteUser(user.id);
            showToast?.('İstifadəçi uğurla silindi', 'success');
            load(page);
            if (selectedUser?.id === user.id) setShowUserModal(false);
        } catch (e) {
            console.error('Delete error:', e);
            showToast?.('Silmə əməliyyatı uğursuz oldu', 'error');
        }
    };

    const saveUserChanges = async () => {
        if (!selectedUser) return;
        try {
            await api.updateUserAdmin(selectedUser.id, editData);
            setEditMode(false);
            load(page);
            showToast?.('İstifadəçi yeniləndi!', 'success');
        } catch (e) {
            showToast?.('Xəta baş verdi', 'error');
        }
    };

    const createAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createAdminUser(newAdmin);
            setShowCreateModal(false);
            setNewAdmin({ phone: '', name: '', surname: '', role: 'ADMIN' });
            load(page);
            showToast?.('Admin yaradıldı!', 'success');
        } catch (e: any) {
            showToast?.(e.message || 'Xəta baş verdi', 'error');
        }
    };

    const sendNotification = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        try {
            await api.sendNotificationToUser(selectedUser.id, notifyForm.title, notifyForm.message, notifyForm.type);
            setShowNotifyModal(false);
            setNotifyForm({ title: '', message: '', type: 'info' });
            showToast?.('Bildiriş göndərildi!', 'success');
        } catch (e) {
            showToast?.('Xəta baş verdi', 'error');
        }
    };

    const exportUsers = async (format: 'json' | 'csv') => {
        try {
            const data = await api.exportUsers(format);
            const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type: format === 'csv' ? 'text/csv' : 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `users.${format}`;
            a.click();
            showToast?.(`${format.toUpperCase()} faylı yüklənir`, 'success');
        } catch (e) {
            showToast?.('Export xətası', 'error');
        }
    };

    const filtered = users.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.phone?.includes(search) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold">İstifadəçi İdarəetməsi <span className="text-sm font-normal text-slate-400">({totalElements} istifadəçi)</span></h2>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={() => exportUsers('json')} className="flex items-center gap-1 px-3 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-sm hover:bg-slate-300">
                        <Download className="w-4 h-4" /> JSON
                    </button>
                    <button onClick={() => exportUsers('csv')} className="flex items-center gap-1 px-3 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-sm hover:bg-slate-300">
                        <Download className="w-4 h-4" /> CSV
                    </button>
                    <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                        <UserPlus className="w-4 h-4" /> Yeni Admin
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl flex gap-2 border border-slate-200 dark:border-white/10">
                <Search className="text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ad, telefon və ya email ilə axtar..." className="bg-transparent outline-none flex-1" />
            </div>

            {loading ? (
                <div className="text-center py-10 text-slate-400">Yüklənir...</div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 overflow-x-auto">
                    <table className="w-full text-sm text-left min-w-[700px]">
                        <thead className="bg-slate-50 dark:bg-white/5 uppercase text-xs text-slate-500">
                            <tr>
                                <th className="px-4 py-3">İstifadəçi</th>
                                <th className="px-4 py-3">Rol</th>
                                <th className="px-4 py-3">Balans</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Scan&Go</th>
                                <th className="px-4 py-3">Əməliyyatlar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                            {filtered.map(u => (
                                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                                    <td className="px-4 py-3">
                                        <div className="font-bold">{u.name} {u.surname}</div>
                                        <div className="text-xs text-slate-500 font-mono">{u.phone}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-600' : u.role === 'CASHIER' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>{u.role}</span>
                                    </td>
                                    <td className="px-4 py-3 font-bold text-emerald-600">{u.points}</td>
                                    <td className="px-4 py-3">
                                        <button onClick={() => toggleBlock(u)} className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold transition-colors ${u.isBlocked ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'}`}>
                                            {u.isBlocked ? <Ban className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                                            {u.isBlocked ? 'Bloklu' : 'Aktiv'}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button onClick={() => toggleScanGo(u)} className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold transition-colors ${u.isScanGoBlocked ? 'bg-red-100 text-red-500 hover:bg-red-200' : 'bg-blue-100 text-blue-500 hover:bg-blue-200'}`}>
                                            {u.isScanGoBlocked ? <Ban className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                                            {u.isScanGoBlocked ? 'Qadağan' : 'İcazəli'}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 flex gap-2">
                                        <button onClick={() => openUserDetails(u)} className="flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs hover:bg-slate-200">
                                            <Eye className="w-3 h-3" /> Ətraflı
                                        </button>
                                        <button onClick={() => deleteUser(u)} className="p-1 px-2 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200" title="Sil">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 py-4">
                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="flex items-center gap-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg disabled:opacity-50">
                        <ChevronLeft className="w-4 h-4" /> Əvvəlki
                    </button>
                    <span className="text-sm font-medium">Səhifə {page + 1} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="flex items-center gap-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg disabled:opacity-50">
                        Növbəti <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* User Details Modal */}
            {showUserModal && selectedUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowUserModal(false); setEditMode(false); }}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-800">
                            <h3 className="text-xl font-bold">İstifadəçi Detalları</h3>
                            <div className="flex gap-2">
                                <button onClick={() => deleteUser(selectedUser)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200" title="İstifadəçini Sil">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => setShowNotifyModal(true)} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200" title="Bildiriş göndər">
                                    <Send className="w-4 h-4" />
                                </button>
                                <button onClick={() => setEditMode(!editMode)} className={`p-2 rounded-lg ${editMode ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => { setShowUserModal(false); setEditMode(false); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-500">Ad</label>
                                    {editMode ? <input value={editData.name || ''} onChange={e => setEditData({ ...editData, name: e.target.value })} className="w-full p-2 border rounded-lg bg-transparent mt-1" /> : <p className="font-bold">{selectedUser.name}</p>}
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500">Soyad</label>
                                    {editMode ? <input value={editData.surname || ''} onChange={e => setEditData({ ...editData, surname: e.target.value })} className="w-full p-2 border rounded-lg bg-transparent mt-1" /> : <p className="font-bold">{selectedUser.surname || '-'}</p>}
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500">Telefon</label>
                                    <p className="font-mono">{selectedUser.phone}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500">Email</label>
                                    {editMode ? <input value={editData.email || ''} onChange={e => setEditData({ ...editData, email: e.target.value })} className="w-full p-2 border rounded-lg bg-transparent mt-1" /> : <p>{selectedUser.email || '-'}</p>}
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500">Bonus</label>
                                    {editMode ? <input type="number" value={editData.points || 0} onChange={e => setEditData({ ...editData, points: parseInt(e.target.value) })} className="w-full p-2 border rounded-lg bg-transparent mt-1" /> : <p className="text-emerald-600 font-bold">{selectedUser.points} xal</p>}
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500">Rol</label>
                                    <p><span className={`px-2 py-1 rounded text-xs font-bold ${selectedUser.role === 'ADMIN' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-600'}`}>{selectedUser.role}</span></p>
                                </div>
                            </div>

                            {editMode && (
                                <button onClick={saveUserChanges} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                                    <Save className="w-4 h-4" /> Yadda Saxla
                                </button>
                            )}

                            <div>
                                <h4 className="font-bold flex items-center gap-2 mb-3"><ShoppingBag className="w-4 h-4" /> Alış Tarixçəsi</h4>
                                {receiptsLoading ? <p className="text-slate-400 text-sm">Yüklənir...</p> : userReceipts.length === 0 ? <p className="text-slate-400 text-sm">Alış tarixçəsi yoxdur</p> : (
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {userReceipts.map((r, i) => (
                                            <ReceiptItem key={i} receipt={r} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Admin Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
                            <h3 className="text-xl font-bold">Yeni Admin Yarat</h3>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={createAdmin} className="p-6 space-y-4">
                            <div><label className="text-xs text-slate-500 block mb-1">Telefon *</label><input value={newAdmin.phone} onChange={e => setNewAdmin({ ...newAdmin, phone: e.target.value })} placeholder="0501234567" className="w-full p-3 border rounded-lg bg-transparent" required /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs text-slate-500 block mb-1">Ad</label><input value={newAdmin.name} onChange={e => setNewAdmin({ ...newAdmin, name: e.target.value })} className="w-full p-3 border rounded-lg bg-transparent" /></div>
                                <div><label className="text-xs text-slate-500 block mb-1">Soyad</label><input value={newAdmin.surname} onChange={e => setNewAdmin({ ...newAdmin, surname: e.target.value })} className="w-full p-3 border rounded-lg bg-transparent" /></div>
                            </div>
                            <div><label className="text-xs text-slate-500 block mb-1">Rol</label><select value={newAdmin.role} onChange={e => setNewAdmin({ ...newAdmin, role: e.target.value })} className="w-full p-3 border rounded-lg bg-transparent dark:bg-slate-700 dark:text-white"><option value="ADMIN">Admin</option><option value="CASHIER">Kassir</option></select></div>
                            <button type="submit" className="w-full py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold">Admin Yarat</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Send Notification Modal */}
            {showNotifyModal && selectedUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowNotifyModal(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
                            <h3 className="text-xl font-bold">Bildiriş Göndər</h3>
                            <button onClick={() => setShowNotifyModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={sendNotification} className="p-6 space-y-4">
                            <p className="text-sm text-slate-500">Alıcı: <strong>{selectedUser.name}</strong> ({selectedUser.phone})</p>
                            <div><label className="text-xs text-slate-500 block mb-1">Başlıq *</label><input value={notifyForm.title} onChange={e => setNotifyForm({ ...notifyForm, title: e.target.value })} className="w-full p-3 border rounded-lg bg-transparent" required /></div>
                            <div><label className="text-xs text-slate-500 block mb-1">Mesaj *</label><textarea value={notifyForm.message} onChange={e => setNotifyForm({ ...notifyForm, message: e.target.value })} rows={3} className="w-full p-3 border rounded-lg bg-transparent" required /></div>
                            <div><label className="text-xs text-slate-500 block mb-1">Tip</label><select value={notifyForm.type} onChange={e => setNotifyForm({ ...notifyForm, type: e.target.value })} className="w-full p-3 border rounded-lg bg-transparent dark:bg-slate-700 dark:text-white"><option value="info">Məlumat</option><option value="discount">Endirim</option><option value="warning">Xəbərdarlıq</option></select></div>
                            <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold flex items-center justify-center gap-2"><Send className="w-4 h-4" /> Göndər</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsers;

