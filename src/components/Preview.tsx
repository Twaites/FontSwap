"use client";

import React, { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';

interface PreviewProps {
    iframeSrc: string;
    iframeRef: React.RefObject<HTMLIFrameElement | null>;
}

export default function Preview({ iframeSrc, iframeRef }: PreviewProps) {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setIsLoaded(false);
    }, [iframeSrc]);

    return (
        <div className="flex-1 flex flex-col h-full bg-[var(--bg-main)] relative min-w-0 transition-colors duration-300">
            {/* Preview Area */}
            <div className="flex-1 relative bg-[var(--bg-secondary)]/50 backdrop-blur-sm overflow-hidden flex flex-col">
                {!iframeSrc ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-secondary)]">
                        <div className="w-20 h-20 bg-[var(--bg-secondary)] rounded-2xl flex items-center justify-center mb-4 shadow-xl border border-[var(--border)] rotate-12 transform hover:rotate-0 transition-all duration-500">
                            <ExternalLink className="w-10 h-10 text-[var(--accent)]" />
                        </div>
                        <h2 className="text-xl font-semibold text-[var(--text-main)]">Ready to Explore</h2>
                        <p className="max-w-md text-center mt-2 opacity-70">Use the sidebar to load a website and start experimenting with fonts.</p>
                    </div>
                ) : (
                    <>
                        {!isLoaded && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg-secondary)]/50 backdrop-blur-sm z-10 p-4">
                                <div className="w-12 h-12 rounded-full border-4 border-[var(--border)] border-t-[var(--accent)] animate-spin mb-4"></div>
                                <p className="text-sm font-medium text-[var(--text-secondary)] animate-pulse">Loading Website...</p>
                            </div>
                        )}
                        <iframe
                            ref={iframeRef}
                            src={iframeSrc}
                            className={`w-full h-full border-0 bg-white transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                            sandbox="allow-scripts allow-same-origin allow-forms"
                            title="Preview"
                            onLoad={() => setIsLoaded(true)}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
