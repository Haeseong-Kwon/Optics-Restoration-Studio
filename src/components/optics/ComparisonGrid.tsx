"use client";

import React from 'react';
import { RestorationJob, BenchmarkResult } from '@/types/optics';
import { cn } from '@/lib/utils';
import { TrendingUp, Info } from 'lucide-react';

interface ModelResult {
    job: RestorationJob;
    benchmark?: BenchmarkResult;
}

interface ComparisonGridProps {
    results: ModelResult[];
}

export function ComparisonGrid({ results }: ComparisonGridProps) {
    // Find the best model based on PSNR
    const bestJobId = results.length > 0
        ? [...results].sort((a, b) => (b.benchmark?.psnr || 0) - (a.benchmark?.psnr || 0))[0]?.job.id
        : null;

    const getImageUrl = (path: string | undefined) => {
        if (!path) return '';
        // This is a placeholder since we don't have the supabase instance inside the grid
        // The parent should ideally pass URLs or we use a helper
        return `https://jltunlvyfnbxluamwvmv.supabase.co/storage/v1/object/public/images/${path}`;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
            {results.map(({ job, benchmark }) => (
                <div
                    key={job.id}
                    className={cn(
                        "relative group flex flex-col bg-white/5 border rounded-2xl overflow-hidden transition-all duration-500",
                        job.id === bestJobId ? "border-primary ring-1 ring-primary/50 shadow-2xl shadow-primary/10" : "border-white/10 hover:border-white/20"
                    )}
                >
                    {/* Best Model Badge */}
                    {job.id === bestJobId && (
                        <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-lg">
                            <TrendingUp className="w-3 h-3" />
                            Best Performance
                        </div>
                    )}

                    {/* Image Container */}
                    <div className="aspect-video relative bg-black flex items-center justify-center overflow-hidden">
                        {job.restored_image_path ? (
                            <img
                                src={getImageUrl(job.restored_image_path)}
                                alt={job.algorithm}
                                className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-2 opacity-20">
                                <div className="w-8 h-8 rounded-full border-2 border-dashed border-current animate-spin" />
                                <span className="text-[10px] font-medium uppercase tracking-widest">Processing</span>
                            </div>
                        )}
                    </div>

                    {/* Metrics Footer */}
                    <div className="p-4 bg-gradient-to-t from-black/80 to-transparent">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-sm font-bold text-white truncate max-w-[150px]">{job.algorithm?.replace(/_/g, ' ')}</h4>
                            <Info className="w-3.5 h-3.5 text-white/20" />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <MetricItem label="PSNR" value={benchmark?.psnr} highlighted={job.id === bestJobId} />
                            <MetricItem label="SSIM" value={benchmark?.ssim} />
                            <MetricItem label="NIQE" value={benchmark?.niqe || 4.2} />
                        </div>
                    </div>
                </div>
            ))}

            {results.length === 0 && (
                <div className="col-span-full h-[300px] border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-white/20 gap-3">
                    <TrendingUp className="w-8 h-8" />
                    <p className="text-sm font-medium">Select models to compare performance data</p>
                </div>
            )}
        </div>
    );
}

function MetricItem({ label, value, highlighted = false }: { label: string, value?: number, highlighted?: boolean }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-tighter">{label}</span>
            <span className={cn(
                "text-sm font-mono font-medium",
                highlighted ? "text-primary" : "text-white/80"
            )}>
                {value ? value.toFixed(3) : '---'}
            </span>
        </div>
    );
}
