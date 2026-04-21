"use client";

import { useRef } from 'react';
import { useSiteCopy } from './SiteCopyProvider';

export default function EditableMediaFrame({
    contentKey,
    fallback = '',
    editorLabel,
    mediaKind = 'image',
    className = '',
    children,
}) {
    const context = useSiteCopy();
    const mediaRef = useRef(null);
    const isAdmin = context?.isAdmin;
    const isEditMode = context?.isEditMode;
    const highlightClassName = isAdmin && isEditMode
        ? 'rounded-[0.75rem] outline outline-1 outline-offset-[3px] outline-[#EFE7DA]/70 cursor-pointer'
        : '';

    const registerHover = () => {
        if (!context || !mediaRef.current || !isAdmin || !isEditMode) {
            return;
        }

        context.registerHoverTarget({
            key: contentKey,
            label: editorLabel || contentKey,
            fallback,
            multiline: false,
            entryType: 'media',
            mediaKind,
            element: mediaRef.current,
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
            multiline: false,
            entryType: 'media',
            mediaKind,
            element: mediaRef.current,
        });
    };

    return (
        <div
            ref={mediaRef}
            className={`${className} ${highlightClassName}`.trim()}
            onMouseEnter={registerHover}
            onMouseMove={registerHover}
            onMouseLeave={() => context?.clearHoverTarget()}
            onClick={handleClick}
        >
            {children}
        </div>
    );
}