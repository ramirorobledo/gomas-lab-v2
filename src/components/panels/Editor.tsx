"use client";

import React, { useState, useEffect } from "react";

interface EditorProps {
    markdown: string;
    onChange?: (value: string) => void;
    readOnly?: boolean;
}

export function Editor({ markdown, onChange, readOnly = false }: EditorProps) {
    const [content, setContent] = useState(markdown);

    // Sync internal state when markdown prop changes (e.g. new PDF processed)
    useEffect(() => {
        setContent(markdown);
    }, [markdown]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setContent(newContent);
        onChange?.(newContent);
    };

    return (
        <div className="editor-container h-full flex flex-col">
            <div className="editor-header px-4 py-3 border-b border-border bg-panel/50">
                <h3 className="text-sm font-tech text-primary uppercase tracking-widest">📝 Markdown Editor</h3>
            </div>

            <textarea
                value={content}
                onChange={handleChange}
                readOnly={readOnly}
                className="flex-1 p-4 bg-base text-txt-main font-mono text-sm resize-none border-0 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Markdown output will appear here..."
            />

            <div className="editor-footer px-4 py-2 bg-panel/30 border-t border-border flex justify-between text-xs text-muted">
                <span>{content.length} characters</span>
                <span>{content.split("\n").length} lines</span>
            </div>
        </div>
    );
}