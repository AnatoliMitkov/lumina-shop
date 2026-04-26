import { createLocalizedValue as localizedFallback, resolveLocalizedValue } from '../utils/language';

function CookieMascot() {
    return (
        <div className="lumina-cookie-mascot" aria-hidden="true">
            <svg viewBox="0 0 220 220" className="h-full w-full overflow-visible" fill="none" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="110" cy="188" rx="54" ry="14" fill="rgba(92,75,67,0.16)" className="lumina-cookie-shadow" />
                <g className="lumina-cookie-heart">
                    <path d="M158 42c0-8 6-14 13.5-14 5.7 0 9.5 3.1 11.5 7.2 2-4.1 5.8-7.2 11.5-7.2C202 28 208 34 208 42c0 18-24 27.6-24 27.6S158 60 158 42Z" fill="#F48B9B" />
                </g>
                <g className="lumina-cookie-float">
                    <path d="M73 165c-4.8 0-8.7 3.9-8.7 8.7 0 6.1 4.8 12.4 12.4 12.4 7.6 0 12.4-6.3 12.4-12.4 0-4.8-3.9-8.7-8.7-8.7H73Z" fill="#5C4B43" />
                    <path d="M139.6 165c-4.8 0-8.7 3.9-8.7 8.7 0 6.1 4.8 12.4 12.4 12.4s12.4-6.3 12.4-12.4c0-4.8-3.9-8.7-8.7-8.7h-7.4Z" fill="#5C4B43" />
                    <path d="M58 138c-11.8-15.7-17.4-33.7-17.4-52 0-39 31.9-70.9 71.4-70.9 39.4 0 71.3 31.9 71.3 71 0 41.7-32.9 72.9-76.3 72.9-19.8 0-36.5-7.2-49-21Z" fill="#D7B56D" />
                    <path d="M71 38.5c11.3-10 25.8-15.9 41-15.9 35.8 0 64.7 28.9 64.7 64.5 0 17.3-6.7 33.2-18.8 44.9 5.5-9.1 8.5-19.8 8.5-31.1 0-35.6-28.8-64.5-64.4-64.5-11.4 0-22.1 3-31 8.6Z" fill="#E7C883" />
                    <path d="M56 96.2c0-32.5 26.5-59 59.1-59 18.9 0 35.8 8.9 46.6 22.9-10.6-18.7-30.8-31.3-53.9-31.3-34.1 0-61.7 27.5-61.7 61.5 0 15.2 5.5 29.1 14.7 39.8-3.1-7.1-4.8-14.9-4.8-22.9Z" fill="#F7E6B5" />
                    <circle cx="90" cy="74" r="10" fill="#8A5A44" />
                    <circle cx="136" cy="58" r="8.5" fill="#9A624B" />
                    <circle cx="142" cy="95" r="11" fill="#7E5341" />
                    <circle cx="110" cy="117" r="8" fill="#99614C" />
                    <circle cx="74" cy="109" r="6.5" fill="#7E5341" />
                    <circle cx="122" cy="80" r="5.5" fill="#5C4B43" opacity="0.72" />
                    <ellipse cx="88" cy="102" rx="5" ry="7" fill="#1C1C1C" />
                    <ellipse cx="125" cy="102" rx="5" ry="7" fill="#1C1C1C" />
                    <g className="lumina-cookie-blink">
                        <path d="M85 102c0-3.9 1.7-6.1 3-6.1s3 2.2 3 6.1-1.7 6.1-3 6.1-3-2.2-3-6.1Z" fill="#1C1C1C" />
                        <path d="M122 102c0-3.9 1.7-6.1 3-6.1s3 2.2 3 6.1-1.7 6.1-3 6.1-3-2.2-3-6.1Z" fill="#1C1C1C" />
                    </g>
                    <circle cx="79" cy="115" r="6.2" fill="#F2A5A5" opacity="0.7" />
                    <circle cx="134" cy="115" r="6.2" fill="#F2A5A5" opacity="0.7" />
                    <path d="M93 126c5.2 6.3 18.4 6.8 26.6 0" stroke="#5C4B43" strokeWidth="4.8" strokeLinecap="round" />
                    <path d="M49 119.5c-8.8-4.3-16.8 5.5-11.9 12.8 4 5.9 13.6 4.2 18-1.4" stroke="#5C4B43" strokeWidth="6" strokeLinecap="round" className="lumina-cookie-wave" />
                    <path d="M163 129.5c9.5 1.4 15.7 10.3 11.3 17.7-3.6 6.2-13.2 6.7-18 1.8" stroke="#5C4B43" strokeWidth="6" strokeLinecap="round" />
                </g>
            </svg>
        </div>
    );
}

function ConsentToggle({ label, description, enabled, locked = false, onChange, language }) {
    const getText = (value) => resolveLocalizedValue(value, language);

    return (
        <div className="rounded-[1.35rem] border border-[#1C1C1C]/10 bg-white/68 p-4 shadow-[0_10px_24px_rgba(92,75,67,0.08)]">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#1C1C1C]">{getText(label)}</p>
                    <p className="mt-2 text-sm leading-relaxed text-[#1C1C1C]/62">{getText(description)}</p>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={getText(label)}
                    disabled={locked}
                    onClick={locked ? undefined : onChange}
                    className={`inline-flex h-8 w-14 shrink-0 items-center rounded-full border px-1 transition-colors ${enabled ? 'border-[#1C1C1C] bg-[#1C1C1C]' : 'border-[#1C1C1C]/12 bg-white'} ${locked ? 'opacity-72' : 'hover:border-[#A78B65]'}`}
                >
                    <span className={`h-6 w-6 rounded-full transition-transform ${enabled ? 'translate-x-6 bg-[#EFECE8]' : 'translate-x-0 bg-[#D7B56D]'}`}></span>
                </button>
            </div>
            {locked && (
                <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-[#1C1C1C]/44">
                    {getText(localizedFallback('Always on for core store features', 'Винаги е включено за основните функции на магазина'))}
                </p>
            )}
        </div>
    );
}

export default function CookieConsentBanner({
    language,
    isOpen,
    hasDecision = false,
    showLauncher = false,
    preferencesOpen = false,
    analyticsEnabled = false,
    onOpenPreferences,
    onToggleAnalytics,
    onAcceptAll,
    onRejectNonEssential,
    onSavePreferences,
    onClosePreferences,
}) {
    const getText = (value) => resolveLocalizedValue(value, language);

    return (
        <>
            {showLauncher && !isOpen && (
                <button
                    type="button"
                    onClick={onOpenPreferences}
                    className="lumina-cookie-launcher hover-target fixed bottom-4 left-4 z-[170] inline-flex items-center gap-3 rounded-full border border-[#1C1C1C]/10 bg-[rgba(255,248,240,0.92)] px-4 py-3 text-[#1C1C1C] shadow-[0_18px_40px_rgba(92,75,67,0.14)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-white sm:bottom-5 sm:left-5"
                    aria-label={getText(localizedFallback('Open cookie choices', 'Отвори настройките за бисквитки'))}
                >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#F8E8B5,#D7B56D_70%)] text-lg shadow-[inset_0_2px_8px_rgba(255,255,255,0.55)]">{getText(localizedFallback('Cookie', 'Бисквитка')).slice(0, 1)}</span>
                    <span className="text-[10px] uppercase tracking-[0.24em]">{getText(localizedFallback('Cookie Choices', 'Избор за бисквитки'))}</span>
                </button>
            )}

            {isOpen && (
                <div className="fixed inset-x-3 bottom-3 z-[170] sm:inset-x-auto sm:bottom-5 sm:left-5 sm:w-[min(30rem,calc(100vw-2.5rem))]">
                    <section className="relative overflow-hidden rounded-[2rem] border border-[#1C1C1C]/10 bg-[linear-gradient(145deg,rgba(255,249,242,0.98),rgba(248,237,223,0.94))] p-4 text-[#1C1C1C] shadow-[0_28px_70px_rgba(92,75,67,0.18)] backdrop-blur-2xl sm:p-5">
                        <div className="pointer-events-none absolute right-[-2rem] top-[-2rem] h-28 w-28 rounded-full bg-[#F7D6D9]/70 blur-2xl"></div>
                        <div className="pointer-events-none absolute bottom-[-2.5rem] left-[-1.75rem] h-28 w-28 rounded-full bg-[#F5E0AF]/80 blur-2xl"></div>

                        <div className="relative grid gap-4 sm:grid-cols-[8.75rem_minmax(0,1fr)] sm:items-start">
                            <div className="flex flex-col items-center justify-center gap-3 rounded-[1.6rem] border border-white/50 bg-white/34 px-3 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.48)]">
                                <CookieMascot />
                                <p className="text-[10px] uppercase tracking-[0.24em] text-[#5C4B43]">
                                    {getText(localizedFallback('A tiny cookie note', 'Една сладка бисквитена бележка'))}
                                </p>
                            </div>

                            <div className="min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-[0.28em] text-[#5C4B43]/72">
                                            {getText(localizedFallback('Privacy with personality', 'Поверителност с характер'))}
                                        </p>
                                        <h2 className="mt-2 font-serif text-[2rem] font-light uppercase leading-[0.9] tracking-[0.06em] text-[#1C1C1C]">
                                            {getText(localizedFallback('Cute cookie choices', 'Сладки избори за бисквитки'))}
                                        </h2>
                                    </div>

                                    {hasDecision && onClosePreferences ? (
                                        <button
                                            type="button"
                                            onClick={onClosePreferences}
                                            className="hover-target rounded-full border border-[#1C1C1C]/10 bg-white/60 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-[#1C1C1C]/58 transition-colors hover:border-[#1C1C1C]/18 hover:text-[#1C1C1C]"
                                        >
                                            {getText(localizedFallback('Close', 'Затвори'))}
                                        </button>
                                    ) : null}
                                </div>

                                <p className="mt-3 text-sm leading-relaxed text-[#1C1C1C]/68 sm:text-[0.96rem]">
                                    {getText(localizedFallback(
                                        'We keep the necessary crumbs for cart, language, secure sign-in, and checkout. If you allow analytics too, Google Analytics can help us understand which pages are loved most and improve the store.',
                                        'Пазим нужните бисквитки за количката, езика, защитения вход и поръчката. Ако разрешите и анализ, Google Analytics ще ни помага да разбираме кои страници се харесват най-много и да подобряваме магазина.'
                                    ))}
                                </p>

                                <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-[#5C4B43]/70">
                                    {getText(localizedFallback('Analytics stays off until you say yes.', 'Анализът остава изключен, докато не кажете да.'))}
                                </p>

                                {preferencesOpen && (
                                    <div className="mt-4 grid gap-3">
                                        <ConsentToggle
                                            language={language}
                                            label={localizedFallback('Necessary cookies', 'Необходими бисквитки')}
                                            description={localizedFallback('Needed for cart, language, secure sign-in, and checkout reliability.', 'Нужни са за количката, езика, защитения вход и надеждната работа на поръчката.')}
                                            enabled
                                            locked
                                        />
                                        <ConsentToggle
                                            language={language}
                                            label={localizedFallback('Analytics cookies', 'Аналитични бисквитки')}
                                            description={localizedFallback('Optional. Turns on Google Analytics so we can understand visits and improve the storefront.', 'По избор. Включва Google Analytics, за да разбираме посещенията и да подобряваме магазина.')}
                                            enabled={analyticsEnabled}
                                            onChange={onToggleAnalytics}
                                        />
                                    </div>
                                )}

                                <div className="mt-5 flex flex-wrap gap-2.5">
                                    <button
                                        type="button"
                                        onClick={onRejectNonEssential}
                                        className="hover-target lumina-button lumina-button--compact"
                                    >
                                        {getText(localizedFallback('Necessary only', 'Само необходимите'))}
                                    </button>

                                    {preferencesOpen ? (
                                        <button
                                            type="button"
                                            onClick={onSavePreferences}
                                            className="hover-target lumina-button lumina-button--compact"
                                        >
                                            {getText(localizedFallback('Save choices', 'Запази избора'))}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={onOpenPreferences}
                                            className="hover-target lumina-button lumina-button--compact"
                                        >
                                            {getText(localizedFallback('Choose', 'Избери'))}
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={onAcceptAll}
                                        className="hover-target lumina-button lumina-button--compact lumina-button--solid"
                                    >
                                        {getText(localizedFallback('Accept all', 'Приеми всички'))}
                                    </button>
                                </div>

                                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] uppercase tracking-[0.22em] text-[#5C4B43]/62">
                                    <a href="/cookie-policy" className="hover-target transition-link underline decoration-[#A78B65]/55 underline-offset-4 transition-colors hover:text-[#1C1C1C]">
                                        {getText(localizedFallback('Read cookie policy', 'Прочети политиката за бисквитки'))}
                                    </a>
                                    <span>{getText(localizedFallback('Necessary cookies are always on.', 'Необходимите бисквитки са винаги включени.'))}</span>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </>
    );
}