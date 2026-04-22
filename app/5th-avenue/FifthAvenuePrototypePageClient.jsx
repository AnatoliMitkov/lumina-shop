'use client';

import '../../fifth-avenue-prototype/src/index.css';
import PrototypeApp from '../../fifth-avenue-prototype/src/App';

export default function FifthAvenuePrototypePageClient({ collectionStageMediaOverrides = {} }) {
    return <PrototypeApp collectionStageMediaOverrides={collectionStageMediaOverrides} />;
}
