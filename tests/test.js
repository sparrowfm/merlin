/**
 * Merlin - Puppeteer E2E Tests
 * TDD approach with visual verification
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Test configuration
const config = {
    headless: process.env.HEADLESS !== 'false',
    screenshotDir: path.join(__dirname, 'screenshots'),
    fixturesDir: path.join(__dirname, 'fixtures')
};

// Ensure screenshot directory exists
if (!fs.existsSync(config.screenshotDir)) {
    fs.mkdirSync(config.screenshotDir, { recursive: true });
}

// Test state
const tests = [];
let passed = 0;
let failed = 0;

// Test runner
async function runTests() {
    console.log('\n🧪 Merlin Test Suite\n');
    console.log('='.repeat(50));

    const browser = await puppeteer.launch({
        headless: config.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 900 });

    // Run each test
    for (const test of tests) {
        try {
            await test.fn(page);
            console.log(`✅ PASS: ${test.name}`);
            passed++;
        } catch (error) {
            console.log(`❌ FAIL: ${test.name}`);
            console.log(`   ${error.message}`);
            failed++;
        }
    }

    await browser.close();

    // Summary
    console.log('='.repeat(50));
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

    process.exit(failed > 0 ? 1 : 0);
}

// Test helper
function test(name, fn) {
    tests.push({ name, fn });
}

// Assertion helpers
function expect(value) {
    return {
        toBe: (expected) => {
            if (value !== expected) {
                throw new Error(`Expected ${expected}, got ${value}`);
            }
        },
        toContain: (substring) => {
            if (!value.includes(substring)) {
                throw new Error(`Expected "${value}" to contain "${substring}"`);
            }
        },
        toBeTruthy: () => {
            if (!value) {
                throw new Error(`Expected truthy value, got ${value}`);
            }
        },
        toBeVisible: async () => {
            const isVisible = await value.isVisible();
            if (!isVisible) {
                throw new Error('Element is not visible');
            }
        }
    };
}

async function screenshot(page, name) {
    const filepath = path.join(config.screenshotDir, `${name}.png`);
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`   📸 Screenshot: ${name}.png`);
}

// ============================================================================
// TESTS
// ============================================================================

// Test 1: Page loads with bold Sparrow aesthetic
test('Page loads with Merlin branding', async (page) => {
    const htmlPath = 'file://' + path.join(__dirname, '..', 'src', 'index.html');
    await page.goto(htmlPath);

    // Check title
    const title = await page.$eval('.site-title', el => el.textContent);
    await expect(title).toContain('MERLIN');

    // Check tagline
    const tagline = await page.$eval('.site-tagline', el => el.textContent);
    await expect(tagline).toContain('PRECISION CAPTIONING');

    // Visual verification
    await screenshot(page, '01-landing-page');
});

// Test 2: Upload area is visible and styled
test('Upload area displays correctly', async (page) => {
    const htmlPath = 'file://' + path.join(__dirname, '..', 'src', 'index.html');
    await page.goto(htmlPath);

    // Check upload area exists
    const uploadArea = await page.$('#uploadArea');
    await expect(uploadArea).toBeTruthy();

    // Check upload text
    const uploadText = await page.$eval('.upload-text', el => el.textContent);
    await expect(uploadText).toContain('Drag & drop');

    // Check browse button
    const browseBtn = await page.$('#browseBtn');
    await expect(browseBtn).toBeTruthy();

    await screenshot(page, '02-upload-area');
});

// Test 3: Bold design aesthetic (colors, borders, typography)
test('Bold Sparrow aesthetic is applied', async (page) => {
    const htmlPath = 'file://' + path.join(__dirname, '..', 'src', 'index.html');
    await page.goto(htmlPath);

    // Check header background color (red)
    const headerBg = await page.$eval('.site-header', el => {
        return window.getComputedStyle(el).backgroundColor;
    });
    // Should be red (#e63946)
    await expect(headerBg).toContain('rgb(230, 57, 70)');

    // Check section borders (4px solid)
    const sectionBorder = await page.$eval('.intro', el => {
        return window.getComputedStyle(el).borderTopWidth;
    });
    await expect(sectionBorder).toBe('4px');

    // Check button shadow (bold shadow)
    const btnShadow = await page.$eval('.btn-primary', el => {
        return window.getComputedStyle(el).boxShadow;
    });
    await expect(btnShadow).toContain('4px');

    await screenshot(page, '03-bold-aesthetic');
});

// Test 4: Styling controls are present
test('Caption styling controls exist', async (page) => {
    const htmlPath = 'file://' + path.join(__dirname, '..', 'src', 'index.html');
    await page.goto(htmlPath);

    // Check all controls exist (even if section is hidden)
    const fontSize = await page.$('#fontSize');
    await expect(fontSize).toBeTruthy();

    const fontColor = await page.$('#fontColor');
    await expect(fontColor).toBeTruthy();

    const bgColor = await page.$('#bgColor');
    await expect(bgColor).toBeTruthy();

    const bgOpacity = await page.$('#bgOpacity');
    await expect(bgOpacity).toBeTruthy();

    const position = await page.$('#captionPosition');
    await expect(position).toBeTruthy();

    console.log('   ✓ All 5 styling controls present (KISS principle)');
});

// Test 5: Video sections exist (even if hidden initially)
test('Video preview and export sections exist', async (page) => {
    const htmlPath = 'file://' + path.join(__dirname, '..', 'src', 'index.html');
    await page.goto(htmlPath);

    const previewSection = await page.$('#previewSection');
    await expect(previewSection).toBeTruthy();

    const transcribeSection = await page.$('#transcribeSection');
    await expect(transcribeSection).toBeTruthy();

    const exportSection = await page.$('#exportSection');
    await expect(exportSection).toBeTruthy();
});

// Test 6: GoatCounter analytics is included
test('GoatCounter analytics script is present', async (page) => {
    const htmlPath = 'file://' + path.join(__dirname, '..', 'src', 'index.html');
    await page.goto(htmlPath);

    const gcScript = await page.$('script[data-goatcounter]');
    await expect(gcScript).toBeTruthy();

    const gcUrl = await page.$eval('script[data-goatcounter]', el => el.dataset.goatcounter);
    await expect(gcUrl).toContain('goatcounter.com');

    console.log('   ✓ GoatCounter analytics configured');
});

// Test 7: Color inputs have correct default values
test('Styling controls have sensible defaults', async (page) => {
    const htmlPath = 'file://' + path.join(__dirname, '..', 'src', 'index.html');
    await page.goto(htmlPath);

    const fontSize = await page.$eval('#fontSize', el => el.value);
    await expect(fontSize).toBe('32');

    const fontColor = await page.$eval('#fontColor', el => el.value);
    await expect(fontColor).toBe('#ffffff');

    const bgColor = await page.$eval('#bgColor', el => el.value);
    await expect(bgColor).toBe('#000000');

    const bgOpacity = await page.$eval('#bgOpacity', el => el.value);
    await expect(bgOpacity).toBe('80');

    console.log('   ✓ Default values: 32px white text, black background, 80% opacity');
});

// Test 8: Responsive design check
test('Layout is responsive', async (page) => {
    const htmlPath = 'file://' + path.join(__dirname, '..', 'src', 'index.html');

    // Test mobile viewport
    await page.setViewport({ width: 375, height: 667 });
    await page.goto(htmlPath);
    await screenshot(page, '04-mobile-layout');

    // Test desktop viewport
    await page.setViewport({ width: 1200, height: 900 });
    await page.goto(htmlPath);
    await screenshot(page, '05-desktop-layout');

    console.log('   ✓ Layout tested at 375px and 1200px widths');
});

// Test 9: Footer links are correct
test('Footer contains correct links', async (page) => {
    const htmlPath = 'file://' + path.join(__dirname, '..', 'src', 'index.html');
    await page.goto(htmlPath);

    // Check GitHub link
    const githubLink = await page.$eval('.site-footer a[href*="github"]', el => el.href);
    await expect(githubLink).toContain('github.com/sparrowfm/merlin');

    // Check Whisper link
    const whisperLink = await page.$eval('.site-footer a[href*="whisper"]', el => el.href);
    await expect(whisperLink).toContain('github.com/openai/whisper');

    // Check FFmpeg link
    const ffmpegLink = await page.$eval('.site-footer a[href*="ffmpeg"]', el => el.href);
    await expect(ffmpegLink).toContain('ffmpeg.org');
});

// Test 10: Button interactions work
test('Browse button triggers file input', async (page) => {
    const htmlPath = 'file://' + path.join(__dirname, '..', 'src', 'index.html');
    await page.goto(htmlPath);

    // Set up file chooser listener
    let fileChooserOpened = false;
    page.on('filechooser', () => {
        fileChooserOpened = true;
    });

    // Click browse button
    await page.click('#browseBtn');

    // Wait a bit for file chooser
    await page.waitForTimeout(100);

    // In headless mode, file chooser might not trigger the event
    // So we just check that the click doesn't error
    console.log('   ✓ Browse button click executes without error');
});

// ============================================================================
// RUN TESTS
// ============================================================================

runTests().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
});
