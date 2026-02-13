"use client";

import { useState, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";

if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;
}

interface PDFViewerProps {
    file: File;
    onRangeSelect?: (from: number, to: number) => void;
}

export default function PDFViewer({ file, onRangeSelect }: PDFViewerProps) {
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [rangeFrom, setRangeFrom] = useState(1);
    const [rangeTo, setRangeTo] = useState(1);
    const [loading, setLoading] = useState(true);
    const [pdfDoc, setPdfDoc] = useState<any>(null);

    useEffect(() => {
        const loadPDF = async () => {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                setPdfDoc(pdf);
                setNumPages(pdf.numPages);
                setRangeTo(pdf.numPages);
                setLoading(false);
            } catch (error) {
                console.error("Error loading PDF:", error);
                setLoading(false);
            }
        };
        loadPDF();
    }, [file]);

    const handleExtract = () => {
        if (rangeFrom > 0 && rangeTo <= numPages && rangeFrom <= rangeTo) {
            onRangeSelect?.(rangeFrom, rangeTo);
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-panel/30 backdrop-blur-sm rounded-sm border border-primary/30">
                <div className="text-center">
                    <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="font-tech text-xs text-primary uppercase">Cargando PDF...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-panel/30 backdrop-blur-sm rounded-sm border border-primary/30 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-primary/20 bg-black/30">
                <h3 className="font-tech text-primary uppercase text-xs tracking-widest mb-4">
                    📄 PDF Viewer ({numPages} páginas)
                </h3>

                {/* Range Selector */}
                <div className="space-y-3">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="text-[10px] text-muted font-data uppercase mb-1 block">
                                Desde página
                            </label>
                            <input
                                type="number"
                                min="1"
                                max={numPages}
                                value={rangeFrom}
                                onChange={(e) => setRangeFrom(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full bg-base border border-primary/30 text-primary px-3 py-2 rounded-sm font-mono text-sm focus:border-primary focus:outline-none"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] text-muted font-data uppercase mb-1 block">
                                Hasta página
                            </label>
                            <input
                                type="number"
                                min="1"
                                max={numPages}
                                value={rangeTo}
                                onChange={(e) => setRangeTo(Math.min(numPages, parseInt(e.target.value) || numPages))}
                                className="w-full bg-base border border-primary/30 text-primary px-3 py-2 rounded-sm font-mono text-sm focus:border-primary focus:outline-none"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleExtract}
                        className="w-full px-4 py-2 bg-primary/20 hover:bg-primary/40 border border-primary/50 text-primary font-tech rounded-sm text-xs uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(99,102,241,0.1)]"
                    >
                        ✂️ Extraer Rango ({rangeTo - rangeFrom + 1} páginas)
                    </button>
                </div>
            </div>

            {/* Page Navigator */}
            <div className="p-4 border-b border-primary/20 bg-black/20">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 bg-primary/20 hover:bg-primary/40 disabled:bg-gray-800 border border-primary/30 text-primary disabled:text-gray-600 rounded-sm text-xs font-tech uppercase transition-all"
                    >
                        ◀ Atrás
                    </button>

                    <div className="flex-1 text-center text-sm font-data text-primary">
                        Página {currentPage} / {numPages}
                    </div>

                    <button
                        onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
                        disabled={currentPage === numPages}
                        className="px-3 py-2 bg-primary/20 hover:bg-primary/40 disabled:bg-gray-800 border border-primary/30 text-primary disabled:text-gray-600 rounded-sm text-xs font-tech uppercase transition-all"
                    >
                        Adelante ▶
                    </button>
                </div>
            </div>

            {/* PDF Preview Area */}
            <div className="flex-1 overflow-auto bg-black/60 p-4">
                <div className="text-center text-muted font-data text-xs">
                    <p>🔍 Vista previa de página {currentPage}</p>
                    <p className="text-[10px] mt-2">(Renderizado de PDF en desarrollo)</p>
                </div>
            </div>
        </div>
    );
}