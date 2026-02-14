"use client";

import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../hud/Sidebar";
import SystemHeader from "../hud/SystemHeader";
import Dropzone from "./Dropzone";
import { VisualFeed } from "../panels/VisualFeed";
import ExtractionList from "../panels/ExtractionList";
import type { ProcessedDocument, ExtractionRange, CertificateData } from "@/lib/types";
import { startProcessingAction, uploadChunkAction, checkJobStatusAction } from "@/app/actions";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Terminal, CheckCircle2, AlertTriangle, FileText, Cpu, Activity } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility for safe tailwind merge
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB chunks

export function Workspace() {
    const [file, setFile] = useState<File | null>(null);
    const [processing, setProcessing] = useState(false);
    const [jobId, setJobId] = useState<string | null>(null);
    const [processed, setProcessed] = useState<ProcessedDocument | null>(null);
    const [activeTab, setActiveTab] = useState("certificate");
    const [extractionRanges, setExtractionRanges] = useState<ExtractionRange[]>([]);
    const [numPages, setNumPages] = useState(0);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [systemLogs, setSystemLogs] = useState<string[]>([]);

    // Status polling state
    const [jobStatus, setJobStatus] = useState<string>("idle");
    const [currentStep, setCurrentStep] = useState<string>("");

    const addLog = (msg: string) => {
        setSystemLogs(prev => [...prev.slice(-49), `> [${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    const handleFileDrop = (droppedFile: File) => {
        setFile(droppedFile);
        setNumPages(0);
        addLog(`File loaded: ${droppedFile.name} (${(droppedFile.size / 1024 / 1024).toFixed(2)}MB)`);
    };

    const handleAddRange = (from: number, to: number, name: string) => {
        setExtractionRanges([...extractionRanges, { from, to, name }]);
        addLog(`Range added: ${name} (p${from}-p${to})`);
    };

    const handleRemoveRange = (idx: number) => {
        setExtractionRanges(extractionRanges.filter((_, i) => i !== idx));
    };

    // Polling Effect
    useEffect(() => {
        if (!processing || !jobId) return;

        const interval = setInterval(async () => {
            const statusRes = await checkJobStatusAction(jobId);

            if (!statusRes.success || !statusRes.status) {
                addLog(`Error checking status: ${statusRes.error}`);
                return;
            }

            setJobStatus(statusRes.status);
            if (statusRes.step) setCurrentStep(statusRes.step);

            if (statusRes.status === 'completed' && statusRes.result) {
                clearInterval(interval);
                setProcessing(false);
                addLog("Processing complete.");

                const data = statusRes.result;
                setNumPages(data.pageCount || 0);
                setProcessed({
                    markdown: data.markdown || "",
                    certificateData: data.certificate,
                    anomalies: data.anomalies || [],
                    extractions: data.extractions || [],
                    pageCount: data.pageCount || 0,
                });
            } else if (statusRes.status === 'failed') {
                clearInterval(interval);
                setProcessing(false);
                alert(`Error: ${statusRes.error}`);
                addLog(`CRITICAL ERROR: ${statusRes.error}`);
            } else {
                // Still processing
                if (statusRes.progress && statusRes.progress.total > 0) {
                    addLog(`Progress: ${statusRes.step} (${statusRes.progress.current}/${statusRes.progress.total})`);
                } else {
                    addLog(`Status: ${statusRes.step}`);
                }
            }

        }, 1000);

        return () => clearInterval(interval);
    }, [processing, jobId]);


    const handleProcess = async () => {
        if (!file) return;

        setProcessing(true);
        setUploadProgress(0);
        setSystemLogs([]);
        addLog("Initiating upload sequence...");

        try {
            let uploadId: string | null = null;

            // Chunk Upload Strategy
            if (file.size > 4 * 1024 * 1024) {
                addLog("Large file detected. Engaging chunk interface...");
                uploadId = crypto.randomUUID();
                const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

                for (let i = 0; i < totalChunks; i++) {
                    const start = i * CHUNK_SIZE;
                    const end = Math.min(start + CHUNK_SIZE, file.size);
                    const chunk = file.slice(start, end);

                    const formData = new FormData();
                    formData.append('uploadId', uploadId);
                    formData.append('chunkIndex', i.toString());
                    formData.append('chunk', chunk);

                    const res = await uploadChunkAction(formData);
                    if (!res.success) throw new Error(res.error || `Failed to upload chunk ${i}`);

                    const progress = (i + 1) / totalChunks;
                    setUploadProgress(progress);
                    addLog(`Uploaded chunk ${i + 1}/${totalChunks}`);
                }
            }

            addLog("Upload complete. Requesting processing job...");

            const formData = new FormData();
            if (uploadId) {
                formData.append('uploadId', uploadId);
                formData.append('filename', file.name);
            } else {
                formData.append('file', file);
            }
            formData.append('ranges', JSON.stringify(extractionRanges));

            const startRes = await startProcessingAction(formData);

            if (!startRes.success || !startRes.jobId) {
                throw new Error(startRes.error || "Failed to start job");
            }

            setJobId(startRes.jobId);
            addLog(`Job started: ${startRes.jobId}`);
            // Polling effect will take over from here

        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error("Error processing file:", error);
            alert(`Error initializing: ${message}`);
            setProcessing(false);
        }
    };

    return (
        <div className="workspace h-screen w-screen bg-base flex overflow-hidden font-sans text-white/90">
            {/* SIDEBAR */}
            <Sidebar
                activeTab={activeTab}
                onSwitchTab={setActiveTab}
                certificateData={processed?.certificateData}
            />

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Background Grid */}
                <div className="absolute inset-0 pointer-events-none opacity-5"
                    style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
                />

                <SystemHeader />

                <div className="workspace-content flex-1 flex gap-6 p-6 overflow-hidden z-10">

                    {/* LEFT PANEL: Controls */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-2/5 flex flex-col gap-4 overflow-hidden"
                    >
                        {/* Dropzone with Status */}
                        <div className="flex-1 relative group">
                            <div className={cn(
                                "absolute inset-0 bg-primary/5 rounded-lg border border-primary/20 transition-all duration-500",
                                processing && "animate-pulse border-primary/50"
                            )} />

                            <Dropzone
                                onFileDrop={handleFileDrop}
                                file={file}
                                loading={processing}
                                uploadProgress={uploadProgress}
                                uploadPhase={jobId ? 'processing' : (uploadProgress > 0 ? 'uploading' : 'idle')}
                            />
                        </div>

                        {/* Extractions or Actions */}
                        {file && !processed && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col gap-2"
                            >
                                <ExtractionList
                                    ranges={extractionRanges}
                                    onAdd={handleAddRange}
                                    onRemove={handleRemoveRange}
                                    onProcess={handleProcess}
                                    isProcessing={processing}
                                    maxPages={numPages > 0 ? numPages : 100}
                                />

                                {extractionRanges.length === 0 && (
                                    <button
                                        onClick={handleProcess}
                                        disabled={processing}
                                        className="w-full px-6 py-4 bg-primary/20 hover:bg-primary/30 disabled:opacity-50 disabled:cursor-not-allowed
                                              border border-primary/50 text-primary font-tech uppercase tracking-widest text-sm
                                              shadow-[0_0_20px_rgba(99,102,241,0.15)] hover:shadow-[0_0_30px_rgba(99,102,241,0.3)]
                                              transition-all duration-300 rounded relative overflow-hidden group"
                                    >
                                        <span className="relative z-10 flex items-center justify-center gap-2">
                                            {processing ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    {currentStep || "INITIALIZING..."}
                                                </>
                                            ) : (
                                                <>
                                                    <Cpu className="w-4 h-4" />
                                                    PROCESS FULL DOCUMENT
                                                </>
                                            )}
                                        </span>
                                        <div className="absolute inset-0 bg-primary/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                    </button>
                                )}
                            </motion.div>
                        )}

                        {/* Reset Button */}
                        {processed && (
                            <motion.button
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                onClick={() => {
                                    setFile(null);
                                    setProcessed(null);
                                    setJobId(null);
                                    setSystemLogs([]);
                                    setUploadProgress(0);
                                }}
                                className="w-full px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-mono text-xs border border-zinc-800 rounded transition-all"
                            >
                                [ SYSTEM RESET ]
                            </motion.button>
                        )}

                        {/* TERMINAL LOGS */}
                        <div className="h-48 glass-panel rounded border border-primary/20 flex flex-col overflow-hidden relative">
                            <div className="px-3 py-2 border-b border-primary/10 bg-black/40 flex items-center justify-between">
                                <span className="font-tech text-[10px] text-primary/70 flex items-center gap-2">
                                    <Terminal className="w-3 h-3" />
                                    SYSTEM_LOGS
                                </span>
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 rounded-full bg-red-500/50" />
                                    <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                                    <div className="w-2 h-2 rounded-full bg-green-500/50" />
                                </div>
                            </div>
                            <div className="flex-1 p-3 font-mono text-[10px] text-primary/80 overflow-y-auto space-y-1 scrollbar-hide">
                                {systemLogs.length === 0 && <span className="opacity-50">... awaiting input ...</span>}
                                {systemLogs.map((log, i) => (
                                    <div key={i} className="border-l-2 border-primary/20 pl-2">
                                        {log}
                                    </div>
                                ))}
                                <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
                            </div>
                        </div>

                    </motion.div>

                    {/* RIGHT PANEL: VISUAL FEED */}
                    <div className="flex-1 relative overflow-hidden rounded-lg border border-white/5 bg-black/20 backdrop-blur-sm">
                        <AnimatePresence mode="wait">
                            {processed ? (
                                <motion.div
                                    key="feed"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="h-full"
                                >
                                    <VisualFeed
                                        markdown={processed.markdown}
                                        certificateData={processed.certificateData}
                                        anomalies={processed.anomalies}
                                        extractions={processed.extractions}
                                        loading={false}
                                    />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="placeholder"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="h-full flex items-center justify-center flex-col gap-4"
                                >
                                    <div className="w-24 h-24 rounded-full border border-dashed border-primary/20 flex items-center justify-center animate-spin-slow">
                                        <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center animate-reverse-spin">
                                            <FileText className="w-8 h-8 text-primary/50" />
                                        </div>
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h3 className="text-lg font-tech text-primary/80 tracking-widest">AWAITING_DATA_STREAM</h3>
                                        <p className="text-xs text-muted font-mono">Secure Connection Established</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                </div>
            </div>
        </div>
    );
}