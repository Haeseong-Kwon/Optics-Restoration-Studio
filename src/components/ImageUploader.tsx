"use client";

import React, { useCallback, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ImageUploader({ onUpload }: { onUpload: (file: File) => void }) {
    const [isDragging, setIsDragging] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setIsDragging(true);
        } else if (e.type === "dragleave") {
            setIsDragging(false);
        }
    }, []);

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setPreview(URL.createObjectURL(file));
            onUpload(file);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setPreview(URL.createObjectURL(file));
            onUpload(file);
        }
    }, [onUpload]);

    return (
        <div
            className={cn(
                "relative w-full h-full rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-all duration-500 overflow-hidden min-h-[400px]",
                isDragging ? "border-primary bg-primary/5 scale-[0.98]" : "border-white/10 hover:border-white/20 bg-white/5",
                preview ? "border-transparent" : "hover:bg-white/[0.07]"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            {preview ? (
                <div className="absolute inset-0 w-full h-full animate-in fade-in zoom-in-95 duration-700">
                    <img
                        src={preview}
                        alt="Preview"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?auto=format&fit=crop&q=80&w=1200';
                        }}
                    />
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setPreview(null);
                        }}
                        className="absolute top-6 right-6 p-2.5 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-xl text-white transition-all hover:scale-110 active:scale-90"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <>
                    <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-2 transition-transform duration-500 hover:rotate-6">
                        <Upload className="w-10 h-10 text-white/40" />
                    </div>
                    <div className="text-center px-6">
                        <p className="text-base font-bold tracking-tight mb-1">Upload Optical Data</p>
                        <p className="text-xs text-white/40 leading-relaxed font-medium">Drag & Drop raw or blurred images<br />PNG, JPG, TIFF up to 10MB</p>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-4 px-6 py-2.5 bg-white text-black hover:bg-white/90 rounded-xl text-sm font-bold transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:-translate-y-0.5"
                    >
                        Select Image
                    </button>
                </>
            )}
        </div>
    );
}
