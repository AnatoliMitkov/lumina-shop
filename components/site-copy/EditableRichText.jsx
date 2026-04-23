"use client";

import { useRef } from 'react';
import { DEFAULT_LANGUAGE, resolveLocalizedValue } from '../../utils/language';
import { resolveSiteCopyRichTextEntry } from '../../utils/site-copy';
import { useSiteCopy } from './SiteCopyProvider';
import SiteCopyRichTextContent from './SiteCopyRichTextContent';

export default function EditableRichText({
    contentKey,
    fallback = '',
    editorLabel,
    className = '',
    blockBaseClassName = '',
    blockClassNames = {},
    sizeClassNames = {},
    listClassName = '',
}) {
    const context = useSiteCopy();
    const containerRef = useRef(null);
    const isAdmin = context?.isAdmin;
    const isEditMode = context?.isEditMode;
    const resolvedDocument = context
        ? context.resolveRichTextEntry(contentKey, fallback)
        : resolveSiteCopyRichTextEntry(undefined, resolveLocalizedValue(fallback, DEFAULT_LANGUAGE));
    const hasVisibleContent = resolvedDocument.blocks.some((block) => String(block.text || '').trim());
    const highlightClassName = isAdmin && isEditMode
        ? 'rounded-[0.8rem] outline outline-1 outline-offset-[3px] outline-[#1C1C1C]/18 bg-[#EFE7DA]/20 cursor-pointer'
        : '';

    const registerHover = () => {
        if (!context || !containerRef.current || !isAdmin || !isEditMode) {
            return;
        }

        context.registerHoverTarget({
            key: contentKey,
            label: editorLabel || contentKey,
            fallback,
            entryType: 'rich-text',
            element: containerRef.current,
        });
    };

    const handleClick = (event) => {
        if (!context || !isAdmin || !isEditMode) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        context.openEditor({
            key: contentKey,
            label: editorLabel || contentKey,
            fallback,
            entryType: 'rich-text',
            element: containerRef.current,
        });
    };

    return (
        <div
            ref={containerRef}
            className={`${className} ${highlightClassName}`.trim()}
            onMouseEnter={registerHover}
            onMouseMove={registerHover}
            onMouseLeave={() => context?.clearHoverTarget()}
            onFocus={registerHover}
            onBlur={() => context?.clearHoverTarget()}
            onClick={handleClick}
            suppressHydrationWarning
        >
            {hasVisibleContent ? (
                <SiteCopyRichTextContent
                    document={resolvedDocument}
                    className="flex flex-col gap-4"
                    blockBaseClassName={blockBaseClassName}
                    blockClassNames={blockClassNames}
                    sizeClassNames={sizeClassNames}
                    listClassName={listClassName}
                />
            ) : (
                isAdmin && isEditMode ? <span>[Empty content]</span> : null
            )}
        </div>
    );
}