"use client";

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import Preview from './Preview';
import { GoogleFont, DetectedFonts, FontMapping } from '@/types';
import { getRandomColor } from '@/utils/colors';

export default function AppShell() {
    const [googleFonts, setGoogleFonts] = useState<GoogleFont[]>([]);
    const [detectedFonts, setDetectedFonts] = useState<DetectedFonts>({});
    const [mappings, setMappings] = useState<Record<string, FontMapping>>({});
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [iframeSrc, setIframeSrc] = useState('');
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout>(null);

    // Fetch Google Fonts
    useEffect(() => {
        const fetchFonts = async () => {
            try {
                const res = await fetch('/api/fonts');
                if (res.ok) {
                    const data = await res.json();
                    setGoogleFonts(data);
                }
            } catch (e) {
                console.error('Failed to load fonts', e);
            }
        };
        fetchFonts();
    }, []);

    const handleUrlSubmit = (url: string) => {
        setLoading(true);
        setErrorMessage('');

        // Clear existing timeout
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        // Reset state
        setDetectedFonts({});
        setMappings({});

        const encoded = encodeURIComponent(url);
        // Force reload by appending timestamp
        setIframeSrc(`/api/proxy?url=${encoded}&t=${Date.now()}`);

        // Set 20s timeout
        timeoutRef.current = setTimeout(() => {
            setLoading(false);
            setErrorMessage('Request timed out. The website might be blocking access or took too long to load.');
        }, 20000);
    };

    // Listen for messages from Iframe
    useEffect(() => {
        const handler = (event: MessageEvent) => {
            // Setup listener logic
            const { type, fonts } = event.data;

            if (type === 'FONT_ANALYSIS') {
                // Clear timeout on success
                if (timeoutRef.current) clearTimeout(timeoutRef.current);

                setLoading(false);
                setDetectedFonts(fonts);

                // Merge new fonts with existing mappings to preserve state
                setMappings(prevMappings => {
                    const newMappings: Record<string, FontMapping> = {};

                    Object.keys(fonts).forEach((font, idx) => {
                        // If we already have this font mapped, preserve its state
                        if (prevMappings[font]) {
                            newMappings[font] = prevMappings[font];
                        } else {
                            // Otherwise initialize new mapping
                            newMappings[font] = {
                                original: font,
                                replacement: '',
                                active: false,
                                color: getRandomColor(idx)
                            };
                        }
                    });
                    return newMappings;
                });
            }
        };

        window.addEventListener('message', handler);
        return () => {
            window.removeEventListener('message', handler);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const handleToggleHighlight = (fontName: string) => {
        const mapping = mappings[fontName];
        if (!mapping) return;

        const newActive = !mapping.active;

        // Update local state first
        const newMappings = {
            ...mappings,
            [fontName]: { ...mapping, active: newActive }
        };
        setMappings(newMappings);

        // Gather ALL active highlights to send
        const activeHighlights = Object.values(newMappings)
            .filter(m => m.active)
            .map(m => ({ font: m.original, color: m.color }));

        // Send message to iframe
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
                type: 'UPDATE_HIGHLIGHTS',
                payload: activeHighlights
            }, '*');
        }
    };

    const handleMappingChange = (fontName: string, newFontFamily: string) => {
        setMappings(prev => ({
            ...prev,
            [fontName]: { ...prev[fontName], replacement: newFontFamily }
        }));

        if (!iframeRef.current?.contentDocument) return;

        // 1. Inject Stylesheet if needed
        if (newFontFamily) {
            const doc = iframeRef.current.contentDocument;
            const id = `font-swap-link-${newFontFamily.replace(/\s+/g, '-')}`;
            if (!doc.getElementById(id)) {
                const link = doc.createElement('link');
                link.id = id;
                link.rel = 'stylesheet';
                link.href = `https://fonts.googleapis.com/css2?family=${newFontFamily.replace(/\s+/g, '+')}&display=swap`;
                doc.head.appendChild(link);
            }
        }

        // 2. Apply Font
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
                type: 'CHANGE_FONT',
                payload: {
                    target: fontName,
                    newFont: newFontFamily
                }
            }, '*');
        }
    };

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-300">
            <Sidebar
                detectedFonts={detectedFonts}
                googleFonts={googleFonts}
                mappings={mappings}
                onMappingChange={handleMappingChange}
                onToggleHighlight={handleToggleHighlight}
                onUrlSubmit={handleUrlSubmit}
                loading={loading}
                errorMessage={errorMessage}
            />
            <Preview
                iframeSrc={iframeSrc}
                iframeRef={iframeRef}
            />
        </div>
    );
}
