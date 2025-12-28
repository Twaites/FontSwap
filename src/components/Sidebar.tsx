import React, { useState } from 'react';
import { GoogleFont, FontMapping } from '@/types';
import { RefreshCw, RotateCw, Search } from 'lucide-react';
import { FontRow } from './FontRow';

interface SidebarProps {
    detectedFonts: Record<string, number>;
    googleFonts: GoogleFont[];
    mappings: Record<string, FontMapping>;
    onMappingChange: (original: string, replacement: string) => void;
    onToggleHighlight: (original: string) => void;
    onUrlSubmit: (url: string) => void;
    loading: boolean;
    errorMessage?: string; // External error from AppShell
}

export default function Sidebar({
    detectedFonts,
    googleFonts,
    mappings,
    onMappingChange,
    onToggleHighlight,
    onUrlSubmit,
    loading,
    errorMessage: externalError
}: SidebarProps) {
    const [inputUrl, setInputUrl] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!inputUrl) return;

        let finalUrl = inputUrl.trim();
        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
            finalUrl = 'https://' + finalUrl;
        }

        try {
            const parsedUrl = new URL(finalUrl);
            const hostname = parsedUrl.hostname;

            // Check if hostname is valid domain format (basic check)
            if (!hostname.includes('.')) {
                setError('Please enter a valid domain (e.g., example.com)');
                return;
            }

            // check for IP address
            const isIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname);
            if (isIp) {
                setError('IP addresses are not supported. Please use a domain name.');
                return;
            }

            onUrlSubmit(finalUrl);
        } catch (_) {
            setError('Please enter a valid URL');
        }
    };

    return (
        <aside className="w-[350px] shrink-0 h-full bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col shadow-2xl z-10 transition-colors duration-300">
            {/* Header */}
            <div className="p-6 border-b border-[var(--border)] bg-[var(--bg-main)] transition-colors duration-300">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent flex items-center gap-2 mb-4"
                    style={{ backgroundImage: 'linear-gradient(to right, var(--accent), var(--accent-hover))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'var(--accent)' }}>
                    {/* Logo */}
                    <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="6" y="6" width="12" height="12" rx="2" stroke="var(--text-secondary)" strokeWidth="2" />
                        <rect x="14" y="14" width="12" height="12" rx="2" stroke="var(--accent)" strokeWidth="2" />
                        <text x="9" y="15" fontFamily="sans-serif" fontWeight="bold" fontSize="8" fill="var(--text-secondary)">F</text>
                        <text x="17" y="23" fontFamily="sans-serif" fontWeight="bold" fontSize="8" fill="var(--accent)">S</text>
                    </svg>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)]">Font Swap</span>
                </h1>

                {/* URL Input */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <Search className="w-4 h-4 text-[var(--text-secondary)] group-focus-within:text-[var(--accent)] transition-colors" />
                        </div>
                        <input
                            type="text"
                            value={inputUrl}
                            onChange={(e) => {
                                setInputUrl(e.target.value);
                                setError('');
                            }}
                            placeholder="Enter website URL..."
                            className={`w-full bg-[var(--bg-input)] text-[var(--text-main)] pl-10 pr-4 py-2.5 rounded-lg border focus:ring-2 outline-none transition-all placeholder:text-[var(--text-secondary)] text-sm ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-[var(--border)] focus:border-[var(--accent)] focus:ring-[var(--accent-light)]'}`}
                        />
                    </div>
                    {error && <p className="text-xs text-red-500 ml-1">{error}</p>}
                    {externalError && !error && <p className="text-xs text-red-500 ml-1">{externalError}</p>}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white py-2.5 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                    >
                        {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : 'Load Website'}
                    </button>
                </form>
            </div>

            {/* Font List */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[var(--bg-main)]/50">
                {/* Empty State */}
                {!loading && Object.keys(detectedFonts).length === 0 && (
                    <div className="text-center py-10 text-[var(--text-secondary)] px-4">
                        <p className="text-sm">No fonts detected yet.</p>
                        <p className="text-xs mt-2 opacity-70">Enter a URL above to start analyzing typography.</p>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-10 text-[var(--text-secondary)] animate-pulse gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Analyzing Typography...</span>
                    </div>
                )}

                {/* Font Items */}
                {Object.entries(detectedFonts).map(([fontName, count]) => (
                    <FontRow
                        key={fontName}
                        fontName={fontName}
                        count={count}
                        mapping={mappings[fontName] || { active: false, color: '#ccc', replacement: '', original: fontName }}
                        googleFonts={googleFonts}
                        onMappingChange={onMappingChange}
                        onToggleHighlight={onToggleHighlight}
                    />
                ))}
            </div>

            <div className="p-3 border-t border-[var(--border)] bg-[var(--bg-main)] text-[10px] text-[var(--text-secondary)] text-center uppercase tracking-widest font-semibold flex items-center justify-center gap-2">
                <span>Font Swap</span>
                <span className="text-[var(--border)]">•</span>
                <span>Built by AI + <a href="https://twaites.com" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent)] transition-colors">Twaites</a></span>
            </div>
        </aside>
    );
}
