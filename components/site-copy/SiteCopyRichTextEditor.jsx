"use client";

import { useEffect, useState } from 'react';
import SiteCopyRichTextContent from './SiteCopyRichTextContent';
import {
    SITE_COPY_RICH_TEXT_ALIGN_OPTIONS,
    SITE_COPY_RICH_TEXT_BLOCK_TYPE_OPTIONS,
    SITE_COPY_RICH_TEXT_COLOR_SWATCHES,
    SITE_COPY_RICH_TEXT_SIZE_OPTIONS,
    createSiteCopyRichTextBlock,
    createSiteCopyRichTextDocument,
    resolveSiteCopyRichTextEntry,
} from '../../utils/site-copy';

const PREVIEW_SIZE_CLASS_NAMES = {
    display: 'text-4xl md:text-5xl',
    xl: 'text-3xl md:text-4xl',
    lg: 'text-2xl md:text-3xl',
    body: 'text-base md:text-lg',
    sm: 'text-sm md:text-base',
    xs: 'text-xs md:text-sm',
};

const PREVIEW_BLOCK_CLASS_NAMES = {
    heading1: 'font-serif font-light uppercase tracking-[0.08em] leading-[0.9] text-white',
    heading2: 'font-serif font-light uppercase tracking-[0.08em] leading-[0.92] text-white',
    heading3: 'font-serif font-light uppercase tracking-[0.08em] leading-[0.96] text-white',
    paragraph: 'leading-relaxed text-white/78',
    quote: 'border-l border-white/20 pl-5 text-white/72 italic',
    'bullet-list': 'list-disc pl-5 text-white/78',
    'numbered-list': 'list-decimal pl-5 text-white/78',
};

function createEditorBlockId(type = 'block') {
    return `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function SurfaceButton({ isActive = false, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-[0.95rem] border px-3 py-2 text-[10px] uppercase tracking-[0.24em] transition-colors ${isActive ? 'border-[#EFE7DA] bg-[#EFE7DA] text-[#1C1C1C]' : 'border-white/10 bg-white/[0.03] text-white/62 hover:text-white'}`}
        >
            {children}
        </button>
    );
}

function WorkspaceToggle({ isActive = false, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-full px-4 py-2 text-[10px] uppercase tracking-[0.24em] transition-colors ${isActive ? 'bg-[#EFE7DA] text-[#1C1C1C]' : 'text-white/58 hover:text-white'}`}
        >
            {children}
        </button>
    );
}

export default function SiteCopyRichTextEditor({ activeEntry, draftValue, onChange }) {
    const [workspaceMode, setWorkspaceMode] = useState('split');
    const resolvedDocument = resolveSiteCopyRichTextEntry(draftValue, activeEntry?.fallback);

    useEffect(() => {
        setWorkspaceMode('split');
    }, [activeEntry?.key]);

    const updateDocument = (updater) => {
        onChange((currentValue) => {
            const currentDocument = resolveSiteCopyRichTextEntry(currentValue, activeEntry?.fallback);
            const nextDocument = typeof updater === 'function' ? updater(currentDocument) : updater;
            return createSiteCopyRichTextDocument(nextDocument?.blocks || currentDocument.blocks);
        });
    };

    const updateBlock = (blockId, updater) => {
        updateDocument((currentDocument) => ({
            ...currentDocument,
            blocks: currentDocument.blocks.map((block) => {
                if (block.id !== blockId) {
                    return block;
                }

                const nextBlock = typeof updater === 'function' ? updater(block) : updater;
                return createSiteCopyRichTextBlock(nextBlock, currentDocument.blocks.findIndex((item) => item.id === blockId));
            }),
        }));
    };

    const appendBlock = (type = 'paragraph') => {
        updateDocument((currentDocument) => ({
            ...currentDocument,
            blocks: [
                ...currentDocument.blocks,
                createSiteCopyRichTextBlock({ id: createEditorBlockId(type), type }, currentDocument.blocks.length),
            ],
        }));
    };

    const moveBlock = (blockId, direction) => {
        updateDocument((currentDocument) => {
            const blockIndex = currentDocument.blocks.findIndex((block) => block.id === blockId);
            const targetIndex = blockIndex + direction;

            if (blockIndex < 0 || targetIndex < 0 || targetIndex >= currentDocument.blocks.length) {
                return currentDocument;
            }

            const nextBlocks = [...currentDocument.blocks];
            const [movedBlock] = nextBlocks.splice(blockIndex, 1);
            nextBlocks.splice(targetIndex, 0, movedBlock);

            return {
                ...currentDocument,
                blocks: nextBlocks.map((block, index) => createSiteCopyRichTextBlock(block, index)),
            };
        });
    };

    const duplicateBlock = (blockId) => {
        updateDocument((currentDocument) => {
            const blockIndex = currentDocument.blocks.findIndex((block) => block.id === blockId);

            if (blockIndex < 0) {
                return currentDocument;
            }

            const sourceBlock = currentDocument.blocks[blockIndex];
            const nextBlocks = [...currentDocument.blocks];
            nextBlocks.splice(blockIndex + 1, 0, createSiteCopyRichTextBlock({
                ...sourceBlock,
                id: createEditorBlockId(sourceBlock.type),
            }, blockIndex + 1));

            return {
                ...currentDocument,
                blocks: nextBlocks.map((block, index) => createSiteCopyRichTextBlock(block, index)),
            };
        });
    };

    const removeBlock = (blockId) => {
        updateDocument((currentDocument) => {
            const nextBlocks = currentDocument.blocks.filter((block) => block.id !== blockId);

            if (nextBlocks.length === 0) {
                return createSiteCopyRichTextDocument([
                    createSiteCopyRichTextBlock({ id: createEditorBlockId('paragraph'), type: 'paragraph' }),
                ]);
            }

            return {
                ...currentDocument,
                blocks: nextBlocks.map((block, index) => createSiteCopyRichTextBlock(block, index)),
            };
        });
    };

    const showsEditorPane = workspaceMode !== 'preview';
    const showsPreviewPane = workspaceMode !== 'editor';
    const layoutClassName = workspaceMode === 'split'
        ? 'grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(25rem,0.85fr)] 2xl:grid-cols-[minmax(0,1.5fr)_minmax(29rem,0.9fr)]'
        : 'grid gap-6 grid-cols-1';

    return (
        <div className="flex flex-col gap-6">
            <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4 md:p-5">
                <div className="flex flex-col gap-4 border-b border-white/8 pb-4 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">Semantic Structure</p>
                        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/62">Use headings, paragraphs, quotes, and lists as real semantic blocks. The saved content renders into actual HTML tags, which keeps structure useful for accessibility and search indexing.</p>
                    </div>

                    <div className="inline-flex w-full rounded-full border border-white/10 bg-white/[0.04] p-1 xl:w-auto">
                        <WorkspaceToggle isActive={workspaceMode === 'editor'} onClick={() => setWorkspaceMode('editor')}>Writing Focus</WorkspaceToggle>
                        <WorkspaceToggle isActive={workspaceMode === 'split'} onClick={() => setWorkspaceMode('split')}>Split View</WorkspaceToggle>
                        <WorkspaceToggle isActive={workspaceMode === 'preview'} onClick={() => setWorkspaceMode('preview')}>Preview</WorkspaceToggle>
                    </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                    {SITE_COPY_RICH_TEXT_BLOCK_TYPE_OPTIONS.map((option) => (
                        <SurfaceButton key={option.value} onClick={() => appendBlock(option.value)}>
                            Add {option.label}
                        </SurfaceButton>
                    ))}
                </div>
            </div>

            <div className={layoutClassName}>
                {showsEditorPane ? (
                    <div className="flex flex-col gap-4">
                        {resolvedDocument.blocks.map((block, index) => {
                            const isListBlock = block.type === 'bullet-list' || block.type === 'numbered-list';

                            return (
                                <div key={block.id} className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4 md:p-5">
                                    <div className="flex flex-col gap-3 border-b border-white/8 pb-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">Block {String(index + 1).padStart(2, '0')}</p>
                                            <p className="mt-2 text-sm leading-relaxed text-white/62">{isListBlock ? 'Each line in the content box becomes a list item.' : 'You can combine semantic type, alignment, size, and color for this block.'}</p>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <SurfaceButton onClick={() => moveBlock(block.id, -1)} isActive={false}>Up</SurfaceButton>
                                            <SurfaceButton onClick={() => moveBlock(block.id, 1)} isActive={false}>Down</SurfaceButton>
                                            <SurfaceButton onClick={() => duplicateBlock(block.id)} isActive={false}>Duplicate</SurfaceButton>
                                            <SurfaceButton onClick={() => removeBlock(block.id)} isActive={false}>Delete</SurfaceButton>
                                        </div>
                                    </div>

                                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.24em] text-white/48">
                                            Block Type
                                            <select
                                                value={block.type}
                                                onChange={(event) => {
                                                    const nextType = event.target.value;
                                                    updateBlock(block.id, (currentBlock) => ({
                                                        ...currentBlock,
                                                        type: nextType,
                                                    }));
                                                }}
                                                className="h-12 rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 text-sm tracking-normal text-white outline-none transition-colors focus:border-white/26"
                                            >
                                                {SITE_COPY_RICH_TEXT_BLOCK_TYPE_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value} className="bg-[#121214] text-white">
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>

                                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.24em] text-white/48">
                                            Size
                                            <select
                                                value={block.size}
                                                onChange={(event) => {
                                                    const nextSize = event.target.value;
                                                    updateBlock(block.id, (currentBlock) => ({
                                                        ...currentBlock,
                                                        size: nextSize,
                                                    }));
                                                }}
                                                className="h-12 rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 text-sm tracking-normal text-white outline-none transition-colors focus:border-white/26"
                                            >
                                                {SITE_COPY_RICH_TEXT_SIZE_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value} className="bg-[#121214] text-white">
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>

                                    <div className="mt-5 flex flex-col gap-5">
                                        <div className="flex flex-col gap-3">
                                            <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">Alignment</p>
                                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                                {SITE_COPY_RICH_TEXT_ALIGN_OPTIONS.map((option) => (
                                                    <SurfaceButton key={option.value} isActive={block.align === option.value} onClick={() => updateBlock(block.id, (currentBlock) => ({ ...currentBlock, align: option.value }))}>
                                                        {option.label}
                                                    </SurfaceButton>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">Style</p>
                                            <div className="grid grid-cols-3 gap-2">
                                                <SurfaceButton isActive={block.bold} onClick={() => updateBlock(block.id, (currentBlock) => ({ ...currentBlock, bold: !currentBlock.bold }))}>Bold</SurfaceButton>
                                                <SurfaceButton isActive={block.italic} onClick={() => updateBlock(block.id, (currentBlock) => ({ ...currentBlock, italic: !currentBlock.italic }))}>Italic</SurfaceButton>
                                                <SurfaceButton isActive={block.underline} onClick={() => updateBlock(block.id, (currentBlock) => ({ ...currentBlock, underline: !currentBlock.underline }))}>Underline</SurfaceButton>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">Color</p>
                                                <button
                                                    type="button"
                                                    onClick={() => updateBlock(block.id, (currentBlock) => ({ ...currentBlock, color: '' }))}
                                                    className="text-[10px] uppercase tracking-[0.24em] text-white/38 transition-colors hover:text-white/72"
                                                >
                                                    Reset
                                                </button>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2">
                                                {SITE_COPY_RICH_TEXT_COLOR_SWATCHES.map((color) => (
                                                    <button
                                                        key={color}
                                                        type="button"
                                                        onClick={() => updateBlock(block.id, (currentBlock) => ({ ...currentBlock, color }))}
                                                        className={`h-9 w-9 rounded-full border transition-transform hover:scale-[1.05] ${block.color === color ? 'border-white' : 'border-white/12'}`}
                                                        style={{ backgroundColor: color }}
                                                        aria-label={`Set color ${color}`}
                                                    ></button>
                                                ))}

                                                <label className="ml-auto flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-white/52">
                                                    Custom
                                                    <input
                                                        type="color"
                                                        value={block.color || '#efece8'}
                                                        onChange={(event) => updateBlock(block.id, (currentBlock) => ({ ...currentBlock, color: event.target.value }))}
                                                        className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0"
                                                    />
                                                </label>
                                            </div>
                                        </div>

                                        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.24em] text-white/48">
                                            Content
                                            <textarea
                                                value={block.text}
                                                onChange={(event) => updateBlock(block.id, (currentBlock) => ({
                                                    ...currentBlock,
                                                    text: event.target.value,
                                                }))}
                                                rows={isListBlock ? 8 : 6}
                                                className="min-h-[12rem] rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm leading-relaxed tracking-normal text-white outline-none transition-colors placeholder:text-white/28 focus:border-white/26 xl:min-h-[15rem]"
                                                placeholder={isListBlock ? 'One line per list item' : 'Write the visible copy for this block'}
                                            />
                                        </label>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : null}

                {showsPreviewPane ? (
                    <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4 md:p-5 xl:sticky xl:top-0 xl:self-start">
                        <div className="border-b border-white/8 pb-4">
                            <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">Live Preview</p>
                            <p className="mt-3 text-sm leading-relaxed text-white/62">This mirrors the semantic structure that will land in the storefront DOM. Use H1 sparingly and reserve it for the primary page subject when possible.</p>
                        </div>

                        <div className="mt-5 overflow-hidden rounded-[1.2rem] border border-white/10 bg-[#0E0E10] p-5">
                            <div className="max-h-[calc(100vh-22rem)] overflow-y-auto pr-1 xl:max-h-[calc(100vh-18rem)]">
                                <SiteCopyRichTextContent
                                    document={resolvedDocument}
                                    className="flex flex-col gap-4"
                                    blockBaseClassName="text-white"
                                    blockClassNames={PREVIEW_BLOCK_CLASS_NAMES}
                                    sizeClassNames={PREVIEW_SIZE_CLASS_NAMES}
                                    emptyState={<p className="text-sm leading-relaxed text-white/38">No content yet.</p>}
                                />
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}