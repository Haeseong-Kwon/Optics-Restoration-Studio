"use client";

import React, { useState } from 'react';
import { ImageIcon, Maximize2, Download } from 'lucide-react';

interface ImageComparisonViewerProps {
    original?: string;
    restored?: string;
}

export function ImageComparisonViewer({ original, restored }: ImageComparisonViewerProps) {
    const [sliderPos, setSliderPos] = useState(50);

    if (!restored) {
        return (
            <div className="w-full h-full min-h-[400px] rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-3 text-white/20">
                <ImageIcon className="w-12 h-12" />
                <p className="text-sm">Restoration results will appear here</p>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full min-h-[400px] rounded-2xl overflow-hidden bg-black border border-white/10 group">
            <div className="absolute inset-0 w-full h-full">
                {/* Restored (Base) */}
                <img src={restored} alt="Restored" className="w-full h-full object-contain" />

                {/* Original (Overlay with clip) */}
                <div
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                >
                    {original && <img src={original} alt="Original" className="w-full h-full object-contain" />}
                </div>
            </div>

            {/* Slider Handle */}
            <div
                className="absolute inset-y-0 w-1 bg-white cursor-ew-resize z-10"
                style={{ left: `${sliderPos}%` }}
            >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-xl flex items-center justify-center">
                    <div className="flex gap-0.5">
                        <div className="w-0.5 h-3 bg-black/20 rounded-full" />
                        <div className="w-0.5 h-3 bg-black/20 rounded-full" />
                    </div>
                </div>
            </div>

            <input
                type="range"
                min="0"
                max="100"
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
            />

            <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 bg-black/50 hover:bg-black/80 rounded-lg text-white backdrop-blur-md">
                    <Download className="w-4 h-4" />
                </button>
                <button className="p-2 bg-black/50 hover:bg-black/80 rounded-lg text-white backdrop-blur-md">
                    <Maximize2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
