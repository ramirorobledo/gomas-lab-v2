"use client";

import React, { useState } from "react";
import Sidebar from "../hud/Sidebar";
import SystemHeader from "../hud/SystemHeader";
import Dropzone from "./Dropzone";
import { VisualFeed } from "../panels/VisualFeed";

interface ProcessedDocument {
    markdown: string;
    certificateData: any;
    anomalies: any[];
    cost: number;
}

export function Workspace() {
    const [file, setFile] = useState<File | null>(null);
    const [processing, setProcessing] = useState(false);
    const [processed, setProcessed] = useState<ProcessedDocument | null>(null);
    const [activeTab, setActiveTab] = useState("certificate");

    const handleFileDrop = (droppedFile: File) => {
        setFile(droppedFile);
    };

    const handleProcess = async () => {
        if (!file) return;

        setProcessing(true);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/process-pdf", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Processing failed");

            const data = await response.json();
            setProcessed({
                markdown: data.markdown,
                certificateData: data.certificateData,
                anomalies: data.anomalies || [],
                cost: data.cost,
            });
        } catch (error) {
            console.error("Error processing file:", error);
            alert("Error procesando documento");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="workspace h-screen w-screen bg-base flex overflow-hidden">
            {/* SIDEBAR LEFT */}
            <Sidebar
                activeTab={activeTab}
                onSwitchTab={setActiveTab}
                certificateData={processed?.certificateData}
            />

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* HEADER */}
                <SystemHeader />

                {/* MAIN WORKSPACE */}
                <div className="workspace-content flex-1 flex gap-6 p-6 overflow-hidden">
                    {/* CENTER: Upload & Console */}
                    <div className="workspace-center w-2/5 flex flex-col gap-4 overflow-hidden">
                        {/* Dropzone */}
                        <div className="flex-1">
                            <Dropzone
                                onFileDrop={handleFileDrop}
                                file={file}
                                loading={processing}
                            />
                        </div>

                        {/* Process Button */}
                        {file && !processed && (
                            <button
                                onClick={handleProcess}
                                disabled={processing}
                                className="w-full px-4 py-3 bg-primary/20 hover:bg-primary/40 disabled:bg-gray-700 text-white font-tech rounded-sm transition-all border border-primary/50 uppercase tracking-wider text-xs shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                            >
                                {processing ? "⏳ Procesando..." : "▶️ Procesar"}
                            </button>
                        )}

                        {/* New Document Button */}
                        {processed && (
                            <button
                                onClick={() => {
                                    setFile(null);
                                    setProcessed(null);
                                }}
                                className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white font-tech rounded-sm transition-all border border-border uppercase tracking-wider text-xs"
                            >
                                🔄 Nuevo Documento
                            </button>
                        )}

                        {/* System Console */}
                        <div className="glass-panel p-4 rounded-sm border border-primary/30 flex-1 flex flex-col overflow-hidden">
                            <h3 className="font-tech text-primary uppercase text-xs tracking-widest mb-3">System Console</h3>
                            <div className="bg-black/60 p-3 rounded flex-1 overflow-auto border border-primary/20 font-mono text-[10px] space-y-1">
                                <p className="text-muted">&gt; Sistema inicializado</p>
                                <p className="text-muted">&gt; Esperando documento...</p>
                                {processing && (
                                    <>
                                        <p className="text-primary">&gt; [OCR] Extrayendo texto...</p>
                                        <p className="text-primary">&gt; [VLM] Analizando estructura...</p>
                                        <p className="text-primary">&gt; [PageIndex] Mapeando contenido...</p>
                                    </>
                                )}
                                {processed && (
                                    <>
                                        <p className="text-success">&gt; ✓ Procesamiento completado</p>
                                        <p className="text-success">&gt; ✓ Documento validado</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Live Preview */}
                    <div className="workspace-right flex-1 overflow-hidden">
                        {processed ? (
                            <VisualFeed
                                markdown={processed.markdown}
                                certificateData={processed.certificateData}
                                anomalies={processed.anomalies}
                                loading={false}
                            />
                        ) : (
                            <div className="h-full flex items-center justify-center border-2 border-dashed border-primary/30 rounded-sm bg-panel/30 backdrop-blur-sm">
                                <div className="text-center">
                                    <p className="text-4xl mb-4">📄</p>
                                    <p className="text-primary font-tech uppercase tracking-widest">Sube un documento</p>
                                    <p className="text-xs text-muted mt-2 font-data">para ver preview en tiempo real</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* FOOTER Status */}
                <div className="workspace-footer px-8 py-3 border-t border-border bg-panel/30 backdrop-blur-sm flex justify-between items-center text-[10px]">
                    <div className="flex gap-6 text-muted font-data">
                        <span>SYSTEM STATUS: <span className="text-success">SECURE</span></span>
                        <span>PROCESSING: <span className={processing ? "text-primary animate-pulse" : "text-muted"}>
                            {processing ? "ACTIVE" : "IDLE"}
                        </span></span>
                    </div>
                    <div className="text-muted">
                        {processed && <span>DOCUMENTOS: <span className="text-primary">1</span></span>}
                    </div>
                </div>
            </div>
        </div>
    );
}