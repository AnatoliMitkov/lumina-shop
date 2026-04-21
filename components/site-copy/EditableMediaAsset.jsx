"use client";

import { useEffect, useState } from 'react';
import { detectEditableMediaKind } from './media-kind';

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
    imageProps = {},
    videoProps = {},
}) {
    const [resolvedKind, setResolvedKind] = useState(() => detectEditableMediaKind(source, fallbackKind));
    const [hasSwappedKind, setHasSwappedKind] = useState(false);
    const imageErrorHandler = imageProps.onError;
    const videoErrorHandler = videoProps.onError;

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

    if (resolvedKind === 'video') {
        const { onError: ignoredOnError, ...restVideoProps } = videoProps;

        return (
            <video
                key={`${source}:video`}
                src={source}
                className={className}
                onError={(event) => handleMediaError(event, videoErrorHandler)}
                {...restVideoProps}
            />
        );
    }

    const { onError: ignoredOnError, ...restImageProps } = imageProps;

    return (
        <img
            key={`${source}:image`}
            src={source}
            alt={alt}
            className={className}
            onError={(event) => handleMediaError(event, imageErrorHandler)}
            {...restImageProps}
        />
    );
}