import React from 'react';

interface SmartPriceProps {
    originalPrice: number;
    globalPrice: number;
    personalPrice?: number;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export const SmartPrice: React.FC<SmartPriceProps> = ({
    originalPrice,
    globalPrice,
    personalPrice,
    className = '',
    size = 'md'
}) => {
    const isDiscount = (originalPrice || 0) > (globalPrice || 0);
    const isPersonalized = typeof personalPrice === 'number' && personalPrice < (globalPrice || 0);
    const isDoubleDiscount = isDiscount && isPersonalized;

    const displayPrice = (isPersonalized ? personalPrice : globalPrice) || 0;

    // Size classes
    const textSizes = {
        sm: { current: 'text-lg', old: 'text-xs', badge: 'text-[10px]' },
        md: { current: 'text-2xl', old: 'text-sm', badge: 'text-xs' },
        lg: { current: 'text-4xl', old: 'text-lg', badge: 'text-sm' }
    };

    const s = textSizes[size];

    return (
        <div className={`flex flex-col items-start ${className}`}>
            {/* Badge Area */}
            {isDoubleDiscount ? (
                <div className={`flex items-center gap-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white px-2 py-0.5 rounded-full font-bold ${s.badge} shadow-lg shadow-purple-500/20 mb-1 animate-pulse`}>
                    <span className="text-[10px]">⚡</span>
                    <span>2-qat Endirim</span>
                </div>
            ) : isPersonalized ? (
                <div className={`flex items-center gap-1 bg-gradient-to-r from-amber-400 to-amber-600 text-white px-2 py-0.5 rounded-full font-medium ${s.badge} shadow-lg shadow-amber-500/20 mb-1 animate-pulse`}>
                    <span>👑</span>
                    <span>Sizə Özəl</span>
                </div>
            ) : isDiscount ? (
                <div className={`bg-red-500/90 text-white px-2 py-0.5 rounded-full font-bold ${s.badge} shadow-lg shadow-red-500/20 mb-1`}>
                    -{Math.round(((originalPrice - globalPrice) / originalPrice) * 100)}%
                </div>
            ) : null}

            <div className="flex flex-wrap items-baseline gap-2">
                {/* Main Price */}
                <span className={`font-bold tracking-tight ${s.current} ${isPersonalized ? 'text-amber-600 dark:text-amber-400 drop-shadow-sm' : isDiscount ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                    {displayPrice.toFixed(2)} ₼
                </span>

                {/* Intermediate Price (Global Discounted) - Only show if Double Discount */}
                {isDoubleDiscount && (
                    <span className="text-xs text-red-400/70 line-through decoration-red-400/50">
                        {globalPrice.toFixed(2)} ₼
                    </span>
                )}

                {/* Old Price */}
                {(isDiscount || isPersonalized || globalPrice < originalPrice) && (
                    <span className={`text-slate-400 dark:text-white/40 line-through ${s.old}`}>
                        {originalPrice.toFixed(2)} ₼
                    </span>
                )}
            </div>
        </div>
    );
};
