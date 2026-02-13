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
                "relative w-full h-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-all overflow-hidden min-h-[400px]",
                isDragging ? "border-primary bg-primary/5 scale-[0.99]" : "border-white/10 hover:border-white/20 bg-white/5",
                preview ? "border-transparent" : ""
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            {preview ? (
                <div className="absolute inset-0 w-full h-full">
                    <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setPreview(null);
                        }}
                        className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <>
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
                        <Upload className="w-8 h-8 text-white/40" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-medium">Drag & Drop image</p>
                        <p className="text-xs text-white/40 mt-1">PNG, JPG, TIFF up to 10MB</p>
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
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
                    >
                        Select File
                    </button>
                </>
            )}
        </div>
    );
}
