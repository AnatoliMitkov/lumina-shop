"use client";

import { useEffect, useState } from 'react';
import { detectEditableMediaKind } from './media-kind';
import {
    buildResponsiveMediaStyle,
    buildViewportMediaLayoutStyle,
    buildViewportMediaTransformStyle,
    resolveSiteCopyMediaEntry,
} from '../../utils/site-copy';

function callHandler(handler, event) {
    if (typeof handler === 'function') {
        handler(event);
    }
}

export default function EditableMediaAsset({
    source = '',
    alt = '',
    fallbackKind = 'image',
    className = '',
    onError,
    mediaConfig,
    viewportMode = 'responsive',
    imageProps = {},
    videoProps = {},
}) {
    const [resolvedKind, setResolvedKind] = useState(() => detectEditableMediaKind(source, fallbackKind));
    const [hasSwappedKind, setHasSwappedKind] = useState(false);
    const imageErrorHandler = imageProps.onError;
    const videoErrorHandler = videoProps.onError;
    const normalizedMediaConfig = resolveSiteCopyMediaEntry({
        ...(mediaConfig || {}),
        src: source,
    }, source);

    useEffect(() => {
        setResolvedKind(detectEditableMediaKind(source, fallbackKind));
        setHasSwappedKind(false);
    }, [fallbackKind, source]);

    const handleMediaError = (event, kindHandler) => {
        if (!hasSwappedKind) {
            setHasSwappedKind(true);
            setResolvedKind((currentKind) => (currentKind === 'video' ? 'image' : 'video'));
            return;
        }

        callHandler(kindHandler, event);
        callHandler(onError, event);
    };

    if (!source) {
        return null;
    }

    const shellStyle = viewportMode === 'responsive'
        ? buildResponsiveMediaStyle(normalizedMediaConfig)
        : buildViewportMediaTransformStyle(normalizedMediaConfig, viewportMode);
    const mediaLayoutStyle = viewportMode === 'responsive'
        ? null
        : buildViewportMediaLayoutStyle(normalizedMediaConfig, viewportMode);
    const sharedClassName = `${viewportMode === 'responsive' ? 'editable-media-asset-responsive' : ''} ${className}`.trim();

    if (resolvedKind === 'video') {
        const { onError: ignoredOnError, style: videoStyle, ...restVideoProps } = videoProps;

        return (
            <div
                className={`h-full w-full overflow-hidden ${viewportMode === 'responsive' ? 'editable-media-transform-shell-responsive' : ''}`.trim()}
                style={shellStyle}
            >
                <video
                    key={`${source}:video`}
                    src={source}
                    className={sharedClassName}
                    style={{
                        ...(mediaLayoutStyle || {}),
                        ...videoStyle,
                    }}
                    onError={(event) => handleMediaError(event, videoErrorHandler)}
                    {...restVideoProps}
                />
            </div>
        );
    }

    const { onError: ignoredOnError, style: imageStyle, ...restImageProps } = imageProps;

    return (
        <div
            className={`h-full w-full overflow-hidden ${viewportMode === 'responsive' ? 'editable-media-transform-shell-responsive' : ''}`.trim()}
            style={shellStyle}
        >
            <img
                key={`${source}:image`}
                src={source}
                alt={alt}
                className={sharedClassName}
                style={{
                    ...(mediaLayoutStyle || {}),
                    ...imageStyle,
                }}
                onError={(event) => handleMediaError(event, imageErrorHandler)}
                {...restImageProps}
            />
        </div>
    );
}