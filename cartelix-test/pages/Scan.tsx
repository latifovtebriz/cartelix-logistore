import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GlassCard, GlassButton } from '../components/GlassComponents';
import { QrCode, X, Keyboard, CameraOff, ScanLine, Hash, Camera, RefreshCw } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { api } from '../services/api';

interface ScanProps {
  onClose: () => void;
  onScanSuccess: (type: 'product' | 'receipt' | 'pos', id: string, data?: any) => void;
  initialMode?: 'product' | 'receipt' | 'pos';
  onShowToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

// Dəstəklənən barkod formatları
const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.PDF_417,
];

/**
 * Əsas arxa kameranı seç - çoxlu kameralı telefonlarda main camera seçimi
 * Ultra-wide, macro, depth kameraları istisna edilir
 */
async function selectMainBackCamera(): Promise<{ deviceId: string; label: string } | null> {
  try {
    // Əvvəlcə icazə alaq ki cihaz adlarını görə bilək
    const tempStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    tempStream.getTracks().forEach(track => track.stop());

    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === 'videoinput' && d.deviceId);

    console.log('Tapılan kameralar:', videoDevices.map(d => ({ id: d.deviceId, label: d.label })));

    // 1. Əsas arxa kameranı tap (ultra-wide, macro, depth istisna)
    const backCameras = videoDevices.filter(d => {
      const label = d.label.toLowerCase();
      const isBack = label.includes('back') || label.includes('environment') ||
        label.includes('rear') || label.includes('arxa') || label.includes('0,');
      const isUnwanted = label.includes('wide') || label.includes('ultra') ||
        label.includes('macro') || label.includes('depth') ||
        label.includes('tele') || label.includes('front') ||
        label.includes('selfie') || label.includes('ön');
      return isBack && !isUnwanted;
    });

    if (backCameras.length > 0) {
      // Ən qısa adlı olanı seç (adətən əsas kamera)
      const mainBack = backCameras.reduce((prev, curr) =>
        prev.label.length <= curr.label.length ? prev : curr
      );
      console.log('Seçilən arxa kamera:', mainBack.label);
      return { deviceId: mainBack.deviceId, label: mainBack.label };
    }

    // 2. "main" və ya "camera 0" axtaraq
    const mainCamera = videoDevices.find(d => {
      const label = d.label.toLowerCase();
      return (label.includes('main') || label.includes('camera 0') || label.includes('camera0')) &&
        !label.includes('front');
    });
    if (mainCamera) {
      console.log('Main camera tapıldı:', mainCamera.label);
      return { deviceId: mainCamera.deviceId, label: mainCamera.label };
    }

    // 3. İstənilən arxa kamera
    const anyBack = videoDevices.find(d => {
      const label = d.label.toLowerCase();
      return !label.includes('front') && !label.includes('selfie') && !label.includes('ön');
    });
    if (anyBack) {
      console.log('Alternativ arxa kamera:', anyBack.label);
      return { deviceId: anyBack.deviceId, label: anyBack.label };
    }

    // 4. Heç nə tapılmadı - ilk kameranı istifadə et
    if (videoDevices.length > 0) {
      console.log('Default kamera istifadə olunur:', videoDevices[0].label);
      return { deviceId: videoDevices[0].deviceId, label: videoDevices[0].label };
    }

    return null;
  } catch (error) {
    console.error('Kamera seçimində xəta:', error);
    return null;
  }
}

const Scan: React.FC<ScanProps> = ({ onClose, onScanSuccess, initialMode, onShowToast }) => {
  const [mode, setMode] = useState<'product' | 'receipt' | 'pos'>(initialMode || 'product');
  const [inputMethod, setInputMethod] = useState<'camera' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [cameraReady, setCameraReady] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<string>('');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const scannerContainerId = 'qr-scanner-container';
  const isProcessingRef = useRef(false);
  const lastScanTimeRef = useRef<number>(0);

  // Scanner cleanup - kamera track-lərini də dayandır
  const stopScanner = useCallback(async () => {
    console.log('stopScanner çağırıldı');

    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        console.log('Scanner state:', state);
        if (state === 2) { // SCANNING state
          await scannerRef.current.stop();
          console.log('Scanner dayandırıldı');
        }
        scannerRef.current.clear();
      } catch (e) {
        console.log('Scanner stop error (ignorable):', e);
      }
      scannerRef.current = null;
    }

    // Bütün aktiv video track-ləri dayandır (əlavə təhlükəsizlik)
    try {
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach(video => {
        if (video.srcObject) {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach(track => {
            track.stop();
            console.log('Video track dayandırıldı:', track.label);
          });
          video.srcObject = null;
        }
      });
    } catch (e) {
      console.log('Video cleanup error:', e);
    }

    setCameraReady(false);
  }, []);

  const handleProcess = useCallback(async (scanType: string, code: string) => {
    if (!code.trim() || isProcessingRef.current) return;

    isProcessingRef.current = true;
    setLoading(true);

    try {
      if (scanType === 'receipt') {
        const user = await api.getCurrentUser();
        if (!user) {
          if (onShowToast) onShowToast('error', "Giriş edin");
          onClose();
          return;
        }

        // Base64 encoded QR data yoxla
        let processedCode = code;
        try {
          const decoded = atob(code);
          const qrData = JSON.parse(decoded);
          if (qrData.transactionId) {
            processedCode = qrData.transactionId;
          }
        } catch {
          // Base64 deyil, kodu birbaşa istifadə et
        }

        // Əvvəlcə status yoxla
        try {
          const status = await api.getReceiptClaimStatus(processedCode);
          if (status.claimed) {
            if (onShowToast) onShowToast('info', 'Bu çek artıq tələb olunub');
            return;
          }
        } catch {
          // Status yoxlanışı uğursuz, davam et
        }

        const res = await api.processPhysicalReceipt(processedCode, user.id);
        if (res.success) {
          if (onShowToast) onShowToast('success', 'Çek uğurla əlavə olundu!');
          onScanSuccess('receipt', processedCode, res.receipt);
        } else {
          if (onShowToast) onShowToast('error', res.message || "Çek tapılmadı");
        }
      } else if (scanType === 'pos') {
        if (onShowToast) onShowToast('success', 'POS terminal tapıldı!');
        onScanSuccess('pos', code);
      } else {
        // Product barcode - backend-ə göndər
        if (onShowToast) onShowToast('success', `Barkod oxundu: ${code}`);
        onScanSuccess('product', code);
      }
    } catch (e: any) {
      console.error('Process xətası:', e);
      if (onShowToast) onShowToast('error', "Xəta: " + (e.message || "Bilinməyən xəta"));
    } finally {
      setLoading(false);
      setManualCode('');
      isProcessingRef.current = false;
    }
  }, [onClose, onShowToast, onScanSuccess]);

  // Start camera scanner
  const startScanner = useCallback(async () => {
    if (inputMethod !== 'camera' || !scanning) return;

    try {
      await stopScanner();

      // Container hazır olana qədər gözlə
      await new Promise(resolve => setTimeout(resolve, 100));

      const container = document.getElementById(scannerContainerId);
      if (!container) {
        console.error('Scanner container tapılmadı');
        return;
      }

      const cameraInfo = await selectMainBackCamera();

      scannerRef.current = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: SUPPORTED_FORMATS,
        verbose: false
      });

      const config = {
        fps: 30, // Increased FPS for faster scanning
        qrbox: { width: 300, height: 200 }, // Wider box for barcodes
        aspectRatio: 1.0,
        disableFlip: false,
        verbose: false,
      };

      const onScanSuccessCallback = (decodedText: string) => {
        // Debounce
        const now = Date.now();
        if (decodedText === lastScannedCode && now - lastScanTimeRef.current < 2000) {
          return;
        }

        if (isProcessingRef.current) return;

        // Beep sound effect (optional, simple feedback)
        // const audio = new Audio('/beep.mp3'); audio.play().catch(e => {});

        console.log('Kod oxundu:', decodedText);
        lastScanTimeRef.current = now;

        // Haptic feedback if available
        if (navigator.vibrate) navigator.vibrate(50);

        setLastScannedCode(decodedText);
        handleProcess(mode, decodedText);
      };

      const onScanFailure = (err: any) => {
        // Ignore errors, just noise
      };

      if (cameraInfo?.deviceId) {
        await scannerRef.current.start(
          cameraInfo.deviceId,
          config,
          onScanSuccessCallback,
          onScanFailure
        );
        setSelectedCamera(cameraInfo.label);
      } else {
        // facingMode ilə başlat
        await scannerRef.current.start(
          { facingMode: 'environment' },
          config,
          onScanSuccessCallback,
          onScanFailure
        );
        setSelectedCamera('Arxa Kamera');
      }

      setCameraReady(true);
      setCameraError(null);

    } catch (error: any) {
      console.error('Kamera başladıla bilmədi:', error);
      if (error.message?.includes('Permission')) {
        setCameraError('Kamera icazəsi verilmədi. Brauzer parametrlərindən icazə verin.');
      } else if (error.message?.includes('NotFound') || error.message?.includes('not found')) {
        setCameraError('Kamera tapılmadı. Cihazınızda kamera olduğundan əmin olun.');
      } else {
        setCameraError('Kamera açıla bilmədi: ' + (error.message || 'Bilinməyən xəta'));
      }
    }
  }, [inputMethod, scanning, mode, lastScannedCode, stopScanner, handleProcess]);

  // Mode dəyişdikdə scanner-i yenidən başlat
  useEffect(() => {
    if (inputMethod === 'camera' && scanning) {
      // Kiçik gecikmə ilə başlat
      const timer = setTimeout(() => {
        startScanner();
      }, 200);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [inputMethod, scanning, startScanner, stopScanner]);

  // Handle visibility change and navigation (when user switches tabs or goes back)
  useEffect(() => {
    const handleInactivity = () => {
      if (document.hidden) {
        stopScanner();
      } else {
        // Optional: Resume scanning when returning?
        // For now, let's keep it stopped or require user interaction to restart if desired,
        // but typically users expect it to resume or stay off. 
        // Let's just stop it to be safe as requested "baglansa".
        // If we want to resume: setScanning(true) etc.
      }
    };

    const handlePopState = () => {
      stopScanner();
    };

    document.addEventListener("visibilitychange", handleInactivity);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("visibilitychange", handleInactivity);
      window.removeEventListener("popstate", handlePopState);
      stopScanner();
    };
  }, [stopScanner]);

  // Manual input focus
  useEffect(() => {
    if (inputMethod === 'manual') {
      setTimeout(() => manualInputRef.current?.focus(), 100);
    }
  }, [inputMethod]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleProcess(mode, manualCode.trim());
    }
  };

  const retryCamera = async () => {
    setCameraError(null);
    setScanning(true);
    await startScanner();
  };

  const getModeConfig = () => {
    switch (mode) {
      case 'product':
        return {
          label: 'Məhsul',
          placeholder: 'Barkod nömrəsi (məs: 8690526093458)',
          instruction: 'Məhsul barkodunu kameraya tutun',
          color: 'emerald'
        };
      case 'receipt':
        return {
          label: 'Çek / QR',
          placeholder: 'Fiscal ID (məs: FIS-20231213-001234)',
          instruction: 'Çek QR kodunu kameraya tutun',
          color: 'indigo'
        };
      case 'pos':
        return {
          label: 'POS Terminal',
          placeholder: 'POS kodu',
          instruction: 'POS QR kodunu kameraya tutun',
          color: 'amber'
        };
    }
  };

  const config = getModeConfig();

  return (
    <div className="fixed top-0 left-0 right-0 bottom-[90px] z-40 bg-[#0f172a] flex flex-col rounded-b-3xl overflow-hidden shadow-2xl border-b border-white/10">
      {/* Camera View */}
      {inputMethod === 'camera' && (
        <div className="relative flex-1 bg-black flex items-center justify-center">
          {cameraError ? (
            <div className="flex flex-col items-center justify-center h-full text-white gap-4 p-6">
              <CameraOff size={48} className="text-red-400" />
              <p className="text-center">{cameraError}</p>
              <button
                onClick={retryCamera}
                className="px-6 py-3 bg-blue-600 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition"
              >
                <RefreshCw className="w-5 h-5" />
                Yenidən cəhd et
              </button>
            </div>
          ) : (
            <>
              {/* Scanner Container */}
              <div
                id={scannerContainerId}
                className="w-full h-full"
                style={{ minHeight: '300px' }}
              />

              {/* Overlay */}
              <div className="absolute inset-0 pointer-events-none flex flex-col">
                {/* Top bar */}
                <div className="flex justify-between w-full p-4 pointer-events-auto">
                  <div className={`backdrop-blur px-3 py-1.5 rounded-full text-white text-xs border border-white/20 bg-${config.color}-600/70 flex items-center gap-2`}>
                    <Camera className="w-3 h-3" />
                    {config.label}
                    {selectedCamera && <span className="opacity-70">• {selectedCamera.substring(0, 15)}</span>}
                  </div>
                  <button onClick={onClose} className="bg-black/50 p-2 rounded-full text-white hover:bg-black/70 transition">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Center instruction */}
                <div className="flex-1 flex items-center justify-center">
                  {loading ? (
                    <div className="bg-black/70 px-6 py-4 rounded-2xl">
                      <div className="text-white font-bold animate-pulse flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Emal edilir...
                      </div>
                    </div>
                  ) : !cameraReady ? (
                    <div className="bg-black/70 px-6 py-4 rounded-2xl">
                      <div className="text-white flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Kamera açılır...
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Bottom instruction */}
                <div className="p-4 text-center">
                  <div className="bg-black/50 backdrop-blur px-4 py-2 rounded-full inline-block">
                    <span className="text-white/80 text-sm">{config.instruction}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Manual Input View */}
      {inputMethod === 'manual' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 relative">
          <div className="flex justify-between w-full absolute top-6 px-4 z-20">
            <div className={`px-3 py-1 rounded-full text-white text-xs border border-white/20 bg-${config.color}-600`}>
              {config.label} - Əl ilə
            </div>
            <button onClick={onClose} className="bg-white/10 p-2 rounded-full text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="w-full max-w-md">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/10 flex items-center justify-center">
              <Hash className="w-10 h-10 text-white/60" />
            </div>

            <h2 className="text-white text-xl font-bold text-center mb-2">
              {mode === 'product' ? 'Barkod Daxil Et' : mode === 'receipt' ? 'Fiscal ID Daxil Et' : 'POS Kodu'}
            </h2>
            <p className="text-white/50 text-sm text-center mb-6">
              {mode === 'receipt' ? 'Çekin üzərindəki Fiscal ID-ni daxil edin' : 'Kodu əl ilə daxil edin'}
            </p>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <input
                ref={manualInputRef}
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder={config.placeholder}
                className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white text-center text-lg focus:outline-none focus:border-white/50 placeholder:text-white/30"
              />
              <button
                type="submit"
                disabled={loading || !manualCode.trim()}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl text-white font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Yoxlanılır...
                  </>
                ) : (
                  'Təsdiqlə'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer Controls - Floating above Navbar */}
      <div className="fixed bottom-24 left-0 right-0 z-40 px-4">
        <div className="max-w-md mx-auto space-y-3 bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-white/20 dark:border-white/10">
          {/* Mode Select */}
          <div className="flex bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl">
            <button onClick={() => setMode('product')} className={`flex-1 py-3 rounded-xl text-xs font-bold transition flex justify-center gap-2 ${mode === 'product' ? 'bg-emerald-600 text-white shadow' : 'text-slate-600 dark:text-white/60'}`}>Məhsul</button>
            <button onClick={() => setMode('receipt')} className={`flex-1 py-3 rounded-xl text-xs font-bold transition flex justify-center gap-2 ${mode === 'receipt' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 dark:text-white/60'}`}>Çek / QR</button>
            <button onClick={() => setMode('pos')} className={`flex-1 py-3 rounded-xl text-xs font-bold transition flex justify-center gap-2 ${mode === 'pos' ? 'bg-amber-600 text-white shadow' : 'text-slate-600 dark:text-white/60'}`}>POS</button>
          </div>

          {/* Input Method */}
          <div className="flex gap-3">
            <button onClick={() => setInputMethod('camera')} className={`flex-1 p-3.5 rounded-2xl flex justify-center gap-2 transition ${inputMethod === 'camera' ? 'bg-emerald-600 text-white font-bold shadow' : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white'}`}><QrCode className="w-5 h-5" /> Kamera</button>
            <button onClick={() => setInputMethod('manual')} className={`flex-1 p-3.5 rounded-2xl flex justify-center gap-2 transition ${inputMethod === 'manual' ? 'bg-emerald-600 text-white font-bold shadow' : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white'}`}><Keyboard className="w-5 h-5" /> Əl ilə</button>
          </div>
        </div>
      </div>

      {/* Navbar Background for Clean Look - Gradient Fade */}
      <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent dark:from-[#0f172a] dark:via-[#0f172a] dark:to-transparent z-20 pointer-events-none" />
    </div>
  );
};

export default Scan;
