"use client";

import React, { useState } from "react";

interface EditorProps {
    markdown: string;
    onChange?: (value: string) => void;
    readOnly?: boolean;
}

export function Editor({ markdown, onChange, readOnly = false }: EditorProps) {
    const [content, setContent] = useState(markdown);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setContent(newContent);
        onChange?.(newContent);
    };

    return (
        <div className="editor-container h-full flex flex-col">
            <div className="editor-header px-4 py-3 border-b border-slate-700 bg-slate-900/50">
                <h3 className="text-sm font-semibold text-slate-300">📝 Markdown Editor</h3>
            </div>

            <textarea
                value={content}
                onChange={handleChange}
                readOnly={readOnly}
                className="flex-1 p-4 bg-slate-950 text-slate-100 font-mono text-sm resize-none border-0 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Markdown output will appear here..."
            />

            <div className="editor-footer px-4 py-2 bg-slate-900/30 border-t border-slate-700 flex justify-between text-xs text-slate-400">
                <span>{content.length} characters</span>
                <span>{content.split("\n").length} lines</span>
            </div>
        </div>
    );
}