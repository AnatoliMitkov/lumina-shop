import nodemailer from 'nodemailer';
import { buildCreatorApplicationAgreementPdfBuffer } from './creator-program-pdf';

const defaultSmtpHost = 'mail.stylingbyva.com';
const defaultSmtpPort = 465;
const defaultSmtpUser = 'sales@stylingbyva.com';
const defaultAdminInbox = 'sales@stylingbyva.com';
const defaultFromAddress = 'no-reply@stylingbyva.com';

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
    const pass = process.env.CONTACT_SMTP_PASSWORD
        || process.env.SMTP_PASSWORD
        || process.env.MAIL_PASSWORD
        || process.env.EMAIL_PASSWORD
        || '';
    const secure = readBoolean(process.env.CONTACT_SMTP_SECURE, port === 465);
    const to = process.env.CREATOR_PROGRAM_TO_EMAIL || process.env.CONTACT_TO_EMAIL || defaultAdminInbox;
    const from = process.env.CREATOR_PROGRAM_FROM_EMAIL || defaultFromAddress;

    return { host, port, user, pass, secure, to, from };
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

function renderApplicationDetails(application = {}) {
    const socialLinks = Array.isArray(application.socialLinks) ? application.socialLinks.filter(Boolean) : [];

    return [
        `Application ID: ${application.id || '-'}`,
        `Name: ${application.fullName || '-'}`,
        `Email: ${application.email || '-'}`,
        `Phone: ${application.phone || '-'}`,
        `Social links: ${socialLinks.length ? socialLinks.join(', ') : (application.profileUrl || '-')}`,
        `Status: ${application.status || 'pending'}`,
        '',
        'Motivation:',
        application.motivation || '-',
    ].join('\n');
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderApplicationDetailsHtml(application = {}) {
    const socialLinks = Array.isArray(application.socialLinks) ? application.socialLinks.filter(Boolean) : [];

    return `
        <div style="font-family: Arial, sans-serif; color: #1c1c1c; line-height: 1.6;">
            <p style="margin: 0 0 8px;">A creator collaboration application was received and stored successfully.</p>
            <p style="margin: 0 0 16px; color: #5f5a53;">The contract confirmation PDF is attached for both sides.</p>
            <table style="border-collapse: collapse; width: 100%; margin: 0 0 16px;">
                <tbody>
                    <tr><td style="padding: 6px 12px 6px 0; font-weight: 600;">Application ID</td><td style="padding: 6px 0;">${escapeHtml(application.id || '-')}</td></tr>
                    <tr><td style="padding: 6px 12px 6px 0; font-weight: 600;">Name</td><td style="padding: 6px 0;">${escapeHtml(application.fullName || '-')}</td></tr>
                    <tr><td style="padding: 6px 12px 6px 0; font-weight: 600;">Email</td><td style="padding: 6px 0;">${escapeHtml(application.email || '-')}</td></tr>
                    <tr><td style="padding: 6px 12px 6px 0; font-weight: 600;">Phone</td><td style="padding: 6px 0;">${escapeHtml(application.phone || '-')}</td></tr>
                    <tr><td style="padding: 6px 12px 6px 0; font-weight: 600;">Social links</td><td style="padding: 6px 0;">${escapeHtml(socialLinks.length ? socialLinks.join(', ') : (application.profileUrl || '-'))}</td></tr>
                    <tr><td style="padding: 6px 12px 6px 0; font-weight: 600;">Status</td><td style="padding: 6px 0;">${escapeHtml(application.status || 'pending')}</td></tr>
                </tbody>
            </table>
            <p style="margin: 0 0 6px; font-weight: 600;">Motivation</p>
            <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(application.motivation || '-')}</p>
        </div>
    `;
}

export async function notifyCreatorProgramAdmin(application, { language } = {}) {
    const config = getMailConfig();

    if (!config.pass) {
        throw new Error('Creator application email delivery is not configured. Add CONTACT_SMTP_PASSWORD to .env.local.');
    }

    if (!application?.email) {
        throw new Error('Creator application email is missing.');
    }

    const pdfBuffer = await buildCreatorApplicationAgreementPdfBuffer({ application, language });
    const mailer = getTransporter();

    await mailer.sendMail({
        from: `"THE VA STORE" <${config.from}>`,
        to: application.email,
        bcc: config.to || undefined,
        subject: `Creator application confirmation - ${application.fullName || 'Applicant'}`,
        text: [
            'Your creator partnership application has been received and is now under review.',
            'A PDF copy of your contract confirmation is attached.',
            '',
            renderApplicationDetails(application),
        ].join('\n'),
        html: renderApplicationDetailsHtml(application),
        attachments: [
            {
                filename: `the-va-store-collaboration-${String(application?.fullName || 'application').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'application'}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf',
            },
        ],
    });

    return { queued: true };
}