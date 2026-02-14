"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="h-screen w-screen bg-base flex items-center justify-center p-8">
                    <div className="glass-panel p-8 rounded-sm border border-danger/30 max-w-lg w-full text-center">
                        <div className="text-4xl mb-4">⚠️</div>
                        <h2 className="font-tech text-danger text-lg uppercase tracking-widest mb-4">
                            Error del Sistema
                        </h2>
                        <p className="text-muted text-sm mb-6">
                            {this.state.error?.message || "Ocurrió un error inesperado."}
                        </p>
                        <button
                            onClick={() => {
                                this.setState({ hasError: false, error: null });
                                window.location.reload();
                            }}
                            className="px-6 py-3 bg-primary/20 hover:bg-primary/40 border border-primary/50 text-primary font-tech rounded-sm text-xs uppercase tracking-wider transition-all"
                        >
                            🔄 Reiniciar
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
