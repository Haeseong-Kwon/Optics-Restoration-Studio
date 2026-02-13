"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RestorationJob } from '@/types/optics';
import { Loader2, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProcessingStatus({ jobId }: { jobId: string }) {
    const [job, setJob] = useState<RestorationJob | null>(null);
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        // Initial fetch
        const fetchJob = async () => {
            const { data } = await supabase
                .from('restoration_jobs')
                .select('*')
                .eq('id', jobId)
                .single();
            if (data) {
                setJob(data);
                if (data.logs) setLogs(data.logs);
            }
        };

        fetchJob();

        // Subscribe to real-time changes
        const channel = supabase
            .channel(`job-${jobId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'restoration_jobs',
                    filter: `id=eq.${jobId}`,
                },
                (payload) => {
                    const updatedJob = payload.new as RestorationJob;
                    setJob(updatedJob);
                    if (updatedJob.logs) setLogs(updatedJob.logs);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [jobId]);

    if (!job) return null;

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                    {job.status === 'processing' && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
                    {job.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                    {job.status === 'failed' && <AlertCircle className="w-5 h-5 text-red-500" />}
                    Processing Queue
                </h3>
                <span className={cn(
                    "text-xs px-2 py-1 rounded-full uppercase font-bold tracking-widest",
                    job.status === 'processing' ? "bg-primary/20 text-primary" :
                        job.status === 'completed' ? "bg-green-500/20 text-green-500" :
                            "bg-white/10 text-white/40"
                )}>
                    {job.status}
                </span>
            </div>

            <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs text-white/60 mb-1">
                    <span>{job.current_step || 'Initializing...'}</span>
                    <span>{job.progress || 0}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all duration-1000 ease-in-out"
                        style={{ width: `${job.progress || 0}%` }}
                    />
                </div>
            </div>

            <div className="flex flex-col gap-3 pt-6 border-t border-white/5">
                <div className="flex items-center gap-2 text-xs text-white/40 font-semibold mb-1 uppercase tracking-wider">
                    <FileText className="w-3.5 h-3.5" />
                    Execution Logs
                </div>
                <div className="bg-black/50 rounded-lg p-4 h-48 overflow-y-auto font-mono text-[11px] leading-relaxed scrollbar-hide flex flex-col gap-1">
                    {logs.length > 0 ? logs.map((log, i) => (
                        <div key={i} className="text-white/60">
                            <span className="text-primary mr-2">›</span>
                            {log}
                        </div>
                    )) : (
                        <div className="text-white/20 italic italic">Waiting for logs...</div>
                    )}
                </div>
            </div>
        </div>
    );
}
