import React, { useState, useEffect, useRef } from 'react';
import { Camera, User, Trash2, Zap, Bell, X, LogOut, CheckCircle, Store, Barcode, Plus, Minus, QrCode, CreditCard, Banknote } from 'lucide-react';
import { Product } from '../types';
import { api } from '../services/api';
import { ManualInput } from '../components/ManualInput';

interface Props {
    onLogout: () => void;
    cashierId: string;
}

interface CartItem {
    product: Product;
    quantity: number;
}

interface CustomerInfo {
    id: string;
    name: string;
    surname?: string;
    phone: string;
    points: number;
    physicalPurchases: number;
    barcode: string;
}

interface MarketInfo {
    id: number;
    name: string;
    location: string;
}

type ScanMode = 'product' | 'customer';

export default function CashierDashboard({ onLogout, cashierId }: Props) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isManualInputOpen, setIsManualInputOpen] = useState(false);
    const [isCustomerScanOpen, setIsCustomerScanOpen] = useState(false); // legacy modal (kept for fallback)
    const [currentCustomer, setCurrentCustomer] = useState<CustomerInfo | null>(null);
    const [market, setMarket] = useState<MarketInfo | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CARD');
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastReceipt, setLastReceipt] = useState<any>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [scanMode, setScanMode] = useState<ScanMode>('product');
    const [scanError, setScanError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scanLoopRef = useRef<number | null>(null);

    // Load market info on mount
    useEffect(() => {
        loadMarketInfo();
    }, []);

    const loadMarketInfo = async () => {
        try {
            const data = await api.getCashierMarket(cashierId);
            if (data.market) {
                setMarket(data.market);
            }
        } catch (e) {
            console.error('Error loading market:', e);
        }
    };

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // Camera lifecycle
    useEffect(() => {
        if (!isCameraOpen) {
            stopCamera();
            return;
        }
        startCamera();
        return () => stopCamera();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCameraOpen, scanMode]);

    const showToast = (message: string, type: 'success' | 'info' | 'error') => {
        setToast({ message, type });
    };

    const addToCart = async (barcode: string) => {
        try {
            const product = await api.getProductByBarcode(barcode);
            if (product) {
                setCart(prev => {
                    const existing = prev.find(item => item.product.id === product.id);
                    if (existing) {
                        return prev.map(item =>
                            item.product.id === product.id
                                ? { ...item, quantity: item.quantity + 1 }
                                : item
                        );
                    }
                    return [...prev, { product, quantity: 1 }];
                });
                showToast(`${product.name} əlavə edildi`, 'success');
            } else {
                showToast('Məhsul tapılmadı', 'error');
            }
        } catch (e) {
            showToast('Məhsul yüklənərkən xəta baş verdi', 'error');
        }
    };

    const handleScanResult = (code: string) => {
        if (!code) return;
        if (scanMode === 'product') {
            addToCart(code);
        } else {
            scanCustomer(code);
        }
        setIsCameraOpen(false);
    };

    const startCamera = async () => {
        setScanError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            // Try BarcodeDetector if available
            // @ts-ignore
            const Detector = (window as any).BarcodeDetector;
            if (Detector) {
                const detector = new Detector({ formats: ['qr_code', 'code_128', 'ean_13', 'ean_8'] });
                const tick = async () => {
                    if (!videoRef.current) return;
                    try {
                        const codes = await detector.detect(videoRef.current);
                        if (codes && codes.length > 0) {
                            handleScanResult(codes[0].rawValue || codes[0].rawData?.toString() || '');
                            return;
                        }
                    } catch (e) {
                        // ignore detector errors, keep scanning
                    }
                    scanLoopRef.current = requestAnimationFrame(tick);
                };
                scanLoopRef.current = requestAnimationFrame(tick);
            } else {
                setScanError('BarcodeDetector dəstəklənmir. Manual və ya başqa brauzer sınayın.');
            }
        } catch (e: any) {
            console.error(e);
            setScanError('Kamera açılmadı. İcazələri yoxlayın və ya manual daxil edin.');
        }
    };

    const stopCamera = () => {
        if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
        scanLoopRef.current = null;
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    const scanCustomer = async (barcode: string) => {
        try {
            const customer = await api.lookupCustomerByBarcode(barcode);
            setCurrentCustomer(customer);
            setIsCustomerScanOpen(false);
            showToast(`${customer.name} bağlandı`, 'success');
        } catch (e) {
            showToast('Müştəri tapılmadı', 'error');
        }
    };

    const updateQuantity = (productId: number, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const removeFromCart = (id: number) => {
        setCart(prev => prev.filter(item => item.product.id !== id));
    };

    const clearCart = () => {
        setCart([]);
        setCurrentCustomer(null);
        setLastReceipt(null);
    };

    const total = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

    const handleCheckout = async () => {
        if (cart.length === 0) {
            showToast('Səbət boşdur', 'error');
            return;
        }

        setIsProcessing(true);
        try {
            const result = await api.cashierCheckout(cashierId, {
                customerId: currentCustomer?.id,
                items: cart.map(item => ({
                    productId: item.product.id,
                    quantity: item.quantity
                })),
                paymentMethod
            });

            setLastReceipt(result);
            showToast(`Ödəniş uğurla tamamlandı! Qəbz: ${result.fiscalId}`, 'success');
            setIsPaymentModalOpen(false);

            // Clear after short delay
            setTimeout(() => {
                setCart([]);
                setCurrentCustomer(null);
            }, 3000);

        } catch (e: any) {
            showToast(e.message || 'Ödəniş xətası', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex h-screen bg-[#0f111a] text-white overflow-hidden">

            {/* LEFT: Camera & Input Area */}
            <div className="w-1/2 p-6 flex flex-col gap-6 border-r border-white/5 bg-gradient-to-br from-[#13151f] to-[#0f111a]">

                {/* Header with Market Info */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-white/90">Kassir Paneli</h1>
                        {market && (
                            <div className="flex items-center gap-2 text-sm text-white/50 mt-1">
                                <Store size={14} />
                                <span>{market.name}</span>
                                <span className="text-white/30">•</span>
                                <span>{market.location}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-xl text-sm font-mono flex items-center gap-2">
                            <Zap size={16} /> Online
                        </div>
                        <button onClick={onLogout} className="p-2 hover:bg-white/10 rounded-lg text-red-400" title="Çıxış">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>

                {/* Camera Viewport / Scanner */}
                <div className="flex-1 bg-black/40 rounded-3xl border border-white/10 relative overflow-hidden group">
                    {isCameraOpen ? (
                        <>
                            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                            <div className="absolute inset-0 pointer-events-none border-4 border-emerald-500/40 rounded-3xl" />
                            <div className="absolute top-4 left-4 bg-black/60 text-white text-xs px-3 py-2 rounded-full">{scanMode === 'product' ? 'Məhsul skanı' : 'Bonus kart skanı'}</div>
                            {scanError && <div className="absolute bottom-4 left-4 right-4 bg-red-500/80 text-white text-xs px-3 py-2 rounded-lg">{scanError}</div>}
                            <button
                                onClick={() => setIsCameraOpen(false)}
                                className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full"
                            >
                                <X size={16} />
                            </button>
                        </>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30">
                            <Camera size={64} className="mb-4 opacity-50" />
                            <p>Barkod / QR skanı</p>
                            <p className="text-xs mt-2">Kamera ilə oxutmaq üçün aşağıdan seçim edin</p>
                        </div>
                    )}

                    {/* Overlay Corner Markers */}
                    <div className="absolute top-8 left-8 w-16 h-16 border-t-4 border-l-4 border-blue-500/50 rounded-tl-3xl" />
                    <div className="absolute top-8 right-8 w-16 h-16 border-t-4 border-r-4 border-blue-500/50 rounded-tr-3xl" />
                    <div className="absolute bottom-8 left-8 w-16 h-16 border-b-4 border-l-4 border-blue-500/50 rounded-bl-3xl" />
                    <div className="absolute bottom-8 right-8 w-16 h-16 border-b-4 border-r-4 border-blue-500/50 rounded-br-3xl" />

                    {/* Floating Action Buttons */}
                    <div className="absolute bottom-6 right-6 flex flex-col gap-3">
                        <button
                            onClick={() => { setScanMode('product'); setIsCameraOpen(true); }}
                            className="bg-emerald-600 hover:bg-emerald-500 p-4 rounded-full shadow-lg shadow-emerald-500/30 transition-transform hover:scale-105 active:scale-95 flex items-center gap-2"
                        >
                            <Barcode size={22} />
                            <span className="text-sm font-semibold">Məhsul</span>
                        </button>
                        <button
                            onClick={() => { setScanMode('customer'); setIsCameraOpen(true); }}
                            className="bg-blue-600 hover:bg-blue-500 p-4 rounded-full shadow-lg shadow-blue-500/30 transition-transform hover:scale-105 active:scale-95 flex items-center gap-2"
                        >
                            <QrCode size={20} />
                            <span className="text-sm font-semibold">Bonus kart</span>
                        </button>
                        <button
                            onClick={() => setIsManualInputOpen(true)}
                            className="bg-white/10 hover:bg-white/20 p-4 rounded-full shadow-lg shadow-white/10 transition-transform hover:scale-105 active:scale-95"
                        >
                            <span className="text-sm font-semibold">Manual</span>
                        </button>
                        <button
                            onClick={() => { setScanMode('product'); handleScanResult('47600022'); }}
                            className="bg-white/10 hover:bg-white/20 p-3 rounded-full text-xs text-white/70"
                        >
                            Demo Məhsul (Snickers)
                        </button>
                        <button
                            onClick={() => { setScanMode('customer'); handleScanResult('0504350284'); }}
                            className="bg-white/10 hover:bg-white/20 p-3 rounded-full text-xs text-white/70"
                        >
                            Demo Kart (0504350284)
                        </button>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => { setScanMode('customer'); setIsCameraOpen(true); }}
                        className="bg-white/5 hover:bg-white/10 p-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
                    >
                        <User size={20} className="text-purple-400" /> Müştəri Kartı
                    </button>
                    <button
                        onClick={clearCart}
                        className="bg-white/5 hover:bg-red-500/20 p-4 rounded-2xl flex items-center justify-center gap-2 transition-colors text-red-400"
                    >
                        <Trash2 size={20} /> Təmizlə
                    </button>
                </div>
            </div>

            {/* RIGHT: Transaction List & Output */}
            <div className="w-1/2 bg-[#1a1c2e]/50 backdrop-blur-3xl flex flex-col relative">

                {/* Toast Notification */}
                {toast && (
                    <div className="absolute top-6 left-6 right-6 z-50 animate-in slide-in-from-top-4 fade-in">
                        <div className={`
                            p-4 rounded-2xl flex items-center justify-between shadow-2xl border
                            ${toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-100' :
                                toast.type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-100' :
                                    'bg-blue-500/20 border-blue-500/30 text-blue-100'}
                        `}>
                            <div className="flex items-center gap-3">
                                {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
                                {toast.type === 'error' && <X className="w-5 h-5" />}
                                {toast.type === 'info' && <Bell className="w-5 h-5" />}
                                <span className="font-medium">{toast.message}</span>
                            </div>
                            <button onClick={() => setToast(null)}><X size={18} className="opacity-50 hover:opacity-100" /></button>
                        </div>
                    </div>
                )}

                {/* User Card */}
                {currentCustomer ? (
                    <div className="m-6 p-6 bg-purple-500/10 border border-purple-500/20 rounded-3xl flex items-center gap-4">
                        <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center text-2xl font-bold">
                            {currentCustomer.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-white">{currentCustomer.name} {currentCustomer.surname}</h3>
                            <p className="text-purple-300">{currentCustomer.points} puan • {currentCustomer.physicalPurchases} fiziki alış</p>
                            <p className="text-xs text-white/50">{currentCustomer.phone}</p>
                        </div>
                        <button
                            onClick={() => setCurrentCustomer(null)}
                            className="p-2 hover:bg-white/10 rounded-full"
                        >
                            <X size={20} />
                        </button>
                    </div>
                ) : (
                    <div className="m-6 p-6 bg-white/5 border border-dashed border-white/10 rounded-3xl flex items-center justify-center text-white/30 cursor-pointer hover:bg-white/10 transition"
                        onClick={() => setIsCustomerScanOpen(true)}>
                        <User size={20} className="mr-2" /> Müştəri skan edilməyib (klik edin)
                    </div>
                )}

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto px-6 pb-4">
                    <div className="space-y-3">
                        {cart.map((item, idx) => (
                            <div key={idx} className="bg-white/5 hover:bg-white/10 transition-colors p-4 rounded-2xl flex items-center gap-4 group">
                                <img
                                    src={item.product.image || '/placeholder.png'}
                                    alt={item.product.name}
                                    className="w-12 h-12 bg-white/10 rounded-xl object-cover"
                                />
                                <div className="flex-1">
                                    <h4 className="font-medium">{item.product.name}</h4>
                                    <p className="text-sm text-white/50">{item.product.barcode}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => updateQuantity(item.product.id, -1)}
                                        className="p-1 bg-white/10 rounded hover:bg-white/20"
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <span className="w-8 text-center">{item.quantity}</span>
                                    <button
                                        onClick={() => updateQuantity(item.product.id, 1)}
                                        className="p-1 bg-white/10 rounded hover:bg-white/20"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                                <div className="text-right min-w-[80px]">
                                    <div className="font-bold">{(item.product.price * item.quantity).toFixed(2)} ₼</div>
                                    <div className="text-xs text-white/40">{item.product.price.toFixed(2)} ₼/ədəd</div>
                                </div>
                                <button
                                    onClick={() => removeFromCart(item.product.id)}
                                    className="p-2 bg-red-500/10 text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                        {cart.length === 0 && (
                            <div className="text-center text-white/30 py-12">
                                Səbət boşdur
                            </div>
                        )}
                    </div>
                </div>

                {/* Last Receipt Info */}
                {lastReceipt && (
                    <div className="mx-6 mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-3">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-emerald-400 font-bold">Son Qəbz: {lastReceipt.fiscalId}</p>
                                <p className="text-xs text-white/50">Cəm: {lastReceipt.total?.toFixed(2)} ₼ • {lastReceipt.itemCount} məhsul</p>
                            </div>
                            {lastReceipt.earnedPoints > 0 && (
                                <div className="text-right">
                                    <p className="text-yellow-400 font-bold">+{lastReceipt.earnedPoints} puan</p>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-white/70">
                            <div className="flex justify-between bg-white/5 rounded-lg px-3 py-2">
                                <span>Əsas cəm</span><span>{lastReceipt.originalTotal?.toFixed(2)} ₼</span>
                            </div>
                            <div className="flex justify-between bg-white/5 rounded-lg px-3 py-2 text-emerald-300">
                                <span>Endirim</span><span>-{(lastReceipt.discountTotal || 0).toFixed(2)} ₼</span>
                            </div>
                            <div className="flex justify-between bg-white/5 rounded-lg px-3 py-2">
                                <span>Kart/Nəğd</span><span>{(lastReceipt.cardSpent || lastReceipt.total).toFixed(2)} ₼</span>
                            </div>
                            <div className="flex justify-between bg-white/5 rounded-lg px-3 py-2 text-amber-300">
                                <span>Bonus</span><span>-{(lastReceipt.bonusSpent || 0).toFixed(2)} ₼</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-white/60">
                            <span>POS: {lastReceipt.posDeviceCode || '—'}</span>
                            <div className="flex items-center gap-2">
                                <span>QR: {lastReceipt.physicalQrString || '—'}</span>
                                {lastReceipt.physicalQrString && (
                                    <button
                                        onClick={() => navigator.clipboard?.writeText(lastReceipt.physicalQrString)}
                                        className="text-emerald-300 hover:text-emerald-100 text-[11px] underline"
                                    >
                                        Kopyala
                                    </button>
                                )}
                            </div>
                        </div>
                        {lastReceipt.physicalQrString && (
                            <div className="flex items-center gap-4 pt-2">
                                <img
                                    alt="Receipt QR"
                                    className="w-28 h-28 bg-white rounded-xl p-2"
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(lastReceipt.physicalQrString)}`}
                                />
                                <div className="text-xs text-white/70 space-y-1">
                                    <p>Alıcı tətbiqdə bu QR-ni skan edib qəbzi öz hesabına yaza bilər.</p>
                                    <p className="text-white/50">Offline əvəzləmə üçün QR dəyəri: {lastReceipt.physicalQrString}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer / Calculation */}
                <div className="p-6 bg-[#0f111a]/50 border-t border-white/5 backdrop-blur-xl">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <span className="text-white/60">Cəmi Məbləğ</span>
                            <p className="text-xs text-white/40">{cart.length} məhsul, {cart.reduce((a, i) => a + i.quantity, 0)} ədəd</p>
                        </div>
                        <span className="text-4xl font-bold text-emerald-400">{total.toFixed(2)} ₼</span>
                    </div>

                    <button
                        onClick={() => setIsPaymentModalOpen(true)}
                        disabled={cart.length === 0}
                        className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                    >
                        Ödənişi Tamamla
                    </button>
                </div>
            </div>

            {/* Manual Barcode Input Modal */}
            <ManualInput
                isOpen={isManualInputOpen}
                onClose={() => setIsManualInputOpen(false)}
                onSubmit={(code) => {
                    if (scanMode === 'product') {
                        addToCart(code);
                    } else {
                        scanCustomer(code);
                    }
                    setIsManualInputOpen(false);
                }}
            />

            {/* Customer Scan Modal */}
            {isCustomerScanOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-[#1a1c2e] p-6 rounded-3xl w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Müştəri Kartı</h3>
                            <button onClick={() => setIsCustomerScanOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-white/50 mb-4">LogiStore Plus kartın barkodunu daxil edin:</p>
                        <input
                            type="text"
                            autoFocus
                            placeholder="Barkod..."
                            className="w-full p-4 bg-white/5 border border-white/10 rounded-xl mb-4 text-white"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    scanCustomer((e.target as HTMLInputElement).value);
                                }
                            }}
                        />
                        <button
                            onClick={() => {
                                const input = document.querySelector('input[placeholder="Barkod..."]') as HTMLInputElement;
                                if (input?.value) scanCustomer(input.value);
                            }}
                            className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold"
                        >
                            Müştərini Bağla
                        </button>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-[#1a1c2e] p-6 rounded-3xl w-full max-w-md">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">Ödəniş Növü</h3>
                            <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="text-center mb-6">
                            <p className="text-4xl font-bold text-emerald-400">{total.toFixed(2)} ₼</p>
                            {currentCustomer && (
                                <p className="text-sm text-white/50 mt-2">Müştəri: {currentCustomer.name}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <button
                                onClick={() => setPaymentMethod('CASH')}
                                className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-2 transition ${paymentMethod === 'CASH'
                                    ? 'border-emerald-500 bg-emerald-500/20'
                                    : 'border-white/10 hover:border-white/30'
                                    }`}
                            >
                                <Banknote size={32} className={paymentMethod === 'CASH' ? 'text-emerald-400' : 'text-white/50'} />
                                <span className="font-bold">Nağd</span>
                            </button>
                            <button
                                onClick={() => setPaymentMethod('CARD')}
                                className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-2 transition ${paymentMethod === 'CARD'
                                    ? 'border-blue-500 bg-blue-500/20'
                                    : 'border-white/10 hover:border-white/30'
                                    }`}
                            >
                                <CreditCard size={32} className={paymentMethod === 'CARD' ? 'text-blue-400' : 'text-white/50'} />
                                <span className="font-bold">Kart</span>
                            </button>
                        </div>

                        <button
                            onClick={handleCheckout}
                            disabled={isProcessing}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 rounded-xl font-bold text-lg flex items-center justify-center gap-2"
                        >
                            {isProcessing ? (
                                <>Emal olunur...</>
                            ) : (
                                <>
                                    <CheckCircle size={20} />
                                    Ödənişi Təsdiqlə
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}