"use client";

import React from "react";
import type { CertificateData } from "@/lib/types";

interface CertificateProps {
    data?: CertificateData | null;
    loading?: boolean;
}

export function Certificate({ data, loading = false }: CertificateProps) {
    if (loading) {
        return (
            <div className="certificate-container h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const statusColor = {
        OK: "text-success",
        ALERT: "text-alert",
        FAILED: "text-danger",
    };

    const status = data?.validation_status || "PENDING";

    return (
        <div className="certificate-container h-full flex flex-col overflow-hidden">
            <div className="certificate-header px-4 py-3 border-b border-border bg-panel/50">
                <h3 className="text-sm font-tech text-primary uppercase tracking-widest">📜 Certificado Forense</h3>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
                {data ? (
                    <>
                        <div className="cert-item bg-panel/50 p-3 rounded-sm border border-primary/20">
                            <p className="text-xs text-muted mb-1">Estatus Validación</p>
                            <p className={`text-sm font-semibold ${statusColor[status as keyof typeof statusColor]}`}>
                                {status}
                            </p>
                        </div>

                        {data.hash_original && (
                            <div className="cert-item bg-panel/50 p-3 rounded-sm border border-primary/20">
                                <p className="text-xs text-muted mb-1">Hash Original (SHA256)</p>
                                <p className="text-xs font-mono text-txt-muted break-all">{data.hash_original}</p>
                            </div>
                        )}

                        {data.hash_markdown && (
                            <div className="cert-item bg-panel/50 p-3 rounded-sm border border-primary/20">
                                <p className="text-xs text-muted mb-1">Hash Markdown</p>
                                <p className="text-xs font-mono text-txt-muted break-all">{data.hash_markdown}</p>
                            </div>
                        )}

                        {data.integrity_hash && (
                            <div className="cert-item bg-panel/50 p-3 rounded-sm border border-primary/20">
                                <p className="text-xs text-muted mb-1">Hash de Integridad</p>
                                <p className="text-xs font-mono text-txt-muted break-all">{data.integrity_hash}</p>
                            </div>
                        )}

                        <div className="cert-item bg-panel/50 p-3 rounded-sm border border-primary/20">
                            <p className="text-xs text-muted mb-1">VLM Utilizado</p>
                            <p className="text-sm text-txt-main">{data.vlm_used || "gemini-2.0-flash"}</p>
                        </div>

                        <div className="cert-item bg-panel/50 p-3 rounded-sm border border-primary/20">
                            <p className="text-xs text-muted mb-1">Timestamp</p>
                            <p className="text-sm text-txt-main">{data.timestamp || new Date().toISOString()}</p>
                        </div>

                        {data.processing_time_ms > 0 && (
                            <div className="cert-item bg-panel/50 p-3 rounded-sm border border-primary/20">
                                <p className="text-xs text-muted mb-1">Tiempo Procesamiento</p>
                                <p className="text-sm text-txt-main">{data.processing_time_ms}ms</p>
                            </div>
                        )}

                        {data.anomalies_count !== undefined && (
                            <div className="cert-item bg-panel/50 p-3 rounded-sm border border-primary/20">
                                <p className="text-xs text-muted mb-1">Anomalías Detectadas</p>
                                <p className="text-sm text-txt-main">{data.anomalies_count}</p>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="h-full flex items-center justify-center text-muted">
                        <p className="text-sm">Procesa un documento para generar certificado</p>
                    </div>
                )}
            </div>
        </div>
    );
}