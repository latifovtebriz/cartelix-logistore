import React from 'react';

interface BarcodeProps {
    value: string;
    width?: number;
    height?: number;
    className?: string;
}

export const Barcode: React.FC<BarcodeProps> = ({ value, width = 200, height = 60, className = "" }) => {
    // Increased scale for sharpness, removed includeText (we render it manually for better font control)
    const src = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${value}&scale=4&rotate=N`;

    return (
        <div className={`flex flex-col items-center justify-center bg-white p-4 rounded-xl shadow-sm border border-slate-100 ${className}`}>
            <img
                src={src}
                alt={`Barcode ${value}`}
                className="mix-blend-multiply"
                style={{ height: `${height}px`, width: '100%', objectFit: 'fill' }}
            />
        </div>
    );
};
