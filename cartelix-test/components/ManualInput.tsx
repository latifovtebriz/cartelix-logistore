import React, { useState } from 'react';
import { X, ArrowRight, Keyboard } from 'lucide-react';

interface ManualInputProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (barcode: string) => void;
}

export const ManualInput: React.FC<ManualInputProps> = ({ isOpen, onClose, onSubmit }) => {
    const [code, setCode] = useState('');

    if (!isOpen) return null;

    const handleNumberClick = (num: string) => {
        if (code.length < 13) {
            setCode(prev => prev + num);
        }
    };

    const handleBackspace = () => {
        setCode(prev => prev.slice(0, -1));
    };

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (code.length > 0) {
            onSubmit(code);
            setCode('');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-[#1a1c2e]/90 border border-white/10 rounded-3xl p-6 shadow-2xl relative">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Keyboard className="w-5 h-5 text-blue-400" />
                        Manual Giriş
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Display */}
                <div className="bg-black/40 h-16 rounded-2xl mb-6 flex items-center justify-center border border-white/5 shadow-inner">
                    <span className={`text-3xl font-mono tracking-widest ${code ? 'text-white' : 'text-white/20'}`}>
                        {code || '00000000'}
                    </span>
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                            key={num}
                            onClick={() => handleNumberClick(num.toString())}
                            className="h-14 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-white text-xl font-bold transition-all border border-white/5"
                        >
                            {num}
                        </button>
                    ))}
                    <button
                        onClick={() => handleNumberClick('0')}
                        className="h-14 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-white text-xl font-bold transition-all border border-white/5 col-start-2"
                    >
                        0
                    </button>
                    <button
                        onClick={handleBackspace}
                        className="h-14 rounded-xl bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 text-red-400 flex items-center justify-center transition-all border border-red-500/10"
                    >
                        ⌫
                    </button>
                </div>

                {/* Submit Button */}
                <button
                    onClick={() => handleSubmit()}
                    disabled={code.length === 0}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-white/5 disabled:text-white/20 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    Təsdiqlə <ArrowRight size={20} />
                </button>

            </div>
        </div>
    );
};
