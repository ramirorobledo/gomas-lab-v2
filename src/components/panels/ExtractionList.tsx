"use client";

import { useState, useMemo } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { HudButton, HudInput } from "../ui/HudComponents";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

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
    isProcessing,
    maxPages
}: ExtractionListProps) {
    const clampedMax = useMemo(() => Math.min(10, maxPages || 10), [maxPages]);
    const [from, setFrom] = useState(1);
    const [to, setTo] = useState(clampedMax);
    const [name, setName] = useState("extraction_1");

    const handleAdd = () => {
        if (from > 0 && to <= maxPages && from <= to) {
            onAdd(from, to, name);
            setFrom(1);
            setTo(Math.min(10, maxPages || 10));
            setName(`extraction_${ranges.length + 2}`);
        }
    };

    return (
        <div className="flex flex-col gap-4 h-full">
            <h3 className="font-tech text-primary/70 uppercase text-xs tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary/20 border border-primary/50" />
                TARGET_EXTRACTION_ZONES
            </h3>

            {/* Input Row - Compact Command Line Style */}
            <div className="p-3 bg-white/5 border border-white/10 flex items-center gap-2 rounded-sm backdrop-blur-md">
                <div className="flex items-center gap-2 flex-1">
                    <span className="text-[10px] font-mono text-muted uppercase">RNG:</span>
                    <HudInput
                        type="number"
                        min="1"
                        max={maxPages}
                        value={from}
                        onChange={(e) => setFrom(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-12 text-center"
                        placeholder="#"
                    />
                    <span className="text-muted text-xs">-</span>
                    <HudInput
                        type="number"
                        min="1"
                        max={maxPages}
                        value={to}
                        onChange={(e) => setTo(Math.min(maxPages, parseInt(e.target.value) || maxPages))}
                        className="w-12 text-center"
                        placeholder="#"
                    />
                    <span className="text-muted text-xs mx-1">|</span>
                    <span className="text-[10px] font-mono text-muted uppercase">ID:</span>
                    <HudInput
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="NAME"
                        className="flex-1 min-w-[80px]"
                    />
                </div>
                <HudButton
                    onClick={handleAdd}
                    disabled={isProcessing}
                    className="p-2 h-full aspect-square flex items-center justify-center border-primary/30 text-primary bg-primary/10"
                >
                    <Plus className="w-4 h-4" />
                </HudButton>
            </div>

            {/* Tactical List */}
            <div className="flex-1 overflow-auto space-y-1 pr-1 font-mono text-xs">
                {ranges.length === 0 ? (
                    <div className="text-center text-muted/30 py-8 border border-dashed border-white/10 rounded-sm italic">
                        NO_TARGETS_ACQUIRED
                    </div>
                ) : (
                    ranges.map((range, idx) => (
                        <div
                            key={idx}
                            className="bg-black/40 hover:bg-white/5 p-2 rounded-sm border-l-2 border-primary/20 hover:border-primary flex justify-between items-center group transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-primary/50 text-[10px] w-4">{(idx + 1).toString().padStart(2, '0')}</span>
                                <span className="text-white/90 uppercase tracking-wider font-bold text-[10px]">{range.name}</span>
                                <span className="text-muted text-[10px] bg-white/5 px-1.5 rounded">P.{range.from}-{range.to}</span>
                            </div>

                            <button
                                onClick={() => onRemove(idx)}
                                aria-label={`Remove extraction range ${range.name}`}
                                className="text-danger/40 hover:text-danger hover:bg-danger/10 p-1.5 rounded transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Context Stats */}
            {ranges.length > 0 && (
                <div className="text-[10px] text-primary/40 font-mono text-right border-t border-white/5 pt-2">
                    TOTAL_TARGETS: {ranges.length.toString().padStart(2, '0')} // PAGES: {ranges.reduce((acc, r) => acc + (r.to - r.from + 1), 0)}
                </div>
            )}
        </div>
    );
}