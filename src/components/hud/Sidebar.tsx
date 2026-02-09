"use client";

import { useState } from "react";

interface SidebarProps {
    activeTab: string;
    onSwitchView: (view: string) => void;
}

export default function Sidebar({ activeTab, onSwitchView }: SidebarProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Mobile Hamburger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-panel border border-primary/30 rounded-sm"
                aria-label="Toggle menu"
            >
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isOpen ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                </svg>
            </button>

            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/80 z-30"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:relative
                w-72 h-full
                bg-base border-r border-[#262626] 
                flex flex-col justify-between 
                z-40
                transform transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-20 text-[10px] font-tech text-primary">
                        SYS.V2.0
                    </div>
                    <h1 className="font-tech font-black text-2xl tracking-widest text-white uppercase glow-text">
                        GOMAS<span className="text-primary">LAB</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                        <div className="h-1 w-1 bg-success rounded-full animate-pulse"></div>
                        <p className="text-[10px] font-data text-primary tracking-[0.2em] uppercase">
                            Forensic Edition
                        </p>
                    </div>
                    <div className="mt-4 w-full h-[1px] bg-gradient-to-r from-primary/50 to-transparent"></div>
                </div>

                <nav className="flex-1 px-4 space-y-1 mt-2">
                    <div
                        onClick={() => { onSwitchView("ocr"); setIsOpen(false); }}
                        className={`group flex items-center gap-4 px-4 py-4 rounded-sm border border-transparent hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-all ${activeTab === "ocr" ? "active-nav" : ""
                            }`}
                    >
                        <div className="text-xs font-tech text-muted group-[.active-nav]:text-primary w-6 text-center">
                            01
                        </div>
                        <div className="flex-1">
                            <div className="text-sm font-bold text-gray-300 group-[.active-nav]:text-white tracking-wide uppercase font-tech">
                                OCR VLM Forense
                            </div>
                            <div className="text-[10px] text-gray-600 font-data group-[.active-nav]:text-primary/70">
                                Analysis & Extraction
                            </div>
                        </div>
                        <div className="w-1 h-1 bg-gray-700 group-[.active-nav]:bg-primary group-[.active-nav]:shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
                    </div>

                    <div
                        onClick={() => { onSwitchView("studio"); setIsOpen(false); }}
                        className={`group flex items-center gap-4 px-4 py-4 rounded-sm border border-transparent hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-all ${activeTab === "studio" ? "active-nav" : ""
                            }`}
                    >
                        <div className="text-xs font-tech text-muted group-[.active-nav]:text-primary w-6 text-center">
                            02
                        </div>
                        <div className="flex-1">
                            <div className="text-sm font-bold text-gray-300 group-[.active-nav]:text-white tracking-wide uppercase font-tech">
                                Gomas IA
                            </div>
                            <div className="text-[10px] text-gray-600 font-data group-[.active-nav]:text-primary/70">
                                En Construcción
                            </div>
                        </div>
                        <div className="w-1 h-1 bg-gray-700 group-[.active-nav]:bg-primary group-[.active-nav]:shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
                    </div>

                    <div
                        onClick={() => { onSwitchView("history"); setIsOpen(false); }}
                        className={`group flex items-center gap-4 px-4 py-4 rounded-sm border border-transparent hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-all ${activeTab === "history" ? "active-nav" : ""
                            }`}
                    >
                        <div className="text-xs font-tech text-muted group-[.active-nav]:text-primary w-6 text-center">
                            03
                        </div>
                        <div className="flex-1">
                            <div className="text-sm font-bold text-gray-300 group-[.active-nav]:text-white tracking-wide uppercase font-tech">
                                Historial
                            </div>
                            <div className="text-[10px] text-gray-600 font-data group-[.active-nav]:text-primary/70">
                                Conversion Logs
                            </div>
                        </div>
                        <div className="w-1 h-1 bg-gray-700 group-[.active-nav]:bg-primary group-[.active-nav]:shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
                    </div>
                </nav>

                <div className="p-4 border-t border-[#262626] bg-panel">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-[10px] text-muted font-tech">SYSTEM STATUS</span>
                        <span className="text-[10px] text-success font-data animate-pulse">
                            ONLINE
                        </span>
                    </div>
                    <div className="flex gap-1 h-1 w-full mb-1">
                        <div className="flex-1 bg-primary/40"></div>
                        <div className="flex-1 bg-primary/30"></div>
                        <div className="flex-1 bg-primary/20"></div>
                        <div className="w-2 bg-transparent"></div>
                        <div className="w-8 bg-success/50"></div>
                    </div>
                    <div className="text-[10px] text-dim font-mono">gomas.forensic.v2</div>
                </div>
            </aside>
        </>
    );
}