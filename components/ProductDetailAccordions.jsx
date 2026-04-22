"use client";

import { startTransition, useState } from 'react';
import EditableText from './site-copy/EditableText';

function SizeMeasurementsTable({ rows = [] }) {
    return (
        <div className="min-w-0 overflow-x-auto rounded-sm border border-[#1C1C1C]/10 bg-white/82" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="min-w-[760px] w-full border-collapse text-left text-sm text-[#1C1C1C]/74">
                <thead>
                    <tr className="bg-[#F5F1EB] text-[10px] uppercase tracking-[0.26em] text-[#1C1C1C]/52">
                        <th className="border-b border-[#1C1C1C]/10 px-4 py-4"><EditableText contentKey="product.measurements.headers.size" fallback="Size" editorLabel="Product measurements size header" /></th>
                        <th className="border-b border-[#1C1C1C]/10 px-4 py-4"><EditableText contentKey="product.measurements.headers.unit" fallback="Unit" editorLabel="Product measurements unit header" /></th>
                        <th className="border-b border-[#1C1C1C]/10 px-4 py-4"><EditableText contentKey="product.measurements.headers.bust" fallback="Bust / Chest" editorLabel="Product measurements bust header" /></th>
                        <th className="border-b border-[#1C1C1C]/10 px-4 py-4"><EditableText contentKey="product.measurements.headers.waist" fallback="Waist" editorLabel="Product measurements waist header" /></th>
                        <th className="border-b border-[#1C1C1C]/10 px-4 py-4"><EditableText contentKey="product.measurements.headers.hips" fallback="Hips" editorLabel="Product measurements hips header" /></th>
                        <th className="border-b border-[#1C1C1C]/10 px-4 py-4"><EditableText contentKey="product.measurements.headers.back" fallback="Back" editorLabel="Product measurements back header" /></th>
                    </tr>
                </thead>
                <tbody>
                    {rows.flatMap((row) => ([
                        <tr key={`${row.label}-inch`} className="align-top">
                            <th rowSpan={2} className="border-b border-[#1C1C1C]/10 px-4 py-4 font-serif text-xl font-light uppercase tracking-[0.06em] text-[#1C1C1C]">{row.label}</th>
                            <td className="border-b border-[#1C1C1C]/10 px-4 py-4 text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/46">inch</td>
                            <td className="border-b border-[#1C1C1C]/10 px-4 py-4">{row.inch.bust}</td>
                            <td className="border-b border-[#1C1C1C]/10 px-4 py-4">{row.inch.waist}</td>
                            <td className="border-b border-[#1C1C1C]/10 px-4 py-4">{row.inch.hips}</td>
                            <td className="border-b border-[#1C1C1C]/10 px-4 py-4">{row.inch.back}</td>
                        </tr>,
                        <tr key={`${row.label}-cm`}>
                            <td className="border-b border-[#1C1C1C]/10 px-4 py-4 text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/46">cm</td>
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

export default function ProductDetailAccordions({ sections = [] }) {
    const [openTitles, setOpenTitles] = useState([]);

    const toggleSection = (title) => {
        startTransition(() => {
            setOpenTitles((currentTitles) => (
                currentTitles.includes(title)
                    ? currentTitles.filter((entry) => entry !== title)
                    : [...currentTitles, title]
            ));
        });
    };

    return (
        <div className="border border-[#1C1C1C]/10 bg-white/60 rounded-sm px-6 md:px-8 py-2">
            {sections.map((section, index) => {
                const isOpen = openTitles.includes(section.title);

                return (
                    <div key={section.title} className={`${index === 0 ? '' : 'border-t border-[#1C1C1C]/10'}`}>
                        <button
                            type="button"
                            onClick={() => toggleSection(section.title)}
                            aria-expanded={isOpen}
                            className="hover-target flex w-full items-center justify-between gap-4 py-5 text-left"
                        >
                            <span className="text-[10px] uppercase tracking-[0.24em] text-[#1C1C1C]/74 font-medium">
                                {section.titleKey
                                    ? <EditableText contentKey={section.titleKey} fallback={section.title} editorLabel={section.editorLabel || section.title} />
                                    : section.title}
                            </span>
                            <span className={`text-lg font-light text-[#1C1C1C]/55 transition-transform duration-300 ${isOpen ? 'rotate-45 text-[#1C1C1C]' : ''}`}>+</span>
                        </button>

                        <div className={`grid overflow-y-hidden transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                            <div className="min-h-0">
                                <div className="pb-5 flex flex-col gap-4 text-sm leading-relaxed text-[#1C1C1C]/62 normal-case">
                                    {section.copy && (
                                        <p>
                                            {section.copyKey
                                                ? <EditableText contentKey={section.copyKey} fallback={section.copy} editorLabel={section.copyEditorLabel || `${section.title} copy`} />
                                                : section.copy}
                                        </p>
                                    )}

                                    {section.chips?.length > 0 && (
                                        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/44">
                                            {section.chips.map((chip) => (
                                                <span key={chip} className="rounded-full border border-[#1C1C1C]/10 bg-white px-3 py-2">{chip}</span>
                                            ))}
                                        </div>
                                    )}

                                    {section.bullets?.length > 0 && (
                                        <div className="flex flex-col gap-2.5 pt-1 text-[11px] uppercase tracking-[0.22em] text-[#1C1C1C]/58">
                                            {section.bullets.map((bullet) => (
                                                <p key={bullet}>{bullet}</p>
                                            ))}
                                        </div>
                                    )}

                                    {section.table?.length > 0 && <SizeMeasurementsTable rows={section.table} />}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}