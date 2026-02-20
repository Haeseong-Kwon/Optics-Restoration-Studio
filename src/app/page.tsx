"use client";

import React, { useState, useEffect } from 'react';
import { ImageUploader } from '@/components/ImageUploader';
import { ImageComparisonViewer } from '@/components/ImageComparisonViewer';
import { supabase } from '@/lib/supabase';
import { RestorationJob } from '@/types/optics';

export default function Dashboard() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentJob, setCurrentJob] = useState<RestorationJob | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleUpload = async (file: File) => {
        setIsProcessing(true);
        setUploadProgress(0);

        try {
            // 1. Upload blurred image to Supabase Storage
            const fileName = `${Date.now()}_${file.name}`;
            const filePath = `blurred/${fileName}`;

            // Smooth progress simulation for upload
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) return prev;
                    return prev + 2;
                });
            }, 100);

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('images')
                .upload(filePath, file);

            clearInterval(progressInterval);
            if (uploadError) throw uploadError;
            setUploadProgress(100);

            // 2. Create job in restoration_jobs table
            const { data: jobData, error: jobError } = await supabase
                .from('restoration_jobs')
                .insert({
                    blurred_image_path: filePath,
                    status: 'pending',
                    algorithm: 'wiener_deconvolution_v1' // Default
                })
                .select()
                .single();

            if (jobError) throw jobError;
            setCurrentJob(jobData);

        } catch (error) {
            console.error('Error during upload:', error);
            alert('Upload failed. Please check your Supabase configuration.');
            setIsProcessing(false);
        }
    };

    // Poll for job status updates
    useEffect(() => {
        if (!currentJob || currentJob.status === 'completed' || currentJob.status === 'failed') return;

        const interval = setInterval(async () => {
            const { data, error } = await supabase
                .from('restoration_jobs')
                .select('*')
                .eq('id', currentJob.id)
                .single();

            if (data) {
                setCurrentJob(data);
                if (data.status === 'completed' || data.status === 'failed') {
                    setIsProcessing(false);
                    clearInterval(interval);
                }
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [currentJob]);

    const getImageUrl = (path: string | undefined) => {
        if (!path) return undefined;
        const { data } = supabase.storage.from('images').getPublicUrl(path);
        return data.publicUrl;
    };

    return (
        <div className="p-8 flex-1 flex flex-col gap-8 max-w-7xl mx-auto w-full">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold mb-2">Image Restoration</h2>
                    <p className="text-white/40">Upload a blurred optical image to begin the restoration process.</p>
                </div>
                {isProcessing && (
                    <div className="flex items-center gap-4">
                        <div className="h-2 w-48 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-500"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                        <span className="text-sm font-medium text-primary animate-pulse">Processing...</span>
                    </div>
                )}
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
                <section className="flex flex-col gap-4">
                    <h3 className="text-lg font-semibold">Source Image</h3>
                    <div className="flex-1 min-h-[400px]">
                        <ImageUploader onUpload={handleUpload} />
                    </div>
                </section>

                <section className="flex flex-col gap-4">
                    <h3 className="text-lg font-semibold flex justify-between items-center">
                        Restoration Result
                        {currentJob?.status === 'completed' && (
                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Completed</span>
                        )}
                    </h3>
                    <div className="flex-1 min-h-[400px]">
                        <ImageComparisonViewer
                            original={getImageUrl(currentJob?.blurred_image_path)}
                            restored={getImageUrl(currentJob?.restored_image_path)}
                        />
                    </div>
                </section>
            </div>
        </div>
    );
}
