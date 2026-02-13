"use client";

import React from 'react';
import { Settings, Zap, Play, History, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RestorationSidebar() {
    return (
        <aside className="w-64 h-screen bg-card border-r border-white/5 flex flex-col p-6 gap-8">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold tracking-tight">Optics Studio</h1>
            </div>

            <nav className="flex flex-col gap-2">
                <SidebarItem icon={<ImageIcon className="w-4 h-4" />} label="Restore" active />
                <SidebarItem icon={<History className="w-4 h-4" />} label="Recent Jobs" />
                <SidebarItem icon={<Settings className="w-4 h-4" />} label="Settings" />
            </nav>

            <div className="mt-auto pt-8 border-t border-white/5 flex flex-col gap-6">
                <div>
                    <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Algorithm</h3>
                    <select className="w-full bg-white/5 border border-white/10 rounded-md p-2 text-sm outline-none focus:border-primary transition-colors">
                        <option value="wiener">Wiener Deconvolution</option>
                        <option value="gan">GAN-based (High Res)</option>
                        <option value="pinn">PINN Enhanced</option>
                    </select>
                </div>

                <button className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2 rounded-md transition-all flex items-center justify-center gap-2">
                    <Play className="w-4 h-4" />
                    Run Job
                </button>
            </div>
        </aside>
    );
}

function SidebarItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
    return (
        <div className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors",
            active ? "bg-white/10 text-white" : "text-white/40 hover:text-white hover:bg-white/5"
        )}>
            {icon}
            <span className="text-sm font-medium">{label}</span>
        </div>
    );
}
