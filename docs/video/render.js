const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const ffmpeg = require('ffmpeg-static');

const DIR = __dirname;
const FRAMES = path.join(DIR, 'frames');
const FPS = 30;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function dataUri(file, mime) {
    return `data:${mime};base64,${fs.readFileSync(path.join(DIR, file)).toString('base64')}`;
}

(async () => {
    fs.rmSync(FRAMES, { recursive: true, force: true });
    fs.mkdirSync(FRAMES, { recursive: true });

    const html = fs
        .readFileSync(path.join(DIR, 'template.html'), 'utf8')
        .replace('__FONT_REGULAR__', dataUri('fonts/Poppins-Regular.ttf', 'font/ttf'))
        .replace('__FONT_BOLD__', dataUri('fonts/Poppins-Bold.ttf', 'font/ttf'))
        .replace('__QR__', dataUri('qr.png', 'image/png'));

    const browser = await puppeteer.launch({
        executablePath: CHROME,
        headless: 'new',
        args: ['--force-device-scale-factor=1', '--hide-scrollbars', '--font-render-hinting=none'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);

    const duration = await page.evaluate(() => window.DURATION);
    const total = Math.round(duration * FPS);
    console.log(`Renderizando ${total} frames (${duration}s @ ${FPS}fps)…`);

    for (let i = 0; i < total; i++) {
        const t = i / FPS;
        await page.evaluate((tt) => window.render(tt), t);
        await page.screenshot({
            path: path.join(FRAMES, String(i).padStart(5, '0') + '.jpg'),
            type: 'jpeg',
            quality: 94,
            optimizeForSpeed: true,
        });
        if (i % 60 === 0) console.log(`  frame ${i}/${total}`);
    }
    await browser.close();

    const out = path.join(DIR, 'servy-como-funciona.mp4');
    execFileSync(
        ffmpeg,
        [
            '-y', '-framerate', String(FPS),
            '-i', path.join(FRAMES, '%05d.jpg'),
            '-c:v', 'libx264', '-preset', 'slow', '-crf', '19',
            '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
            out,
        ],
        { stdio: 'inherit' }
    );
    console.log('OK ->', out);
})();
