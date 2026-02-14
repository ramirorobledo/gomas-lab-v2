"use client";

import { useState } from "react";
import type { CertificateData } from "@/lib/types";
import { FileText, Cpu, Activity, ShieldCheck, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { HudPanel } from "../ui/HudComponents";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface SidebarProps {
    activeTab: string;
    onSwitchTab: (tab: string) => void;
    certificateData?: CertificateData | null;
}

export default function Sidebar({ activeTab, onSwitchTab, certificateData }: SidebarProps) {
    const [hoveredTab, setHoveredTab] = useState<string | null>(null);

    const tabs = [
        { id: "certificate", label: "CERTIFICATE", icon: FileText },
        { id: "console", label: "SYSTEM_CONSOLE", icon: Cpu },
        { id: "status", label: "NET_STATUS", icon: Activity },
    ];

    return (
        <aside className="w-16 h-full bg-black/80 border-r border-white/5 flex flex-col items-center py-4 z-50 backdrop-blur-md relative">
            {/* Brand Mark */}
            <div className="mb-8 w-10 h-10 flex items-center justify-center bg-primary/10 rounded-sm border border-primary/30 text-primary font-black font-tech text-xs tracking-tighter">
                GL
            </div>

            {/* Navigation Strip */}
            <nav className="flex-1 flex flex-col gap-4 w-full px-2">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;

                    return (
                        <div key={tab.id} className="relative group flex justify-center">
                            <button
                                onClick={() => onSwitchTab(tab.id)}
                                onMouseEnter={() => setHoveredTab(tab.id)}
                                onMouseLeave={() => setHoveredTab(null)}
                                className={cn(
                                    "p-3 rounded-md transition-all duration-300 relative overflow-hidden",
                                    isActive
                                        ? "text-primary bg-primary/10 shadow-[0_0_15px_rgba(0,243,255,0.2)] border border-primary/30"
                                        : "text-muted hover:text-white hover:bg-white/5 border border-transparent"
                                )}
                            >
                                <Icon className="w-5 h-5" />
                                {isActive && (
                                    <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                                )}
                            </button>

                            {/* Tooltip */}
                            <AnimatePresence>
                                {hoveredTab === tab.id && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 20 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 whitespace-nowrap pointer-events-none"
                                    >
                                        <div className="bg-black/90 border border-primary/30 px-3 py-1.5 rounded-sm text-[10px] font-tech text-primary tracking-widest uppercase shadow-xl backdrop-blur-sm">
                                            {tab.label}
                                            {/* Decorative line */}
                                            <div className="absolute left-0 top-1/2 -translate-x-full w-2 h-[1px] bg-primary/50" />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </nav>

            {/* Status Indicator */}
            <div className="mt-auto flex flex-col gap-2 items-center w-full px-2">
                {certificateData && (
                    <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center border transition-colors",
                        certificateData.validation_status === 'OK' ? "border-success/50 bg-success/10 text-success" : "border-danger/50 bg-danger/10 text-danger"
                    )}>
                        {certificateData.validation_status === 'OK' ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    </div>
                )}

                <div className="h-10 w-[1px] bg-white/10 my-2" />

                <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_10px_rgba(0,255,157,0.5)]" title="System Online" />
            </div>
        </aside>
    );
}