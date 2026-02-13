"use client";

import React, { useState, useEffect } from 'react';
import { ImageUploader } from '@/components/ImageUploader';
import { ImageComparisonViewer } from '@/components/ImageComparisonViewer';
import { ModelSelector } from '@/components/optics/ModelSelector';
import { ProcessingStatus } from '@/components/optics/ProcessingStatus';
import { BatchManager } from '@/components/optics/BatchManager';
import { ComparisonGrid } from '@/components/optics/ComparisonGrid';
import { TuningPanel } from '@/components/optics/TuningSlider';
import { supabase } from '@/lib/supabase';
import { RestorationJob, BenchmarkResult } from '@/types/optics';
import { Rocket, Sliders, LayoutDashboard, History, Beaker, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RestorationPage() {
    const [activeTab, setActiveTab] = useState<'workbench' | 'batch'>('workbench');
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentJob, setCurrentJob] = useState<RestorationJob | null>(null);
    const [selectedModelId, setSelectedModelId] = useState('wiener_deconvolution_v1');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [parameters, setParameters] = useState({
        denoise_level: 0.5,
        sharpness: 0.3,
        iterations: 20
    });

    const handleParameterChange = (key: string, value: number) => {
        setParameters(prev => ({ ...prev, [key]: value }));
    };

    // Real results for comparison grid (mocking data structure for now)
    const [comparisonResults, setComparisonResults] = useState<{ job: RestorationJob; benchmark?: BenchmarkResult }[]>([]);

    const handleUpload = async (file: File) => {
        setIsProcessing(true);
        setUploadProgress(10);

        try {
            const fileName = `${Date.now()}_${file.name}`;
            const filePath = `blurred/${fileName}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;
            setUploadProgress(50);

            const { data: jobData, error: jobError } = await supabase
                .from('restoration_jobs')
                .insert({
                    blurred_image_path: filePath,
                    status: 'pending',
                    algorithm: selectedModelId,
                    progress: 0,
                    current_step: 'Queued',
                    parameters: parameters
                })
                .select()
                .single();

            if (jobError) throw jobError;
            setCurrentJob(jobData);
            setUploadProgress(100);

        } catch (error) {
            console.error('Error:', error);
            setIsProcessing(false);
        }
    };

    const getImageUrl = (path: string | undefined) => {
        if (!path) return undefined;
        const { data } = supabase.storage.from('images').getPublicUrl(path);
        return data.publicUrl;
    };

    return (
        <div className="flex h-screen bg-black overflow-hidden font-sans">
            {/* Sidebar Expansion */}
            <div className="w-80 border-r border-white/5 bg-card/50 backdrop-blur-3xl p-6 flex flex-col gap-8 overflow-y-auto">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center shadow-lg shadow-primary/20">
                        <Rocket className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold tracking-tight">Studio Pro</h1>
                        <p className="text-[10px] text-white/40 uppercase font-bold tracking-[0.2em]">Restoration Lab</p>
                    </div>
                </div>

                <nav className="flex flex-col gap-1">
                    <div onClick={() => setActiveTab('workbench')}>
                        <NavItem
                            icon={<LayoutDashboard className="w-4 h-4" />}
                            label="Workbench"
                            active={activeTab === 'workbench'}
                        />
                    </div>
                    <div onClick={() => setActiveTab('batch')}>
                        <NavItem
                            icon={<Layers className="w-4 h-4" />}
                            label="Batch Analysis"
                            active={activeTab === 'batch'}
                        />
                    </div>
                    <NavItem icon={<Sliders className="w-4 h-4" />} label="Parameters" />
                    <NavItem icon={<History className="w-4 h-4" />} label="Archive" />
                </nav>

                <div className="h-px bg-white/5 my-2" />

                {activeTab === 'workbench' && (
                    <>
                        <ModelSelector
                            selectedModelId={selectedModelId}
                            onSelect={setSelectedModelId}
                        />
                        <div className="h-px bg-white/5 my-2" />
                        <TuningPanel
                            parameters={parameters}
                            onParameterChange={handleParameterChange}
                        />
                    </>
                )}

                {currentJob && activeTab === 'workbench' && (
                    <div className="mt-auto">
                        <ProcessingStatus jobId={currentJob.id} />
                    </div>
                )}
            </div>

            {/* Main Area */}
            <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent">
                <div className="p-8 max-w-6xl mx-auto flex flex-col gap-8">
                    <header className="flex flex-col gap-1">
                        <h2 className="text-4xl font-extrabold tracking-tight">
                            {activeTab === 'workbench' ? 'Active Restoration' : 'Batch Evaluation'}
                        </h2>
                        <p className="text-white/40 text-sm">
                            {activeTab === 'workbench'
                                ? 'Fine-tune and process high-resolution optical data.'
                                : 'Process multiple images and compare relative model accuracy.'}
                        </p>
                    </header>

                    <div className="grid grid-cols-1 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        {activeTab === 'workbench' ? (
                            <section className="bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
                                    <Rocket className="w-32 h-32 text-primary rotate-12" />
                                </div>

                                <div className="relative z-10 flex flex-col gap-6">
                                    <h3 className="text-xl font-bold">Image Pipeline</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[500px]">
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold uppercase tracking-widest text-white/40">Input Data</span>
                                                <div className="flex gap-1">
                                                    <div className="w-1 h-1 rounded-full bg-primary" />
                                                    <div className="w-1 h-1 rounded-full bg-white/20" />
                                                </div>
                                            </div>
                                            <ImageUploader onUpload={handleUpload} />
                                        </div>

                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold uppercase tracking-widest text-white/40">Restored Output</span>
                                            </div>
                                            <ImageComparisonViewer
                                                original={getImageUrl(currentJob?.blurred_image_path)}
                                                restored={getImageUrl(currentJob?.restored_image_path)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>
                        ) : (
                            <div className="flex flex-col gap-12">
                                <BatchManager />

                                <section className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                            <Beaker className="w-4 h-4 text-purple-400" />
                                        </div>
                                        <h3 className="font-bold text-lg">Model Performance Grid</h3>
                                    </div>
                                    <ComparisonGrid results={comparisonResults} />
                                </section>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
    return (
        <div className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-300",
            active ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10" : "text-white/40 hover:text-white hover:bg-white/5"
        )}>
            {icon}
            <span className="text-sm font-semibold tracking-tight">{label}</span>
        </div>
    );
}
