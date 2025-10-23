#!/usr/bin/env node
/**
 * TDD: Test with ACTUAL user transcript to reproduce the gap issue
 */

const buildDrawtextFilters = require('../test-filter-builder.js');
const { spawn } = require('child_process');
const fs = require('fs');

// ACTUAL transcript from user's video (from console log)
const userTranscript = {
    words: [
        { word: "Herman,", start: 0.00, end: 0.60 },
        { word: "what", start: 0.76, end: 0.84 },
        { word: "now?", start: 0.84, end: 1.12 },
        { word: "What", start: 1.38, end: 1.50 },
        { word: "now?", start: 1.50, end: 1.70 },
        { word: "I'll", start: 1.98, end: 2.04 },
        { word: "tell", start: 2.04, end: 2.12 },
        { word: "you", start: 2.12, end: 2.24 },
        { word: "what", start: 2.24, end: 2.38 },
        { word: "now.", start: 2.38, end: 2.54 },
        { word: "My", start: 2.84, end: 2.98 },
        { word: "entire", start: 2.98, end: 3.20 }
    ]
};

console.log('=== TDD: Testing User\'s Actual Transcript ===\n');

// Identify gaps in original transcript
const gaps = [];
for (let i = 0; i < userTranscript.words.length - 1; i++) {
    const gap = userTranscript.words[i + 1].start - userTranscript.words[i].end;
    if (gap > 0.01) {
        gaps.push({
            afterWord: i,
            gapStart: userTranscript.words[i].end,
            gapEnd: userTranscript.words[i + 1].start,
            duration: gap
        });
    }
}

console.log(`Found ${gaps.length} gaps in original transcript:`);
gaps.forEach(g => {
    console.log(`  Gap after word ${g.afterWord + 1}: ${g.gapStart.toFixed(2)}s - ${g.gapEnd.toFixed(2)}s (${(g.duration * 1000).toFixed(0)}ms)`);
});
console.log('');

// Generate filter with gap-filling
const style = {
    fontSize: 32,
    fontFamily: 'Arial',
    fontColor: '#ffffff',
    bgColor: '#000000',
    bgOpacity: 80,
    position: 'bottom'
};

console.log('Building filter with gap-filling logic...');
const filter = buildDrawtextFilters(userTranscript.words, style);
fs.writeFileSync('tests/user-filter.txt', filter);
console.log(`Filter generated: ${filter.length} bytes\n`);

// Create test video
console.log('Creating test video (10s)...');
const createVideo = spawn('ffmpeg', [
    '-f', 'lavfi',
    '-i', 'color=c=blue:s=1280x720:d=10',
    '-y',
    'tests/user-test-input.mp4'
], { stdio: 'pipe' });

createVideo.on('close', () => {
    console.log('✓ Test video created\n');

    // Render with captions
    console.log('Rendering with captions...');
    const render = spawn('ffmpeg', [
        '-i', 'tests/user-test-input.mp4',
        '-filter_complex_script', 'tests/user-filter.txt',
        '-y',
        'tests/user-test-output.mp4'
    ], { stdio: 'pipe' });

    render.on('close', (code) => {
        if (code !== 0) {
            console.error('✗ Rendering failed');
            process.exit(1);
        }
        console.log('✓ Rendered\n');

        // Test each gap by extracting frames
        console.log('Testing gap timestamps...\n');
        
        let allPassed = true;
        let tested = 0;
        
        gaps.forEach((gap, i) => {
            // Extract frame in middle of gap
            const testTime = (gap.gapStart + gap.gapEnd) / 2;
            const framePath = `tests/gap-frame-${i}.png`;
            
            const extract = spawn('ffmpeg', [
                '-ss', testTime.toString(),
                '-i', 'tests/user-test-output.mp4',
                '-vframes', '1',
                '-y',
                framePath
            ], { stdio: 'pipe' });

            extract.on('close', () => {
                tested++;
                const size = fs.statSync(framePath).size;
                
                // Background-only frame is ~4-5KB, with text is 15KB+
                const hasText = size > 8000;
                
                if (hasText) {
                    console.log(`  ✓ Gap ${i + 1} at ${testTime.toFixed(2)}s: HAS TEXT (${(size/1024).toFixed(1)}KB)`);
                } else {
                    console.log(`  ✗ Gap ${i + 1} at ${testTime.toFixed(2)}s: NO TEXT (${(size/1024).toFixed(1)}KB) - FAILED!`);
                    allPassed = false;
                }

                fs.unlinkSync(framePath);

                // Check if all tested
                if (tested === gaps.length) {
                    console.log('\n=== Results ===');
                    if (allPassed) {
                        console.log('✓ ALL GAPS FILLED - Test PASSED');
                        process.exit(0);
                    } else {
                        console.log('✗ GAPS STILL EXIST - Test FAILED');
                        console.log('\nThis reproduces the user\'s issue!');
                        process.exit(1);
                    }
                }
            });
        });
    });
});
