/**
 * Shared types for gomas-lab-v2
 * 
 * Central type definitions used across API routes and UI components.
 */

// ── Certificate ──────────────────────────────────────────────

export interface CertificateData {
    hash_original: string;
    hash_markdown: string;
    integrity_hash: string;
    vlm_used: string;
    timestamp: string;
    validation_status: "OK" | "ALERT" | "FAILED";
    anomalies_count: number;
    processing_time_ms: number;
}

// ── Anomalies ────────────────────────────────────────────────

export interface Anomaly {
    type: string;
    location?: string;
    severity: "low" | "medium" | "high";
    description: string;
    action_taken?: string;
}

// ── Extractions ──────────────────────────────────────────────

export interface ExtractionRange {
    from: number;
    to: number;
    name: string;
}

export interface Extraction {
    id?: string;
    name: string;
    from: number;
    to: number;
    markdown: string;
}

// ── Processed Document (frontend state) ──────────────────────

export interface ProcessedDocument {
    markdown: string;
    certificateData: CertificateData | null;
    anomalies: Anomaly[];
    extractions: Extraction[];
    pageCount: number;
}
