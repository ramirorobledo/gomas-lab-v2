"use client";

import React from "react";
import type { Anomaly } from "@/lib/types";

interface AnomaliesProps {
    anomalies?: Anomaly[];
    loading?: boolean;
}

export function Anomalies({ anomalies = [], loading = false }: AnomaliesProps) {
    const getSeverityColor = (severity?: string) => {
        switch (severity) {
            case "high":
                return "bg-danger/10 border-danger/50 text-danger";
            case "medium":
                return "bg-alert/10 border-alert/50 text-alert";
            case "low":
                return "bg-process/10 border-process/50 text-process";
            default:
                return "bg-panel/30 border-border text-muted";
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="anomalies-container h-full flex flex-col overflow-hidden">
            <div className="anomalies-header px-4 py-3 border-b border-border bg-panel/50">
                <h3 className="text-sm font-tech text-primary uppercase tracking-widest">
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
                    <div className="h-full flex items-center justify-center text-muted">
                        <p className="text-sm">✓ Sin anomalías detectadas</p>
                    </div>
                )}
            </div>
        </div>
    );
}