"use client";

import { useState } from "react";
import type { CertificateData } from "@/lib/types";

interface SidebarProps {
    activeTab: string;
    onSwitchTab: (tab: string) => void;
    certificateData?: CertificateData | null;
}

export default function Sidebar({ activeTab, onSwitchTab, certificateData }: SidebarProps) {
    const [isOpen, setIsOpen] = useState(false);

    const tabs = [
        { id: "certificate", label: "Certificado", icon: "📜" },
        { id: "console", label: "Console", icon: "⚙️" },
        { id: "status", label: "Status", icon: "📊" },
    ];

    return (
        <>
            {/* Mobile Hamburger */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-panel border border-primary/30 rounded-sm"
            >
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isOpen ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                </svg>
            </button>

            {/* Overlay */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/80 z-30"
                    role="button"
                    tabIndex={0}
                    aria-label="Cerrar menú"
                    onClick={() => setIsOpen(false)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsOpen(false); }}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:relative
                w-80 h-full
                bg-base border-r border-border
                flex flex-col
                z-40
                transform transition-transform duration-300
                ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Header */}
                <div className="p-6 border-b border-border bg-panel/30">
                    <h1 className="font-tech font-black text-xl tracking-widest text-primary glow-text uppercase">
                        GOMAS<span className="text-white">LAB</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                        <div className="h-1 w-1 bg-success rounded-full animate-pulse"></div>
                        <p className="text-[10px] font-data text-primary tracking-widest uppercase">
                            Forensic Edition
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <nav className="flex-1 px-4 space-y-2 mt-4 overflow-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                onSwitchTab(tab.id);
                                setIsOpen(false);
                            }}
                            className={`
                                w-full group flex items-center gap-4 px-4 py-4 rounded-sm border transition-all
                                ${activeTab === tab.id
                                    ? "bg-primary/10 border-primary/50 text-primary"
                                    : "bg-transparent border-transparent text-muted hover:border-primary/30 hover:bg-primary/5"
                                }
                            `}
                        >
                            <span className="text-lg">{tab.icon}</span>
                            <div className="flex-1 text-left">
                                <div className="text-sm font-tech uppercase tracking-wider">{tab.label}</div>
                            </div>
                            <div className={`w-1 h-1 rounded-full transition-all ${activeTab === tab.id ? "bg-primary shadow-[0_0_8px_rgba(99,102,241,0.8)]" : "bg-gray-700"
                                }`}></div>
                        </button>
                    ))}
                </nav>

                {/* Content Panels */}
                <div className="flex-1 overflow-auto p-4 border-t border-border">
                    {/* Certificate Tab */}
                    {activeTab === "certificate" && (
                        <div className="glass-panel p-4 rounded-sm border border-primary/30">
                            <h3 className="font-tech text-primary uppercase text-xs tracking-widest mb-4">Validación Forense</h3>
                            {certificateData ? (
                                <div className="space-y-3 text-[11px]">
                                    <div className="border-l-2 border-primary pl-3">
                                        <p className="text-muted font-mono">Status</p>
                                        <p className={`font-tech ${certificateData.validation_status === 'OK' ? 'text-success' :
                                                certificateData.validation_status === 'ALERT' ? 'text-alert' : 'text-danger'
                                            }`}>{certificateData.validation_status === 'OK' ? '✓' : '⚠'} {certificateData.validation_status}</p>
                                    </div>
                                    <div className="border-l-2 border-primary pl-3">
                                        <p className="text-muted font-mono">Anomalías</p>
                                        <p className="text-primary font-data">{certificateData.anomalies_count}</p>
                                    </div>
                                    <div className="border-l-2 border-primary pl-3">
                                        <p className="text-muted font-mono">Hash SHA256</p>
                                        <p className="text-gray-400 font-mono truncate text-[10px]">{certificateData.hash_original?.slice(0, 16)}...</p>
                                    </div>
                                    {certificateData.processing_time_ms > 0 && (
                                        <div className="border-l-2 border-primary pl-3">
                                            <p className="text-muted font-mono">Tiempo</p>
                                            <p className="text-primary font-data">{(certificateData.processing_time_ms / 1000).toFixed(1)}s</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center text-muted text-xs font-data">
                                    Procesa un documento para ver el certificado
                                </div>
                            )}
                        </div>
                    )}

                    {/* Console Tab */}
                    {activeTab === "console" && (
                        <div className="glass-panel p-4 rounded-sm border border-primary/30 font-mono text-[10px]">
                            <h3 className="font-tech text-primary uppercase text-xs tracking-widest mb-4">System Console</h3>
                            <div className="bg-black/50 p-3 rounded h-64 overflow-auto border border-primary/20">
                                <p className="text-muted">&gt; Sistema listo</p>
                                <p className="text-muted">&gt; Esperando documento...</p>
                            </div>
                        </div>
                    )}

                    {/* Status Tab */}
                    {activeTab === "status" && (
                        <div className="glass-panel p-4 rounded-sm border border-primary/30 space-y-4">
                            <h3 className="font-tech text-primary uppercase text-xs tracking-widest">Status del Sistema</h3>
                            <div className="space-y-2 text-[10px]">
                                <div className="flex justify-between">
                                    <span className="text-muted">Procesados</span>
                                    <span className="text-primary font-data">0</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted">Tiempo</span>
                                    <span className="text-primary font-data">0ms</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted">Conectado</span>
                                    <span className="text-success font-data">ONLINE</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border bg-panel/30">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-[10px] text-muted font-tech">SYSTEM</span>
                        <span className="text-[10px] text-success font-data animate-pulse">ONLINE</span>
                    </div>
                    <div className="flex gap-1 h-1">
                        <div className="flex-1 bg-primary/40"></div>
                        <div className="flex-1 bg-primary/30"></div>
                        <div className="flex-1 bg-primary/20"></div>
                        <div className="w-8 bg-success/50"></div>
                    </div>
                </div>
            </aside>
        </>
    );
}