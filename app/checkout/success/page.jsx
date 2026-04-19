import CheckoutSuccessPanel from '../../../components/CheckoutSuccessPanel';

export const dynamic = 'force-dynamic';

export default async function CheckoutSuccessPage({ searchParams = {} }) {
  return <CheckoutSuccessPanel orderCode={searchParams?.orderCode || ''} />;
}