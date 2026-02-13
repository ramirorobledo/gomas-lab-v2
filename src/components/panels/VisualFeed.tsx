"use client";

import React, { useState } from "react";
import { Editor } from "./Editor";
import { Certificate } from "./Certificate";
import { Anomalies } from "./Anomalies";

interface Extraction {
    name: string;
    from: number;
    to: number;
    markdown: string;
}

interface VisualFeedProps {
    markdown?: string;
    certificateData?: any;
    anomalies?: any[];
    extractions?: Extraction[];
    loading?: boolean;
    onMarkdownChange?: (value: string) => void;
}

type TabType = "editor" | "certificate" | "anomalies" | "extractions";

export function VisualFeed({
    markdown = "",
    certificateData,
    anomalies = [],
    extractions = [],
    loading = false,
    onMarkdownChange,
}: VisualFeedProps) {
    const [activeTab, setActiveTab] = useState<TabType>("editor");

    const tabs: { id: TabType; label: string; icon: string }[] = [
        { id: "editor", label: "Editor", icon: "📝" },
        { id: "certificate", label: "Certificado", icon: "📜" },
        { id: "anomalies", label: "Anomalías", icon: "⚠️" },
        ...(extractions.length > 0 ? [{ id: "extractions" as TabType, label: "Descargas", icon: "⬇️" }] : []),
    ];

    const handleDownloadMarkdown = () => {
        if (!markdown) return;

        const element = document.createElement('a');
        element.setAttribute(
            'href',
            'data:text/plain;charset=utf-8,' + encodeURIComponent(markdown)
        );
        element.setAttribute('download', 'documento.md');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const handleDownloadExtraction = async (extraction: Extraction) => {
        try {
            const response = await fetch('/api/download-extraction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: extraction.name,
                    markdown: extraction.markdown,
                }),
            });

            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${extraction.name}.md`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download error:', error);
            alert('Error descargando archivo');
        }
    };

    return (
        <div className="visual-feed h-full flex flex-col bg-panel/30 backdrop-blur-sm rounded-sm border border-primary/30 overflow-hidden">
            {/* Tab Navigation */}
            <div className="tab-nav flex gap-0 bg-panel/50 border-b border-border">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            flex-1 px-4 py-3 text-xs font-tech transition-all border-b-2 uppercase tracking-wider
                            ${activeTab === tab.id
                                ? "bg-primary/10 text-primary border-primary"
                                : "bg-transparent text-muted border-transparent hover:text-primary/70"
                            }
                        `}
                    >
                        <span className="mr-2">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Download Button */}
            <div className="download-section px-4 py-3 bg-panel/30 border-b border-border flex gap-2">
                <button
                    onClick={handleDownloadMarkdown}
                    disabled={!markdown}
                    className="px-4 py-2 bg-primary/20 hover:bg-primary/40 disabled:bg-gray-800 disabled:cursor-not-allowed text-primary disabled:text-gray-600 font-tech rounded-sm transition-all border border-primary/50 text-xs uppercase tracking-wider shadow-[0_0_10px_rgba(99,102,241,0.1)]"
                >
                    ⬇️ Documento Completo
                </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content flex-1 overflow-hidden">
                {activeTab === "editor" && (
                    <Editor markdown={markdown} onChange={onMarkdownChange} readOnly={false} />
                )}

                {activeTab === "certificate" && (
                    <Certificate data={certificateData} loading={loading} />
                )}

                {activeTab === "anomalies" && (
                    <Anomalies anomalies={anomalies} loading={loading} />
                )}

                {activeTab === "extractions" && (
                    <div className="h-full overflow-auto p-6 space-y-4">
                        <h3 className="font-tech text-primary uppercase text-sm tracking-widest mb-4">
                            Extracciones Procesadas
                        </h3>
                        <div className="grid gap-3">
                            {extractions.map((ext, idx) => (
                                <div
                                    key={idx}
                                    className="bg-black/30 p-4 rounded border border-primary/20 flex justify-between items-center"
                                >
                                    <div>
                                        <p className="font-tech text-primary uppercase text-sm">
                                            {ext.name}
                                        </p>
                                        <p className="text-[10px] text-muted mt-1">
                                            Páginas {ext.from}-{ext.to}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDownloadExtraction(ext)}
                                        className="px-4 py-2 bg-success/20 hover:bg-success/40 border border-success/50 text-success font-tech rounded-sm text-xs uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                                    >
                                        ⬇️ Descargar
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}