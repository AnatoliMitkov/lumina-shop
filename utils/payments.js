function toText(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
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

export function buildCheckoutModeLabel(value = '') {
  return paymentModeLabelMap[normalizeCheckoutMode(value)] || paymentModeLabelMap.manual_review;
}

export function normalizePaymentStatus(value = '') {
  const normalizedValue = toText(value, 'manual_review').toLowerCase();

  return PAYMENT_STATUS_VALUES.includes(normalizedValue)
    ? normalizedValue
    : 'manual_review';
}

export function getPaymentStatusMeta(status = '', checkoutMode = 'manual_review') {
  const normalizedStatus = normalizePaymentStatus(status);
  const normalizedMode = normalizeCheckoutMode(checkoutMode);

  switch (normalizedStatus) {
    case 'paid':
      return {
        label: 'Paid',
        description: 'Payment completed successfully.',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      };
    case 'awaiting_payment':
      return {
        label: 'Awaiting Payment',
        description: 'Secure checkout was created, but payment is not complete yet.',
        className: 'border-sky-200 bg-sky-50 text-sky-700',
      };
    case 'failed':
      return {
        label: 'Payment Failed',
        description: 'The payment did not complete successfully.',
        className: 'border-red-200 bg-red-50 text-red-700',
      };
    case 'cancelled':
      return {
        label: 'Payment Cancelled',
        description: 'Secure checkout was opened, but the payment was cancelled.',
        className: 'border-[#D9C08A] bg-[#FFF8E8] text-[#8A6A2F]',
      };
    case 'expired':
      return {
        label: 'Payment Expired',
        description: 'The secure payment session expired before completion.',
        className: 'border-[#D9C08A] bg-[#FFF8E8] text-[#8A6A2F]',
      };
    case 'refunded':
      return {
        label: 'Refunded',
        description: 'The recorded payment was refunded.',
        className: 'border-[#1C1C1C]/12 bg-[#EFE7DA] text-[#1C1C1C]/62',
      };
    default:
      return normalizedMode === 'stripe_checkout'
        ? {
            label: 'Awaiting Payment',
            description: 'This order is ready for secure checkout, but payment is still pending.',
            className: 'border-sky-200 bg-sky-50 text-sky-700',
          }
        : {
            label: 'Pay On Delivery',
            description: 'Payment will be confirmed directly on delivery or pickup.',
            className: 'border-[#D9C08A] bg-[#FFF8E8] text-[#8A6A2F]',
          };
  }
}

export function buildOrderPaymentSummary(order = {}) {
  const meta = getPaymentStatusMeta(order?.payment_status, order?.checkout_mode);
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