"use client";

import { startTransition, useState } from 'react';
import EditableText from './site-copy/EditableText';
import LocalizedText from './LocalizedText';
import { createLocalizedValue as localizedFallback } from '../utils/language';

function renderEditableSectionItem(item, defaultEditorLabel) {
    if (item && typeof item === 'object' && typeof item.contentKey === 'string') {
        return <EditableText contentKey={item.contentKey} fallback={item.fallback} editorLabel={item.editorLabel || defaultEditorLabel} />;
    }

    return item;
}

function SizeMeasurementsTable({ rows = [], language }) {
    return (
        <div className="min-w-0 overflow-x-auto rounded-sm border border-[#1C1C1C]/10 bg-white/82" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="min-w-[760px] w-full border-collapse text-left text-base lg:text-[1.02rem] text-[#1C1C1C]/74">
                <thead>
                    <tr className="bg-[#F5F1EB] text-[11px] lg:text-[1rem] uppercase tracking-[0.26em] text-[#1C1C1C]/52">
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
                            <th rowSpan={2} className="border-b border-[#1C1C1C]/10 px-4 py-4 font-serif text-xl font-light uppercase tracking-[0.06em] text-[#1C1C1C]">{row.label}</th>
                            <td className="border-b border-[#1C1C1C]/10 px-4 py-4 text-[11px] lg:text-[1rem] uppercase tracking-[0.24em] text-[#1C1C1C]/46">inch</td>
                            <td className="border-b border-[#1C1C1C]/10 px-4 py-4">{row.inch.bust}</td>
                            <td className="border-b border-[#1C1C1C]/10 px-4 py-4">{row.inch.waist}</td>
                            <td className="border-b border-[#1C1C1C]/10 px-4 py-4">{row.inch.hips}</td>
                            <td className="border-b border-[#1C1C1C]/10 px-4 py-4">{row.inch.back}</td>
                        </tr>,
                        <tr key={`${row.label}-cm`}>
                            <td className="border-b border-[#1C1C1C]/10 px-4 py-4 text-[11px] lg:text-[1rem] uppercase tracking-[0.24em] text-[#1C1C1C]/46">cm</td>
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
    const [openTitles, setOpenTitles] = useState([]);

    const toggleSection = (sectionId) => {
        startTransition(() => {
            setOpenTitles((currentTitles) => (
                currentTitles.includes(sectionId)
                    ? currentTitles.filter((entry) => entry !== sectionId)
                    : [...currentTitles, sectionId]
            ));
        });
    };

    return (
        <div className="border border-[#1C1C1C]/10 bg-white/60 rounded-sm px-6 md:px-8 py-2">
            {sections.map((section, index) => {
                const sectionId = section.id || section.titleKey || section.title || `section-${index}`;
                const isOpen = openTitles.includes(sectionId);

                return (
                    <div key={sectionId} className={`${index === 0 ? '' : 'border-t border-[#1C1C1C]/10'}`}>
                        <button
                            type="button"
                            onClick={() => toggleSection(sectionId)}
                            aria-expanded={isOpen}
                            className="hover-target flex w-full items-center justify-between gap-4 py-5 text-left"
                        >
                            <span className="text-[11px] lg:text-[1.05rem] uppercase tracking-[0.24em] text-[#1C1C1C]/74 font-medium">
                                {section.titleKey
                                    ? <EditableText contentKey={section.titleKey} fallback={section.title} editorLabel={section.editorLabel || section.title} />
                                        : <LocalizedText value={section.title} language={language} />}
                            </span>
                            <span className={`text-lg font-light text-[#1C1C1C]/55 transition-transform duration-300 ${isOpen ? 'rotate-45 text-[#1C1C1C]' : ''}`}>+</span>
                        </button>

                        <div className={`grid overflow-y-hidden transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                            <div className="min-h-0">
                                <div className="pb-5 flex flex-col gap-4 text-base lg:text-[1.15rem] leading-relaxed text-[#1C1C1C]/62 normal-case">
                                    {section.copy && (
                                        <p>
                                            {section.copyKey
                                                ? <EditableText contentKey={section.copyKey} fallback={section.copy} editorLabel={section.copyEditorLabel || `${section.title} copy`} />
                                                : section.copy}
                                        </p>
                                    )}

                                    {section.chips?.length > 0 && (
                                        <div className="flex flex-wrap gap-2 text-[11px] lg:text-[1.05rem] uppercase tracking-[0.22em] text-[#1C1C1C]/44">
                                            {section.chips.map((chip, index) => (
                                                <span key={chip?.contentKey || chip?.fallback || chip || index} className="rounded-full border border-[#1C1C1C]/10 bg-white px-3 py-2">{renderEditableSectionItem(chip, `${section.title} chip ${index + 1}`)}</span>
                                            ))}
                                        </div>
                                    )}

                                    {section.bullets?.length > 0 && (
                                        <div className="flex flex-col gap-2.5 pt-1 text-xs lg:text-[1.08rem] uppercase tracking-[0.22em] text-[#1C1C1C]/58">
                                            {section.bullets.map((bullet, index) => (
                                                <p key={bullet?.contentKey || bullet?.fallback || bullet || index}>{renderEditableSectionItem(bullet, `${section.title} bullet ${index + 1}`)}</p>
                                            ))}
                                        </div>
                                    )}

                                    {section.table?.length > 0 && <SizeMeasurementsTable rows={section.table} language={language} />}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}