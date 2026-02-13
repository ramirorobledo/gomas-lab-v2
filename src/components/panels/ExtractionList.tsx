"use client";

interface ExtractionRange {
    from: number;
    to: number;
    name: string;
}

interface ExtractionListProps {
    ranges: ExtractionRange[];
    onRemove: (index: number) => void;
    onProcess: () => void;
    isProcessing: boolean;
}

export default function ExtractionList({
    ranges,
    onRemove,
    onProcess,
    isProcessing
}: ExtractionListProps) {
    return (
        <div className="glass-panel p-4 rounded-sm border border-primary/30 flex flex-col gap-4 h-full overflow-hidden">
            <h3 className="font-tech text-primary uppercase text-xs tracking-widest">
                ✂️ Extracciones ({ranges.length})
            </h3>

            {/* List */}
            <div className="flex-1 overflow-auto space-y-2">
                {ranges.length === 0 ? (
                    <div className="text-center text-muted text-xs font-data py-4">
                        Selecciona rangos en el visor PDF
                    </div>
                ) : (
                    ranges.map((range, idx) => (
                        <div
                            key={idx}
                            className="bg-black/30 p-3 rounded border border-primary/20 flex justify-between items-center"
                        >
                            <div className="flex-1">
                                <input
                                    type="text"
                                    defaultValue={range.name}
                                    placeholder="Nombre del archivo"
                                    className="w-full bg-transparent text-primary font-tech text-xs uppercase tracking-wider focus:outline-none border-b border-primary/30 focus:border-primary transition-all"
                                />
                                <p className="text-[10px] text-muted mt-1">
                                    Páginas {range.from}-{range.to} ({range.to - range.from + 1} páginas)
                                </p>
                            </div>
                            <button
                                onClick={() => onRemove(idx)}
                                className="ml-2 px-2 py-1 bg-danger/20 hover:bg-danger/40 border border-danger/50 text-danger rounded text-[10px] font-tech uppercase transition-all"
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
                    {isProcessing ? "⏳ Procesando Extracciones..." : "▶️ Procesar Todo"}
                </button>
            )}
        </div>
    );
}