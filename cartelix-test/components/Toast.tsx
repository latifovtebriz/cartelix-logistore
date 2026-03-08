import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
    id: string;
    type: ToastType;
    message: string;
}

interface ToastProps {
    toast: ToastMessage;
    onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(toast.id);
        }, 4000);
        return () => clearTimeout(timer);
    }, [toast.id, onClose]);

    const bgColors = {
        success: 'bg-emerald-500',
        error: 'bg-red-500',
        info: 'bg-blue-500'
    };

    const icons = {
        success: <CheckCircle className="w-5 h-5 text-white" />,
        error: <AlertCircle className="w-5 h-5 text-white" />,
        info: <Info className="w-5 h-5 text-white" />
    };

    return (
        <div className={`flex items-center gap-3 p-4 rounded-xl shadow-lg shadow-black/5 transform transition-all duration-300 animate-slide-in ${bgColors[toast.type]} backdrop-blur-md bg-opacity-90`}>
            {icons[toast.type]}
            <p className="text-white text-sm font-medium">{toast.message}</p>
            <button onClick={() => onClose(toast.id)} className="ml-2 text-white/50 hover:text-white transition">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

export const ToastContainer: React.FC<{ toasts: ToastMessage[]; onClose: (id: string) => void }> = ({ toasts, onClose }) => {
    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
            {toasts.map(t => (
                <div key={t.id} className="pointer-events-auto w-full">
                    <Toast toast={t} onClose={onClose} />
                </div>
            ))}
        </div>
    );
};
