#!/usr/bin/env node
/**
 * Test that gap-filling works correctly
 */

// Test data with gaps
const wordsWithGaps = [
    { word: "Hello", start: 0.0, end: 0.5 },    // Gap: 0.5-0.7
    { word: "world", start: 0.7, end: 1.2 },   // Gap: 1.2-1.5
    { word: "test", start: 1.5, end: 2.0 }
];

// Normalize (fill gaps)
const normalized = wordsWithGaps.map((word, i) => {
    if (i < wordsWithGaps.length - 1) {
        return {
            ...word,
            end: wordsWithGaps[i + 1].start
        };
    }
    return word;
});

console.log('Original words (with gaps):');
wordsWithGaps.forEach((w, i) => {
    const gap = i < wordsWithGaps.length - 1 ? 
        (wordsWithGaps[i + 1].start - w.end).toFixed(2) : 'N/A';
    console.log(`  ${w.word}: ${w.start}-${w.end} (gap to next: ${gap}s)`);
});

console.log('\nNormalized words (gaps filled):');
normalized.forEach((w, i) => {
    const gap = i < normalized.length - 1 ? 
        (normalized[i + 1].start - w.end).toFixed(2) : 'N/A';
    console.log(`  ${w.word}: ${w.start}-${w.end} (gap to next: ${gap}s)`);
});

// Verify no gaps
let hasGaps = false;
for (let i = 0; i < normalized.length - 1; i++) {
    if (normalized[i].end !== normalized[i + 1].start) {
        console.error(`ERROR: Gap found between word ${i} and ${i+1}`);
        hasGaps = true;
    }
}

if (!hasGaps) {
    console.log('\n✓ No gaps in normalized timing!');
    process.exit(0);
} else {
    console.log('\n✗ Gaps still exist!');
    process.exit(1);
}
