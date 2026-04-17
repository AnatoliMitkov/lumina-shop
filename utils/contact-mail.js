import nodemailer from 'nodemailer';

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

export function isContactMailConfigured() {
    return Boolean(getMailConfig().pass);
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

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatField(label, value) {
    return `${label}: ${value || 'Not provided'}`;
}

function buildSelectionText(inquiry) {
    const selectionItems = Array.isArray(inquiry.selection_items) ? inquiry.selection_items : [];

    if (!selectionItems.length) {
        return '';
    }

    return [
        '',
        'Attached selection:',
        ...selectionItems.map((item, index) => `${String(index + 1).padStart(2, '0')}. ${item.name || 'Untitled Piece'} - €${Number(item.price ?? 0).toFixed(2)}`),
        `Selection total: €${Number(inquiry.selection_total ?? 0).toFixed(2)}`,
    ].join('\n');
}

function buildSelectionHtml(inquiry) {
    const selectionItems = Array.isArray(inquiry.selection_items) ? inquiry.selection_items : [];

    if (!selectionItems.length) {
        return '';
    }

    return `
        <div style="margin: 0 0 20px;">
            <p style="margin: 0 0 10px; font-weight: 600;">Attached selection</p>
            <table style="border-collapse: collapse; width: 100%; margin: 0;">
                <tbody>
                    ${selectionItems.map((item, index) => `
                        <tr>
                            <td style="padding: 8px 12px 8px 0; vertical-align: top; color: #5f5a53; white-space: nowrap;">${String(index + 1).padStart(2, '0')}</td>
                            <td style="padding: 8px 12px 8px 0; vertical-align: top;">${escapeHtml(item.name || 'Untitled Piece')}</td>
                            <td style="padding: 8px 0; vertical-align: top; text-align: right; white-space: nowrap;">€${Number(item.price ?? 0).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <p style="margin: 10px 0 0; color: #5f5a53;">Selection total: €${Number(inquiry.selection_total ?? 0).toFixed(2)}</p>
        </div>
    `;
}

function buildTextMessage(inquiry) {
    return [
        'A new atelier contact request has been shared.',
        'This note was delivered to the atelier and copied to the sender for confirmation.',
        '',
        formatField('Name', inquiry.full_name),
        formatField('Email', inquiry.email),
        formatField('Phone', inquiry.phone),
        formatField('Location', inquiry.location),
        formatField('Query type', inquiry.query_type),
        formatField('Signed-in account', inquiry.user_email),
        formatField('Submitted', inquiry.submitted_at),
        ...[buildSelectionText(inquiry)].filter(Boolean),
        '',
        'Message:',
        inquiry.message || 'No message provided.',
    ].join('\n');
}

function buildHtmlMessage(inquiry) {
    const rows = [
        ['Name', inquiry.full_name],
        ['Email', inquiry.email],
        ['Phone', inquiry.phone],
        ['Location', inquiry.location],
        ['Query type', inquiry.query_type],
        ['Signed-in account', inquiry.user_email],
        ['Submitted', inquiry.submitted_at],
    ];

    return `
        <div style="font-family: Arial, sans-serif; color: #1c1c1c; line-height: 1.6;">
            <p style="margin: 0 0 8px;">A new atelier contact request has been shared.</p>
            <p style="margin: 0 0 16px; color: #5f5a53;">This note was delivered to the atelier and copied to the sender for confirmation.</p>
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
            ${buildSelectionHtml(inquiry)}
            <p style="margin: 0 0 8px; font-weight: 600;">Message</p>
            <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(inquiry.message || 'No message provided.')}</p>
        </div>
    `;
}

export async function sendContactEmail(inquiry) {
    const config = getMailConfig();

    if (!config.pass) {
        throw new Error('Contact email delivery is not configured. Add CONTACT_SMTP_PASSWORD to .env.local.');
    }

    const mailer = getTransporter();
    const subject = `Styling By VA request copy: ${inquiry.query_type} from ${inquiry.full_name}`;
    const copiedInbox = inquiry.email?.toLowerCase() === config.to.toLowerCase() ? '' : inquiry.email;

    await mailer.sendMail({
        from: `"Styling By VA" <${config.from}>`,
        to: config.to,
        cc: copiedInbox || undefined,
        replyTo: inquiry.email,
        subject,
        text: buildTextMessage(inquiry),
        html: buildHtmlMessage(inquiry),
    });
}