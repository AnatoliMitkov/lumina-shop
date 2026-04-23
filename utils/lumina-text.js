// Storage / normalization layer for the new Lumina TipTap-based editor.
//
// We persist a small wrapper around TipTap's HTML output so that:
//   - Existing site_copy_entries rows can be read by old renderers (plain string)
//     and the new renderer (HTML) without a migration step.
//   - Inline contexts (button labels, eyebrows) can fall back to .text.
//   - We can detect the document type and route to the right editor mode.
//
// Shape:
//   {
//     kind: 'lumina-text-v1',
//     mode: 'inline' | 'block',
//     html: '<p>...</p>',
//     text: 'Plain text fallback',
//   }

export const LUMINA_TEXT_KIND = 'lumina-text-v1';

export const LUMINA_TEXT_MODES = Object.freeze(['inline', 'block']);

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function tryParseJson(value) {
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        return null;
    }
    try {
        return JSON.parse(trimmed);
    } catch (error) {
        return null;
    }
}

export function isLuminaTextValue(value) {
    if (isPlainObject(value) && value.kind === LUMINA_TEXT_KIND) {
        return true;
    }
    const parsed = tryParseJson(value);
    return Boolean(parsed && parsed.kind === LUMINA_TEXT_KIND);
}

export function parseLuminaTextValue(value) {
    if (isPlainObject(value) && value.kind === LUMINA_TEXT_KIND) {
        return value;
    }
    const parsed = tryParseJson(value);
    if (parsed && parsed.kind === LUMINA_TEXT_KIND) {
        return parsed;
    }
    return null;
}

export function createLuminaTextDocument({ html = '', text = '', mode = 'block' } = {}) {
    const safeMode = LUMINA_TEXT_MODES.includes(mode) ? mode : 'block';
    return {
        kind: LUMINA_TEXT_KIND,
        mode: safeMode,
        html: typeof html === 'string' ? html : '',
        text: typeof text === 'string' ? text : '',
    };
}

// Strip HTML tags safely for plain-text fallback contexts (e.g. <title>, alt
// text, plain inline spans on the live site that don't render formatting).
export function htmlToPlainText(html = '') {
    if (typeof html !== 'string' || !html) {
        return '';
    }
    return html
        .replace(/<br\s*\/?>(?=\s|$|<)/gi, '\n')
        .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

// Resolve an entry value (whatever shape was saved) into the inputs the editor
// needs: { html, text, mode }. Falls back to a string fallback if no value.
export function resolveLuminaTextDocument(value, fallback = '', mode = 'block') {
    const parsed = parseLuminaTextValue(value);
    if (parsed) {
        return createLuminaTextDocument({
            html: parsed.html || '',
            text: parsed.text || htmlToPlainText(parsed.html || ''),
            mode: parsed.mode || mode,
        });
    }

    // Backward compatibility with the legacy semantic-block format
    // (`site-copy-rich-text-v1`). Convert each block to an equivalent HTML
    // element so the new editor can edit it natively.
    const legacy = parseLegacyRichTextDocument(value);
    if (legacy) {
        return createLuminaTextDocument({
            html: legacyDocumentToHtml(legacy),
            text: legacyDocumentToPlainText(legacy),
            mode,
        });
    }

    // Backward compatibility: plain string saved by EditableText.
    if (typeof value === 'string' && value.length > 0) {
        return createLuminaTextDocument({
            html: escapeHtml(value).replace(/\n/g, mode === 'inline' ? ' ' : '<br>'),
            text: value,
            mode,
        });
    }

    const fallbackString = typeof fallback === 'string' ? fallback : '';
    // Fallback might itself be a legacy rich-text document (used by some surfaces).
    const fallbackLegacy = parseLegacyRichTextDocument(fallback);
    if (fallbackLegacy) {
        return createLuminaTextDocument({
            html: legacyDocumentToHtml(fallbackLegacy),
            text: legacyDocumentToPlainText(fallbackLegacy),
            mode,
        });
    }

    return createLuminaTextDocument({
        html: escapeHtml(fallbackString).replace(/\n/g, mode === 'inline' ? ' ' : '<br>'),
        text: fallbackString,
        mode,
    });
}

// ---- Legacy site-copy-rich-text-v1 → HTML conversion --------------------

function parseLegacyRichTextDocument(value) {
    const candidate = isPlainObject(value) ? value : tryParseJson(value);
    if (!candidate || candidate.kind !== 'site-copy-rich-text-v1' || !Array.isArray(candidate.blocks)) {
        return null;
    }
    return candidate;
}

const LEGACY_BLOCK_TAGS = {
    paragraph: 'p',
    heading1: 'h1',
    heading2: 'h2',
    heading3: 'h3',
    quote: 'blockquote',
    'bullet-list': 'ul',
    'numbered-list': 'ol',
};

function legacyBlockInlineStyle(block) {
    const styles = [];
    if (block.color) styles.push(`color: ${block.color}`);
    if (block.align && block.align !== 'left') styles.push(`text-align: ${block.align}`);
    return styles.length ? ` style="${styles.join('; ')}"` : '';
}

function legacyWrapEmphasis(text, block) {
    let inner = escapeHtml(text);
    if (block.bold) inner = `<strong>${inner}</strong>`;
    if (block.italic) inner = `<em>${inner}</em>`;
    if (block.underline) inner = `<u>${inner}</u>`;
    return inner;
}

function legacyDocumentToHtml(doc) {
    if (!doc || !Array.isArray(doc.blocks)) return '';
    return doc.blocks.map((block) => {
        const tag = LEGACY_BLOCK_TAGS[block.type] || 'p';
        const styleAttr = legacyBlockInlineStyle(block);
        const text = String(block.text || '');

        if (tag === 'ul' || tag === 'ol') {
            const items = text.split('\n').map((line) => line.trim()).filter(Boolean);
            if (items.length === 0) return `<${tag}${styleAttr}><li></li></${tag}>`;
            return `<${tag}${styleAttr}>${items.map((item) => `<li>${legacyWrapEmphasis(item, block)}</li>`).join('')}</${tag}>`;
        }

        const inner = text.split('\n').map((line) => legacyWrapEmphasis(line, block)).join('<br>');
        return `<${tag}${styleAttr}>${inner || '<br>'}</${tag}>`;
    }).join('');
}

function legacyDocumentToPlainText(doc) {
    if (!doc || !Array.isArray(doc.blocks)) return '';
    return doc.blocks
        .map((block) => String(block.text || '').trim())
        .filter(Boolean)
        .join('\n\n');
}

export function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Sanitize HTML coming out of the editor before persisting. We allow only the
// tags / attributes the editor itself produces. This protects the live site
// from any pasted-in script or unsafe attribute that might slip through.
const ALLOWED_TAGS = new Set([
    'p', 'br', 'span', 'strong', 'em', 'u', 's', 'a',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'hr',
]);

const ALLOWED_ATTRS = new Set(['href', 'target', 'rel', 'style', 'class']);

const ALLOWED_STYLE_PROPERTIES = new Set([
    'color', 'text-align', 'font-weight', 'font-style', 'text-decoration',
    'text-decoration-line', 'text-decoration-color', 'text-decoration-style', 'font-size',
]);

function sanitizeStyleAttribute(styleString = '') {
    return String(styleString)
        .split(';')
        .map((rule) => rule.trim())
        .filter(Boolean)
        .map((rule) => {
            const colonIndex = rule.indexOf(':');
            if (colonIndex < 0) return null;
            const prop = rule.slice(0, colonIndex).trim().toLowerCase();
            const val = rule.slice(colonIndex + 1).trim();
            if (!ALLOWED_STYLE_PROPERTIES.has(prop)) return null;
            if (prop === 'font-size' && !/^\d+(?:\.\d+)?(?:px|pt|rem|em|%)$/i.test(val)) return null;
            // Block url(), expression(), javascript:, etc.
            if (/url\(|expression\(|javascript:/i.test(val)) return null;
            return `${prop}: ${val}`;
        })
        .filter(Boolean)
        .join('; ');
}

export function sanitizeLuminaTextHtml(html = '') {
    if (typeof html !== 'string' || !html) {
        return '';
    }

    if (typeof DOMParser === 'undefined') {
        // Server-side: do a conservative regex strip of <script> tags and
        // event handlers. The browser-side path is the trusted one because
        // the editor only runs in the browser.
        return html
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/\son\w+="[^"]*"/gi, '')
            .replace(/\son\w+='[^']*'/gi, '')
            .replace(/javascript:/gi, '');
    }

    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    const root = doc.body.firstChild;
    if (!root) return '';

    const walk = (node) => {
        const children = Array.from(node.childNodes);
        children.forEach((child) => {
            if (child.nodeType === Node.ELEMENT_NODE) {
                const tagName = child.tagName.toLowerCase();
                if (!ALLOWED_TAGS.has(tagName)) {
                    // Replace disallowed element with its text content.
                    const textNode = doc.createTextNode(child.textContent || '');
                    node.replaceChild(textNode, child);
                    return;
                }

                Array.from(child.attributes).forEach((attr) => {
                    const name = attr.name.toLowerCase();
                    if (!ALLOWED_ATTRS.has(name)) {
                        child.removeAttribute(attr.name);
                        return;
                    }
                    if (name === 'href') {
                        const href = attr.value.trim();
                        if (/^javascript:/i.test(href)) {
                            child.removeAttribute(attr.name);
                            return;
                        }
                    }
                    if (name === 'style') {
                        const sanitized = sanitizeStyleAttribute(attr.value);
                        if (sanitized) {
                            child.setAttribute('style', sanitized);
                        } else {
                            child.removeAttribute('style');
                        }
                    }
                });

                // Force safe link attributes
                if (tagName === 'a' && child.getAttribute('href')) {
                    const href = child.getAttribute('href');
                    if (/^https?:|^mailto:|^tel:|^\/|^#/.test(href)) {
                        child.setAttribute('target', '_blank');
                        child.setAttribute('rel', 'noopener noreferrer');
                    } else {
                        child.removeAttribute('href');
                    }
                }

                walk(child);
            }
        });
    };

    walk(root);
    return root.innerHTML;
}
