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

    return (
        <div className="visual-feed h-full flex flex-col bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
            {/* Tab Navigation */}
            <div className="tab-nav flex gap-0 bg-slate-900/50 border-b border-slate-800">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
              flex-1 px-4 py-3 text-sm font-medium transition-all border-b-2
              ${activeTab === tab.id
                                ? "bg-indigo-900/30 text-indigo-400 border-indigo-500"
                                : "bg-transparent text-slate-400 border-transparent hover:text-slate-300"
                            }
            `}
                    >
                        <span className="mr-2">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
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