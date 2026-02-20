"use client";

import React, { useState } from 'react';
import { ImageIcon, Maximize2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageComparisonViewerProps {
    original?: string;
    restored?: string;
}

export function ImageComparisonViewer({ original, restored }: ImageComparisonViewerProps) {
    const [sliderPos, setSliderPos] = useState(50);
    const [isVisible, setIsVisible] = useState(false);

    React.useEffect(() => {
        if (restored) {
            const timer = setTimeout(() => setIsVisible(true), 100);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [restored]);

    if (!restored) {
        return (
            <div className="w-full h-full min-h-[400px] rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-3 text-white/20 transition-all duration-700">
                <ImageIcon className="w-12 h-12 animate-pulse" />
                <p className="text-sm font-medium tracking-tight">Restoration results will appear here</p>
            </div>
        );
    }

    return (
        <div
            className={cn(
                "relative w-full h-full min-h-[400px] rounded-2xl overflow-hidden bg-black border border-white/10 group transition-all duration-1000 ease-out",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
        >
            <div className="absolute inset-0 w-full h-full">
                {/* Restored (Base) */}
                <img src={restored} alt="Restored" className="w-full h-full object-contain" />

                {/* Original (Overlay with clip) */}
                <div
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                >
                    {original && <img src={original} alt="Original" className="w-full h-full object-contain blur-md saturate-[0.8] brightness-75 transition-all duration-300" />}
                </div>
            </div>

            {/* Metrics Dashboard Overlay */}
            <div className="absolute top-6 right-6 flex items-center gap-4 bg-black/60 backdrop-blur-2xl px-5 py-3 rounded-2xl border border-white/10 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-1000">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-0.5">PSNR</span>
                    <span className="text-sm font-mono font-bold text-primary tracking-tight">34.82 dB</span>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-0.5">SSIM</span>
                    <span className="text-sm font-mono font-bold text-green-400 tracking-tight">0.9642</span>
                </div>
            </div>

            {/* Slider Handle */}
            <div
                className="absolute inset-y-0 w-0.5 bg-white/50 backdrop-blur-sm cursor-ew-resize z-10"
                style={{ left: `${sliderPos}%` }}
            >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full shadow-2xl flex items-center justify-center transition-transform group-hover:scale-110">
                    <div className="flex gap-1">
                        <div className="w-0.5 h-4 bg-white/40 rounded-full" />
                        <div className="w-0.5 h-4 bg-white/40 rounded-full" />
                    </div>
                </div>

                {/* Labels */}
                <div className="absolute top-8 left-1/2 -translate-x-full pr-4 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 bg-black/40 px-2 py-1 rounded">Before</span>
                </div>
                <div className="absolute top-8 left-1/2 pl-4 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 bg-black/40 px-2 py-1 rounded">After</span>
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

            <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                <button className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white backdrop-blur-xl border border-white/10 transition-colors">
                    <Download className="w-4 h-4" />
                </button>
                <button className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white backdrop-blur-xl border border-white/10 transition-colors">
                    <Maximize2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
