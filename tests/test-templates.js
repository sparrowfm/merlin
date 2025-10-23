/**
 * Merlin - Template Test
 * Quick test to verify style templates work
 */

const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    let browser;

    try {
        console.log('\n🧪 Testing Style Templates\n');
        console.log('='.repeat(50));

        browser = await puppeteer.launch({
            headless: false,
            args: ['--window-size=1200,900']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 900 });

        // Add error handler
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('Browser error:', msg.text());
            }
        });

        page.on('pageerror', error => {
            console.log('Page error:', error.message);
        });

        // Load the app
        const htmlPath = path.join(__dirname, '../src/index.html');
        await page.goto(`file://${htmlPath}`);
        console.log('✓ App loaded');

        // Check if template buttons exist
        const templateButtons = await page.$$('.template-btn');
        console.log(`✓ Found ${templateButtons.length} template buttons`);

        if (templateButtons.length === 0) {
            console.log('✗ No template buttons found!');
            await browser.close();
            process.exit(1);
        }

        // Upload video
        const videoPath = path.join(__dirname, 'fixtures/speech-test.mp4');
        const fileInput = await page.$('#videoInput');
        await fileInput.uploadFile(videoPath);
        console.log('✓ Video uploaded');

        // Wait for mock transcription (should complete quickly)
        await page.waitForSelector('#previewSection', { visible: true, timeout: 10000 });
        console.log('✓ Transcription complete, preview visible');

        // Test clicking first template (Social Bold)
        console.log('\n📋 Testing Social Bold template');
        await page.click('[data-template="social-bold"]');
        await page.waitForTimeout(500);

        // Check if active
        const isActive = await page.$eval('[data-template="social-bold"]', el =>
            el.classList.contains('active')
        );
        console.log(`  Active state: ${isActive ? '✓' : '✗'}`);

        // Get current settings
        const fontSize = await page.$eval('#fontSize', el => el.value);
        const fontFamily = await page.$eval('#fontFamily', el => el.value);
        console.log(`  Font: ${fontFamily}, Size: ${fontSize}px`);

        // Take screenshot
        await page.screenshot({
            path: path.join(__dirname, 'output/template-social-bold.png')
        });
        console.log('  ✓ Screenshot saved');

        // Try another template
        console.log('\n📋 Testing YouTube template');
        await page.click('[data-template="youtube"]');
        await page.waitForTimeout(500);

        const fontSize2 = await page.$eval('#fontSize', el => el.value);
        const fontFamily2 = await page.$eval('#fontFamily', el => el.value);
        console.log(`  Font: ${fontFamily2}, Size: ${fontSize2}px`);

        await page.screenshot({
            path: path.join(__dirname, 'output/template-youtube.png')
        });
        console.log('  ✓ Screenshot saved');

        console.log('\n' + '='.repeat(50));
        console.log('✅ Template tests complete!\n');

        await page.waitForTimeout(2000);
        await browser.close();

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (browser) {
            await browser.close();
        }
        process.exit(1);
    }
})();
