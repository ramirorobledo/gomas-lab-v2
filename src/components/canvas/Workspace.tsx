"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "../hud/Sidebar";
import SystemHeader from "../hud/SystemHeader";
import Dropzone from "./Dropzone";
import { VisualFeed } from "../panels/VisualFeed";
import ExtractionList from "../panels/ExtractionList";
import type { ProcessedDocument, ExtractionRange } from "@/lib/types";
import { startProcessingAction, uploadChunkAction, checkJobStatusAction } from "@/app/actions";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Terminal, Cpu, FileText } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { HudPanel, HudButton, StatusBadge } from "../ui/HudComponents";

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
        <div className="workspace h-screen w-screen bg-base flex overflow-hidden font-sans text-white/90 selection:bg-primary/30">
            <Sidebar
                activeTab={activeTab}
                onSwitchTab={setActiveTab}
                certificateData={processed?.certificateData}
            />

            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Background Grid */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
                    style={{ backgroundImage: 'var(--image-grid-pattern)', backgroundSize: '40px 40px' }}
                />

                <SystemHeader />

                <div className="workspace-content flex-1 flex gap-6 p-6 overflow-hidden z-10">

                    {/* LEFT PANEL: INPUT & CONTROLS */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-[480px] flex flex-col gap-4 overflow-hidden"
                    >
                        {/* Dropzone with Status */}
                        <div className="flex-1 relative group min-h-[150px]">
                            <div className={cn(
                                "absolute inset-0 bg-primary/5 rounded-lg border border-primary/20 transition-all duration-500",
                                processing && "animate-pulse border-primary/50 shadow-[0_0_30px_rgba(0,243,255,0.1)]"
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
                                className="flex flex-col gap-4"
                            >
                                <ExtractionList
                                    ranges={extractionRanges}
                                    onAdd={handleAddRange}
                                    onRemove={handleRemoveRange}
                                    onProcess={handleProcess}
                                    isProcessing={processing}
                                    maxPages={numPages > 0 ? numPages : 100}
                                /* Fixed height for consistent layout */
                                /* className="h-[250px]" */
                                />

                                {extractionRanges.length === 0 && (
                                    <HudButton
                                        onClick={handleProcess}
                                        disabled={processing}
                                        isLoading={false}
                                        variant="primary"
                                        className="w-full py-4 text-sm font-bold tracking-widest"
                                    >
                                        {processing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                {currentStep || "INITIALIZING..."}
                                            </>
                                        ) : (
                                            <>
                                                <Cpu className="w-4 h-4" />
                                                INITIATE SEQUENCE
                                            </>
                                        )}
                                    </HudButton>
                                )}
                            </motion.div>
                        )}

                        {/* Reset Button */}
                        {processed && (
                            <HudButton
                                variant="ghost"
                                onClick={() => {
                                    setFile(null);
                                    setProcessed(null);
                                    setJobId(null);
                                    setSystemLogs([]);
                                    setUploadProgress(0);
                                }}
                                className="w-full text-xs border border-white/5"
                            >
                                [ SYSTEM RESET ]
                            </HudButton>
                        )}

                        {/* TERMINAL LOGS - TALLER */}
                        <HudPanel className="h-64 flex flex-col" title="SYSTEM_LOGS">
                            <div className="flex-1 p-3 font-mono text-[10px] text-primary/70 overflow-y-auto space-y-1 scrollbar-hide">
                                {systemLogs.length === 0 && <span className="opacity-30">... awaiting input ...</span>}
                                {systemLogs.map((log, i) => (
                                    <div key={i} className="border-l border-primary/20 pl-2">
                                        <span className="text-primary/40 mr-2">{i.toString().padStart(3, '0')}</span>
                                        {log}
                                    </div>
                                ))}
                                <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
                            </div>
                        </HudPanel>

                    </motion.div>


                    {/* RIGHT PANEL: VISUAL FEED (HUD) */}
                    <HudPanel className="flex-1 overflow-hidden" title="VISUAL_FEED">
                        <div className="absolute top-4 right-4 z-20">
                            <StatusBadge status={processing ? 'processing' : (processed ? 'completed' : 'idle')} />
                        </div>

                        <AnimatePresence mode="wait">
                            {processed ? (
                                <motion.div
                                    key="feed"
                                    initial={{ opacity: 0, scale: 0.98 }}
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
                                    className="h-full flex items-center justify-center flex-col gap-6"
                                >
                                    {/* Animated HUD spinner */}
                                    <div className="relative w-64 h-64 flex items-center justify-center">
                                        <div className="absolute inset-0 border border-primary/10 rounded-full animate-spin-slow opacity-30" />
                                        <div className="absolute inset-4 border border-dashed border-primary/20 rounded-full animate-reverse-spin opacity-40" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-32 h-32 bg-primary/5 rounded-full blur-xl animate-pulse" />
                                        </div>
                                        <FileText className="w-12 h-12 text-primary/50 relative z-10" />
                                    </div>

                                    <div className="text-center space-y-2 relative z-10">
                                        <h3 className="text-xl font-tech text-primary/90 tracking-[0.2em] glow-text">AWAITING DATA STREAM</h3>
                                        <p className="text-xs text-muted font-mono uppercase tracking-widest">
                                            Secure Connection Established :: Ready for Input
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </HudPanel>

                </div>
            </div>
        </div>
    );
}
