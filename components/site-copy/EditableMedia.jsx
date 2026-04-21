"use client";

import EditableMediaAsset from './EditableMediaAsset';
import EditableMediaFrame from './EditableMediaFrame';
import { useSiteCopy } from './SiteCopyProvider';

export default function EditableMedia({
    contentKey,
    fallback = '',
    editorLabel,
    alt = '',
    className = '',
    wrapperClassName = '',
    mediaKind = 'image',
    videoProps = {},
    onError,
    ...imageProps
}) {
    const context = useSiteCopy();
    const resolvedSource = context ? context.resolveMedia(contentKey, fallback) : fallback;

    return (
        <EditableMediaFrame
            contentKey={contentKey}
            fallback={fallback}
            editorLabel={editorLabel}
            mediaKind={mediaKind}
            className={wrapperClassName}
        >
            <EditableMediaAsset
                source={resolvedSource}
                alt={alt}
                fallbackKind={mediaKind}
                className={className}
                onError={onError}
                imageProps={imageProps}
                videoProps={{
                    autoPlay: true,
                    loop: true,
                    muted: true,
                    playsInline: true,
                    preload: 'metadata',
                    ...videoProps,
                }}
            />
        </EditableMediaFrame>
    );
}