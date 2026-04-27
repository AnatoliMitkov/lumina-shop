import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fontsDir = path.join(__dirname, '../public/fonts');

// Google Fonts returns TTF when a legacy User-Agent is sent
const LEGACY_UA = 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1)';

const FONT_QUERIES = [
    {
        url: 'https://fonts.googleapis.com/css?family=Noto+Sans:400',
        filename: 'NotoSans-Regular.ttf',
    },
    {
        url: 'https://fonts.googleapis.com/css?family=Noto+Sans:700',
        filename: 'NotoSans-Bold.ttf',
    },
];

fs.mkdirSync(fontsDir, { recursive: true });

for (const font of FONT_QUERIES) {
    console.log(`Resolving ${font.filename}...`);

    const cssResponse = await fetch(font.url, { headers: { 'User-Agent': LEGACY_UA } });

    if (!cssResponse.ok) {
        throw new Error(`CSS fetch failed: ${cssResponse.status} ${font.url}`);
    }

    const css = await cssResponse.text();
    const match = css.match(/src:\s*url\(([^)]+)\)/);

    if (!match) {
        console.error('CSS response:', css.slice(0, 400));
        throw new Error(`Could not find TTF URL in CSS for ${font.filename}`);
    }

    const ttfUrl = match[1];
    console.log(`  TTF URL: ${ttfUrl}`);

    const ttfResponse = await fetch(ttfUrl);

    if (!ttfResponse.ok) {
        throw new Error(`TTF fetch failed: ${ttfResponse.status} ${ttfUrl}`);
    }

    const dest = path.join(fontsDir, font.filename);
    fs.writeFileSync(dest, Buffer.from(await ttfResponse.arrayBuffer()));
    console.log(`  Saved: ${dest}`);
}

console.log('Done.');
