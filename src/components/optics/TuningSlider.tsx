"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { SlidersHorizontal } from 'lucide-react';

interface TuningSliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit?: string;
    onChange: (value: number) => void;
}

export function TuningSlider({ label, value, min, max, step, unit, onChange }: TuningSliderProps) {
    return (
        <div className="flex flex-col gap-3 group">
            <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest group-hover:text-white/60 transition-colors">
                    {label}
                </label>
                <div className="flex items-center gap-1">
                    <span className="text-sm font-mono font-bold text-primary">{value}</span>
                    {unit && <span className="text-[10px] text-white/20 uppercase">{unit}</span>}
                </div>
            </div>

            <div className="relative h-6 flex items-center">
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary hover:accent-primary/80 transition-all focus:outline-none"
                />
                <div
                    className="absolute left-0 h-1 bg-primary/20 rounded-full pointer-events-none transition-all"
                    style={{ width: `${((value - min) / (max - min)) * 100}%` }}
                />
            </div>
        </div>
    );
}

export function TuningPanel({
    parameters,
    onParameterChange
}: {
    parameters: any,
    onParameterChange: (key: string, value: number) => void
}) {
    return (
        <div className="flex flex-col gap-8 bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <SlidersHorizontal className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-bold text-sm uppercase tracking-tighter text-white/80">Hyperparameter Tuning</h3>
            </div>

            <div className="flex flex-col gap-6">
                <TuningSlider
                    label="Denoising Strength"
                    value={parameters.denoise_level || 0.5}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(v) => onParameterChange('denoise_level', v)}
                />

                <TuningSlider
                    label="Sharpness Boost"
                    value={parameters.sharpness || 0.3}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={(v) => onParameterChange('sharpness', v)}
                />

                <TuningSlider
                    label="Iterations"
                    value={parameters.iterations || 20}
                    min={1}
                    max={100}
                    step={1}
                    unit="iters"
                    onChange={(v) => onParameterChange('iterations', v)}
                />
            </div>

            <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 flex flex-col gap-2">
                <p className="text-[10px] leading-relaxed text-orange-400/60 font-medium">
                    <span className="font-bold">Note:</span> Increasing iterations significantly improves quality but increases processing time in high-res mode.
                </p>
            </div>
        </div>
    );
}
