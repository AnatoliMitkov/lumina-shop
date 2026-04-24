import { createLocalizedValue as localizedFallback, DEFAULT_LANGUAGE, normalizeLanguage, resolveLocalizedValue } from './language';

function toText(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function resolveText(value, language = DEFAULT_LANGUAGE) {
  return resolveLocalizedValue(value, normalizeLanguage(language) || DEFAULT_LANGUAGE);
}

export const PAYMENT_MODE_OPTIONS = [
  {
    value: 'stripe_checkout',
    label: 'Online Payment',
    copy: 'Pay securely now with card, Apple Pay, or Google Pay through Stripe Checkout.',
  },
  {
    value: 'manual_review',
    label: 'Pay On Delivery',
    copy: 'Submit the Bulgarian order first and confirm payment directly on delivery or pickup.',
  },
];

const paymentModeLabelMap = PAYMENT_MODE_OPTIONS.reduce((labelMap, option) => {
  labelMap[option.value] = option.label;
  return labelMap;
}, {});

const PAYMENT_STATUS_VALUES = [
  'manual_review',
  'awaiting_payment',
  'paid',
  'failed',
  'cancelled',
  'expired',
  'refunded',
];

export function normalizeCheckoutMode(value = '') {
  return value === 'stripe_checkout' ? 'stripe_checkout' : 'manual_review';
}

export function buildCheckoutModeLabel(value = '', language = DEFAULT_LANGUAGE) {
  const normalizedMode = normalizeCheckoutMode(value);
  const localizedLabels = {
    stripe_checkout: localizedFallback('Online Payment', 'Онлайн плащане'),
    manual_review: localizedFallback('Pay On Delivery', 'Плащане при доставка'),
  };

  return resolveText(localizedLabels[normalizedMode] || paymentModeLabelMap.manual_review, language);
}

export function normalizePaymentStatus(value = '') {
  const normalizedValue = toText(value, 'manual_review').toLowerCase();

  return PAYMENT_STATUS_VALUES.includes(normalizedValue)
    ? normalizedValue
    : 'manual_review';
}

export function getPaymentStatusMeta(status = '', checkoutMode = 'manual_review', language = DEFAULT_LANGUAGE) {
  const normalizedStatus = normalizePaymentStatus(status);
  const normalizedMode = normalizeCheckoutMode(checkoutMode);

  switch (normalizedStatus) {
    case 'paid':
      return {
        label: resolveText(localizedFallback('Paid', 'Платено'), language),
        description: resolveText(localizedFallback('Payment completed successfully.', 'Плащането е завършено успешно.'), language),
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      };
    case 'awaiting_payment':
      return {
        label: resolveText(localizedFallback('Awaiting Payment', 'Очаква плащане'), language),
        description: resolveText(localizedFallback('Secure checkout was created, but payment is not complete yet.', 'Сигурният checkout е създаден, но плащането още не е завършено.'), language),
        className: 'border-sky-200 bg-sky-50 text-sky-700',
      };
    case 'failed':
      return {
        label: resolveText(localizedFallback('Payment Failed', 'Плащането е неуспешно'), language),
        description: resolveText(localizedFallback('The payment did not complete successfully.', 'Плащането не завърши успешно.'), language),
        className: 'border-red-200 bg-red-50 text-red-700',
      };
    case 'cancelled':
      return {
        label: resolveText(localizedFallback('Payment Cancelled', 'Плащането е отказано'), language),
        description: resolveText(localizedFallback('Secure checkout was opened, but the payment was cancelled.', 'Сигурният checkout беше отворен, но плащането беше отказано.'), language),
        className: 'border-[#D9C08A] bg-[#FFF8E8] text-[#8A6A2F]',
      };
    case 'expired':
      return {
        label: resolveText(localizedFallback('Payment Expired', 'Сесията изтече'), language),
        description: resolveText(localizedFallback('The secure payment session expired before completion.', 'Сигурната платежна сесия изтече преди завършване.'), language),
        className: 'border-[#D9C08A] bg-[#FFF8E8] text-[#8A6A2F]',
      };
    case 'refunded':
      return {
        label: resolveText(localizedFallback('Refunded', 'Възстановено'), language),
        description: resolveText(localizedFallback('The recorded payment was refunded.', 'Записаното плащане е възстановено.'), language),
        className: 'border-[#1C1C1C]/12 bg-[#EFE7DA] text-[#1C1C1C]/62',
      };
    default:
      return normalizedMode === 'stripe_checkout'
        ? {
            label: resolveText(localizedFallback('Awaiting Payment', 'Очаква плащане'), language),
            description: resolveText(localizedFallback('This order is ready for secure checkout, but payment is still pending.', 'Тази поръчка е готова за сигурен checkout, но плащането още се очаква.'), language),
            className: 'border-sky-200 bg-sky-50 text-sky-700',
          }
        : {
            label: resolveText(localizedFallback('Pay On Delivery', 'Плащане при доставка'), language),
            description: resolveText(localizedFallback('Payment will be confirmed directly on delivery or pickup.', 'Плащането ще бъде потвърдено директно при доставка или вземане.'), language),
            className: 'border-[#D9C08A] bg-[#FFF8E8] text-[#8A6A2F]',
          };
  }
}

export function buildOrderPaymentSummary(order = {}, language = DEFAULT_LANGUAGE) {
  const meta = getPaymentStatusMeta(order?.payment_status, order?.checkout_mode, language);
  const provider = toText(order?.payment_provider).toUpperCase();
  const amountPaid = Number(order?.amount_paid ?? 0);
  const summaryParts = [meta.label];

  if (provider) {
    summaryParts.push(provider);
  }

  if (amountPaid > 0) {
    summaryParts.push(`EUR ${amountPaid.toFixed(2)}`);
  }

  return summaryParts.join(' / ');
}