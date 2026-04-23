"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Link } from '@tiptap/extension-link';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import { CharacterCount } from '@tiptap/extension-character-count';
import {
    createLuminaTextDocument,
    htmlToPlainText,
    resolveLuminaTextDocument,
    sanitizeLuminaTextHtml,
} from '../../utils/lumina-text';

const COLOR_SWATCHES = [
    '#ffffff', '#efe7da', '#c8b893', '#9a7b3f',
    '#1c1c1c', '#3a3a3a', '#7a7a7a', '#b3b3b3',
    '#a64b3a', '#c97a44', '#3a6b4a', '#365a7a',
];

const FONT_SIZE_OPTIONS = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 48, 72];

function normalizeFontSizeValue(value) {
    const normalizedValue = String(value || '').trim();

    if (!normalizedValue) {
        return '';
    }

    if (/^\d+(?:\.\d+)?pt$/i.test(normalizedValue)) {
        return normalizedValue.toLowerCase();
    }

    if (/^\d+(?:\.\d+)?$/.test(normalizedValue)) {
        return `${normalizedValue}pt`;
    }

    return '';
}

const StyledText = TextStyle.extend({
    addAttributes() {
        return {
            ...(this.parent?.() || {}),
            fontSize: {
                default: null,
                parseHTML: (element) => normalizeFontSizeValue(element.style.fontSize),
                renderHTML: (attributes) => {
                    const fontSize = normalizeFontSizeValue(attributes.fontSize);

                    if (!fontSize) {
                        return {};
                    }

                    return {
                        style: `font-size: ${fontSize}`,
                    };
                },
            },
        };
    },
});

function ToolbarButton({ isActive = false, onClick, title, disabled = false, children }) {
    return (
        <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`hover-target inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-[0.7rem] border px-2.5 text-[11px] uppercase tracking-[0.18em] transition-colors ${
                isActive
                    ? 'border-[#EFE7DA] bg-[#EFE7DA] text-[#1C1C1C]'
                    : 'border-white/10 bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08]'
            } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
            {children}
        </button>
    );
}

function ToolbarDivider() {
    return <span className="mx-1 h-6 w-px self-center bg-white/10" />;
}

function HeadingPicker({ editor, allowHeadings }) {
    if (!editor || !allowHeadings) return null;
    const value = editor.isActive('heading', { level: 1 })
        ? 'h1'
        : editor.isActive('heading', { level: 2 })
            ? 'h2'
            : editor.isActive('heading', { level: 3 })
                ? 'h3'
                : 'p';

    return (
        <select
            value={value}
            onMouseDown={(event) => event.stopPropagation()}
            onChange={(event) => {
                const next = event.target.value;
                if (next === 'p') {
                    editor.chain().focus().setParagraph().run();
                } else {
                    const level = Number(next.replace('h', ''));
                    editor.chain().focus().toggleHeading({ level }).run();
                }
            }}
            className="h-9 rounded-[0.7rem] border border-white/10 bg-white/[0.04] px-3 text-[11px] uppercase tracking-[0.18em] text-white outline-none transition-colors focus:border-white/26"
        >
            <option value="p" className="bg-[#121214]">Body</option>
            <option value="h1" className="bg-[#121214]">Heading 1</option>
            <option value="h2" className="bg-[#121214]">Heading 2</option>
            <option value="h3" className="bg-[#121214]">Heading 3</option>
        </select>
    );
}

function FontSizePicker({ editor }) {
    if (!editor) return null;

    const currentFontSize = normalizeFontSizeValue(editor.getAttributes('textStyle').fontSize);
    const currentPointValue = currentFontSize ? String(Number.parseFloat(currentFontSize)) : 'auto';
    const hasCustomValue = currentPointValue !== 'auto' && !FONT_SIZE_OPTIONS.includes(Number(currentPointValue));
    const options = hasCustomValue
        ? [...FONT_SIZE_OPTIONS, Number(currentPointValue)].sort((left, right) => left - right)
        : FONT_SIZE_OPTIONS;

    return (
        <select
            value={currentPointValue}
            onMouseDown={(event) => event.stopPropagation()}
            onChange={(event) => {
                const next = event.target.value;

                if (next === 'auto') {
                    editor.chain().focus().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
                    return;
                }

                editor.chain().focus().setMark('textStyle', { fontSize: `${next}pt` }).run();
            }}
            className="h-9 rounded-[0.7rem] border border-white/10 bg-white/[0.04] px-3 text-[11px] uppercase tracking-[0.18em] text-white outline-none transition-colors focus:border-white/26"
            title="Font size"
        >
            <option value="auto" className="bg-[#121214]">Auto</option>
            {options.map((size) => (
                <option key={size} value={size} className="bg-[#121214]">{size} pt</option>
            ))}
        </select>
    );
}

function ColorMenu({ editor }) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const onDocClick = (event) => {
            if (!containerRef.current?.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [open]);

    if (!editor) return null;

    return (
        <div ref={containerRef} className="relative inline-flex">
            <ToolbarButton onClick={() => setOpen((prev) => !prev)} title="Text color" isActive={open}>
                <span className="inline-flex items-center gap-1">
                    A
                    <span
                        className="block h-1.5 w-4 rounded-full"
                        style={{ backgroundColor: editor.getAttributes('textStyle').color || '#ffffff' }}
                    />
                </span>
            </ToolbarButton>
            {open && (
                <div className="absolute left-0 top-[calc(100%+0.4rem)] z-30 flex w-[14rem] flex-wrap gap-2 rounded-[0.9rem] border border-white/10 bg-[#121214] p-3 shadow-2xl">
                    {COLOR_SWATCHES.map((color) => (
                        <button
                            key={color}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                                editor.chain().focus().setColor(color).run();
                                setOpen(false);
                            }}
                            className="h-7 w-7 rounded-full border border-white/12 transition-transform hover:scale-110"
                            style={{ backgroundColor: color }}
                            aria-label={`Color ${color}`}
                        />
                    ))}
                    <label className="flex w-full items-center justify-between gap-2 rounded-[0.6rem] border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/60">
                        Custom
                        <input
                            type="color"
                            value={editor.getAttributes('textStyle').color || '#ffffff'}
                            onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
                            className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0"
                        />
                    </label>
                    <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                            editor.chain().focus().unsetColor().run();
                            setOpen(false);
                        }}
                        className="w-full rounded-[0.6rem] border border-white/10 bg-white/[0.02] px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/55 transition-colors hover:text-white"
                    >
                        Reset color
                    </button>
                </div>
            )}
        </div>
    );
}

function LinkPrompt({ editor }) {
    const [open, setOpen] = useState(false);
    const [href, setHref] = useState('');
    const containerRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const onDocClick = (event) => {
            if (!containerRef.current?.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [open]);

    if (!editor) return null;

    const openMenu = () => {
        setHref(editor.getAttributes('link').href || '');
        setOpen(true);
    };

    const apply = () => {
        const trimmed = href.trim();
        if (!trimmed) {
            editor.chain().focus().unsetLink().run();
        } else {
            editor.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run();
        }
        setOpen(false);
    };

    return (
        <div ref={containerRef} className="relative inline-flex">
            <ToolbarButton isActive={editor.isActive('link') || open} onClick={openMenu} title="Insert link">
                Link
            </ToolbarButton>
            {open && (
                <div className="absolute left-0 top-[calc(100%+0.4rem)] z-30 w-[20rem] rounded-[0.9rem] border border-white/10 bg-[#121214] p-3 shadow-2xl">
                    <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-white/50">Link URL</p>
                    <input
                        type="url"
                        value={href}
                        onChange={(event) => setHref(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                apply();
                            }
                        }}
                        placeholder="https://example.com  or  /path  or  mailto:..."
                        className="h-10 w-full rounded-[0.7rem] border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none focus:border-white/26"
                        autoFocus
                    />
                    <div className="mt-3 flex justify-end gap-2">
                        <button
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                                editor.chain().focus().unsetLink().run();
                                setOpen(false);
                            }}
                            className="rounded-[0.6rem] border border-white/10 bg-white/[0.02] px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/55 transition-colors hover:text-white"
                        >
                            Remove
                        </button>
                        <button
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={apply}
                            className="rounded-[0.6rem] bg-[#EFE7DA] px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]"
                        >
                            Apply
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function FindReplacePanel({ editor }) {
    const [open, setOpen] = useState(false);
    const [find, setFind] = useState('');
    const [replace, setReplace] = useState('');

    if (!editor) return null;

    const replaceAll = () => {
        if (!find) return;
        const text = editor.getText();
        if (!text.includes(find)) return;
        const html = editor.getHTML();
        const safeFind = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const next = html.replace(new RegExp(safeFind, 'g'), replace);
        editor.commands.setContent(next, true);
    };

    return (
        <div className="relative inline-flex">
            <ToolbarButton isActive={open} onClick={() => setOpen((prev) => !prev)} title="Find and replace">
                Find
            </ToolbarButton>
            {open && (
                <div className="absolute right-0 top-[calc(100%+0.4rem)] z-30 w-[22rem] space-y-2 rounded-[0.9rem] border border-white/10 bg-[#121214] p-3 shadow-2xl">
                    <input
                        value={find}
                        onChange={(event) => setFind(event.target.value)}
                        placeholder="Find"
                        className="h-9 w-full rounded-[0.6rem] border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none focus:border-white/26"
                    />
                    <input
                        value={replace}
                        onChange={(event) => setReplace(event.target.value)}
                        placeholder="Replace with"
                        className="h-9 w-full rounded-[0.6rem] border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none focus:border-white/26"
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={replaceAll}
                            className="rounded-[0.6rem] bg-[#EFE7DA] px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]"
                        >
                            Replace all
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function LuminaTextEditor({
    value,
    fallback = '',
    mode = 'block',
    onChange,
    autoFocus = true,
    minHeight,
}) {
    const isInline = mode === 'inline';
    const initialDoc = useMemo(
        () => resolveLuminaTextDocument(value, fallback, mode),
        // Intentionally only resolve once per editor mount; updates flow through editor.commands.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const extensions = useMemo(() => {
        const list = [
            StarterKit.configure({
                heading: isInline ? false : { levels: [1, 2, 3] },
                bulletList: isInline ? false : {},
                orderedList: isInline ? false : {},
                listItem: isInline ? false : {},
                blockquote: isInline ? false : {},
                codeBlock: false,
                horizontalRule: false,
                hardBreak: { keepMarks: true },
            }),
            Underline,
            StyledText,
            Color.configure({ types: ['textStyle'] }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
            }),
            CharacterCount.configure({}),
        ];
        if (!isInline) {
            list.push(
                TextAlign.configure({
                    types: ['heading', 'paragraph'],
                    alignments: ['left', 'center', 'right', 'justify'],
                }),
            );
        }
        return list;
    }, [isInline]);

    const editor = useEditor({
        extensions,
        content: initialDoc.html || (initialDoc.text ? `<p>${initialDoc.text.replace(/</g, '&lt;')}</p>` : ''),
        autofocus: autoFocus ? 'end' : false,
        editorProps: {
            attributes: {
                class: `lumina-text-surface focus:outline-none ${
                    isInline
                        ? 'min-h-[3rem] py-2'
                        : 'min-h-[12rem] py-4'
                } px-4 text-white`,
                spellcheck: 'true',
            },
        },
        onUpdate: ({ editor: currentEditor }) => {
            if (!onChange) return;
            const rawHtml = currentEditor.getHTML();
            const cleanHtml = sanitizeLuminaTextHtml(rawHtml);
            const text = currentEditor.getText();
            onChange(createLuminaTextDocument({ html: cleanHtml, text, mode }));
        },
        immediatelyRender: false,
    });

    // If parent swaps to a different entry while the modal stays open, sync the
    // editor content. We avoid pushing updates while the user is mid-edit by
    // checking if the new value differs from current HTML.
    useEffect(() => {
        if (!editor) return;
        const incoming = resolveLuminaTextDocument(value, fallback, mode);
        const incomingHtml = incoming.html || '';
        if (incomingHtml && incomingHtml !== editor.getHTML()) {
            // Only resync if the editor isn't currently focused (avoid clobbering typing).
            if (!editor.isFocused) {
                editor.commands.setContent(incomingHtml, false);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    if (!editor) {
        return (
            <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-4 text-sm text-white/50">
                Loading editor…
            </div>
        );
    }

    const wordCount = editor.storage.characterCount?.words?.() ?? 0;
    const charCount = editor.storage.characterCount?.characters?.() ?? 0;

    return (
        <div className="lumina-text-editor flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-1.5 rounded-[1rem] border border-white/10 bg-white/[0.03] p-2">
                <ToolbarButton
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    title="Undo (Ctrl/Cmd+Z)"
                >
                    ↶
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    title="Redo (Ctrl/Cmd+Shift+Z)"
                >
                    ↷
                </ToolbarButton>

                <ToolbarDivider />

                <HeadingPicker editor={editor} allowHeadings={!isInline} />
                <FontSizePicker editor={editor} />

                <ToolbarButton
                    isActive={editor.isActive('bold')}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    title="Bold (Ctrl/Cmd+B)"
                >
                    <span className="font-bold">B</span>
                </ToolbarButton>
                <ToolbarButton
                    isActive={editor.isActive('italic')}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    title="Italic (Ctrl/Cmd+I)"
                >
                    <span className="italic">I</span>
                </ToolbarButton>
                <ToolbarButton
                    isActive={editor.isActive('underline')}
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    title="Underline (Ctrl/Cmd+U)"
                >
                    <span className="underline">U</span>
                </ToolbarButton>
                <ToolbarButton
                    isActive={editor.isActive('strike')}
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    title="Strikethrough"
                >
                    <span className="line-through">S</span>
                </ToolbarButton>

                <ColorMenu editor={editor} />
                <LinkPrompt editor={editor} />

                {!isInline && (
                    <>
                        <ToolbarDivider />
                        <ToolbarButton
                            isActive={editor.isActive('bulletList')}
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                            title="Bullet list"
                        >
                            • List
                        </ToolbarButton>
                        <ToolbarButton
                            isActive={editor.isActive('orderedList')}
                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                            title="Numbered list"
                        >
                            1. List
                        </ToolbarButton>
                        <ToolbarButton
                            isActive={editor.isActive('blockquote')}
                            onClick={() => editor.chain().focus().toggleBlockquote().run()}
                            title="Quote"
                        >
                            “ ”
                        </ToolbarButton>

                        <ToolbarDivider />
                        <ToolbarButton
                            isActive={editor.isActive({ textAlign: 'left' })}
                            onClick={() => editor.chain().focus().setTextAlign('left').run()}
                            title="Align left"
                        >
                            ⟸
                        </ToolbarButton>
                        <ToolbarButton
                            isActive={editor.isActive({ textAlign: 'center' })}
                            onClick={() => editor.chain().focus().setTextAlign('center').run()}
                            title="Align center"
                        >
                            ≡
                        </ToolbarButton>
                        <ToolbarButton
                            isActive={editor.isActive({ textAlign: 'right' })}
                            onClick={() => editor.chain().focus().setTextAlign('right').run()}
                            title="Align right"
                        >
                            ⟹
                        </ToolbarButton>
                        <ToolbarButton
                            isActive={editor.isActive({ textAlign: 'justify' })}
                            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                            title="Justify"
                        >
                            ☰
                        </ToolbarButton>
                    </>
                )}

                <ToolbarDivider />
                <ToolbarButton
                    onClick={() => editor.chain().focus().unsetAllMarks().run()}
                    title="Clear formatting"
                >
                    Clear
                </ToolbarButton>
                <FindReplacePanel editor={editor} />
            </div>

            <div
                className={`rounded-[1.2rem] border border-white/10 bg-white/[0.04] transition-colors focus-within:border-white/26 ${
                    isInline ? '' : 'min-h-[14rem]'
                }`}
                style={minHeight ? { minHeight } : undefined}
            >
                <EditorContent editor={editor} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-white/40">
                <span>{wordCount} {wordCount === 1 ? 'word' : 'words'} · {charCount} {charCount === 1 ? 'character' : 'characters'}</span>
                <span>Ctrl/Cmd + B I U Z · Shift+Enter for line break</span>
            </div>
        </div>
    );
}

// Re-export plain-text helper for callers that need a fallback string.
export { htmlToPlainText };
