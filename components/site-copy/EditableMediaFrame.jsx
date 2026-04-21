"use client";

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSiteCopy } from './SiteCopyProvider';

function clamp(value, minValue, maxValue) {
    return Math.min(Math.max(value, minValue), maxValue);
}

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
    const [frameRect, setFrameRect] = useState(null);
    const highlightClassName = isAdmin && isEditMode
        ? 'rounded-[0.75rem] outline outline-1 outline-offset-[3px] outline-[#EFE7DA]/70 cursor-pointer'
        : '';

    useEffect(() => {
        if (!isAdmin || !isEditMode || !mediaRef.current || typeof window === 'undefined') {
            setFrameRect(null);
            return undefined;
        }

        const element = mediaRef.current;
        let frameId = null;

        const updatePosition = () => {
            if (!element) {
                setFrameRect(null);
                return;
            }

            const bounds = element.getBoundingClientRect();
            const isVisible = bounds.bottom > 0
                && bounds.right > 0
                && bounds.top < window.innerHeight
                && bounds.left < window.innerWidth;

            if (!isVisible || bounds.width <= 0 || bounds.height <= 0) {
                setFrameRect(null);
                return;
            }

            setFrameRect({
                top: bounds.top,
                left: bounds.left,
                width: bounds.width,
                height: bounds.height,
            });
        };

        const requestPositionUpdate = () => {
            if (frameId != null) {
                return;
            }

            frameId = window.requestAnimationFrame(() => {
                frameId = null;
                updatePosition();
            });
        };

        const resizeObserver = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(requestPositionUpdate)
            : null;

        resizeObserver?.observe(element);
        updatePosition();

        window.addEventListener('scroll', requestPositionUpdate, true);
        window.addEventListener('resize', requestPositionUpdate);

        return () => {
            window.removeEventListener('scroll', requestPositionUpdate, true);
            window.removeEventListener('resize', requestPositionUpdate);
            resizeObserver?.disconnect();

            if (frameId != null) {
                window.cancelAnimationFrame(frameId);
            }
        };
    }, [isAdmin, isEditMode]);

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

    const openMediaEditor = (event) => {
        if (!context || !mediaRef.current || !isAdmin || !isEditMode) {
            return;
        }

        event?.preventDefault?.();
        event?.stopPropagation?.();
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

    const handleClick = (event) => {
        openMediaEditor(event);
    };

    const triggerStyle = frameRect && typeof window !== 'undefined'
        ? {
            top: clamp(frameRect.top + 14, 12, window.innerHeight - 52),
            left: clamp(frameRect.left + 14, 12, window.innerWidth - 140),
        }
        : null;

    return (
        <>
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

            {isAdmin && isEditMode && triggerStyle && typeof document !== 'undefined' && createPortal(
                <button
                    type="button"
                    onClick={openMediaEditor}
                    className="hover-target fixed z-[245] inline-flex items-center rounded-full border border-[#1C1C1C]/12 bg-[rgba(239,236,232,0.96)] px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C] shadow-[0_14px_40px_rgba(0,0,0,0.18)] transition-transform hover:scale-[1.03]"
                    style={triggerStyle}
                    aria-label={`Edit ${editorLabel || contentKey}`}
                >
                    {mediaKind === 'video' ? 'Edit Video' : 'Edit Image'}
                </button>,
                document.body,
            )}
        </>
    );
}