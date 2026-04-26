import {
    CREATOR_PROGRAM_BENEFITS,
    CREATOR_PROGRAM_DEADLINE,
    CREATOR_PROGRAM_BRAND_NAME,
    CREATOR_PROGRAM_OBLIGATIONS,
    CREATOR_PROGRAM_OFFER,
    CREATOR_PROGRAM_RIGHTS_STATEMENT,
    getCreatorProgramText,
} from './creator-program';
import { DEFAULT_LANGUAGE, normalizeLanguage } from './language';

function formatAgreementDate(value, language) {
    const resolvedLanguage = normalizeLanguage(language) || DEFAULT_LANGUAGE;
    const locale = resolvedLanguage === 'bg' ? 'bg-BG' : 'en-GB';

    return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(new Date(value || Date.now()));
}

function sanitizeFileValue(value) {
    return String(value || 'application')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50) || 'application';
}

function createPdfWriter(doc) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 54;
    const marginY = 56;
    const contentWidth = pageWidth - marginX * 2;
    const bottomLimit = pageHeight - marginY;
    let cursorY = marginY;

    const ensureSpace = (estimatedHeight) => {
        if (cursorY + estimatedHeight <= bottomLimit) {
            return;
        }

        doc.addPage();
        cursorY = marginY;
    };

    const writeText = (text, options = {}) => {
        const fontSize = options.fontSize || 11;
        const lineHeight = options.lineHeight || fontSize * 1.45;
        const gapAfter = options.gapAfter ?? 12;
        const fontName = options.fontName || 'times';
        const fontStyle = options.fontStyle || 'normal';
        const lines = doc.splitTextToSize(String(text || ''), options.maxWidth || contentWidth);
        const estimatedHeight = Math.max(lines.length, 1) * lineHeight + gapAfter;

        ensureSpace(estimatedHeight);
        doc.setFont(fontName, fontStyle);
        doc.setFontSize(fontSize);
        doc.text(lines, marginX, cursorY);
        cursorY += Math.max(lines.length, 1) * lineHeight + gapAfter;
    };

    const writeRule = () => {
        ensureSpace(24);
        doc.setDrawColor(190, 180, 168);
        doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
        cursorY += 18;
    };

    return { writeText, writeRule };
}

export async function downloadCreatorApplicationAgreement({ application, language = DEFAULT_LANGUAGE }) {
    const { jsPDF } = await import('jspdf');
    const resolvedLanguage = normalizeLanguage(language) || DEFAULT_LANGUAGE;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const writer = createPdfWriter(doc);
    const agreementDate = formatAgreementDate(application?.createdAt || Date.now(), resolvedLanguage);
    const benefitsText = CREATOR_PROGRAM_BENEFITS
        .map((benefit) => `[+] ${getCreatorProgramText(resolvedLanguage, benefit.title.en, benefit.title.bg)}: ${getCreatorProgramText(resolvedLanguage, benefit.copy.en, benefit.copy.bg)}`)
        .join('\n');
    const obligationsText = CREATOR_PROGRAM_OBLIGATIONS
        .map((obligation) => `[x] ${getCreatorProgramText(resolvedLanguage, obligation.title.en, obligation.title.bg)}: ${getCreatorProgramText(resolvedLanguage, obligation.copy.en, obligation.copy.bg)}`)
        .join('\n');

    writer.writeText(
        getCreatorProgramText(resolvedLanguage, `${CREATOR_PROGRAM_BRAND_NAME} Creator Partnership Agreement`, `Споразумение за creator partnership с ${CREATOR_PROGRAM_BRAND_NAME}`),
        { fontSize: 23, lineHeight: 28, gapAfter: 10 }
    );
    writer.writeText(
        getCreatorProgramText(
            resolvedLanguage,
            `Application date: ${agreementDate}`,
            `Дата на кандидатстване: ${agreementDate}`
        ),
        { fontSize: 11, gapAfter: 18 }
    );

    writer.writeRule();
    writer.writeText(getCreatorProgramText(resolvedLanguage, 'Applicant details', 'Данни за кандидата'), {
        fontSize: 13,
        fontStyle: 'bold',
        gapAfter: 10,
    });
    writer.writeText(
        [
            `${getCreatorProgramText(resolvedLanguage, 'Full name', 'Име и фамилия')}: ${application?.fullName || ''}`,
            `${getCreatorProgramText(resolvedLanguage, 'Email', 'Имейл')}: ${application?.email || ''}`,
            `${getCreatorProgramText(resolvedLanguage, 'Phone', 'Телефон')}: ${application?.phone || '-'}`,
            `${getCreatorProgramText(resolvedLanguage, 'Social profile links', 'Линкове към социални профили')}: ${Array.isArray(application?.socialLinks) && application.socialLinks.length > 0 ? application.socialLinks.join(', ') : (application?.profileUrl || '')}`,
            `${getCreatorProgramText(resolvedLanguage, 'Application status', 'Статус на кандидатурата')}: ${application?.status || 'pending'}`,
        ].join('\n'),
        { gapAfter: 18 }
    );

    writer.writeText(getCreatorProgramText(resolvedLanguage, 'Offer', 'Оферта'), {
        fontSize: 13,
        fontStyle: 'bold',
        gapAfter: 10,
    });
    writer.writeText(getCreatorProgramText(resolvedLanguage, CREATOR_PROGRAM_OFFER.en, CREATOR_PROGRAM_OFFER.bg), {
        gapAfter: 18,
    });

    writer.writeText(getCreatorProgramText(resolvedLanguage, 'Benefits', 'Ползи'), {
        fontSize: 13,
        fontStyle: 'bold',
        gapAfter: 10,
    });
    writer.writeText(benefitsText, { gapAfter: 18 });

    writer.writeText(getCreatorProgramText(resolvedLanguage, 'Obligations', 'Ангажименти'), {
        fontSize: 13,
        fontStyle: 'bold',
        gapAfter: 10,
    });
    writer.writeText(obligationsText, { gapAfter: 18 });

    writer.writeText(getCreatorProgramText(resolvedLanguage, 'Deadline', 'Срок'), {
        fontSize: 13,
        fontStyle: 'bold',
        gapAfter: 10,
    });
    writer.writeText(getCreatorProgramText(resolvedLanguage, CREATOR_PROGRAM_DEADLINE.en, CREATOR_PROGRAM_DEADLINE.bg), {
        gapAfter: 18,
    });

    writer.writeText(getCreatorProgramText(resolvedLanguage, 'Rights & consent', 'Права и съгласие'), {
        fontSize: 13,
        fontStyle: 'bold',
        gapAfter: 10,
    });
    writer.writeText(
        getCreatorProgramText(
            resolvedLanguage,
            CREATOR_PROGRAM_RIGHTS_STATEMENT.en,
            CREATOR_PROGRAM_RIGHTS_STATEMENT.bg
        ),
        { gapAfter: 18 }
    );

    writer.writeText(getCreatorProgramText(resolvedLanguage, 'Motivation', 'Мотивация'), {
        fontSize: 13,
        fontStyle: 'bold',
        gapAfter: 10,
    });
    writer.writeText(application?.motivation || '', { gapAfter: 24 });

    writer.writeRule();
    writer.writeText(
        getCreatorProgramText(
            resolvedLanguage,
            `Digital confirmation: ${application?.fullName || ''}`,
            `Дигитално потвърждение: ${application?.fullName || ''}`
        ),
        { gapAfter: 6 }
    );
    writer.writeText(
        getCreatorProgramText(
            resolvedLanguage,
            `This PDF confirms the submitted application details and the accepted ${CREATOR_PROGRAM_BRAND_NAME} collaboration terms.`,
            `Този PDF потвърждава подадените данни по кандидатурата и приетите условия за сътрудничество с ${CREATOR_PROGRAM_BRAND_NAME}.`
        ),
        { gapAfter: 0 }
    );

    doc.save(`the-va-store-collaboration-${sanitizeFileValue(application?.fullName)}.pdf`);
}