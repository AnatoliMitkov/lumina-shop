'use client';

import '../../_archive/fifth-avenue-prototype/src/index.css';
import PrototypeApp from '../../_archive/fifth-avenue-prototype/src/App';

export default function FifthAvenuePrototypePageClient({ collectionStageMediaOverrides = {} }) {
    return <PrototypeApp collectionStageMediaOverrides={collectionStageMediaOverrides} />;
}

