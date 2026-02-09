export default function SystemHeader() {
    return (
        <header className="h-16 flex items-center justify-between px-8 z-20 backdrop-blur-sm">
            <div className="flex items-center gap-4">
                <div className="w-px h-4 bg-primary/50"></div>
                <h2 id="page-title" className="font-tech text-lg text-white tracking-wider uppercase glow-text">
                    OCR VLM FORENSE
                </h2>
            </div>
            <div className="flex items-center gap-6">
                <div className="text-right hidden md:block">
                    <div className="text-[10px] text-primary font-data tracking-widest">
                        ENGINE: MOCK-SIMULATION-V1
                    </div>
                    <div className="text-[10px] text-muted font-mono">LATENCY: 0ms</div>
                </div>
            </div>
        </header>
    );
}