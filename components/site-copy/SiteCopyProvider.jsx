"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import EditableMediaAsset from './EditableMediaAsset';
import SiteCopyRichTextEditor from './SiteCopyRichTextEditor';
import { detectEditableMediaKind } from './media-kind';
import {
    createDefaultMediaSettings,
    extractSiteCopyPlainText,
    resolveSiteCopyMediaEntry,
    resolveSiteCopyRichTextEntry,
    serializeSiteCopyMediaEntry,
    serializeSiteCopyRichTextEntry,
} from '../../utils/site-copy';
import { PRODUCT_STORAGE_BUCKET } from '../../utils/products';
import { createClient as createBrowserSupabaseClient, isSupabaseConfigured } from '../../utils/supabase/client';

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

function areSiteCopyEntryMapsEqual(leftEntries = {}, rightEntries = {}) {
    const leftKeys = Object.keys(leftEntries || {});
    const rightKeys = Object.keys(rightEntries || {});

    if (leftKeys.length !== rightKeys.length) {
        return false;
    }

    return leftKeys.every((key) => leftEntries[key] === rightEntries[key]);
}

const MEDIA_PRESET_OPTIONS = [
    {
        key: 'hero',
        label: 'Hero',
        copy: 'Immersive cover framing with a little extra scale.',
        settings: {
            fitDesktop: 'cover',
            fitMobile: 'cover',
            positionDesktop: { x: 50, y: 38 },
            positionMobile: { x: 50, y: 34 },
            scaleDesktop: 1.06,
            scaleMobile: 1.14,
        },
    },
    {
        key: 'editorial-plate',
        label: 'Editorial Plate',
        copy: 'Contained framing for collages and portrait-heavy compositions.',
        settings: {
            fitDesktop: 'contain',
            fitMobile: 'contain',
            positionDesktop: { x: 50, y: 50 },
            positionMobile: { x: 50, y: 50 },
            scaleDesktop: 0.94,
            scaleMobile: 0.9,
        },
    },
    {
        key: 'full-bleed',
        label: 'Full Bleed',
        copy: 'Clean edge-to-edge framing with centered focus.',
        settings: {
            fitDesktop: 'cover',
            fitMobile: 'cover',
            positionDesktop: { x: 50, y: 50 },
            positionMobile: { x: 50, y: 50 },
            scaleDesktop: 1,
            scaleMobile: 1,
        },
    },
    {
        key: 'portrait-crop',
        label: 'Portrait Crop',
        copy: 'Balanced framing for tall portrait images inside wide slots.',
        settings: {
            fitDesktop: 'contain',
            fitMobile: 'cover',
            positionDesktop: { x: 50, y: 28 },
            positionMobile: { x: 50, y: 24 },
            scaleDesktop: 1,
            scaleMobile: 1.08,
        },
    },
];

function slugifySiteCopyKey(value = 'site-media') {
    const normalizedValue = String(value || 'site-media')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);

    return normalizedValue || 'site-media';
}

function MediaPreviewSurface({ label, viewport, mediaConfig, previewKind, onUpdatePosition }) {
    const frameRef = useRef(null);
    const isDraggingRef = useRef(false);
    const position = viewport === 'mobile' ? mediaConfig.positionMobile : mediaConfig.positionDesktop;
    const aspectClassName = viewport === 'mobile' ? 'aspect-[9/16] max-w-[16rem] mx-auto' : 'aspect-[16/10]';

    const updateFromPointer = (event) => {
        if (!frameRef.current) {
            return;
        }

        const bounds = frameRef.current.getBoundingClientRect();

        if (bounds.width <= 0 || bounds.height <= 0) {
            return;
        }

        const nextX = ((event.clientX - bounds.left) / bounds.width) * 100;
        const nextY = ((event.clientY - bounds.top) / bounds.height) * 100;

        onUpdatePosition(viewport, nextX, nextY);
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-white/45">
                <span>{label}</span>
                <span>{Math.round(position.x)} / {Math.round(position.y)}</span>
            </div>

            <div
                ref={frameRef}
                className={`relative w-full overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#080808] ${aspectClassName}`}
                onPointerDown={(event) => {
                    isDraggingRef.current = true;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    updateFromPointer(event);
                }}
                onPointerMove={(event) => {
                    if (!isDraggingRef.current) {
                        return;
                    }

                    updateFromPointer(event);
                }}
                onPointerUp={(event) => {
                    isDraggingRef.current = false;
                    event.currentTarget.releasePointerCapture?.(event.pointerId);
                }}
                onPointerCancel={() => {
                    isDraggingRef.current = false;
                }}
                style={{ touchAction: 'none' }}
            >
                {mediaConfig.src ? (
                    <EditableMediaAsset
                        source={mediaConfig.src}
                        alt={label}
                        fallbackKind={previewKind}
                        mediaConfig={mediaConfig}
                        viewportMode={viewport}
                        className="h-full w-full bg-black"
                        imageProps={{ draggable: false }}
                        videoProps={{
                            autoPlay: true,
                            loop: true,
                            muted: true,
                            playsInline: true,
                            preload: 'metadata',
                        }}
                    />
                ) : (
                    <div className="flex h-full items-center justify-center px-6 text-center text-sm leading-relaxed text-white/40">
                        Add a media URL to start previewing this surface.
                    </div>
                )}

                <div className="pointer-events-none absolute inset-0 border border-white/8"></div>
                <div
                    className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#EFE7DA] bg-[#EFE7DA]/18 shadow-[0_0_0_1px_rgba(0,0,0,0.14)]"
                    style={{
                        left: `${position.x}%`,
                        top: `${position.y}%`,
                    }}
                >
                    <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#EFE7DA]"></span>
                </div>
            </div>

            <p className="text-xs leading-relaxed text-white/44">Drag inside the preview to place the focus for {viewport}.</p>
        </div>
    );
}

function SiteCopyEditor({
    activeEntry,
    draftTextValue,
    draftRichTextValue,
    draftMediaValue,
    isSaving,
    isUploadingMedia,
    uploadFeedback,
    saveError,
    onCancel,
    onTextChange,
    onRichTextChange,
    onMediaChange,
    onMediaUpload,
    onSave,
}) {
    const [activeViewport, setActiveViewport] = useState('desktop');

    useEffect(() => {
        if (activeEntry?.key) {
            setActiveViewport('desktop');
        }
    }, [activeEntry?.key]);

    if (!activeEntry) {
        return null;
    }

    const isMediaEntry = activeEntry.entryType === 'media';
    const isRichTextEntry = activeEntry.entryType === 'rich-text';
    const resolvedDraftMediaValue = isMediaEntry
        ? resolveSiteCopyMediaEntry(draftMediaValue, activeEntry.fallback, activeEntry.defaultMediaSettings || {})
        : null;
    const previewKind = isMediaEntry ? detectEditableMediaKind(resolvedDraftMediaValue?.src, activeEntry.mediaKind) : 'image';
    const previewLabel = previewKind === 'video' ? 'Video Preview' : 'Image Preview';

    const updateMediaDraft = (updater) => {
        if (!onMediaChange) {
            return;
        }

        onMediaChange((currentMediaValue) => {
            const nextMediaValue = typeof updater === 'function' ? updater(currentMediaValue) : updater;
            return resolveSiteCopyMediaEntry(nextMediaValue, nextMediaValue?.src || activeEntry.fallback, activeEntry.defaultMediaSettings || {});
        });
    };

    const viewportKeyMap = activeViewport === 'mobile'
        ? { fit: 'fitMobile', scale: 'scaleMobile', position: 'positionMobile' }
        : { fit: 'fitDesktop', scale: 'scaleDesktop', position: 'positionDesktop' };
    const activeViewportPosition = resolvedDraftMediaValue?.[viewportKeyMap.position] || { x: 50, y: 50 };
    const activeViewportFit = resolvedDraftMediaValue?.[viewportKeyMap.fit] || 'cover';
    const activeViewportScale = resolvedDraftMediaValue?.[viewportKeyMap.scale] || 1;
    const defaultViewportSettings = createDefaultMediaSettings(activeEntry.defaultMediaSettings || {});
    const uploadFeedbackClassName = uploadFeedback?.type === 'error' ? 'text-red-300' : 'text-emerald-300';
    const modalWidthClassName = isMediaEntry || isRichTextEntry
        ? 'max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-2.5rem)] 2xl:max-w-[1560px]'
        : 'max-w-2xl';

    return (
        <div className="fixed inset-0 z-[260] flex items-end justify-center p-4 backdrop-blur-sm sm:items-center">
            <button type="button" aria-label="Close editor" onClick={onCancel} className="absolute inset-0 bg-[#1C1C1C]/55"></button>

            <div className={`relative flex w-full max-h-[calc(100vh-1.5rem)] flex-col overflow-hidden rounded-[1.55rem] border border-white/10 bg-[rgba(12,12,14,0.94)] p-5 text-[#EFECE8] shadow-[0_28px_90px_rgba(0,0,0,0.4)] selection:bg-[#EFE7DA] selection:text-[#121214] sm:max-h-[calc(100vh-3rem)] sm:p-7 ${modalWidthClassName}`}>
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 pb-5">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">{isMediaEntry ? 'Inline Media Editor' : isRichTextEntry ? 'Semantic Copy Editor' : 'Inline Copy Editor'}</p>
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

                <div data-lenis-prevent-wheel className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
                    {isMediaEntry ? (
                        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_22rem]">
                            <div className="flex flex-col gap-5">
                                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_10.5rem]">
                                    <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.24em] text-white/48">
                                        Media URL
                                        <input
                                            type="text"
                                            value={resolvedDraftMediaValue?.src || ''}
                                            onChange={(event) => {
                                                const nextSource = event.target.value;
                                                updateMediaDraft((currentMediaValue) => ({
                                                    ...currentMediaValue,
                                                    src: nextSource,
                                                }));
                                            }}
                                            className="h-14 rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 text-sm tracking-normal text-white outline-none transition-colors placeholder:text-white/28 focus:border-white/26"
                                            placeholder="https://example.com/image.jpg or /banner.jpg"
                                        />
                                    </label>

                                    <label className={`flex cursor-pointer flex-col justify-end gap-2 text-[10px] uppercase tracking-[0.24em] text-white/48 ${isUploadingMedia ? 'opacity-60' : ''}`}>
                                        Upload File
                                        <span className={`flex h-14 items-center justify-center rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 text-[10px] uppercase tracking-[0.24em] text-white/72 transition-colors ${isUploadingMedia ? '' : 'hover:bg-white/[0.08] hover:text-white'}`}>
                                            {isUploadingMedia ? 'Uploading' : 'Select File'}
                                        </span>
                                        <input type="file" accept="image/*,video/*" className="hidden" onChange={onMediaUpload} disabled={isUploadingMedia} />
                                    </label>
                                </div>

                                {uploadFeedback?.type !== 'idle' && (
                                    <p className={`text-sm leading-relaxed ${uploadFeedbackClassName}`}>{uploadFeedback.message}</p>
                                )}

                                <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4 md:p-5">
                                    <div className="flex flex-col gap-2 border-b border-white/8 pb-4 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">Adaptive Preview</p>
                                            <p className="mt-2 text-sm leading-relaxed text-white/62">The slot can now render {previewKind === 'video' ? 'video' : 'image'} media. Adjust desktop and mobile independently.</p>
                                        </div>
                                        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-white/62">{previewLabel}</span>
                                    </div>

                                    <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
                                        <MediaPreviewSurface
                                            label="Desktop Preview"
                                            viewport="desktop"
                                            mediaConfig={resolvedDraftMediaValue}
                                            previewKind={previewKind}
                                            onUpdatePosition={(viewport, nextX, nextY) => {
                                                updateMediaDraft((currentMediaValue) => ({
                                                    ...currentMediaValue,
                                                    [viewport === 'mobile' ? 'positionMobile' : 'positionDesktop']: {
                                                        x: nextX,
                                                        y: nextY,
                                                    },
                                                }));
                                            }}
                                        />

                                        <MediaPreviewSurface
                                            label="Mobile Preview"
                                            viewport="mobile"
                                            mediaConfig={resolvedDraftMediaValue}
                                            previewKind={previewKind}
                                            onUpdatePosition={(viewport, nextX, nextY) => {
                                                updateMediaDraft((currentMediaValue) => ({
                                                    ...currentMediaValue,
                                                    [viewport === 'mobile' ? 'positionMobile' : 'positionDesktop']: {
                                                        x: nextX,
                                                        y: nextY,
                                                    },
                                                }));
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4 md:p-5">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">Adjustments</p>
                                    <span className="text-[10px] uppercase tracking-[0.24em] text-white/32">Precise Controls</span>
                                </div>

                                <div className="mt-5 flex flex-col gap-3 border-b border-white/8 pb-5">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">Presets</p>
                                        <span className="text-[10px] uppercase tracking-[0.24em] text-white/32">Starting Points</span>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
                                        {MEDIA_PRESET_OPTIONS.map((preset) => (
                                            <button
                                                key={preset.key}
                                                type="button"
                                                onClick={() => {
                                                    updateMediaDraft((currentMediaValue) => ({
                                                        ...(currentMediaValue || {}),
                                                        ...preset.settings,
                                                    }));
                                                }}
                                                className="rounded-[0.95rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition-colors hover:bg-white/[0.07]"
                                            >
                                                <span className="block text-[10px] uppercase tracking-[0.24em] text-white/72">{preset.label}</span>
                                                <span className="mt-2 block text-[11px] leading-relaxed text-white/45 normal-case tracking-normal">{preset.copy}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-4 inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
                                    {['desktop', 'mobile'].map((viewport) => (
                                        <button
                                            key={viewport}
                                            type="button"
                                            onClick={() => setActiveViewport(viewport)}
                                            className={`rounded-full px-4 py-2 text-[10px] uppercase tracking-[0.24em] transition-colors ${activeViewport === viewport ? 'bg-[#EFE7DA] text-[#1C1C1C]' : 'text-white/58 hover:text-white'}`}
                                        >
                                            {viewport}
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-5 flex flex-col gap-5">
                                    <div className="flex flex-col gap-3">
                                        <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">Fit</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['cover', 'contain'].map((fitMode) => (
                                                <button
                                                    key={fitMode}
                                                    type="button"
                                                    onClick={() => {
                                                        updateMediaDraft((currentMediaValue) => ({
                                                            ...currentMediaValue,
                                                            [viewportKeyMap.fit]: fitMode,
                                                        }));
                                                    }}
                                                    className={`rounded-[0.95rem] border px-4 py-3 text-[10px] uppercase tracking-[0.24em] transition-colors ${activeViewportFit === fitMode ? 'border-[#EFE7DA] bg-[#EFE7DA] text-[#1C1C1C]' : 'border-white/10 bg-white/[0.03] text-white/60 hover:text-white'}`}
                                                >
                                                    {fitMode}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.24em] text-white/45">
                                        Scale
                                        <div className="flex items-center justify-between gap-3 text-white/62">
                                            <input
                                                type="range"
                                                min="0.6"
                                                max="2.4"
                                                step="0.01"
                                                value={activeViewportScale}
                                                onChange={(event) => {
                                                    updateMediaDraft((currentMediaValue) => ({
                                                        ...currentMediaValue,
                                                        [viewportKeyMap.scale]: Number.parseFloat(event.target.value),
                                                    }));
                                                }}
                                                className="w-full"
                                            />
                                            <span className="w-12 text-right text-xs">{Math.round(activeViewportScale * 100)}%</span>
                                        </div>
                                    </label>

                                    <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.24em] text-white/45">
                                        Horizontal Position
                                        <div className="flex items-center justify-between gap-3 text-white/62">
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                step="1"
                                                value={activeViewportPosition.x}
                                                onChange={(event) => {
                                                    const nextValue = Number.parseFloat(event.target.value);
                                                    updateMediaDraft((currentMediaValue) => ({
                                                        ...currentMediaValue,
                                                        [viewportKeyMap.position]: {
                                                            ...(currentMediaValue?.[viewportKeyMap.position] || activeViewportPosition),
                                                            x: nextValue,
                                                        },
                                                    }));
                                                }}
                                                className="w-full"
                                            />
                                            <span className="w-12 text-right text-xs">{Math.round(activeViewportPosition.x)}%</span>
                                        </div>
                                    </label>

                                    <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.24em] text-white/45">
                                        Vertical Position
                                        <div className="flex items-center justify-between gap-3 text-white/62">
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                step="1"
                                                value={activeViewportPosition.y}
                                                onChange={(event) => {
                                                    const nextValue = Number.parseFloat(event.target.value);
                                                    updateMediaDraft((currentMediaValue) => ({
                                                        ...currentMediaValue,
                                                        [viewportKeyMap.position]: {
                                                            ...(currentMediaValue?.[viewportKeyMap.position] || activeViewportPosition),
                                                            y: nextValue,
                                                        },
                                                    }));
                                                }}
                                                className="w-full"
                                            />
                                            <span className="w-12 text-right text-xs">{Math.round(activeViewportPosition.y)}%</span>
                                        </div>
                                    </label>

                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                updateMediaDraft((currentMediaValue) => ({
                                                    ...currentMediaValue,
                                                    [viewportKeyMap.position]: { x: 50, y: 50 },
                                                }));
                                            }}
                                            className="rounded-[0.95rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-[10px] uppercase tracking-[0.24em] text-white/62 transition-colors hover:text-white"
                                        >
                                            Center Focus
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                const fromViewport = activeViewport === 'desktop' ? 'positionDesktop' : 'positionMobile';
                                                const toViewport = activeViewport === 'desktop' ? 'positionMobile' : 'positionDesktop';
                                                const fromFit = activeViewport === 'desktop' ? 'fitDesktop' : 'fitMobile';
                                                const toFit = activeViewport === 'desktop' ? 'fitMobile' : 'fitDesktop';
                                                const fromScale = activeViewport === 'desktop' ? 'scaleDesktop' : 'scaleMobile';
                                                const toScale = activeViewport === 'desktop' ? 'scaleMobile' : 'scaleDesktop';

                                                updateMediaDraft((currentMediaValue) => ({
                                                    ...currentMediaValue,
                                                    [toViewport]: currentMediaValue?.[fromViewport],
                                                    [toFit]: currentMediaValue?.[fromFit],
                                                    [toScale]: currentMediaValue?.[fromScale],
                                                }));
                                            }}
                                            className="rounded-[0.95rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-[10px] uppercase tracking-[0.24em] text-white/62 transition-colors hover:text-white"
                                        >
                                            {activeViewport === 'desktop' ? 'Copy Desktop To Mobile' : 'Copy Mobile To Desktop'}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                updateMediaDraft((currentMediaValue) => ({
                                                    ...currentMediaValue,
                                                    [viewportKeyMap.fit]: defaultViewportSettings[viewportKeyMap.fit],
                                                    [viewportKeyMap.position]: defaultViewportSettings[viewportKeyMap.position],
                                                    [viewportKeyMap.scale]: defaultViewportSettings[viewportKeyMap.scale],
                                                }));
                                            }}
                                            className="rounded-[0.95rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-[10px] uppercase tracking-[0.24em] text-white/62 transition-colors hover:text-white sm:col-span-2 xl:col-span-1"
                                        >
                                            Reset {activeViewport}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : isRichTextEntry ? (
                        <SiteCopyRichTextEditor
                            activeEntry={activeEntry}
                            draftValue={draftRichTextValue}
                            onChange={onRichTextChange}
                        />
                    ) : (
                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.24em] text-white/48">
                            Visible Text
                            <textarea
                                value={draftTextValue}
                                onChange={(event) => onTextChange(event.target.value)}
                                rows={activeEntry.multiline ? 7 : 3}
                                className="min-h-[10rem] rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm leading-relaxed tracking-normal text-white outline-none transition-colors placeholder:text-white/28 focus:border-white/26"
                            />
                        </label>
                    )}

                    {saveError && <p className="text-sm leading-relaxed text-red-300">{saveError}</p>}
                </div>

                <div className="mt-5 flex shrink-0 flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:justify-end">
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
                        disabled={isSaving || isUploadingMedia}
                        className={`hover-target rounded-full bg-[#EFE7DA] px-6 py-3 text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C] transition-colors ${isSaving || isUploadingMedia ? 'opacity-60' : 'hover:bg-white'}`}
                    >
                        {isSaving ? 'Saving' : isMediaEntry ? 'Save Media' : isRichTextEntry ? 'Save Content' : 'Save Text'}
                    </button>
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
    const [draftTextValue, setDraftTextValue] = useState('');
    const [draftRichTextValue, setDraftRichTextValue] = useState(null);
    const [draftMediaValue, setDraftMediaValue] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingMedia, setIsUploadingMedia] = useState(false);
    const [uploadFeedback, setUploadFeedback] = useState({ type: 'idle', message: '' });
    const [saveError, setSaveError] = useState('');
    const hoverClearTimeoutRef = useRef(null);
    const lastInitialEntriesRef = useRef(initialEntries);

    useEffect(() => {
        if (areSiteCopyEntryMapsEqual(lastInitialEntriesRef.current, initialEntries)) {
            return;
        }

        setEntries((currentEntries) => (areSiteCopyEntryMapsEqual(currentEntries, initialEntries) ? currentEntries : initialEntries));
        lastInitialEntriesRef.current = initialEntries;
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
            return extractSiteCopyPlainText(entries[key], fallback);
        }

        return fallback;
    }, [entries]);

    const resolveRichTextEntry = useCallback((key, fallback) => resolveSiteCopyRichTextEntry(
        Object.prototype.hasOwnProperty.call(entries, key) ? entries[key] : fallback,
        fallback,
    ), [entries]);

    const resolveMedia = useCallback((key, fallback) => {
        return resolveSiteCopyMediaEntry(
            Object.prototype.hasOwnProperty.call(entries, key) ? entries[key] : fallback,
            fallback,
        ).src;
    }, [entries]);

    const resolveMediaEntry = useCallback((key, fallback, defaultMediaSettings) => resolveSiteCopyMediaEntry(
        Object.prototype.hasOwnProperty.call(entries, key) ? entries[key] : fallback,
        fallback,
        defaultMediaSettings,
    ), [entries]);

    const openEditor = useCallback((entry) => {
        setActiveEntry(entry);
        setIsUploadingMedia(false);
        if (entry.entryType === 'media') {
            setDraftMediaValue(resolveSiteCopyMediaEntry(
                Object.prototype.hasOwnProperty.call(entries, entry.key) ? entries[entry.key] : entry.fallback,
                entry.fallback,
                entry.defaultMediaSettings || {},
            ));
            setDraftTextValue('');
            setDraftRichTextValue(null);
        } else if (entry.entryType === 'rich-text') {
            setDraftRichTextValue(resolveSiteCopyRichTextEntry(
                Object.prototype.hasOwnProperty.call(entries, entry.key) ? entries[entry.key] : entry.fallback,
                entry.fallback,
            ));
            setDraftTextValue('');
            setDraftMediaValue(null);
        } else {
            setDraftTextValue(Object.prototype.hasOwnProperty.call(entries, entry.key)
                ? extractSiteCopyPlainText(entries[entry.key], entry.fallback)
                : entry.fallback);
            setDraftRichTextValue(null);
            setDraftMediaValue(null);
        }
        setUploadFeedback({ type: 'idle', message: '' });
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

    const handleMediaUpload = useCallback(async (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        if (!activeEntry || activeEntry.entryType !== 'media') {
            event.target.value = '';
            return;
        }

        setIsUploadingMedia(true);
        setUploadFeedback({ type: 'idle', message: '' });

        try {
            if (!isSupabaseConfigured()) {
                throw new Error('Supabase browser upload is not configured in this environment yet.');
            }

            const supabase = createBrowserSupabaseClient();
            const extension = file.name.split('.').pop()?.toLowerCase() || (file.type.startsWith('video/') ? 'mp4' : 'jpg');
            const filePath = `site-copy/${slugifySiteCopyKey(activeEntry.key)}-${Date.now()}.${extension}`;
            const { error } = await supabase.storage.from(PRODUCT_STORAGE_BUCKET).upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type || undefined,
            });

            if (error) {
                throw error;
            }

            const { data } = supabase.storage.from(PRODUCT_STORAGE_BUCKET).getPublicUrl(filePath);
            const uploadedUrl = data?.publicUrl;

            if (!uploadedUrl) {
                throw new Error('Upload completed, but the public URL could not be resolved.');
            }

            setDraftMediaValue((currentMediaValue) => resolveSiteCopyMediaEntry(
                {
                    ...(currentMediaValue || {}),
                    src: uploadedUrl,
                },
                activeEntry.fallback,
                activeEntry.defaultMediaSettings || {},
            ));
            setUploadFeedback({
                type: 'success',
                message: file.type.startsWith('video/') ? 'Video uploaded to Supabase Storage.' : 'Media uploaded to Supabase Storage.',
            });
        } catch (error) {
            setUploadFeedback({ type: 'error', message: error.message || 'Unable to upload this media file.' });
        } finally {
            event.target.value = '';
            setIsUploadingMedia(false);
        }
    }, [activeEntry]);

    const saveActiveEntry = useCallback(async () => {
        if (!activeEntry || isSaving || isUploadingMedia) {
            return;
        }

        setIsSaving(true);
        setSaveError('');

        try {
            const nextValue = activeEntry.entryType === 'media'
                ? serializeSiteCopyMediaEntry(draftMediaValue, activeEntry.defaultMediaSettings || {})
                : activeEntry.entryType === 'rich-text'
                    ? serializeSiteCopyRichTextEntry(draftRichTextValue, activeEntry.fallback)
                    : draftTextValue;
            const response = await fetch('/api/admin/site-copy', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ key: activeEntry.key, value: nextValue }),
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || 'Unable to save this entry right now.');
            }

            setEntries((currentEntries) => ({
                ...currentEntries,
                [activeEntry.key]: data.entry?.value ?? nextValue,
            }));
            setActiveEntry(null);
            setUploadFeedback({ type: 'idle', message: '' });
        } catch (error) {
            setSaveError(error.message || 'Unable to save this entry right now.');
        } finally {
            setIsSaving(false);
        }
    }, [activeEntry, draftMediaValue, draftRichTextValue, draftTextValue, isSaving, isUploadingMedia]);

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
        resolveRichTextEntry,
        resolveMedia,
        resolveMediaEntry,
        openEditor,
        registerHoverTarget,
        clearHoverTarget,
    }), [clearHoverTarget, isAdmin, isEditMode, openEditor, registerHoverTarget, resolveMedia, resolveMediaEntry, resolveRichTextEntry, resolveText]);

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
                        draftTextValue={draftTextValue}
                        draftRichTextValue={draftRichTextValue}
                        draftMediaValue={draftMediaValue}
                        isSaving={isSaving}
                        isUploadingMedia={isUploadingMedia}
                        uploadFeedback={uploadFeedback}
                        saveError={saveError}
                        onCancel={() => {
                            setActiveEntry(null);
                            setDraftRichTextValue(null);
                            setIsUploadingMedia(false);
                            setUploadFeedback({ type: 'idle', message: '' });
                            setSaveError('');
                        }}
                        onTextChange={setDraftTextValue}
                        onRichTextChange={setDraftRichTextValue}
                        onMediaChange={setDraftMediaValue}
                        onMediaUpload={handleMediaUpload}
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