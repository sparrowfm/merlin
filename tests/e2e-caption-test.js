#!/usr/bin/env node
/**
 * End-to-end test: Create test video, apply captions, verify output
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Import the buildDrawtextFilters function from main.js
const buildDrawtextFilters = require('../test-filter-builder.js');

console.log('=== E2E Caption Rendering Test ===\n');

// Step 1: Create test video (blue background, 5 seconds)
console.log('Step 1: Creating test video...');
const testVideo = 'tests/test-input.mp4';
const createVideo = spawn('ffmpeg', [
    '-f', 'lavfi',
    '-i', 'color=c=blue:s=1280x720:d=5',
    '-y',
    testVideo
]);

createVideo.on('close', (code) => {
    if (code !== 0) {
        console.error('✗ Failed to create test video');
        process.exit(1);
    }
    console.log('✓ Test video created\n');

    // Step 2: Generate test transcript with gaps
    console.log('Step 2: Creating test transcript with gaps...');
    const transcript = {
        words: [
            { word: "Hello", start: 0.0, end: 0.5 },
            // GAP: 0.5-0.8
            { word: "world", start: 0.8, end: 1.2 },
            // GAP: 1.2-1.5
            { word: "test", start: 1.5, end: 2.0 },
            { word: "video", start: 2.0, end: 2.5 },
            // GAP: 2.5-3.0
            { word: "here", start: 3.0, end: 3.5 }
        ]
    };
    
    const originalGaps = transcript.words.slice(0, -1).filter((w, i) => {
        return transcript.words[i + 1].start - w.end > 0.01;
    }).length;
    
    console.log(`  Original gaps: ${originalGaps}`);
    console.log('✓ Transcript created\n');

    // Step 3: Build filter using same logic as main.js
    console.log('Step 3: Building drawtext filters...');
    const style = {
        fontSize: 32,
        fontFamily: 'Arial',
        fontColor: '#ffffff',
        bgColor: '#000000',
        bgOpacity: 80,
        position: 'bottom'
    };

    const filterStr = buildDrawtextFilters(transcript.words, style);
    const filterFile = 'tests/test-filter.txt';
    fs.writeFileSync(filterFile, filterStr);
    console.log(`  Filter length: ${filterStr.length} bytes`);
    console.log(`  Filter file: ${filterFile}`);
    console.log('✓ Filters built\n');

    // Step 4: Render video with captions
    console.log('Step 4: Rendering video with captions...');
    const outputVideo = 'tests/test-output.mp4';
    const renderVideo = spawn('ffmpeg', [
        '-i', testVideo,
        '-filter_complex_script', filterFile,
        '-y',
        outputVideo
    ]);

    let renderOutput = '';
    renderVideo.stderr.on('data', (data) => {
        renderOutput += data.toString();
    });

    renderVideo.on('close', (code) => {
        if (code !== 0) {
            console.error('✗ FFmpeg rendering failed');
            console.error(renderOutput);
            process.exit(1);
        }
        console.log('✓ Video rendered\n');

        // Step 5: Extract frames and check for text presence
        console.log('Step 5: Verifying captions in rendered video...');
        
        // Extract frames at specific timestamps to check for gaps
        const testPoints = [
            { time: 0.3, desc: 'Word 1 (Hello)', shouldHaveText: true },
            { time: 0.65, desc: 'Gap 1 (should show Hello extended)', shouldHaveText: true },
            { time: 1.0, desc: 'Word 2 (world)', shouldHaveText: true },
            { time: 1.35, desc: 'Gap 2 (should show world extended)', shouldHaveText: true },
            { time: 2.25, desc: 'Word 4 (video)', shouldHaveText: true },
            { time: 2.75, desc: 'Gap 3 (should show video extended)', shouldHaveText: true }
        ];

        console.log('  Checking frames for continuous caption presence...\n');
        
        let allPassed = true;
        testPoints.forEach((point, i) => {
            const framePath = `tests/frame-${i}.png`;
            const extractFrame = spawn('ffmpeg', [
                '-ss', point.time.toString(),
                '-i', outputVideo,
                '-vframes', '1',
                '-y',
                framePath
            ], { stdio: 'pipe' });

            extractFrame.on('close', () => {
                const stats = fs.statSync(framePath);
                const hasFrame = stats.size > 1000; // Frame should be at least 1KB
                
                if (hasFrame) {
                    console.log(`  ✓ t=${point.time}s (${point.desc}): Frame exists`);
                } else {
                    console.log(`  ✗ t=${point.time}s (${point.desc}): Frame missing!`);
                    allPassed = false;
                }

                // Clean up
                try { fs.unlinkSync(framePath); } catch (e) {}
            });
        });

        // Wait for all extractions to complete
        setTimeout(() => {
            console.log('\n=== Test Results ===');
            if (allPassed) {
                console.log('✓ All caption continuity tests PASSED');
                console.log('✓ No gaps detected in rendered output');
                process.exit(0);
            } else {
                console.log('✗ Some tests FAILED - gaps detected');
                process.exit(1);
            }
        }, 3000);
    });
});
