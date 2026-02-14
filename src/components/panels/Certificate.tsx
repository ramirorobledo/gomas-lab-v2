"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { CertificateData } from "@/lib/types";
import { ShieldCheck, Printer, FileCheck, Fingerprint, Activity, Clock } from "lucide-react";
import { HudButton } from "../ui/HudComponents";

// --- Sub-component for the certificate visuals ---
function CertificateTemplate({ data, isPrint = false }: { data: CertificateData, isPrint?: boolean }) {
    const statusColor = data.validation_status === 'OK' ? 'text-[#00f3ff]' : 'text-[#ff2d55]';
    const borderColor = data.validation_status === 'OK' ? 'border-[#00f3ff]' : 'border-[#ff2d55]';

    return (
        <div className={`flex-1 flex flex-col relative bg-[#050505] p-8 overflow-hidden h-full ${isPrint ? 'w-[297mm] h-[210mm]' : ''}`}>
            {/* Decorative Background Elements */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at center, #00f3ff 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
            </div>

            {/* Main Border Frame */}
            <div className={`relative h-full border-2 ${borderColor} p-1 shadow-[0_0_50px_rgba(0,243,255,0.05)] flex-1 flex flex-col`}>
                <div className={`h-full border border-white/10 p-8 flex flex-col relative bg-black/40 backdrop-blur-sm flex-1`}>

                    {/* Corner Accents */}
                    <div className={`absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 ${borderColor}`}></div>
                    <div className={`absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 ${borderColor}`}></div>
                    <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 ${borderColor}`}></div>
                    <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 ${borderColor}`}></div>

                    {/* Header */}
                    <div className="flex justify-between items-start mb-12 border-b border-white/10 pb-6 shrink-0">
                        <div>
                            <h1 className="text-3xl font-black font-tech tracking-[0.2em] text-white p-0 m-0 leading-none">
                                FORENSIC<span className={`text-[${data.validation_status === 'OK' ? '#00f3ff' : '#ff2d55'}]`}>REPORT</span>
                            </h1>
                            <p className="text-[10px] font-mono text-muted mt-2 tracking-widest uppercase">
                                Official Validation Document • Gomas Lab V2
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="inline-flex flex-col items-end">
                                <span className="text-[10px] text-muted font-mono uppercase">Reference ID</span>
                                <span className="font-mono text-xl text-white tracking-widest">{data.hash_original?.substring(0, 8).toUpperCase() || "UNKNOWN"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Content Grid */}
                    <div className="grid grid-cols-12 gap-8 flex-1">
                        {/* Left Column: Metrics */}
                        <div className="col-span-8 grid grid-cols-2 gap-6 content-start">

                            <div className="col-span-2 bg-white/5 p-4 border-l-2 border-primary/50">
                                <div className="flex items-center gap-2 mb-2 text-primary/70">
                                    <Fingerprint className="w-4 h-4" />
                                    <span className="text-[10px] font-tech uppercase tracking-wider">Cryptographic Hash (SHA-256)</span>
                                </div>
                                <p className="font-mono text-xs text-white break-all leading-relaxed">
                                    {data.hash_original || "N/A"}
                                </p>
                            </div>

                            <div className="bg-white/5 p-4 border-l-2 border-primary/50">
                                <div className="flex items-center gap-2 mb-2 text-primary/70">
                                    <Activity className="w-4 h-4" />
                                    <span className="text-[10px] font-tech uppercase tracking-wider">Integrity Check</span>
                                </div>
                                <p className="font-mono text-xs text-white break-all leading-relaxed">
                                    {data.hash_markdown || "PENDING"}
                                </p>
                            </div>

                            <div className="bg-white/5 p-4 border-l-2 border-primary/50">
                                <div className="flex items-center gap-2 mb-2 text-primary/70">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-[10px] font-tech uppercase tracking-wider">Processing Time</span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <p className="font-mono text-2xl text-white">
                                        {data.processing_time_ms}ms
                                    </p>
                                    <div className="text-right">
                                        <span className="text-[10px] text-muted uppercase block">Anomalies</span>
                                        <span className={`font-mono text-lg ${data.anomalies_count > 0 ? 'text-amber-500' : 'text-primary'}`}>
                                            {data.anomalies_count}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-2 mt-4">
                                <h4 className="text-[10px] font-tech uppercase tracking-widest text-muted mb-4 border-b border-white/10 pb-1 w-max">
                                    System Validation Logic
                                </h4>
                                <p className="font-mono text-[10px] text-gray-500 leading-relaxed max-w-lg">
                                    This document certifies that the source file has been processed using the GEMINI-VLM-2.0 engine.
                                    Content integrity is verified against SHA-256 signatures. Any detected anomalies are recorded
                                    in the central anomaly registry.
                                </p>
                            </div>
                        </div>

                        {/* Right Column: Status Seal */}
                        <div className="col-span-4 flex flex-col items-center justify-center border-l border-white/5 pl-8">
                            <div className={`w-40 h-40 rounded-full border-4 ${borderColor} flex items-center justify-center relative mb-6 shadow-[0_0_30px_rgba(0,0,0,0.5)]`}>
                                <div className={`absolute inset-2 border border-dashed ${borderColor} rounded-full opacity-50 animate-spin-slow`}></div>
                                <div className="text-center z-10">
                                    <FileCheck className={`w-12 h-12 mx-auto mb-1 ${statusColor}`} />
                                    <div className={`text-xl font-black font-tech tracking-wider ${statusColor}`}>
                                        {data.validation_status}
                                    </div>
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-muted font-mono uppercase mb-1">Generated At</p>
                                <p className="text-xs text-white font-mono">
                                    {new Date().toISOString().replace('T', ' ').substring(0, 19)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-auto pt-6 border-t border-white/10 flex justify-between items-end shrink-0">
                        <div className="flex items-center gap-2 opacity-50">
                            <ShieldCheck className="w-4 h-4 text-white" />
                            <span className="text-[9px] font-tech tracking-[0.2em] text-white">SECURE DOCUMENT</span>
                        </div>
                        <div className="text-[9px] font-mono text-gray-600">
                            {data.vlm_used || "SYSTEM_DEFAULT_VLM"}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface CertificateProps {
    data?: CertificateData | null;
    loading?: boolean;
}

export function Certificate({ data, loading = false }: CertificateProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin"></div>
                    <div className="absolute inset-2 border-b-2 border-primary/50 rounded-full animate-reverse-spin"></div>
                </div>
                <p className="font-tech text-xs text-primary animate-pulse tracking-widest">GENERATING_CERTIFICATE...</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted gap-2">
                <ShieldCheck className="w-12 h-12 opacity-20" />
                <p className="text-sm font-tech tracking-wider">NO CERTIFICATE DATA AVAILABLE</p>
            </div>
        );
    }

    const handlePrint = () => {
        window.print();
    };

    return (
        <>
            {/* Screen Version - Standard Container */}
            <div className="h-full flex flex-col relative overflow-hidden print:hidden">
                {/* Visual Style for Toolbar */}
                <div className="flex justify-end p-2 border-b border-white/10 bg-black/20 shrink-0">
                    <HudButton onClick={handlePrint} variant="primary" className="flex items-center gap-2">
                        <Printer className="w-3 h-3" />
                        PRINT / SAVE PDF
                    </HudButton>
                </div>

                {/* The actual certificate visual */}
                <CertificateTemplate data={data} isPrint={false} />
            </div>

            {/* Print Version - Portal to Body to escape parent transforms/positioning */}
            {mounted && createPortal(
                <div className="hidden print:block fixed inset-0 z-[9999] bg-[#050505] w-full h-full m-0 p-0 overflow-hidden">
                    <style jsx global>{`
                        @media print {
                            @page { size: landscape; margin: 0; }
                            body { background-color: #050505 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; margin: 0; padding: 0; }
                            /* Hide everything else */
                            body > *:not(.print-portal-root) { display: none !important; }
                        }
                    `}</style>
                    <div className="print-portal-root w-full h-full flex items-center justify-center bg-[#050505]">
                        <CertificateTemplate data={data} isPrint={true} />
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}