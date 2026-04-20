"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const SiteCopyContext = createContext(null);

function PencilIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.8]">
            <path d="M4 20.2l3.3-.7L18.5 8.3a1.9 1.9 0 0 0 0-2.7l-.1-.1a1.9 1.9 0 0 0-2.7 0L4.5 16.7 4 20.2Z"></path>
            <path d="m13.9 6.1 4 4"></path>
        </svg>
    );
}

function clamp(value, minValue, maxValue) {
    return Math.min(Math.max(value, minValue), maxValue);
}

function SiteCopyEditor({ activeEntry, draftValue, isSaving, saveError, onCancel, onChange, onSave }) {
    if (!activeEntry) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[260] flex items-end justify-center bg-[#1C1C1C]/55 p-4 backdrop-blur-sm sm:items-center">
            <div className="w-full max-w-2xl rounded-[1.8rem] border border-white/10 bg-[rgba(12,12,14,0.94)] p-6 text-[#EFECE8] shadow-[0_28px_90px_rgba(0,0,0,0.4)] sm:p-7">
                <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">Inline Copy Editor</p>
                        <h3 className="mt-3 font-serif text-3xl font-light uppercase tracking-[0.08em] text-white">{activeEntry.label}</h3>
                        <p className="mt-3 text-sm leading-relaxed text-white/62">Key: {activeEntry.key}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="hover-target rounded-full border border-white/12 bg-white/5 px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-white/72 transition-colors hover:bg-white/10"
                    >
                        Close
                    </button>
                </div>

                <div className="mt-6 flex flex-col gap-4">
                    <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.24em] text-white/48">
                        Visible Text
                        <textarea
                            value={draftValue}
                            onChange={(event) => onChange(event.target.value)}
                            rows={activeEntry.multiline ? 7 : 3}
                            className="min-h-[10rem] rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm leading-relaxed tracking-normal text-white outline-none transition-colors placeholder:text-white/28 focus:border-white/26"
                        />
                    </label>

                    {saveError && <p className="text-sm leading-relaxed text-red-300">{saveError}</p>}

                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="hover-target rounded-full border border-white/12 bg-white/5 px-5 py-3 text-[10px] uppercase tracking-[0.24em] text-white/72 transition-colors hover:bg-white/10"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onSave}
                            disabled={isSaving}
                            className={`hover-target rounded-full bg-[#EFE7DA] px-6 py-3 text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C] transition-colors ${isSaving ? 'opacity-60' : 'hover:bg-white'}`}
                        >
                            {isSaving ? 'Saving' : 'Save Text'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SiteCopyProvider({ children, initialEntries = {}, isAdmin = false }) {
    const [entries, setEntries] = useState(initialEntries);
    const [isEditMode, setIsEditMode] = useState(false);
    const [hoveredEntry, setHoveredEntry] = useState(null);
    const [activeEntry, setActiveEntry] = useState(null);
    const [draftValue, setDraftValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const hoverClearTimeoutRef = useRef(null);

    useEffect(() => {
        setEntries(initialEntries);
    }, [initialEntries]);

    useEffect(() => {
        if (!isAdmin && isEditMode) {
            setIsEditMode(false);
        }
    }, [isAdmin, isEditMode]);

    useEffect(() => {
        return () => {
            if (hoverClearTimeoutRef.current) {
                window.clearTimeout(hoverClearTimeoutRef.current);
            }
        };
    }, []);

    const resolveText = useCallback((key, fallback) => {
        if (Object.prototype.hasOwnProperty.call(entries, key)) {
            return entries[key];
        }

        return fallback;
    }, [entries]);

    const openEditor = useCallback((entry) => {
        setActiveEntry(entry);
        setDraftValue(Object.prototype.hasOwnProperty.call(entries, entry.key) ? entries[entry.key] : entry.fallback);
        setSaveError('');
    }, [entries]);

    const registerHoverTarget = useCallback((entry) => {
        if (!isAdmin || !isEditMode || !entry?.element) {
            return;
        }

        if (hoverClearTimeoutRef.current) {
            window.clearTimeout(hoverClearTimeoutRef.current);
            hoverClearTimeoutRef.current = null;
        }

        const bounds = entry.element.getBoundingClientRect();

        setHoveredEntry({
            ...entry,
            rect: {
                top: bounds.top,
                right: bounds.right,
                bottom: bounds.bottom,
                left: bounds.left,
            },
        });
    }, [isAdmin, isEditMode]);

    const clearHoverTarget = useCallback(() => {
        if (!isAdmin || !isEditMode) {
            return;
        }

        if (hoverClearTimeoutRef.current) {
            window.clearTimeout(hoverClearTimeoutRef.current);
        }

        hoverClearTimeoutRef.current = window.setTimeout(() => {
            setHoveredEntry(null);
            hoverClearTimeoutRef.current = null;
        }, 120);
    }, [isAdmin, isEditMode]);

    const saveActiveEntry = useCallback(async () => {
        if (!activeEntry || isSaving) {
            return;
        }

        setIsSaving(true);
        setSaveError('');

        try {
            const response = await fetch('/api/admin/site-copy', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ key: activeEntry.key, value: draftValue }),
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || 'Unable to save the text right now.');
            }

            setEntries((currentEntries) => ({
                ...currentEntries,
                [activeEntry.key]: data.entry?.value ?? draftValue,
            }));
            setActiveEntry(null);
        } catch (error) {
            setSaveError(error.message || 'Unable to save the text right now.');
        } finally {
            setIsSaving(false);
        }
    }, [activeEntry, draftValue, isSaving]);

    const hoverButtonStyle = hoveredEntry?.rect
        ? {
            top: clamp(hoveredEntry.rect.top - 16, 12, window.innerHeight - 56),
            left: clamp(hoveredEntry.rect.right + 10, 12, window.innerWidth - 64),
        }
        : null;

    const value = useMemo(() => ({
        isAdmin,
        isEditMode,
        resolveText,
        openEditor,
        registerHoverTarget,
        clearHoverTarget,
    }), [clearHoverTarget, isAdmin, isEditMode, openEditor, registerHoverTarget, resolveText]);

    return (
        <SiteCopyContext.Provider value={value}>
            {children}

            {isAdmin && (
                <>
                    <div className="fixed bottom-5 right-5 z-[240] flex items-center gap-3 rounded-full border border-[#1C1C1C]/12 bg-[rgba(239,236,232,0.94)] px-3 py-3 text-[#1C1C1C] shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-md">
                        <span className="hidden text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/42 sm:inline">Inline Copy</span>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={isEditMode}
                            onClick={() => {
                                setIsEditMode((currentValue) => !currentValue);
                                setHoveredEntry(null);
                            }}
                            className="hover-target inline-flex items-center gap-3 rounded-full border border-[#1C1C1C]/10 bg-white px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C] transition-colors hover:bg-[#F8F5F0]"
                        >
                            <span className={`flex h-5 w-10 items-center rounded-full border border-[#1C1C1C]/10 px-1 transition-colors ${isEditMode ? 'justify-end bg-[#1C1C1C]' : 'justify-start bg-transparent'}`}>
                                <span className={`h-3 w-3 rounded-full transition-colors ${isEditMode ? 'bg-[#EFECE8]' : 'bg-[#1C1C1C]/34'}`}></span>
                            </span>
                            <span>{isEditMode ? 'Editing' : 'Edit Copy'}</span>
                        </button>
                    </div>

                    {isEditMode && hoveredEntry && hoverButtonStyle && (
                        <button
                            type="button"
                            onMouseEnter={() => registerHoverTarget(hoveredEntry)}
                            onMouseLeave={clearHoverTarget}
                            onClick={() => openEditor(hoveredEntry)}
                            className="hover-target fixed z-[250] inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#1C1C1C]/12 bg-[rgba(239,236,232,0.96)] text-[#1C1C1C] shadow-[0_16px_46px_rgba(0,0,0,0.18)] transition-transform hover:scale-[1.04]"
                            style={hoverButtonStyle}
                            aria-label={`Edit ${hoveredEntry.label}`}
                        >
                            <PencilIcon />
                        </button>
                    )}

                    <SiteCopyEditor
                        activeEntry={activeEntry}
                        draftValue={draftValue}
                        isSaving={isSaving}
                        saveError={saveError}
                        onCancel={() => {
                            setActiveEntry(null);
                            setSaveError('');
                        }}
                        onChange={setDraftValue}
                        onSave={saveActiveEntry}
                    />
                </>
            )}
        </SiteCopyContext.Provider>
    );
}

export function useSiteCopy() {
    return useContext(SiteCopyContext);
}