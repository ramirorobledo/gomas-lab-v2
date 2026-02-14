import React from 'react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// -- HUD PANEL --
export function HudPanel({ children, className, title }: { children: React.ReactNode, className?: string, title?: string }) {
    return (
        <div className={cn(
            "relative bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/5 shadow-2xl overflow-hidden",
            "before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/5 before:to-transparent before:pointer-events-none",
            className
        )}>
            {/* Corner Markers */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary/50" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/50" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary/50" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary/50" />

            {/* Scanline Overlay */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-10">
                <div className="w-full h-[2px] bg-primary/50 blur-[1px] absolute top-0 animate-scan" />
            </div>

            {title && (
                <div className="absolute top-0 left-0 right-0 h-8 flex items-center px-3 border-b border-white/5 bg-black/40 z-10">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse mr-2" />
                    <span className="font-tech text-xs tracking-[0.2em] text-primary/80 uppercase">{title}</span>
                </div>
            )}

            <div className={cn("relative z-10 h-full", title && "pt-8 pb-2 px-2")}>
                {children}
            </div>
        </div>
    );
}

// -- HUD BUTTON --
interface HudButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'danger' | 'success' | 'ghost';
    isLoading?: boolean;
}

export function HudButton({ children, className, variant = 'primary', isLoading, ...props }: HudButtonProps) {
    const variants = {
        primary: "border-primary/50 text-primary bg-primary/10 hover:bg-primary/20 hover:border-primary hover:shadow-[0_0_15px_rgba(0,243,255,0.3)]",
        danger: "border-danger/50 text-danger bg-danger/10 hover:bg-danger/20 hover:border-danger hover:shadow-[0_0_15px_rgba(255,45,85,0.3)]",
        success: "border-success/50 text-success bg-success/10 hover:bg-success/20 hover:border-success hover:shadow-[0_0_15px_rgba(0,255,157,0.3)]",
        ghost: "border-transparent text-muted hover:text-white hover:bg-white/5"
    };

    return (
        <motion.button
            whileTap={{ scale: 0.98 }}
            className={cn(
                "px-4 py-2 font-tech text-xs uppercase tracking-widest border transition-all duration-300 relative overflow-hidden group",
                variants[variant],
                props.disabled && "opacity-50 cursor-not-allowed hover:shadow-none hover:bg-transparent",
                className
            )}
            {...props as any} // Cast to any to bypass the motion strict type check for now
        >
            <span className="relative z-10 flex items-center justify-center gap-2">
                {isLoading && <span className="animate-spin mr-1">⟳</span>}
                {children}
            </span>
            {/* Glitch hover effect overlay */}
            <div className="absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        </motion.button>
    );
}

// -- HUD INPUT --
export function HudInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div className="relative group">
            <input
                className={cn(
                    "w-full bg-black/50 border border-white/10 text-primary font-mono text-xs px-3 py-2 focus:outline-none focus:border-primary/50 focus:bg-primary/5 transition-all placeholder-white/20",
                    className
                )}
                {...props}
            />
            {/* Active corner indicator */}
            <div className="absolute bottom-0 right-0 w-0 h-0 border-b-[6px] border-r-[6px] border-b-transparent border-r-primary/0 group-focus-within:border-r-primary transition-all duration-300" />
        </div>
    );
}

// -- STATUS BADGE --
export function StatusBadge({ status }: { status: 'idle' | 'processing' | 'completed' | 'failed' }) {
    const styles = {
        idle: "bg-white/5 text-muted border-white/10",
        processing: "bg-process/10 text-process border-process/30 animate-pulse",
        completed: "bg-success/10 text-success border-success/30",
        failed: "bg-danger/10 text-danger border-danger/30"
    };

    return (
        <span className={cn(
            "px-2 py-0.5 rounded-sm border font-mono text-[10px] uppercase tracking-wider",
            styles[status]
        )}>
            {status}
        </span>
    );
}
