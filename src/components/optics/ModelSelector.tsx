"use client";

import React from 'react';
import { Info, Zap, Shield, Sparkles } from 'lucide-react';
import { ModelInfo } from '@/types/optics';
import { cn } from '@/lib/utils';

const MODELS: ModelInfo[] = [
    {
        id: 'wiener_deconvolution_v1',
        name: 'Wiener Deconvolution',
        description: 'Classical signal processing approach. Best for uniform motion blur.',
        type: 'speed',
        tags: ['Classical', 'Fast']
    },
    {
        id: 'swinir_restoration',
        name: 'SwinIR',
        description: 'Transformer-based restoration. Superior quality for diverse degradations.',
        type: 'quality',
        tags: ['Transformer', 'SOTA']
    },
    {
        id: 'real_esrgan_v2',
        name: 'Real-ESRGAN',
        description: 'Blind super-resolution. Excellent for restoring fine textures and details.',
        type: 'quality',
        tags: ['GAN', 'Super-Res']
    },
    {
        id: 'optical_diffusion_beta',
        name: 'Optical Diffusion',
        description: 'Generative diffusion model. Restores images with physical consistency.',
        type: 'balanced',
        tags: ['Diffusion', 'Experimental']
    }
];

interface ModelSelectorProps {
    selectedModelId: string;
    onSelect: (id: string) => void;
}

export function ModelSelector({ selectedModelId, onSelect }: ModelSelectorProps) {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Restoration Model</h3>
                <Info className="w-4 h-4 text-white/20 hover:text-white/40 cursor-help" />
            </div>

            <div className="grid grid-cols-1 gap-3">
                {MODELS.map((model) => (
                    <button
                        key={model.id}
                        onClick={() => onSelect(model.id)}
                        className={cn(
                            "group relative flex flex-col items-start p-4 rounded-xl border transition-all text-left",
                            selectedModelId === model.id
                                ? "bg-primary/10 border-primary text-white"
                                : "bg-white/5 border-white/5 hover:border-white/10 text-white/60 hover:text-white"
                        )}
                    >
                        <div className="flex items-center justify-between w-full mb-1">
                            <span className="font-semibold text-sm">{model.name}</span>
                            {model.type === 'speed' && <Zap className="w-3.5 h-3.5 text-yellow-500" />}
                            {model.type === 'quality' && <Sparkles className="w-3.5 h-3.5 text-purple-500" />}
                            {model.type === 'balanced' && <Shield className="w-3.5 h-3.5 text-blue-500" />}
                        </div>

                        <p className="text-xs text-white/40 group-hover:text-white/60 transition-colors line-clamp-2">
                            {model.description}
                        </p>

                        <div className="flex gap-2 mt-3">
                            {model.tags.map(tag => (
                                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 border border-white/5">
                                    {tag}
                                </span>
                            ))}
                        </div>

                        {selectedModelId === model.id && (
                            <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
