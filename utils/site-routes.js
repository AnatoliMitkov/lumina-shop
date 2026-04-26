export const COLLABORATION_PATH = '/collaboration';
export const COLLABORATION_POLICY_PATH = '/collaboration-policy';
export const SPOTLIGHT_PATH = '/5th-avenue';
export const LEGACY_SPOTLIGHT_PATH = '/spotlight';

export function isSpotlightPath(pathname = '') {
    return pathname === SPOTLIGHT_PATH || pathname === LEGACY_SPOTLIGHT_PATH;
}