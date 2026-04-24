"use client";

import { useRef } from 'react';
import { DEFAULT_LANGUAGE, resolveLocalizedValue } from '../../utils/language';
import { resolveSiteCopyRichTextEntry } from '../../utils/site-copy';
import { isLuminaTextValue } from '../../utils/lumina-text';
import { useSiteCopy } from './SiteCopyProvider';
import SiteCopyRichTextContent from './SiteCopyRichTextContent';
import LuminaTextRenderer from './LuminaTextRenderer';

export default function EditableRichText({
    contentKey,
    fallback = '',
    editorLabel,
    className = '',
    blockBaseClassName = '',
    blockClassNames = {},
    sizeClassNames = {},
    listClassName = '',
    ignoreInlineFontSize = false,
}) {
    const context = useSiteCopy();
    const containerRef = useRef(null);
    const isAdmin = context?.isAdmin;
    const isEditMode = context?.isEditMode;
    const canEditRichText = isAdmin && isEditMode && Boolean(context?.canEditEntryType?.('rich-text'));
    const rawEntry = context?.getRawEntry?.(contentKey);
    const isLuminaEntry = isLuminaTextValue(rawEntry);
    const resolvedDocument = context
        ? context.resolveRichTextEntry(contentKey, fallback)
        : resolveSiteCopyRichTextEntry(undefined, resolveLocalizedValue(fallback, DEFAULT_LANGUAGE));
    const hasVisibleContent = isLuminaEntry || resolvedDocument.blocks.some((block) => String(block.text || '').trim());
    const isEmptyEditableContent = !hasVisibleContent && canEditRichText;
    const highlightClassName = canEditRichText
        ? 'rounded-[0.8rem] outline outline-1 outline-offset-[3px] outline-[#1C1C1C]/18 bg-[#EFE7DA]/20 cursor-pointer'
        : '';

    const registerHover = () => {
        if (!context || !containerRef.current || !canEditRichText) {
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
        if (!context || !canEditRichText) {
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
            className={`${className} ${highlightClassName} ${isEmptyEditableContent ? 'min-h-[1.75rem] min-w-[2rem]' : ''}`.trim()}
            onMouseEnter={registerHover}
            onMouseMove={registerHover}
            onMouseLeave={() => context?.clearHoverTarget()}
            onFocus={registerHover}
            onBlur={() => context?.clearHoverTarget()}
            onClick={handleClick}
            suppressHydrationWarning
        >
            {hasVisibleContent ? (
                isLuminaEntry ? (
                    <LuminaTextRenderer
                        value={rawEntry}
                        fallback={fallback}
                        mode="block"
                        className="flex flex-col gap-4"
                        blockBaseClassName={blockBaseClassName}
                        blockClassNames={blockClassNames}
                        sizeClassNames={sizeClassNames}
                        listClassName={listClassName}
                        ignoreInlineFontSize={ignoreInlineFontSize}
                    />
                ) : (
                    <SiteCopyRichTextContent
                        document={resolvedDocument}
                        className="flex flex-col gap-4"
                        blockBaseClassName={blockBaseClassName}
                        blockClassNames={blockClassNames}
                        sizeClassNames={sizeClassNames}
                        listClassName={listClassName}
                    />
                )
            ) : (
                isEmptyEditableContent ? <span aria-hidden="true" className="block min-h-[1.75rem] w-full">&nbsp;</span> : null
            )}
        </div>
    );
}