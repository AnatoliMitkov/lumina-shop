"use client";

import { useRef } from 'react';
import { useSiteCopy } from './SiteCopyProvider';

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
    const resolvedText = context ? context.resolveText(contentKey, fallback) : fallback;
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
            {visibleText}
        </span>
    );
}