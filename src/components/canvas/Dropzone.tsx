"use client";

import React, { useRef, useState } from "react";

interface DropzoneProps {
    onFileDrop: (file: File) => void;
    file?: File | null;
    loading?: boolean;
}

export function Dropzone({ onFileDrop, file, loading = false }: DropzoneProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.type === "application/pdf") {
                onFileDrop(droppedFile);
            } else {
                alert("Por favor, sube un archivo PDF");
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileDrop(e.target.files[0]);
        }
    };

    return (
        <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`
        dropzone relative w-full h-48 rounded-lg border-2 border-dashed transition-all cursor-pointer
        ${dragActive ? "border-indigo-500 bg-indigo-950/20" : "border-slate-700 bg-slate-900/50 hover:border-slate-600"}
        ${loading ? "opacity-50 cursor-not-allowed" : ""}
      `}
            onClick={() => !loading && inputRef.current?.click()}
        >
            <input
                ref={inputRef}
                type="file"
                accept=".pdf"
                onChange={handleChange}
                className="hidden"
                disabled={loading}
            />

            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                {file ? (
                    <>
                        <p className="text-lg">✅</p>
                        <p className="text-sm font-semibold text-indigo-400">{file.name}</p>
                        <p className="text-xs text-slate-400">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                    </>
                ) : (
                    <>
                        <p className="text-2xl">📄</p>
                        <p className="text-sm font-semibold text-slate-300">
                            Arrastra PDF aquí
                        </p>
                        <p className="text-xs text-slate-400">o click para seleccionar</p>
                    </>
                )}
            </div>
        </div>
    );
}