import CheckoutSuccessPanel from '../../../components/CheckoutSuccessPanel';

export const dynamic = 'force-dynamic';

export default async function CheckoutSuccessPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;

  return (
    <CheckoutSuccessPanel
      orderCode={resolvedSearchParams?.orderCode || ''}
      orderId={resolvedSearchParams?.order || ''}
      sessionId={resolvedSearchParams?.session_id || ''}
    />
  );
}