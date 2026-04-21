"use client";

import { Fragment } from 'react';

const BLOCK_TAG_NAMES = {
    paragraph: 'p',
    heading1: 'h1',
    heading2: 'h2',
    heading3: 'h3',
    quote: 'blockquote',
    'bullet-list': 'ul',
    'numbered-list': 'ol',
};

const ALIGNMENT_CLASS_NAMES = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify',
};

const DEFAULT_TYPE_CLASS_NAMES = {
    heading1: 'font-serif font-light uppercase tracking-[0.08em] leading-[0.9]',
    heading2: 'font-serif font-light uppercase tracking-[0.08em] leading-[0.92]',
    heading3: 'font-serif font-light uppercase tracking-[0.08em] leading-[0.96]',
    paragraph: 'leading-relaxed',
    quote: 'border-l border-current/20 pl-5',
    'bullet-list': 'list-disc space-y-2 pl-6',
    'numbered-list': 'list-decimal space-y-2 pl-6',
};

const DEFAULT_SIZE_CLASS_NAMES = {
    xs: 'text-xs md:text-sm',
    sm: 'text-sm md:text-base',
    body: 'text-base md:text-lg',
    lg: 'text-xl md:text-2xl',
    xl: 'text-2xl md:text-4xl',
    display: 'text-4xl md:text-6xl xl:text-[5rem]',
};

function renderLineBreaks(text = '') {
    const lines = String(text || '').split('\n');

    return lines.map((line, index) => (
        <Fragment key={`${line}-${index}`}>
            {line}
            {index < lines.length - 1 ? <br /> : null}
        </Fragment>
    ));
}

export default function SiteCopyRichTextContent({
    document,
    className = '',
    blockBaseClassName = '',
    blockClassNames = {},
    sizeClassNames = {},
    listClassName = '',
    emptyState = null,
}) {
    const blocks = Array.isArray(document?.blocks) ? document.blocks : [];

    if (blocks.length === 0) {
        return emptyState;
    }

    const resolvedSizeClassNames = {
        ...DEFAULT_SIZE_CLASS_NAMES,
        ...(sizeClassNames || {}),
    };

    return (
        <div className={className}>
            {blocks.map((block, index) => {
                const Tag = BLOCK_TAG_NAMES[block.type] || 'p';
                const isListBlock = block.type === 'bullet-list' || block.type === 'numbered-list';
                const alignmentClassName = ALIGNMENT_CLASS_NAMES[block.align] || ALIGNMENT_CLASS_NAMES.left;
                const sizeClassName = resolvedSizeClassNames[block.size] || resolvedSizeClassNames.body;
                const typeClassName = DEFAULT_TYPE_CLASS_NAMES[block.type] || '';
                const customTypeClassName = blockClassNames?.[block.type] || '';
                const emphasisClassName = [
                    block.bold ? 'font-semibold' : '',
                    block.italic ? 'italic' : '',
                    block.underline ? 'underline decoration-current underline-offset-[0.18em]' : '',
                ].filter(Boolean).join(' ');
                const combinedClassName = [
                    blockBaseClassName,
                    typeClassName,
                    customTypeClassName,
                    sizeClassName,
                    alignmentClassName,
                    emphasisClassName,
                ].filter(Boolean).join(' ');
                const colorStyle = block.color ? { color: block.color } : undefined;

                if (isListBlock) {
                    const items = String(block.text || '')
                        .split('\n')
                        .map((item) => item.trim())
                        .filter(Boolean);

                    if (items.length === 0) {
                        return null;
                    }

                    return (
                        <Tag key={block.id || `${block.type}-${index}`} className={[combinedClassName, listClassName].filter(Boolean).join(' ')} style={colorStyle}>
                            {items.map((item, itemIndex) => (
                                <li key={`${block.id || block.type}-${itemIndex}`}>{item}</li>
                            ))}
                        </Tag>
                    );
                }

                return (
                    <Tag key={block.id || `${block.type}-${index}`} className={combinedClassName} style={colorStyle}>
                        {renderLineBreaks(block.text)}
                    </Tag>
                );
            })}
        </div>
    );
}