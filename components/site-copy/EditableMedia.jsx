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
    defaultMediaSettings,
    videoProps = {},
    onError,
    ...imageProps
}) {
    const context = useSiteCopy();
    const resolvedMediaEntry = context
        ? context.resolveMediaEntry(contentKey, fallback, defaultMediaSettings)
        : { src: fallback, ...(defaultMediaSettings || {}) };
    const resolvedSource = resolvedMediaEntry?.src || fallback;

    return (
        <EditableMediaFrame
            contentKey={contentKey}
            fallback={fallback}
            editorLabel={editorLabel}
            mediaKind={mediaKind}
            className={wrapperClassName}
            defaultMediaSettings={defaultMediaSettings}
        >
            <EditableMediaAsset
                source={resolvedSource}
                alt={alt}
                fallbackKind={mediaKind}
                className={className}
                mediaConfig={resolvedMediaEntry}
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