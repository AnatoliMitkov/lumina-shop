"use client";

import { startTransition, useEffect, useState } from 'react';
import EditableText from './site-copy/EditableText';
import LocalizedText from './LocalizedText';
import { createLocalizedValue as localizedFallback } from '../utils/language';

function renderEditableSectionItem(item, defaultEditorLabel) {
    if (item && typeof item === 'object' && typeof item.contentKey === 'string') {
        return <EditableText contentKey={item.contentKey} fallback={item.fallback} editorLabel={item.editorLabel || defaultEditorLabel} />;
    }

    return item;
}

function getSectionId(section, index) {
    return section.id || section.titleKey || section.title || `section-${index}`;
}

function SizeMeasurementsTable({ rows = [], language }) {
    return (
        <div
            className="min-w-0 w-full max-w-full overflow-x-auto rounded-[0.9rem] border border-[#1C1C1C]/10 bg-white/92 shadow-[0_14px_32px_rgba(92,75,67,0.06)]"
            style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x', overscrollBehaviorX: 'contain' }}
            data-lenis-prevent="true"
            data-lenis-prevent-wheel="true"
            data-lenis-prevent-touch="true"
        >
            <table className="min-w-[760px] w-full border-collapse text-left text-[0.95rem] lg:text-[1rem] text-[#1C1C1C]/72">
                <thead>
                    <tr className="bg-[#F5F1EB] text-[10px] lg:text-[0.78rem] uppercase tracking-[0.22em] text-[#1C1C1C]/48">
                        <th className="border-b border-[#1C1C1C]/10 px-4 py-4"><LocalizedText value={localizedFallback('Size', 'Размер')} language={language} /></th>
                        <th className="border-b border-[#1C1C1C]/10 px-4 py-4"><LocalizedText value={localizedFallback('Unit', 'Единица')} language={language} /></th>
                        <th className="border-b border-[#1C1C1C]/10 px-4 py-4"><LocalizedText value={localizedFallback('Bust / Chest', 'Бюст / Гръдна обиколка')} language={language} /></th>
                        <th className="border-b border-[#1C1C1C]/10 px-4 py-4"><LocalizedText value={localizedFallback('Waist', 'Талия')} language={language} /></th>
                        <th className="border-b border-[#1C1C1C]/10 px-4 py-4"><LocalizedText value={localizedFallback('Hips', 'Ханш')} language={language} /></th>
                        <th className="border-b border-[#1C1C1C]/10 px-4 py-4"><LocalizedText value={localizedFallback('Back', 'Гръб')} language={language} /></th>
                    </tr>
                </thead>
                <tbody>
                    {rows.flatMap((row) => ([
                        <tr key={`${row.label}-inch`} className="align-top">
                            <th rowSpan={2} className="border-b border-[#1C1C1C]/10 px-4 py-4 font-serif text-[1.3rem] lg:text-[1.45rem] font-light uppercase tracking-[0.06em] text-[#1C1C1C]">{row.label}</th>
                            <td className="border-b border-[#1C1C1C]/10 px-4 py-4 text-[10px] lg:text-[0.78rem] uppercase tracking-[0.22em] text-[#1C1C1C]/44">inch</td>
                            <td className="border-b border-[#1C1C1C]/10 px-4 py-4">{row.inch.bust}</td>
                            <td className="border-b border-[#1C1C1C]/10 px-4 py-4">{row.inch.waist}</td>
                            <td className="border-b border-[#1C1C1C]/10 px-4 py-4">{row.inch.hips}</td>
                            <td className="border-b border-[#1C1C1C]/10 px-4 py-4">{row.inch.back}</td>
                        </tr>,
                        <tr key={`${row.label}-cm`}>
                            <td className="border-b border-[#1C1C1C]/10 px-4 py-4 text-[10px] lg:text-[0.78rem] uppercase tracking-[0.22em] text-[#1C1C1C]/44">cm</td>
                            <td className="border-b border-[#1C1C1C]/10 px-4 py-4">{row.cm.bust}</td>
                            <td className="border-b border-[#1C1C1C]/10 px-4 py-4">{row.cm.waist}</td>
                            <td className="border-b border-[#1C1C1C]/10 px-4 py-4">{row.cm.hips}</td>
                            <td className="border-b border-[#1C1C1C]/10 px-4 py-4">{row.cm.back}</td>
                        </tr>,
                    ]))}
                </tbody>
            </table>
        </div>
    );
}

export default function ProductDetailAccordions({ sections = [], language }) {
    const [openSectionId, setOpenSectionId] = useState(null);

    useEffect(() => {
        const validSectionIds = sections.map((section, index) => getSectionId(section, index));

        if (openSectionId && !validSectionIds.includes(openSectionId)) {
            setOpenSectionId(null);
        }
    }, [sections, openSectionId]);

    const toggleSection = (sectionId) => {
        startTransition(() => {
            setOpenSectionId((currentOpenSectionId) => (currentOpenSectionId === sectionId ? null : sectionId));
        });
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-5 items-start">
            {sections.map((section, index) => {
                const sectionId = getSectionId(section, index);
                const isOpen = openSectionId === sectionId;
                const isWide = Boolean(section.wide || section.table?.length > 0);

                return (
                    <section key={sectionId} data-open={isOpen ? 'true' : 'false'} className={`lumina-accordion-card min-w-0 self-start ${isWide ? 'xl:col-span-2' : ''}`}>
                        <button
                            type="button"
                            onClick={() => toggleSection(sectionId)}
                            aria-expanded={isOpen}
                            className="lumina-accordion-trigger hover-target"
                        >
                            <span className="min-w-0 flex flex-col gap-2">
                                <span className="lumina-accordion-kicker">{String(index + 1).padStart(2, '0')} / {String(sections.length).padStart(2, '0')}</span>
                                <span className="lumina-accordion-title">
                                    {section.titleKey
                                        ? <EditableText contentKey={section.titleKey} fallback={section.title} editorLabel={section.editorLabel || section.title} />
                                            : <LocalizedText value={section.title} language={language} />}
                                </span>
                            </span>
                            <span className="lumina-accordion-icon" aria-hidden="true">+</span>
                        </button>

                        <div className="lumina-accordion-content min-w-0 w-full max-w-full">
                            <div className="min-h-0 min-w-0 w-full max-w-full">
                                <div className="min-w-0 w-full max-w-full px-5 md:px-6 pb-5 md:pb-6 flex flex-col gap-4 text-[0.98rem] lg:text-[1.08rem] leading-[1.7] text-[#1C1C1C]/66 normal-case">
                                    {section.copy && (
                                        <p>
                                            {section.copyKey
                                                ? <EditableText contentKey={section.copyKey} fallback={section.copy} editorLabel={section.copyEditorLabel || `${section.title} copy`} />
                                                : section.copy}
                                        </p>
                                    )}

                                    {section.chips?.length > 0 && (
                                        <div className="flex flex-wrap gap-2 text-[10px] lg:text-[0.84rem] uppercase tracking-[0.18em] text-[#1C1C1C]/46">
                                            {section.chips.map((chip, index) => (
                                                <span key={chip?.contentKey || chip?.fallback || chip || index} className="inline-flex items-center rounded-full border border-[#1C1C1C]/10 bg-white/92 px-3 py-2 shadow-[0_10px_24px_rgba(92,75,67,0.05)]">{renderEditableSectionItem(chip, `${section.title} chip ${index + 1}`)}</span>
                                            ))}
                                        </div>
                                    )}

                                    {section.bullets?.length > 0 && (
                                        <div className="flex flex-col gap-2.5 pt-1 text-[0.92rem] lg:text-[1rem] leading-relaxed text-[#1C1C1C]/62">
                                            {section.bullets.map((bullet, index) => (
                                                <p key={bullet?.contentKey || bullet?.fallback || bullet || index} className="border-l border-[#D7B56D]/38 pl-4">{renderEditableSectionItem(bullet, `${section.title} bullet ${index + 1}`)}</p>
                                            ))}
                                        </div>
                                    )}

                                    {section.table?.length > 0 && <SizeMeasurementsTable rows={section.table} language={language} />}
                                </div>
                            </div>
                        </div>
                    </section>
                );
            })}
        </div>
    );
}