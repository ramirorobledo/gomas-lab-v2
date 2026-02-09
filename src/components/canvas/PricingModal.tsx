"use client";

import React from "react";

interface PricingModalProps {
    cost: number;
    onConfirm: () => void;
    onCancel: () => void;
    processing?: boolean;
}

export function PricingModal({
    cost,
    onConfirm,
    onCancel,
    processing = false,
}: PricingModalProps) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-sm w-full mx-4">
                <h2 className="text-lg font-bold text-indigo-400 mb-4">
                    💰 Estimado de Costo
                </h2>

                <div className="bg-slate-950 p-4 rounded mb-6 border border-slate-700">
                    <p className="text-sm text-slate-400 mb-1">Costo estimado:</p>
                    <p className="text-3xl font-bold text-indigo-400">
                        ${cost.toFixed(4)}
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={processing}
                        className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={processing}
                        className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 text-white rounded-lg transition-colors font-semibold"
                    >
                        {processing ? "⏳ Procesando..." : "Continuar"}
                    </button>
                </div>
            </div>
        </div>
    );
}