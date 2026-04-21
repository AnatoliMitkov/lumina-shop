"use client";

import EditableMediaFrame from './EditableMediaFrame';
import { useSiteCopy } from './SiteCopyProvider';

export default function EditableMedia({
    contentKey,
    fallback = '',
    editorLabel,
    alt = '',
    className = '',
    wrapperClassName = '',
    ...imageProps
}) {
    const context = useSiteCopy();
    const resolvedSource = context ? context.resolveMedia(contentKey, fallback) : fallback;

    return (
        <EditableMediaFrame
            contentKey={contentKey}
            fallback={fallback}
            editorLabel={editorLabel}
            mediaKind="image"
            className={wrapperClassName}
        >
            <img src={resolvedSource} alt={alt} className={className} {...imageProps} />
        </EditableMediaFrame>
    );
}