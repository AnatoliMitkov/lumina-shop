'use client';

import '../../_archive/fifth-avenue-prototype/src/index.css';
import PrototypeApp from '../../_archive/fifth-avenue-prototype/src/App';

export default function FifthAvenuePrototypePageClient({ activeLanguage = 'en', collectionStageMediaOverrides = {}, initialProducts = [] }) {
    return (
        <PrototypeApp
            key={activeLanguage}
            activeLanguage={activeLanguage}
            collectionStageMediaOverrides={collectionStageMediaOverrides}
            initialProducts={initialProducts}
        />
    );
}

