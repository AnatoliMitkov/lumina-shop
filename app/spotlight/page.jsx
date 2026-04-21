import { redirect } from 'next/navigation';
import { SPOTLIGHT_PATH } from '../../utils/site-routes';

export const dynamic = 'force-dynamic';

export default function LegacySpotlightPage() {
    redirect(SPOTLIGHT_PATH);
}