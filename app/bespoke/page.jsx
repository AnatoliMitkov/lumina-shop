import { redirect } from 'next/navigation';
import { SPOTLIGHT_PATH } from '../../utils/site-routes';

export const dynamic = 'force-dynamic';

export default function BespokePage() {
    redirect(SPOTLIGHT_PATH);
}