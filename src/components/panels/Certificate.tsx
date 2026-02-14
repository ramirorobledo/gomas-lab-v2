"use client";

import React from "react";

interface CertificateData {
    hash_original?: string;
    hash_markdown?: string;
    digital_signature?: string;
    vlm_used?: string;
    timestamp?: string;
    validation_status?: "OK" | "ALERT" | "FAILED";
    anomalies_count?: number;
    processing_time_ms?: number;
}

interface CertificateProps {
    data?: CertificateData;
    loading?: boolean;
}

export function Certificate({ data, loading = false }: CertificateProps) {
    if (loading) {
        return (
            <div className="certificate-container h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    const statusColor = {
        OK: "text-green-400",
        ALERT: "text-yellow-400",
        FAILED: "text-red-400",
    };

    const status = data?.validation_status || "PENDING";

    return (
        <div className="certificate-container h-full flex flex-col overflow-hidden">
            <div className="certificate-header px-4 py-3 border-b border-slate-700 bg-slate-900/50">
                <h3 className="text-sm font-semibold text-slate-300">📜 Certificado Forense</h3>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
                {data ? (
                    <>
                        <div className="cert-item bg-slate-900/50 p-3 rounded border border-slate-700">
                            <p className="text-xs text-slate-400 mb-1">Estatus Validación</p>
                            <p className={`text-sm font-semibold ${statusColor[status as keyof typeof statusColor]}`}>
                                {status}
                            </p>
                        </div>

                        {data.hash_original && (
                            <div className="cert-item bg-slate-900/50 p-3 rounded border border-slate-700">
                                <p className="text-xs text-slate-400 mb-1">Hash Original (SHA256)</p>
                                <p className="text-xs font-mono text-slate-300 break-all">{data.hash_original}</p>
                            </div>
                        )}

                        {data.hash_markdown && (
                            <div className="cert-item bg-slate-900/50 p-3 rounded border border-slate-700">
                                <p className="text-xs text-slate-400 mb-1">Hash Markdown</p>
                                <p className="text-xs font-mono text-slate-300 break-all">{data.hash_markdown}</p>
                            </div>
                        )}

                        {data.digital_signature && (
                            <div className="cert-item bg-slate-900/50 p-3 rounded border border-slate-700">
                                <p className="text-xs text-slate-400 mb-1">Firma Digital</p>
                                <p className="text-xs font-mono text-slate-300 break-all">{data.digital_signature}</p>
                            </div>
                        )}

                        <div className="cert-item bg-slate-900/50 p-3 rounded border border-slate-700">
                            <p className="text-xs text-slate-400 mb-1">VLM Utilizado</p>
                            <p className="text-sm text-slate-200">{data.vlm_used || "gemini-2.0-flash"}</p>
                        </div>

                        <div className="cert-item bg-slate-900/50 p-3 rounded border border-slate-700">
                            <p className="text-xs text-slate-400 mb-1">Timestamp</p>
                            <p className="text-sm text-slate-200">{data.timestamp || new Date().toISOString()}</p>
                        </div>

                        {data.processing_time_ms && (
                            <div className="cert-item bg-slate-900/50 p-3 rounded border border-slate-700">
                                <p className="text-xs text-slate-400 mb-1">Tiempo Procesamiento</p>
                                <p className="text-sm text-slate-200">{data.processing_time_ms}ms</p>
                            </div>
                        )}

                        {data.anomalies_count !== undefined && (
                            <div className="cert-item bg-slate-900/50 p-3 rounded border border-slate-700">
                                <p className="text-xs text-slate-400 mb-1">Anomalías Detectadas</p>
                                <p className="text-sm text-slate-200">{data.anomalies_count}</p>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">
                        <p className="text-sm">Procesa un documento para generar certificado</p>
                    </div>
                )}
            </div>
        </div>
    );
}