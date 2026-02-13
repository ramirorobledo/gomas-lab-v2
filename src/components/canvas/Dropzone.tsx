"use client";

interface DropzoneProps {
    onFileDrop: (file: File) => void;
    file: File | null;
    loading: boolean;
}

export default function Dropzone({ onFileDrop, file, loading }: DropzoneProps) {
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (loading) return;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFileDrop(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFileDrop(e.target.files[0]);
        }
    };

    return (
        <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="glass-panel rounded-sm border border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 transition-all p-8 flex flex-col items-center justify-center cursor-pointer group flex-1 relative overflow-hidden"
        >
            {/* Decorative corners */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-primary opacity-50"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-primary opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-primary opacity-50"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-primary opacity-50"></div>

            <input
                type="file"
                className="hidden"
                id="file-upload"
                onChange={handleChange}
                accept=".pdf"
                disabled={loading}
            />

            {!loading ? (
                <label htmlFor="file-upload" className="w-full h-full flex flex-col items-center justify-center cursor-pointer z-10">
                    <div className="text-center pointer-events-none">
                        <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center relative">
                            <div className="absolute inset-0 border border-primary/20 rounded-full animate-spin-slow"></div>
                            <div className="absolute inset-4 border border-dashed border-primary/40 rounded-full animate-reverse-spin"></div>
                            <svg
                                className="w-8 h-8 text-primary group-hover:drop-shadow-[0_0_10px_rgba(99,102,241,0.8)] transition-all"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.5"
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                                ></path>
                            </svg>
                        </div>
                        <h3 className="font-tech text-white text-lg tracking-wide uppercase">
                            UPLOAD TARGET
                        </h3>
                        <p className="font-data text-primary text-xs mt-2 uppercase tracking-wider">
                            {file ? `[ ${file.name} ]` : "[ DRAG & DROP or CLICK ]"}
                        </p>
                    </div>
                </label>
            ) : (
                <div className="text-center w-full z-10">
                    <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                    <div className="font-tech text-xs text-primary uppercase tracking-widest animate-pulse">
                        PROCESSING...
                    </div>
                </div>
            )}
        </div>
    );
}