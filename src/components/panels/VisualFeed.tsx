"use client";

import React, { useState } from "react";
import { Editor } from "./Editor";
import { Certificate } from "./Certificate";
import { Anomalies } from "./Anomalies";

interface VisualFeedProps {
    markdown?: string;
    certificateData?: any;
    anomalies?: any[];
    loading?: boolean;
    onMarkdownChange?: (value: string) => void;
}

type TabType = "editor" | "certificate" | "anomalies";

export function VisualFeed({
    markdown = "",
    certificateData,
    anomalies = [],
    loading = false,
    onMarkdownChange,
}: VisualFeedProps) {
    const [activeTab, setActiveTab] = useState<TabType>("editor");

    const tabs: { id: TabType; label: string; icon: string }[] = [
        { id: "editor", label: "Editor", icon: "📝" },
        { id: "certificate", label: "Certificado", icon: "📜" },
        { id: "anomalies", label: "Anomalías", icon: "⚠️" },
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
                    ⬇️ Descargar Markdown
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
            </div>
        </div>
    );
}