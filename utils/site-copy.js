export function isSiteCopySetupError(error) {
    const message = typeof error?.message === 'string' ? error.message : '';

    return error?.code === '42P01'
        || error?.code === '42703'
        || error?.code === 'PGRST204'
        || error?.code === 'PGRST205'
        || message.toLowerCase().includes('site_copy_entries')
        || message.toLowerCase().includes('schema cache');
}

export function toSiteCopyMap(entries = []) {
    return Object.fromEntries(
        (entries || [])
            .filter((entry) => typeof entry?.key === 'string')
            .map((entry) => [entry.key, typeof entry?.value === 'string' ? entry.value : ''])
    );
}