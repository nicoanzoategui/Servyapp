const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const DIR = __dirname;
const OUT = path.join(DIR, 'ig');
const W = 1080, H = 1350; // 4:5, el formato de feed que más pantalla ocupa
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const dataUri = (file, mime) =>
    `data:${mime};base64,${fs.readFileSync(path.join(DIR, file)).toString('base64')}`;

(async () => {
    fs.rmSync(OUT, { recursive: true, force: true });
    fs.mkdirSync(OUT, { recursive: true });

    const html = fs
        .readFileSync(path.join(DIR, 'ig-pasos.html'), 'utf8')
        .replace('__FONT_REGULAR__', dataUri('fonts/Poppins-Regular.ttf', 'font/ttf'))
        .replace('__FONT_BOLD__', dataUri('fonts/Poppins-Bold.ttf', 'font/ttf'))
        .replace('__QR__', dataUri('qr.png', 'image/png'));

    const browser = await puppeteer.launch({
        executablePath: CHROME,
        headless: 'new',
        args: ['--force-device-scale-factor=1', '--hide-scrollbars', '--font-render-hinting=none'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);

    for (const id of ['s1', 's2', 's3']) {
        await page.evaluate((cur) => {
            for (const el of document.querySelectorAll('.slide')) el.classList.remove('on');
            document.getElementById(cur).classList.add('on');
        }, id);
        const file = path.join(OUT, `servy-pasos-${id.slice(1)}.png`);
        await page.screenshot({ path: file, type: 'png' });
        console.log('->', file);
    }

    await browser.close();
})();
