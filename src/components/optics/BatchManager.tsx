"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RestorationJob } from '@/types/optics';
import { cn } from '@/lib/utils';
import { Layers, Play, CheckCircle2, Clock, Trash2, Plus } from 'lucide-react';

export function BatchManager() {
    const [queue, setQueue] = useState<{ id: string; file: File; status: 'idle' | 'pending' | 'completed'; jobId?: string }[]>([]);
    const [selectedModels, setSelectedModels] = useState<string[]>(['wiener_deconvolution_v1']);

    const addFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const newFiles = Array.from(e.target.files).map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            file,
            status: 'idle' as const
        }));
        setQueue(prev => [...prev, ...newFiles]);
    };

    const startBatch = async () => {
        for (const item of queue) {
            if (item.status === 'completed') continue;

            setQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'pending' } : i));

            try {
                const filePath = `blurred/${Date.now()}_${item.file.name}`;
                await supabase.storage.from('images').upload(filePath, item.file);

                // Multiple models per image
                const inserts = selectedModels.map(model => ({
                    blurred_image_path: filePath,
                    status: 'pending',
                    algorithm: model,
                }));

                const { data } = await supabase.from('restoration_jobs').insert(inserts).select();

                setQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'completed', jobId: data?.[0].id } : i));
            } catch (err) {
                console.error(err);
            }
        }
    };

    const removeFile = (id: string) => {
        setQueue(prev => prev.filter(i => i.id !== id));
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Layers className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-bold text-lg">Batch Queue</h3>
                </div>

                <div className="flex gap-2">
                    <label className="cursor-pointer bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 border border-white/10">
                        <Plus className="w-3 h-3" />
                        Add Images
                        <input type="file" multiple className="hidden" onChange={addFiles} />
                    </label>
                    <button
                        disabled={queue.length === 0}
                        onClick={startBatch}
                        className="bg-primary hover:bg-primary/90 disabled:opacity-30 px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                    >
                        <Play className="w-3 h-3 fill-current" />
                        Process All
                    </button>
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/5 border-b border-white/5">
                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Filename</th>
                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Size</th>
                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Status</th>
                            <th className="px-6 py-4 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {queue.map((item) => (
                            <tr key={item.id} className="group hover:bg-white/[0.02] transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center overflow-hidden border border-white/10">
                                            <img src={URL.createObjectURL(item.file)} className="w-full h-full object-cover" alt="" />
                                        </div>
                                        <span className="text-sm font-medium">{item.file.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-xs text-white/40">
                                    {(item.file.size / 1024 / 1024).toFixed(2)} MB
                                </td>
                                <td className="px-6 py-4">
                                    {item.status === 'idle' && (
                                        <div className="flex items-center gap-1.5 text-white/20 text-xs">
                                            <Clock className="w-3.5 h-3.5" /> Idle
                                        </div>
                                    )}
                                    {item.status === 'pending' && (
                                        <div className="flex items-center gap-1.5 text-primary text-xs animate-pulse">
                                            <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                            Pending
                                        </div>
                                    )}
                                    {item.status === 'completed' && (
                                        <div className="flex items-center gap-1.5 text-green-500 text-xs font-bold uppercase tracking-widest">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Done
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => removeFile(item.id)} className="p-2 text-white/20 hover:text-red-500 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {queue.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-white/20 text-sm italic">
                                    No images in queue. Add images to start batch processing.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
