import crypto from 'node:crypto';
import { DEFAULT_LANGUAGE, normalizeLanguage } from './language';

const captchaTtlMs = 10 * 60 * 1000;
const minimumSubmissionDelayMs = 1500;
const captchaSecret =
    process.env.CONTACT_CAPTCHA_SECRET ||
    process.env.CONTACT_SMTP_PASSWORD ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'lumina-contact-captcha';

function encodeBase64Url(value) {
    return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value) {
    return Buffer.from(value, 'base64url').toString('utf8');
}

function signPayload(payload) {
    return crypto.createHmac('sha256', captchaSecret).update(payload).digest('base64url');
}

function randomInt(min, max) {
    return crypto.randomInt(min, max + 1);
}

function getCaptchaMessage(language, englishValue, bulgarianValue) {
    return (normalizeLanguage(language) || DEFAULT_LANGUAGE) === 'bg' ? bulgarianValue : englishValue;
}

function buildMathChallenge(language = DEFAULT_LANGUAGE) {
    const operatorPool = [
        { symbol: '+', solve: (left, right) => left + right },
        { symbol: '-', solve: (left, right) => left - right },
    ];
    const operator = operatorPool[randomInt(0, operatorPool.length - 1)];
    let left = randomInt(2, 9);
    let right = randomInt(1, 8);

    if (operator.symbol === '-' && right >= left) {
        [left, right] = [right + 1, left - 1 || 1];
    }

    return {
        prompt: getCaptchaMessage(language, `Human check: ${left} ${operator.symbol} ${right} = ?`, `Проверка: ${left} ${operator.symbol} ${right} = ?`),
        answer: String(operator.solve(left, right)),
    };
}

export function createContactCaptchaChallenge(language = DEFAULT_LANGUAGE) {
    const challenge = buildMathChallenge(language);
    const expiresAt = Date.now() + captchaTtlMs;
    const payload = JSON.stringify({
        answer: challenge.answer,
        expiresAt,
        nonce: crypto.randomUUID(),
    });

    return {
        prompt: challenge.prompt,
        token: `${encodeBase64Url(payload)}.${signPayload(payload)}`,
        expiresAt,
    };
}

export function verifyContactCaptcha(token, answer, language = DEFAULT_LANGUAGE) {
    const getMessage = (englishValue, bulgarianValue) => getCaptchaMessage(language, englishValue, bulgarianValue);

    if (!token || typeof token !== 'string' || !answer || typeof answer !== 'string') {
        return { isValid: false, message: getMessage('Please complete the human check before sending.', 'Попълнете проверката преди изпращане.') };
    }

    const [encodedPayload, signature] = token.split('.');

    if (!encodedPayload || !signature) {
        return { isValid: false, message: getMessage('The human check could not be verified. Please refresh it and try again.', 'Проверката не можа да бъде потвърдена. Обновете я и опитайте отново.') };
    }

    try {
        const payload = decodeBase64Url(encodedPayload);
        const expectedSignature = signPayload(payload);
        const providedSignature = Buffer.from(signature);
        const knownSignature = Buffer.from(expectedSignature);

        if (
            providedSignature.length !== knownSignature.length ||
            !crypto.timingSafeEqual(providedSignature, knownSignature)
        ) {
            return { isValid: false, message: getMessage('The human check could not be verified. Please refresh it and try again.', 'Проверката не можа да бъде потвърдена. Обновете я и опитайте отново.') };
        }

        const parsedPayload = JSON.parse(payload);

        if (!parsedPayload?.expiresAt || Date.now() > parsedPayload.expiresAt) {
            return { isValid: false, message: getMessage('The human check expired. Please refresh it and try again.', 'Проверката изтече. Обновете я и опитайте отново.') };
        }

        if (String(parsedPayload.answer).trim() !== answer.trim()) {
            return { isValid: false, message: getMessage('The human check answer does not match. Please try once more.', 'Отговорът на проверката не съвпада. Опитайте още веднъж.') };
        }

        return { isValid: true };
    } catch {
        return { isValid: false, message: getMessage('The human check could not be verified. Please refresh it and try again.', 'Проверката не можа да бъде потвърдена. Обновете я и опитайте отново.') };
    }
}

export function isLikelyBotSubmission({ honeypotValue, startedAt }) {
    if (typeof honeypotValue === 'string' && honeypotValue.trim()) {
        return true;
    }

    const numericStartedAt = Number(startedAt);

    if (!Number.isFinite(numericStartedAt) || numericStartedAt <= 0) {
        return true;
    }

    return Date.now() - numericStartedAt < minimumSubmissionDelayMs;
}