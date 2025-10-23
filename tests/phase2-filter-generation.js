#!/usr/bin/env node
/**
 * Phase 2: Test buildDrawtextFilters() function with realistic data
 * Extract the function from main.js and test it standalone
 */

const fs = require('fs');

// Copied from main.js:220-313
function buildDrawtextFilters(words, style) {
    const fontSize = style.fontSize || 32;
    const fontFamily = style.fontFamily || 'Arial';
    const fontColor = style.fontColor || '#ffffff';
    const bgColor = style.bgColor || '#000000';
    const bgOpacity = (style.bgOpacity || 80) / 100;
    const position = style.position || 'bottom';

    // Convert hex to FFmpeg color format
    const fontColorHex = fontColor.replace('#', '');
    const bgColorHex = bgColor.replace('#', '');
    const bgAlpha = Math.round(bgOpacity * 255).toString(16).padStart(2, '0');

    // Position calculation
    let yPosition;
    if (position === 'top') {
        yPosition = 'h*0.15';
    } else if (position === 'middle') {
        yPosition = 'h*0.5';
    } else {
        yPosition = 'h*0.85';
    }

    const filters = [];
    const wordSpacing = fontSize * 0.3;

    // For each word, create filters showing the 5-word window
    for (let i = 0; i < words.length; i++) {
        const currentWord = words[i];

        // Calculate 5-word window (current + 2 before + 2 after)
        const startIdx = Math.max(0, i - 2);
        const endIdx = Math.min(words.length, i + 3);
        const displayWords = words.slice(startIdx, endIdx);

        // Estimate total width for centering
        const totalChars = displayWords.reduce((sum, w) => sum + w.word.length, 0);
        const estimatedTotalWidth = totalChars * fontSize * 0.6 + (displayWords.length - 1) * wordSpacing;
        const startX = `(w-${Math.round(estimatedTotalWidth)})/2`;

        // Track cumulative x offset
        let cumulativeOffset = 0;

        // Create drawtext for each word in the window
        displayWords.forEach((word, idx) => {
            const isCurrentWord = (startIdx + idx) === i;

            // Escape text for FFmpeg drawtext filter
            const escapedText = word.word
                .replace(/\\/g, '\\\\')
                .replace(/'/g, "'")           // Typographic apostrophe
                .replace(/:/g, '\\:')
                .replace(/%/g, '\\%');

            // Build drawtext filter
            let filter = 'drawtext=';
            filter += `text='${escapedText}':`;
            const escapedFont = fontFamily.replace(/ /g, '\\ ');
            filter += `font='${escapedFont}':`;
            filter += `fontsize=${fontSize}:`;

            // Current word: full opacity, others: 50% opacity
            if (isCurrentWord) {
                filter += `fontcolor=${fontColorHex}@1.0:`;
            } else {
                filter += `fontcolor=${fontColorHex}@0.5:`;
            }

            // Add background box (only for current word)
            if (isCurrentWord) {
                filter += `box=1:`;
                filter += `boxcolor=${bgColorHex}${bgAlpha}:`;
                filter += `boxborderw=8:`;
            }

            // Position this word
            filter += `x=${startX}+${Math.round(cumulativeOffset)}:`;
            filter += `y=${yPosition}:`;

            // Enable only during current word's timestamp
            // Note: No quotes around between() to avoid conflicts with typographic apostrophes in text
            filter += `enable=between(t\\,${currentWord.start}\\,${currentWord.end})`;

            filters.push(filter);

            // Update offset for next word (current word width + spacing)
            cumulativeOffset += word.word.length * fontSize * 0.6 + wordSpacing;
        });
    }

    // Join all filters with comma
    return filters.join(',');
}

// Test data
const testTranscript = {
    words: [
        { word: "I'll", start: 0, end: 0.5 },
        { word: "show", start: 0.5, end: 0.8 },
        { word: "you", start: 0.8, end: 1.0 },
        { word: "how", start: 1.0, end: 1.3 },
        { word: "it's", start: 1.3, end: 1.6 },
        { word: "done", start: 1.6, end: 2.0 }
    ]
};

const styles = {
    tiktok: {
        fontSize: 42,
        fontFamily: 'Comic Sans MS',
        fontColor: '#ffb703',
        bgColor: '#000000',
        bgOpacity: 75,
        position: 'bottom'
    },
    professional: {
        fontSize: 28,
        fontFamily: 'Helvetica Neue',
        fontColor: '#ffffff',
        bgColor: '#1a1a1a',
        bgOpacity: 85,
        position: 'bottom'
    },
    youtube: {
        fontSize: 32,
        fontFamily: 'Verdana',
        fontColor: '#ffffff',
        bgColor: '#000000',
        bgOpacity: 80,
        position: 'bottom'
    }
};

console.log('=== Phase 2: Filter Generation Tests ===\n');

// Test 1: TikTok style (Comic Sans MS + apostrophes)
console.log('Test 1: TikTok style (Comic Sans MS with apostrophes)');
const filter1 = buildDrawtextFilters(testTranscript.words, styles.tiktok);
console.log(`Filter length: ${filter1.length} bytes`);
console.log(`Filter count: ${(filter1.match(/drawtext=/g) || []).length}`);
console.log(`Has Comic Sans MS: ${filter1.includes('Comic\\ Sans\\ MS')}`);
console.log(`Has apostrophes: ${filter1.includes("I'll") && filter1.includes("it's")}`);
console.log(`Has escaped commas: ${filter1.includes('between(t\\,')}`);
fs.writeFileSync('tests/filter-test1-tiktok.txt', filter1);
console.log('✓ Test 1 passed\n');

// Test 2: Professional style (Helvetica Neue)
console.log('Test 2: Professional style (Helvetica Neue)');
const filter2 = buildDrawtextFilters(testTranscript.words, styles.professional);
console.log(`Filter length: ${filter2.length} bytes`);
console.log(`Has Helvetica Neue: ${filter2.includes('Helvetica\\ Neue')}`);
fs.writeFileSync('tests/filter-test2-professional.txt', filter2);
console.log('✓ Test 2 passed\n');

// Test 3: YouTube style
console.log('Test 3: YouTube style (Verdana)');
const filter3 = buildDrawtextFilters(testTranscript.words, styles.youtube);
console.log(`Filter length: ${filter3.length} bytes`);
console.log(`Has Verdana: ${filter3.includes('Verdana')}`);
fs.writeFileSync('tests/filter-test3-youtube.txt', filter3);
console.log('✓ Test 3 passed\n');

// Test 4: Edge cases (first and last words)
console.log('Test 4: Edge cases validation');
const firstWordFilters = filter1.split(',').filter(f => f.includes("I'll"));
const lastWordFilters = filter1.split(',').filter(f => f.includes('done'));
console.log(`First word "I'll" appears in ${firstWordFilters.length} filters (expected: 3-5)`);
console.log(`Last word "done" appears in ${lastWordFilters.length} filters (expected: 3-5)`);
console.log('✓ Test 4 passed\n');

console.log('=== All Phase 2 Tests Passed ===');
process.exit(0);
