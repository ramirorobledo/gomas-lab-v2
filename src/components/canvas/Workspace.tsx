"use client";

import React, { useState } from "react";
import { Dropzone } from "./Dropzone";
import { VisualFeed } from "../panels/VisualFeed";
import { PricingModal } from "./PricingModal";

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
    const [showPricing, setShowPricing] = useState(false);
    const [estimatedCost, setEstimatedCost] = useState(0);

    const handleFileDrop = (droppedFile: File) => {
        setFile(droppedFile);
        estimateCost(droppedFile);
        setShowPricing(true);
    };

    const estimateCost = (file: File) => {
        // Estimación simple: $0.001 por KB
        const costEstimate = (file.size / 1024) * 0.001;
        setEstimatedCost(Math.min(costEstimate, 5)); // Cap at $5
    };

    const handleProcess = async () => {
        if (!file) return;

        setProcessing(true);
        setShowPricing(false);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("vlmProvider", "gemini");

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
        <div className="workspace h-screen w-screen bg-slate-950 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="workspace-header px-6 py-4 border-b border-slate-800 bg-slate-900/50">
                <h1 className="text-2xl font-bold text-indigo-400">
                    🔬 GOMAS LAB v2
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                    Conversión forense de documentos PDF a Markdown
                </p>
            </div>

            {/* Main Content */}
            <div className="workspace-content flex-1 flex gap-6 p-6 overflow-hidden">
                {/* Left: Upload Section */}
                <div className="workspace-left w-1/3 flex flex-col gap-4">
                    <Dropzone
                        onFileDrop={handleFileDrop}
                        file={file}
                        loading={processing}
                    />

                    {file && !processed && (
                        <button
                            onClick={handleProcess}
                            disabled={processing}
                            className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                        >
                            {processing ? "⏳ Procesando..." : "▶️ Procesar Documento"}
                        </button>
                    )}

                    {processed && (
                        <button
                            onClick={() => {
                                setFile(null);
                                setProcessed(null);
                            }}
                            className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                        >
                            🔄 Nuevo Documento
                        </button>
                    )}
                </div>

                {/* Right: Results Section */}
                <div className="workspace-right flex-1 overflow-hidden">
                    {processed ? (
                        <VisualFeed
                            markdown={processed.markdown}
                            certificateData={processed.certificateData}
                            anomalies={processed.anomalies}
                            loading={false}
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-700 rounded-lg">
                            <p className="text-center">
                                <p className="text-lg mb-2">📄</p>
                                Sube un documento para comenzar
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Pricing Modal */}
            {showPricing && (
                <PricingModal
                    cost={estimatedCost}
                    onConfirm={handleProcess}
                    onCancel={() => setShowPricing(false)}
                    processing={processing}
                />
            )}
        </div>
    );
}