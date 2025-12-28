import React, { useState, useMemo } from 'react';
import { GoogleFont, FontMapping } from '@/types';
import { Highlighter, Check, ChevronDown, Filter, ArrowDownWideNarrow, TrendingUp, Calendar, ArrowDownAZ, Star, Eye, EyeOff, X, ChevronLeft, ChevronRight } from 'lucide-react';
import * as Select from '@radix-ui/react-select';
import * as Popover from '@radix-ui/react-popover';
import * as Checkbox from '@radix-ui/react-checkbox';

type SortOption = 'popular' | 'alpha' | 'trending' | 'newest';

const CATEGORIES = ['serif', 'sans-serif', 'display', 'handwriting', 'monospace'];

interface FontRowProps {
    fontName: string;
    count: number;
    mapping: FontMapping;
    googleFonts: GoogleFont[];
    onMappingChange: (original: string, replacement: string) => void;
    onToggleHighlight: (original: string) => void;
}

export const FontRow = ({
    fontName,
    count,
    mapping,
    googleFonts,
    onMappingChange,
    onToggleHighlight
}: FontRowProps) => {
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<SortOption>('popular');
    const [visibleCount, setVisibleCount] = useState(20);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [isCompareMode, setIsCompareMode] = useState(false);
    const lastReplacementRef = React.useRef(mapping.replacement);

    // Filter & Sort Logic
    const processedFonts = useMemo(() => {
        let result = googleFonts;

        // 1. Filter
        if (selectedCategories.length > 0) {
            result = result.filter(gf => selectedCategories.includes(gf.category));
        }

        // 2. Sort
        const sorted = [...result]; // Clone to sort

        switch (sortBy) {
            case 'alpha':
                sorted.sort((a, b) => a.family.localeCompare(b.family));
                break;
            case 'trending':
                // Sort by trendingRank (ascending: 0 is #1 trend)
                sorted.sort((a, b) => (a.trendingRank ?? 9999) - (b.trendingRank ?? 9999));
                break;
            case 'newest':
                // Sort by dateRank (ascending: 0 is newest)
                sorted.sort((a, b) => (a.dateRank ?? 9999) - (b.dateRank ?? 9999));
                break;
            case 'popular':
            default:
                // Sort by popularityRank (ascending)
                sorted.sort((a, b) => (a.popularityRank ?? 9999) - (b.popularityRank ?? 9999));
                break;
        }

        return sorted;
    }, [googleFonts, selectedCategories, sortBy]);

    // Reset selection on sort or filter change
    React.useEffect(() => {
        if (mapping.replacement) {
            onMappingChange(fontName, '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortBy, selectedCategories]);

    // Derived Options
    const options = useMemo(() => {
        const list = processedFonts.slice(0, visibleCount).map(gf => ({
            value: gf.family,
            label: gf.family,
            family: gf.family
        }));

        // Always include "Default" option at the top
        return [
            { value: 'original-font-reset', label: `${fontName} (Default)`, family: '' },
            ...list
        ];
    }, [processedFonts, visibleCount, fontName]);

    // Track loaded fonts to avoid redundant requests/large URLs
    const loadedFonts = React.useRef(new Set<string>());

    // 1. Ensure currently selected font is ALWAYS loaded
    React.useEffect(() => {
        const selected = mapping.replacement;
        if (selected && !loadedFonts.current.has(selected)) {
            const href = `https://fonts.googleapis.com/css2?family=${selected.replace(/\s+/g, '+')}&display=swap`;
            if (!document.querySelector(`link[href="${href}"]`)) {
                const link = document.createElement('link');
                link.href = href;
                link.rel = 'stylesheet';
                document.head.appendChild(link);
                loadedFonts.current.add(selected);
            }
        }
    }, [mapping.replacement]);

    // 2. Load styles for visible options (Incremental)
    React.useEffect(() => {
        // Identify which visible options haven't been loaded yet
        const familiesToLoad = options
            .filter(o => o.family && !loadedFonts.current.has(o.family))
            .map(o => o.family);

        if (familiesToLoad.length === 0) return;

        // Load in batches to prevent huge URLs
        // We only load the NEW ones here.
        const familyParam = familiesToLoad.map(f => f.replace(/\s+/g, '+')).join('&family=');
        const href = `https://fonts.googleapis.com/css2?family=${familyParam}&display=swap`;

        if (!document.querySelector(`link[href="${href}"]`)) {
            const link = document.createElement('link');
            link.href = href;
            link.rel = 'stylesheet';
            document.head.appendChild(link);

            // Mark as loaded
            familiesToLoad.forEach(f => loadedFonts.current.add(f));
        }
    }, [options]);

    const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
        if (scrollHeight - scrollTop - clientHeight < 100) {
            if (visibleCount < processedFonts.length) {
                setVisibleCount(prev => Math.min(prev + 20, processedFonts.length));
            }
        }
    };

    const toggleCategory = (cat: string) => {
        setSelectedCategories(prev =>
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
        setVisibleCount(20); // Reset scroll
    };

    const clearFilters = () => {
        setSelectedCategories([]);
        setVisibleCount(20);
        setIsFilterOpen(false);
    };

    const currentValue = mapping.replacement || 'original-font-reset';

    return (
        <div
            className={`bg-[var(--bg-secondary)] p-3 rounded-md border transition-all group shadow-sm ${mapping.active ? 'border-l-4' : 'border border-[var(--border)] hover:border-[var(--accent-light)]'}`}
            style={mapping.active ? {
                borderColor: mapping.color,
                backgroundColor: `${mapping.color}10`,
            } : {}}
        >
            <div className="flex justify-between items-center mb-2 gap-2">
                <div className="flex-1 min-w-0 pr-2">
                    <h3
                        className="font-semibold text-sm text-[var(--text-main)] truncate"
                        title={fontName}
                        style={mapping.active ? { color: mapping.color } : {}}
                    >
                        {fontName}
                    </h3>
                </div>

                <div className="flex items-center gap-1">
                    {/* 1. Show/Hide */}
                    {(mapping.replacement || isCompareMode) && (
                        <button
                            onClick={() => {
                                if (isCompareMode) {
                                    setIsCompareMode(false);
                                    if (lastReplacementRef.current) {
                                        onMappingChange(fontName, lastReplacementRef.current);
                                    }
                                } else {
                                    lastReplacementRef.current = mapping.replacement;
                                    setIsCompareMode(true);
                                    onMappingChange(fontName, '');
                                }
                            }}
                            className={`p-1 rounded transition-colors border ${isCompareMode ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10' : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-main)] hover:text-[var(--text-main)]'}`}
                            title={isCompareMode ? "Show Replacement" : "Hide Replacement (Show Original)"}
                        >
                            {isCompareMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                    )}

                    {/* 2. Highlighter */}
                    <button
                        onClick={() => onToggleHighlight(fontName)}
                        className={`p-1 rounded transition-colors border ${!mapping.active && 'border-transparent'}`}
                        style={mapping.active ? {
                            backgroundColor: `${mapping.color}20`,
                            color: mapping.color,
                            borderColor: `${mapping.color}50`
                        } : {}}
                        title="Highlight this font"
                    >
                        <Highlighter className={`w-3.5 h-3.5 ${!mapping.active ? 'text-[var(--text-secondary)] hover:text-[var(--text-main)]' : ''}`} />
                    </button>

                    {/* Separator */}
                    <div className="h-3 w-[1px] bg-[var(--border)] mx-0.5"></div>

                    {/* 3. Sort */}
                    <Popover.Root open={isSortOpen} onOpenChange={setIsSortOpen}>
                        <Popover.Trigger asChild>
                            <button
                                className="p-1 rounded hover:bg-[var(--bg-main)] transition-colors text-[var(--text-secondary)]"
                                title="Sort Fonts"
                            >
                                <ArrowDownWideNarrow className="w-3.5 h-3.5" />
                            </button>
                        </Popover.Trigger>
                        <Popover.Portal>
                            <Popover.Content
                                className="w-44 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border)] shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-200"
                                sideOffset={5}
                                align="end"
                            >
                                <h4 className="text-xs font-semibold text-[var(--text-main)] mb-2 pb-2 border-b border-[var(--border)]">Sort By</h4>
                                <div className="flex flex-col gap-1">
                                    <button
                                        onClick={() => { setSortBy('popular'); setIsSortOpen(false); }}
                                        className={`flex items-center justify-between w-full px-2 py-1.5 text-xs rounded hover:bg-[var(--bg-main)] ${sortBy === 'popular' ? 'text-[var(--accent)] font-medium' : 'text-[var(--text-secondary)]'}`}
                                    >
                                        <span className="flex items-center gap-2"><Star className="w-3 h-3" /> Most Popular</span>
                                        {sortBy === 'popular' && <Check className="w-3 h-3" />}
                                    </button>
                                    <button
                                        onClick={() => { setSortBy('trending'); setIsSortOpen(false); }}
                                        className={`flex items-center justify-between w-full px-2 py-1.5 text-xs rounded hover:bg-[var(--bg-main)] ${sortBy === 'trending' ? 'text-[var(--accent)] font-medium' : 'text-[var(--text-secondary)]'}`}
                                    >
                                        <span className="flex items-center gap-2"><TrendingUp className="w-3 h-3" /> Trending</span>
                                        {sortBy === 'trending' && <Check className="w-3 h-3" />}
                                    </button>
                                    <button
                                        onClick={() => { setSortBy('newest'); setIsSortOpen(false); }}
                                        className={`flex items-center justify-between w-full px-2 py-1.5 text-xs rounded hover:bg-[var(--bg-main)] ${sortBy === 'newest' ? 'text-[var(--accent)] font-medium' : 'text-[var(--text-secondary)]'}`}
                                    >
                                        <span className="flex items-center gap-2"><Calendar className="w-3 h-3" /> Newest</span>
                                        {sortBy === 'newest' && <Check className="w-3 h-3" />}
                                    </button>
                                    <button
                                        onClick={() => { setSortBy('alpha'); setIsSortOpen(false); }}
                                        className={`flex items-center justify-between w-full px-2 py-1.5 text-xs rounded hover:bg-[var(--bg-main)] ${sortBy === 'alpha' ? 'text-[var(--accent)] font-medium' : 'text-[var(--text-secondary)]'}`}
                                    >
                                        <span className="flex items-center gap-2"><ArrowDownAZ className="w-3 h-3" /> Alphabetical</span>
                                        {sortBy === 'alpha' && <Check className="w-3 h-3" />}
                                    </button>
                                </div>
                                <Popover.Arrow className="fill-[var(--bg-secondary)] stroke-[var(--border)]" />
                            </Popover.Content>
                        </Popover.Portal>
                    </Popover.Root>

                    {/* 4. Filter */}
                    <Popover.Root open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                        <Popover.Trigger asChild>
                            <button
                                className={`p-1 rounded hover:bg-[var(--bg-main)] transition-colors ${selectedCategories.length > 0 ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}
                                title="Filter Fonts"
                            >
                                <Filter className="w-3.5 h-3.5" />
                            </button>
                        </Popover.Trigger>
                        <Popover.Portal>
                            <Popover.Content
                                className="w-48 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border)] shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-200"
                                sideOffset={5}
                                align="end"
                            >
                                <div className="flex items-center justify-between mb-2 pb-2 border-b border-[var(--border)]">
                                    <h4 className="text-xs font-semibold text-[var(--text-main)]">Filter Categories</h4>
                                    {selectedCategories.length > 0 && (
                                        <button
                                            onClick={clearFilters}
                                            className="text-[10px] text-[var(--text-secondary)] hover:text-[var(--accent)] flex items-center gap-0.5"
                                        >
                                            <X className="w-3 h-3" />
                                            Clear
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    {CATEGORIES.map(cat => (
                                        <div key={cat} className="flex items-center gap-2">
                                            <Checkbox.Root
                                                className="w-4 h-4 rounded border border-[var(--border)] bg-[var(--bg-main)] data-[state=checked]:bg-[var(--accent)] data-[state=checked]:border-[var(--accent)] flex items-center justify-center transition-colors"
                                                checked={selectedCategories.includes(cat)}
                                                onCheckedChange={() => toggleCategory(cat)}
                                                id={`${fontName}-${cat}`}
                                            >
                                                <Checkbox.Indicator className="text-white">
                                                    <Check className="w-3 h-3" />
                                                </Checkbox.Indicator>
                                            </Checkbox.Root>
                                            <label
                                                htmlFor={`${fontName}-${cat}`}
                                                className="text-xs text-[var(--text-secondary)] capitalize cursor-pointer select-none hover:text-[var(--text-main)]"
                                            >
                                                {cat}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                <Popover.Arrow className="fill-[var(--bg-secondary)] stroke-[var(--border)]" />
                            </Popover.Content>
                        </Popover.Portal>
                    </Popover.Root>

                    {/* Separator */}
                    <div className="h-3 w-[1px] bg-[var(--border)] mx-0.5"></div>

                    {/* 5. Prev */}
                    <button
                        onClick={() => {
                            const currentIndex = processedFonts.findIndex(gf => gf.family === mapping.replacement);
                            if (currentIndex > 0) {
                                onMappingChange(fontName, processedFonts[currentIndex - 1].family);
                            } else if (currentIndex === 0) {
                                onMappingChange(fontName, '');
                            }
                        }}
                        disabled={!mapping.replacement}
                        className="p-1 rounded hover:bg-[var(--bg-main)] transition-colors text-[var(--text-secondary)] disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Previous Font"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    {/* 6. Next */}
                    <button
                        onClick={() => {
                            const currentIndex = processedFonts.findIndex(gf => gf.family === mapping.replacement);
                            let nextIndex = -1;

                            if (currentIndex < processedFonts.length - 1) {
                                nextIndex = currentIndex + 1;
                            } else if (currentIndex === -1 && processedFonts.length > 0) {
                                nextIndex = 0;
                            }

                            if (nextIndex !== -1) {
                                // Lazy Load: If next item is beyond visible range, expand the list
                                if (nextIndex >= visibleCount) {
                                    setVisibleCount(prev => Math.max(prev, nextIndex + 20));
                                }
                                onMappingChange(fontName, processedFonts[nextIndex].family);
                            }
                        }}
                        disabled={processedFonts.length > 0 && processedFonts.findIndex(gf => gf.family === mapping.replacement) === processedFonts.length - 1}
                        className="p-1 rounded hover:bg-[var(--bg-main)] transition-colors text-[var(--text-secondary)] disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Next Font"
                    >
                        <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <div className="relative">
                <div className="mb-1">
                    <label className="text-[10px] uppercase text-[var(--text-secondary)] font-bold tracking-wider">
                        SWAP{' '}
                        <span style={{ color: mapping.active ? mapping.color : 'var(--text-main)' }}>
                            {count} ELEMENTS
                        </span>{' '}
                        WITH:
                    </label>
                </div>
                <Select.Root
                    value={isCompareMode ? (lastReplacementRef.current || 'original-font-reset') : currentValue}
                    onValueChange={(val) => {
                        setIsCompareMode(false);
                        onMappingChange(fontName, val === 'original-font-reset' ? '' : val);
                    }}
                >
                    <Select.Trigger
                        key={isCompareMode ? (lastReplacementRef.current || 'default') : (mapping.replacement || 'default')}
                        className="w-full bg-[var(--bg-main)] text-[var(--text-main)] text-sm rounded-lg border border-[var(--border)] p-2 flex items-center justify-between outline-none focus:ring-2 focus:ring-[var(--accent)] hover:border-[var(--accent-light)] transition-all data-[placeholder]:text-[var(--text-secondary)]"
                        style={(isCompareMode ? lastReplacementRef.current : mapping.replacement) ? { fontFamily: `"${isCompareMode ? lastReplacementRef.current : mapping.replacement}"` } : {}}
                    >
                        <span
                            className="flex-1 min-w-0 truncate text-left mr-2"
                            title={isCompareMode ? (lastReplacementRef.current || fontName) : (mapping.replacement || fontName)}
                        >
                            <Select.Value placeholder="Select a font" />
                        </span>
                        <Select.Icon className="text-[var(--text-secondary)] shrink-0">
                            <ChevronDown className="w-4 h-4" />
                        </Select.Icon>
                    </Select.Trigger>

                    <Select.Portal>
                        <Select.Content
                            className="overflow-hidden bg-[var(--bg-secondary)] rounded-md border border-[var(--border)] shadow-xl z-50 max-h-[300px]"
                            position="popper"
                            sideOffset={5}
                            style={{ width: 'var(--radix-select-trigger-width)' }}
                        >
                            <Select.Viewport className="p-1" onScroll={handleScroll}>
                                {options.map((option) => (
                                    <Select.Item
                                        key={option.value}
                                        value={option.value}
                                        className="relative flex items-center h-9 px-8 text-sm leading-none text-[var(--text-main)] rounded-[3px] select-none data-[disabled]:text-slate-500 data-[highlighted]:bg-[var(--accent)] data-[highlighted]:text-white outline-none cursor-pointer overflow-hidden"
                                        style={option.family ? { fontFamily: `"${option.family}"` } : {}}
                                    >
                                        <Select.ItemText>
                                            <span className="block truncate w-full" title={option.label}>
                                                {option.label}
                                            </span>
                                        </Select.ItemText>
                                        <Select.ItemIndicator className="absolute left-2 inline-flex items-center justify-center">
                                            <Check className="w-4 h-4" />
                                        </Select.ItemIndicator>
                                    </Select.Item>
                                ))}
                                {processedFonts.length > visibleCount && (
                                    <div className="p-2 text-center text-xs text-[var(--text-secondary)] animate-pulse">Loading more...</div>
                                )}
                            </Select.Viewport>
                        </Select.Content>
                    </Select.Portal>
                </Select.Root>
            </div>
        </div>
    );
};
