import nodemailer from 'nodemailer';
import {
  buildOrderAddressSummary,
  buildOrderDeliverySummary,
  buildOrderReference,
  buildOrderShippingSummary,
} from './checkout';

const defaultSmtpHost = 'mail.stylingbyva.com';
const defaultSmtpPort = 465;
const defaultSmtpUser = 'sales@stylingbyva.com';
const defaultRecipient = 'sales@stylingbyva.com';

let transporter;

function readBoolean(value, fallbackValue) {
  if (typeof value !== 'string') {
    return fallbackValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(value) {
  return `EUR ${Number(value ?? 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) {
    return 'Pending';
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function getMailConfig() {
  const host = process.env.CONTACT_SMTP_HOST || defaultSmtpHost;
  const port = Number(process.env.CONTACT_SMTP_PORT || defaultSmtpPort);
  const user = process.env.CONTACT_SMTP_USER || defaultSmtpUser;
  const pass = process.env.CONTACT_SMTP_PASSWORD || process.env.SMTP_PASSWORD || process.env.MAIL_PASSWORD || process.env.EMAIL_PASSWORD || '';
  const secure = readBoolean(process.env.CONTACT_SMTP_SECURE, port === 465);
  const to = process.env.CONTACT_TO_EMAIL || defaultRecipient;
  const from = process.env.CONTACT_FROM_EMAIL || user;

  return { host, port, user, pass, secure, to, from };
}

export function isOrderMailConfigured() {
  const { pass } = getMailConfig();
  return Boolean(pass);
}

function getTransporter() {
  if (!transporter) {
    const { host, port, user, pass, secure } = getMailConfig();

    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  return transporter;
}

function buildItemsText(order = {}) {
  const items = Array.isArray(order?.items) ? order.items : [];

  if (items.length === 0) {
    return 'No line items were attached to this order.';
  }

  return items.map((item, index) => `${String(index + 1).padStart(2, '0')}. ${item?.name || 'Untitled Piece'} - ${formatCurrency(item?.price)}`).join('\n');
}

function buildItemsHtml(order = {}) {
  const items = Array.isArray(order?.items) ? order.items : [];

  if (items.length === 0) {
    return '<p style="margin: 0; color: #5f5a53;">No line items were attached to this order.</p>';
  }

  return `
    <table style="border-collapse: collapse; width: 100%; margin: 0;">
      <tbody>
        ${items.map((item, index) => `
          <tr>
            <td style="padding: 8px 12px 8px 0; vertical-align: top; color: #5f5a53; white-space: nowrap;">${String(index + 1).padStart(2, '0')}</td>
            <td style="padding: 8px 12px 8px 0; vertical-align: top;">${escapeHtml(item?.name || 'Untitled Piece')}</td>
            <td style="padding: 8px 0; vertical-align: top; text-align: right; white-space: nowrap;">${escapeHtml(formatCurrency(item?.price))}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function buildTextMessage(order = {}) {
  return [
    'Your payment was received successfully.',
    '',
    `Order reference: ${buildOrderReference(order)}`,
    `Paid on: ${formatDate(order?.paid_at || order?.created_at)}`,
    `Amount received: ${formatCurrency(order?.amount_paid || order?.total)}`,
    `Delivery: ${buildOrderDeliverySummary(order)}`,
    `Shipping: ${buildOrderShippingSummary(order)}`,
    `Address: ${buildOrderAddressSummary(order)}`,
    '',
    'Pieces:',
    buildItemsText(order),
    '',
    'The atelier now has your paid order in the production queue and will follow up with any next-step details if needed.',
  ].join('\n');
}

function buildHtmlMessage(order = {}) {
  const rows = [
    ['Order reference', buildOrderReference(order)],
    ['Paid on', formatDate(order?.paid_at || order?.created_at)],
    ['Amount received', formatCurrency(order?.amount_paid || order?.total)],
    ['Delivery', buildOrderDeliverySummary(order)],
    ['Shipping', buildOrderShippingSummary(order)],
    ['Address', buildOrderAddressSummary(order)],
  ];

  return `
    <div style="font-family: Arial, sans-serif; color: #1c1c1c; line-height: 1.6;">
      <p style="margin: 0 0 8px;">Your payment was received successfully.</p>
      <p style="margin: 0 0 16px; color: #5f5a53;">The atelier now has your paid order in the production queue and will follow up with any next-step details if needed.</p>
      <table style="border-collapse: collapse; width: 100%; margin: 0 0 20px;">
        <tbody>
          ${rows.map(([label, value]) => `
            <tr>
              <td style="padding: 8px 12px 8px 0; vertical-align: top; font-weight: 600; white-space: nowrap;">${escapeHtml(label)}</td>
              <td style="padding: 8px 0;">${escapeHtml(value || 'Not provided')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="margin: 0 0 20px;">
        <p style="margin: 0 0 10px; font-weight: 600;">Pieces</p>
        ${buildItemsHtml(order)}
      </div>
    </div>
  `;
}

export async function sendOrderPaymentConfirmation(order = {}) {
  const config = getMailConfig();

  if (!config.pass || !order?.customer_email) {
    return false;
  }

  const mailer = getTransporter();
  const subject = `Payment received for ${buildOrderReference(order)}`;

  await mailer.sendMail({
    from: `"THE VA STORE" <${config.from}>`,
    to: order.customer_email,
    bcc: config.to || undefined,
    replyTo: config.to,
    subject,
    text: buildTextMessage(order),
    html: buildHtmlMessage(order),
  });

  return true;
}