"use client";

import { useRef } from 'react';
import { DEFAULT_LANGUAGE, resolveLocalizedValue } from '../../utils/language';
import { useSiteCopy } from './SiteCopyProvider';
import { isLuminaTextValue } from '../../utils/lumina-text';
import LuminaTextRenderer from './LuminaTextRenderer';

export default function EditableText({
    contentKey,
    fallback = '',
    editorLabel,
    multiline = true,
    className = '',
}) {
    const context = useSiteCopy();
    const textRef = useRef(null);
    const isAdmin = context?.isAdmin;
    const isEditMode = context?.isEditMode;
    const rawEntry = context?.getRawEntry?.(contentKey);
    const isRichEntry = isLuminaTextValue(rawEntry);
    const resolvedText = context ? context.resolveText(contentKey, fallback) : resolveLocalizedValue(fallback, DEFAULT_LANGUAGE);
    const visibleText = resolvedText === '' && isAdmin && isEditMode ? '[Empty text]' : resolvedText;
    const highlightClassName = isAdmin && isEditMode
        ? 'rounded-[0.35rem] outline outline-1 outline-offset-[3px] outline-[#1C1C1C]/18 bg-[#EFE7DA]/45 cursor-pointer'
        : '';

    const registerHover = () => {
        if (!context || !textRef.current || !isAdmin || !isEditMode) {
            return;
        }

        context.registerHoverTarget({
            key: contentKey,
            label: editorLabel || contentKey,
            fallback,
            entryType: 'text',
            multiline,
            element: textRef.current,
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
            entryType: 'text',
            multiline,
            element: textRef.current,
        });
    };

    return (
        <span
            ref={textRef}
            className={`${className} ${highlightClassName}`.trim()}
            onMouseEnter={registerHover}
            onMouseMove={registerHover}
            onMouseLeave={() => context?.clearHoverTarget()}
            onFocus={registerHover}
            onBlur={() => context?.clearHoverTarget()}
            onClick={handleClick}
            suppressHydrationWarning
        >
            {isRichEntry ? (
                <LuminaTextRenderer value={rawEntry} fallback={fallback} mode="inline" inline />
            ) : (
                visibleText
            )}
        </span>
    );
}