"use client";

function resolveTheme(theme = 'light') {
    if (theme === 'dark') {
        return {
            shell: 'border-white/10 bg-white/[0.05] text-white',
            title: 'text-white',
            copy: 'text-white/56',
            axis: 'text-white/42',
            legend: 'text-white/62',
            empty: 'text-white/56',
            grid: 'border-white/10',
        };
    }

    return {
        shell: 'border-[#1C1C1C]/10 bg-white/72 text-[#1C1C1C]',
        title: 'text-[#1C1C1C]',
        copy: 'text-[#1C1C1C]/52',
        axis: 'text-[#1C1C1C]/42',
        legend: 'text-[#1C1C1C]/62',
        empty: 'text-[#1C1C1C]/56',
        grid: 'border-[#1C1C1C]/10',
    };
}

export default function PromotionTrendChart({
    title,
    copy,
    points = [],
    series = [],
    theme = 'light',
    emptyMessage = 'No recent activity yet.',
}) {
    const palette = resolveTheme(theme);
    const maxValue = Math.max(
        1,
        ...points.flatMap((point) => series.map((entry) => Number(point?.[entry.key] ?? 0)))
    );
    const hasActivity = points.some((point) => series.some((entry) => Number(point?.[entry.key] ?? 0) > 0));

    return (
        <div className={`rounded-sm border p-4 sm:p-5 ${palette.shell}`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className={`text-[10px] uppercase tracking-[0.22em] ${palette.copy}`}>{title}</p>
                    {copy && <p className={`mt-2 text-sm leading-relaxed ${palette.copy}`}>{copy}</p>}
                </div>
                <div className={`flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.18em] ${palette.legend}`}>
                    {series.map((entry) => (
                        <span key={entry.key} className="inline-flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                            {entry.label}
                        </span>
                    ))}
                </div>
            </div>

            {hasActivity ? (
                <div className="mt-5">
                    <div className={`grid h-32 grid-cols-[repeat(auto-fit,minmax(16px,1fr))] items-end gap-2 border-b pt-2 ${palette.grid}`}>
                        {points.map((point) => (
                            <div key={point.key} className="flex min-w-0 flex-col items-center gap-2">
                                <div className="flex h-24 w-full items-end justify-center gap-1">
                                    {series.map((entry) => {
                                        const rawValue = Number(point?.[entry.key] ?? 0);
                                        const height = rawValue > 0
                                            ? `${Math.max((rawValue / maxValue) * 100, 8)}%`
                                            : '0%';

                                        return (
                                            <span
                                                key={`${point.key}-${entry.key}`}
                                                title={`${entry.label}: €${rawValue.toFixed(2)} on ${point.fullLabel}`}
                                                className="w-full max-w-[10px] rounded-t-sm"
                                                style={{ height, backgroundColor: entry.color }}
                                            />
                                        );
                                    })}
                                </div>
                                <span className={`text-[9px] uppercase tracking-[0.16em] ${palette.axis}`}>{point.shortLabel}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : emptyMessage ? (
                <p className={`mt-5 text-sm leading-relaxed ${palette.empty}`}>{emptyMessage}</p>
            ) : null}
        </div>
    );
}