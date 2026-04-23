"use client";

import { useEffect, useRef, useState } from 'react';
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

function EditorPill({ isActive = false, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.2em] transition-colors ${isActive ? 'border-[#EFE7DA] bg-[#EFE7DA] text-[#1C1C1C]' : 'border-white/10 bg-white/[0.04] text-white/64 hover:text-white hover:bg-white/[0.08]'}`}
        >
            {children}
        </button>
    );
}

function resolveBlockEditorText(value = '', isListBlock = false) {
    if (isListBlock) {
        const normalizedValue = String(value || '').replace(/\r\n?/g, '\n');
        return normalizedValue;
    }

    return String(value || '').replace(/\r\n?/g, '\n');
}

function RichTextBlockComposer({
    block,
    index,
    onUpdateBlock,
    onMoveBlock,
    onDuplicateBlock,
    onRemoveBlock,
}) {
    const editorRef = useRef(null);
    const isComposingRef = useRef(false);
    const isListBlock = block.type === 'bullet-list' || block.type === 'numbered-list';
    const toolbarHint = isListBlock
        ? 'Enter adds a new list item line. Formatting applies to the whole block.'
        : 'Use the toolbar or keyboard shortcuts. Formatting applies to the whole block.';

    // Sync external text changes into the contentEditable surface only when the
    // user is NOT actively editing it. Touching innerText while focused would
    // collapse the selection to the start of the node, causing each newly typed
    // character to be inserted at position 0 (which produced the "reversed"
    // typing glitch). We also skip while an IME composition is in progress so
    // Cyrillic / Bulgarian input keeps working.
    useEffect(() => {
        const surface = editorRef.current;
        if (!surface) {
            return;
        }

        if (typeof document !== 'undefined' && document.activeElement === surface) {
            return;
        }

        if (isComposingRef.current) {
            return;
        }

        const nextValue = resolveBlockEditorText(block.text, isListBlock);

        if (surface.innerText !== nextValue) {
            surface.innerText = nextValue;
        }
    }, [block.text, isListBlock]);

    const syncFromSurface = () => {
        if (isComposingRef.current) {
            return;
        }

        if (!editorRef.current) {
            return;
        }

        const nextText = editorRef.current.innerText.replace(/\r\n?/g, '\n');

        onUpdateBlock(block.id, (currentBlock) => {
            if (currentBlock.text === nextText) {
                return currentBlock;
            }
            return { ...currentBlock, text: nextText };
        });
    };

    const handleCompositionStart = () => {
        isComposingRef.current = true;
    };

    const handleCompositionEnd = () => {
        isComposingRef.current = false;
        syncFromSurface();
    };

    const handleKeyboardShortcut = (event) => {
        // Normalize Enter so the browser doesn't insert a new <div> block,
        // which would break inherited formatting (especially underline) on the
        // following line. We insert a clean <br> via execCommand so the editor
        // stays a single flow and styles propagate consistently.
        if (event.key === 'Enter' && !event.shiftKey && !isListBlock) {
            event.preventDefault();
            if (typeof document !== 'undefined' && document.queryCommandSupported && document.queryCommandSupported('insertLineBreak')) {
                document.execCommand('insertLineBreak');
            } else if (typeof document !== 'undefined') {
                document.execCommand('insertHTML', false, '<br><br>');
            }
            // Let the input event fire and sync back to state
            return;
        }

        if (!(event.metaKey || event.ctrlKey)) {
            return;
        }

        const pressedKey = event.key.toLowerCase();

        if (pressedKey === 'b') {
            event.preventDefault();
            onUpdateBlock(block.id, (currentBlock) => ({ ...currentBlock, bold: !currentBlock.bold }));
        }

        if (pressedKey === 'i') {
            event.preventDefault();
            onUpdateBlock(block.id, (currentBlock) => ({ ...currentBlock, italic: !currentBlock.italic }));
        }

        if (pressedKey === 'u') {
            event.preventDefault();
            onUpdateBlock(block.id, (currentBlock) => ({ ...currentBlock, underline: !currentBlock.underline }));
        }
    };

    return (
        <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4 md:p-5">
            <div className="flex flex-col gap-3 border-b border-white/8 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">Block {String(index + 1).padStart(2, '0')}</p>
                    <p className="mt-2 text-sm leading-relaxed text-white/62">{toolbarHint}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <SurfaceButton onClick={() => onMoveBlock(block.id, -1)} isActive={false}>Up</SurfaceButton>
                    <SurfaceButton onClick={() => onMoveBlock(block.id, 1)} isActive={false}>Down</SurfaceButton>
                    <SurfaceButton onClick={() => onDuplicateBlock(block.id)} isActive={false}>Duplicate</SurfaceButton>
                    <SurfaceButton onClick={() => onRemoveBlock(block.id)} isActive={false}>Delete</SurfaceButton>
                </div>
            </div>

            <div className="mt-5 flex flex-col gap-5">
                <div className="grid gap-4 lg:grid-cols-2">
                    <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.24em] text-white/48">
                        Block Type
                        <select
                            value={block.type}
                            onChange={(event) => {
                                const nextType = event.target.value;
                                onUpdateBlock(block.id, (currentBlock) => ({
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
                                onUpdateBlock(block.id, (currentBlock) => ({
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

                <div className="flex flex-col gap-3">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">Quick Formatting</p>
                    <div className="flex flex-wrap gap-2">
                        <EditorPill isActive={block.bold} onClick={() => onUpdateBlock(block.id, (currentBlock) => ({ ...currentBlock, bold: !currentBlock.bold }))}>Bold</EditorPill>
                        <EditorPill isActive={block.italic} onClick={() => onUpdateBlock(block.id, (currentBlock) => ({ ...currentBlock, italic: !currentBlock.italic }))}>Italic</EditorPill>
                        <EditorPill isActive={block.underline} onClick={() => onUpdateBlock(block.id, (currentBlock) => ({ ...currentBlock, underline: !currentBlock.underline }))}>Underline</EditorPill>
                        {SITE_COPY_RICH_TEXT_ALIGN_OPTIONS.map((option) => (
                            <EditorPill key={option.value} isActive={block.align === option.value} onClick={() => onUpdateBlock(block.id, (currentBlock) => ({ ...currentBlock, align: option.value }))}>
                                {option.label}
                            </EditorPill>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">Color</p>
                        <button
                            type="button"
                            onClick={() => onUpdateBlock(block.id, (currentBlock) => ({ ...currentBlock, color: '' }))}
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
                                onClick={() => onUpdateBlock(block.id, (currentBlock) => ({ ...currentBlock, color }))}
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
                                onChange={(event) => onUpdateBlock(block.id, (currentBlock) => ({ ...currentBlock, color: event.target.value }))}
                                className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0"
                            />
                        </label>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-white/48">
                        <span>Writing Surface</span>
                        <span className="text-white/32">Ctrl/Cmd+B, I, U</span>
                    </div>

                    <div
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        spellCheck
                        onInput={syncFromSurface}
                        onBlur={syncFromSurface}
                        onKeyDown={handleKeyboardShortcut}
                        onCompositionStart={handleCompositionStart}
                        onCompositionEnd={handleCompositionEnd}
                        className={`min-h-[12rem] rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm tracking-normal text-white outline-none transition-colors focus:border-white/26 xl:min-h-[15rem] ${PREVIEW_BLOCK_CLASS_NAMES[block.type] || PREVIEW_BLOCK_CLASS_NAMES.paragraph} ${PREVIEW_SIZE_CLASS_NAMES[block.size] || PREVIEW_SIZE_CLASS_NAMES.body}`}
                        style={{
                            color: block.color || undefined,
                            textAlign: block.align,
                            whiteSpace: 'pre-wrap',
                            fontWeight: block.bold ? 600 : undefined,
                            fontStyle: block.italic ? 'italic' : undefined,
                            textDecoration: block.underline ? 'underline' : undefined,
                            textDecorationSkipInk: block.underline ? 'auto' : undefined,
                            textUnderlineOffset: block.underline ? '0.18em' : undefined,
                        }}
                    />

                    <details className="rounded-[1rem] border border-white/10 bg-white/[0.02] px-4 py-3 text-white/62">
                        <summary className="cursor-pointer text-[10px] uppercase tracking-[0.24em] text-white/48">Plain Text View</summary>
                        <textarea
                            value={block.text}
                            onChange={(event) => onUpdateBlock(block.id, (currentBlock) => ({
                                ...currentBlock,
                                text: event.target.value,
                            }))}
                            rows={isListBlock ? 8 : 6}
                            className="mt-3 min-h-[10rem] w-full rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm leading-relaxed tracking-normal text-white outline-none transition-colors placeholder:text-white/28 focus:border-white/26"
                            placeholder={isListBlock ? 'One line per list item' : 'Write the visible copy for this block'}
                        />
                    </details>
                </div>
            </div>
        </div>
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
                            return (
                                <RichTextBlockComposer
                                    key={block.id}
                                    block={block}
                                    index={index}
                                    onUpdateBlock={updateBlock}
                                    onMoveBlock={moveBlock}
                                    onDuplicateBlock={duplicateBlock}
                                    onRemoveBlock={removeBlock}
                                />
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