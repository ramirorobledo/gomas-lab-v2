"use client";

import React from "react";

interface Anomaly {
    type: string;
    location?: string;
    severity?: "low" | "medium" | "high";
    description: string;
    action_taken?: string;
}

interface AnomaliesProps {
    anomalies?: Anomaly[];
    loading?: boolean;
}

export function Anomalies({ anomalies = [], loading = false }: AnomaliesProps) {
    const getSeverityColor = (severity?: string) => {
        switch (severity) {
            case "high":
                return "bg-red-900/30 border-red-700 text-red-400";
            case "medium":
                return "bg-yellow-900/30 border-yellow-700 text-yellow-400";
            case "low":
                return "bg-blue-900/30 border-blue-700 text-blue-400";
            default:
                return "bg-slate-900/30 border-slate-700 text-slate-400";
        }
    };

    const getSeverityIcon = (severity?: string) => {
        switch (severity) {
            case "high":
                return "⚠️";
            case "medium":
                return "⚡";
            case "low":
                return "ℹ️";
            default:
                return "📋";
        }
    };

    if (loading) {
        return (
            <div className="anomalies-container h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="anomalies-container h-full flex flex-col overflow-hidden">
            <div className="anomalies-header px-4 py-3 border-b border-slate-700 bg-slate-900/50">
                <h3 className="text-sm font-semibold text-slate-300">
                    ⚠️ Anomalías Detectadas ({anomalies.length})
                </h3>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3">
                {anomalies.length > 0 ? (
                    anomalies.map((anomaly, idx) => (
                        <div
                            key={idx}
                            className={`anomaly-item p-3 rounded border ${getSeverityColor(anomaly.severity)}`}
                        >
                            <div className="flex items-start gap-2">
                                <span className="text-lg mt-0.5">{getSeverityIcon(anomaly.severity)}</span>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold mb-1">
                                        {anomaly.type.replace(/_/g, " ").toUpperCase()}
                                    </p>
                                    <p className="text-xs opacity-90 mb-1">{anomaly.description}</p>

                                    {anomaly.location && (
                                        <p className="text-xs opacity-75 mb-1">
                                            <span className="font-mono">📍 {anomaly.location}</span>
                                        </p>
                                    )}

                                    {anomaly.action_taken && (
                                        <p className="text-xs opacity-75">
                                            <span className="font-semibold">✓ Acción: </span>
                                            {anomaly.action_taken}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">
                        <p className="text-sm">✓ Sin anomalías detectadas</p>
                    </div>
                )}
            </div>
        </div>
    );
}