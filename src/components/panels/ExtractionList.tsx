"use client";

import { useState, useEffect } from "react";

interface ExtractionRange {
    from: number;
    to: number;
    name: string;
}

interface ExtractionListProps {
    ranges: ExtractionRange[];
    onAdd: (from: number, to: number, name: string) => void;
    onRemove: (index: number) => void;
    onProcess: () => void;
    isProcessing: boolean;
    maxPages: number;
}

export default function ExtractionList({
    ranges,
    onAdd,
    onRemove,
    onProcess,
    isProcessing,
    maxPages
}: ExtractionListProps) {
    const [from, setFrom] = useState(1);
    const [to, setTo] = useState(Math.min(10, maxPages || 10));
    const [name, setName] = useState("extraction_1");

    useEffect(() => {
        setTo((prev) => Math.min(prev, Math.min(10, maxPages || 10)));
    }, [maxPages]);

    const handleAdd = () => {
        if (from > 0 && to <= maxPages && from <= to) {
            onAdd(from, to, name);
            setFrom(1);
            setTo(Math.min(10, maxPages || 10));
            setName(`extraction_${ranges.length + 2}`);
        }
    };

    return (
        <div className="glass-panel p-4 rounded-sm border border-primary/30 flex flex-col gap-4 h-full overflow-hidden">
            <h3 className="font-tech text-primary uppercase text-xs tracking-widest">
                ✂️ Gestor de Extracciones
            </h3>

            {/* Input Section */}
            <div className="space-y-3 p-3 bg-black/30 rounded border border-primary/20">
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-[10px] text-muted font-data uppercase mb-1 block">
                            Desde
                        </label>
                        <input
                            type="number"
                            min="1"
                            max={maxPages}
                            value={from}
                            onChange={(e) => setFrom(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full bg-base border border-primary/30 text-primary px-2 py-2 rounded-sm font-mono text-xs focus:border-primary focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-muted font-data uppercase mb-1 block">
                            Hasta
                        </label>
                        <input
                            type="number"
                            min="1"
                            max={maxPages}
                            value={to}
                            onChange={(e) => setTo(Math.min(maxPages, parseInt(e.target.value) || maxPages))}
                            className="w-full bg-base border border-primary/30 text-primary px-2 py-2 rounded-sm font-mono text-xs focus:border-primary focus:outline-none"
                        />
                    </div>
                </div>

                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nombre del archivo"
                    className="w-full bg-base border border-primary/30 text-primary px-2 py-2 rounded-sm font-tech text-xs uppercase tracking-wider focus:border-primary focus:outline-none placeholder-gray-600"
                />

                <button
                    onClick={handleAdd}
                    className="w-full px-3 py-2 bg-primary/20 hover:bg-primary/40 border border-primary/50 text-primary rounded-sm text-xs font-tech uppercase tracking-wider transition-all"
                >
                    + Agregar Rango ({to - from + 1} págs)
                </button>
            </div>

            {/* List Section */}
            <div className="flex-1 overflow-auto space-y-2">
                {ranges.length === 0 ? (
                    <div className="text-center text-muted text-xs font-data py-4">
                        Ingresa rangos para extraer
                    </div>
                ) : (
                    ranges.map((range, idx) => (
                        <div
                            key={idx}
                            className="bg-black/30 p-2 rounded border border-primary/20 flex justify-between items-center"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="text-primary font-tech text-xs uppercase truncate">
                                    {range.name}
                                </p>
                                <p className="text-[10px] text-muted">
                                    Pág {range.from}-{range.to} ({range.to - range.from + 1})
                                </p>
                            </div>
                            <button
                                onClick={() => onRemove(idx)}
                                className="ml-2 px-2 py-1 bg-danger/20 hover:bg-danger/40 border border-danger/50 text-danger rounded text-[10px] font-tech transition-all flex-shrink-0"
                            >
                                ✕
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Process Button */}
            {ranges.length > 0 && (
                <button
                    onClick={onProcess}
                    disabled={isProcessing}
                    className="w-full px-4 py-3 bg-success/20 hover:bg-success/40 disabled:bg-gray-700 border border-success/50 text-success font-tech rounded-sm text-xs uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(16,185,129,0.1)] disabled:shadow-none"
                >
                    {isProcessing ? "⏳ Procesando..." : `▶️ Procesar ${ranges.length} Extracciones`}
                </button>
            )}
        </div>
    );
}