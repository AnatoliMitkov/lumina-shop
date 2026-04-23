"use client";

import { useMemo } from 'react';
import { resolveLuminaTextDocument, sanitizeLuminaTextHtml } from '../../utils/lumina-text';

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

const HTML_TAG_TO_BLOCK_TYPE = {
    p: 'paragraph',
    h1: 'heading1',
    h2: 'heading2',
    h3: 'heading3',
    h4: 'heading3',
    h5: 'heading3',
    h6: 'heading3',
    blockquote: 'quote',
    ul: 'bullet-list',
    ol: 'numbered-list',
};

const HTML_TAG_TO_SIZE_KEY = {
    p: 'body',
    h1: 'display',
    h2: 'xl',
    h3: 'lg',
    h4: 'lg',
    h5: 'body',
    h6: 'body',
    blockquote: 'lg',
    ul: 'body',
    ol: 'body',
};

function joinClassNames(...values) {
    return Array.from(new Set(
        values
            .flatMap((value) => String(value || '').split(/\s+/))
            .filter(Boolean),
    )).join(' ');
}

// Renders a saved Lumina text document for the live site.
// - mode='inline'  -> renders inside a <span> with an inner <span> using
//   dangerouslySetInnerHTML stripped of block tags so it stays inline.
// - mode='block'   -> renders the full HTML inside the chosen wrapper element.
//
// The HTML coming from `lumina-text-v1` was sanitized at write time, but we
// re-sanitize on read as defense in depth in case anything was hand-edited
// directly in the database.

function stripBlockTagsForInline(html = '') {
    return String(html)
        .replace(/<\/?(p|div|h[1-6]|ul|ol|li|blockquote)[^>]*>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ');
}

function mergeHtmlClassAttribute(rawAttributes = '', nextClassName = '') {
    const normalizedAttributes = String(rawAttributes || '').trim();

    if (!nextClassName) {
        return normalizedAttributes;
    }

    if (/\bclass\s*=/i.test(normalizedAttributes)) {
        return normalizedAttributes.replace(/class\s*=\s*(["'])(.*?)\1/i, (match, quote, existingClassName) => `class=${quote}${joinClassNames(existingClassName, nextClassName)}${quote}`);
    }

    return normalizedAttributes
        ? `${normalizedAttributes} class="${nextClassName}"`
        : `class="${nextClassName}"`;
}

function decorateBlockHtml(
    html = '',
    {
        blockBaseClassName = '',
        blockClassNames = {},
        sizeClassNames = {},
        listClassName = '',
    } = {},
) {
    if (!html) {
        return html;
    }

    const resolvedSizeClassNames = {
        ...DEFAULT_SIZE_CLASS_NAMES,
        ...(sizeClassNames || {}),
    };
    return String(html).replace(/<(p|h1|h2|h3|h4|h5|h6|blockquote|ul|ol)([^>]*)>([\s\S]*?)<\/\1>/gi, (match, tagName, rawAttributes = '', innerHtml = '') => {
        const normalizedTagName = tagName.toLowerCase();
        const blockType = HTML_TAG_TO_BLOCK_TYPE[normalizedTagName] || 'paragraph';
        const sizeKey = HTML_TAG_TO_SIZE_KEY[normalizedTagName] || 'body';
        const usesSurfaceHeadingScale = /^h[1-6]$/.test(normalizedTagName);
        const sizeClassNamesForTag = usesSurfaceHeadingScale ? resolvedSizeClassNames : DEFAULT_SIZE_CLASS_NAMES;
        const hasInlineFontSize = /font-size\s*:/i.test(innerHtml);
        const combinedClassName = joinClassNames(
            blockBaseClassName,
            DEFAULT_TYPE_CLASS_NAMES[blockType] || '',
            blockClassNames?.[blockType] || '',
            hasInlineFontSize && usesSurfaceHeadingScale ? 'leading-[1.18]' : '',
            hasInlineFontSize ? '' : sizeClassNamesForTag[sizeKey] || DEFAULT_SIZE_CLASS_NAMES.body,
            normalizedTagName === 'ul' || normalizedTagName === 'ol' ? listClassName : '',
        );
        const mergedAttributes = mergeHtmlClassAttribute(rawAttributes, combinedClassName);

        return mergedAttributes ? `<${tagName} ${mergedAttributes}>${innerHtml}</${tagName}>` : `<${tagName}>${innerHtml}</${tagName}>`;
    });
}

export default function LuminaTextRenderer({
    value,
    fallback = '',
    mode = 'block',
    as,
    className = '',
    style,
    inline = false,
    blockBaseClassName = '',
    blockClassNames = {},
    sizeClassNames = {},
    listClassName = '',
}) {
    const isInline = inline || mode === 'inline';
    const Tag = as || (isInline ? 'span' : 'div');

    const html = useMemo(() => {
        const doc = resolveLuminaTextDocument(value, fallback, isInline ? 'inline' : 'block');
        const cleaned = sanitizeLuminaTextHtml(doc.html || '');
        return isInline
            ? stripBlockTagsForInline(cleaned)
            : decorateBlockHtml(cleaned, {
                blockBaseClassName,
                blockClassNames,
                sizeClassNames,
                listClassName,
            });
    }, [value, fallback, isInline, blockBaseClassName, blockClassNames, sizeClassNames, listClassName]);

    if (!html) {
        return <Tag className={className} style={style} />;
    }

    return (
        <Tag
            className={`lumina-text-content ${className}`.trim()}
            style={style}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
