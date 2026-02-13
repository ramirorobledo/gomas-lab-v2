export default function SystemHeader() {
    return (
        <header className="h-16 flex items-center justify-between px-8 z-20 backdrop-blur-sm border-b border-border bg-panel/30">
            <div className="flex items-center gap-4">
                <div className="w-px h-4 bg-primary/50"></div>
                <h2 className="font-tech text-lg text-primary glow-text tracking-wider uppercase">
                    🔬 OCR FORENSE
                </h2>
            </div>
            <div className="flex items-center gap-6">
                <div className="text-right hidden md:block">
                    <div className="text-[10px] text-primary font-data tracking-widest">
                        ENGINE: GEMINI-VLM-2.0
                    </div>
                    <div className="text-[10px] text-muted font-mono">STATUS: READY</div>
                </div>
            </div>
        </header>
    );
}