#!/usr/bin/env node
/**
 * Debug script: Analyze filters for gaps that fail
 */

const buildDrawtextFilters = require('../test-filter-builder.js');

// User's actual transcript
const userTranscript = {
    words: [
        { word: "Herman,", start: 0.00, end: 0.60 },   // 0
        { word: "what", start: 0.76, end: 0.84 },      // 1
        { word: "now?", start: 0.84, end: 1.12 },      // 2
        { word: "What", start: 1.38, end: 1.50 },      // 3
        { word: "now?", start: 1.50, end: 1.70 },      // 4 - Gap 3 after this
        { word: "I'll", start: 1.98, end: 2.04 },      // 5
        { word: "tell", start: 2.04, end: 2.12 },      // 6
        { word: "you", start: 2.12, end: 2.24 },       // 7
        { word: "what", start: 2.24, end: 2.38 },      // 8
        { word: "now.", start: 2.38, end: 2.54 },      // 9 - Gap 4 after this
        { word: "My", start: 2.84, end: 2.98 },        // 10
        { word: "entire", start: 2.98, end: 3.20 }     // 11
    ]
};

const style = {
    fontSize: 32,
    fontFamily: 'Arial',
    fontColor: '#ffffff',
    bgColor: '#000000',
    bgOpacity: 80,
    position: 'bottom'
};

console.log('=== Analyzing Gap Filter Generation ===\n');

// Normalize words (as the function does)
const normalizedWords = userTranscript.words.map((word, i) => {
    if (i < userTranscript.words.length - 1) {
        return {
            ...word,
            end: userTranscript.words[i + 1].start
        };
    }
    return word;
});

console.log('Normalized words (gaps filled):');
normalizedWords.forEach((w, i) => {
    const gap = i < normalizedWords.length - 1 ?
        (normalizedWords[i + 1].start - w.end).toFixed(3) : 'N/A';
    console.log(`  ${i}. "${w.word}" [${w.start.toFixed(2)}-${w.end.toFixed(2)}] gap: ${gap}s`);
});

console.log('\n=== Gap Analysis ===');
console.log('Gap 3 at 1.84s should be covered by word 4 "now?" (1.50-1.98)');
console.log('Gap 4 at 2.69s should be covered by word 9 "now." (2.38-2.84)');

console.log('\n=== Analyzing Word 4 Window (Gap 3) ===');
const word4Index = 4;
const word4 = normalizedWords[word4Index];
console.log(`Word 4: "${word4.word}" [${word4.start}-${word4.end}]`);

const startIdx4 = Math.max(0, word4Index - 2);
const endIdx4 = Math.min(normalizedWords.length, word4Index + 3);
const displayWords4 = normalizedWords.slice(startIdx4, endIdx4);

console.log(`5-word window: indices ${startIdx4} to ${endIdx4 - 1}`);
console.log('Display words:');
displayWords4.forEach((w, idx) => {
    const isCurrentWord = (startIdx4 + idx) === word4Index;
    console.log(`  ${startIdx4 + idx}. "${w.word}" [${w.start}-${w.end}] ${isCurrentWord ? '← CURRENT' : ''}`);
});
console.log(`All these filters will have: enable=between(t,${word4.start},${word4.end})`);
console.log(`At time 1.84s: between(1.84, ${word4.start}, ${word4.end}) = ${1.84 >= word4.start && 1.84 <= word4.end ? 'TRUE' : 'FALSE'}`);

console.log('\n=== Analyzing Word 9 Window (Gap 4) ===');
const word9Index = 9;
const word9 = normalizedWords[word9Index];
console.log(`Word 9: "${word9.word}" [${word9.start}-${word9.end}]`);

const startIdx9 = Math.max(0, word9Index - 2);
const endIdx9 = Math.min(normalizedWords.length, word9Index + 3);
const displayWords9 = normalizedWords.slice(startIdx9, endIdx9);

console.log(`5-word window: indices ${startIdx9} to ${endIdx9 - 1}`);
console.log('Display words:');
displayWords9.forEach((w, idx) => {
    const isCurrentWord = (startIdx9 + idx) === word9Index;
    console.log(`  ${startIdx9 + idx}. "${w.word}" [${w.start}-${w.end}] ${isCurrentWord ? '← CURRENT' : ''}`);
});
console.log(`All these filters will have: enable=between(t,${word9.start},${word9.end})`);
console.log(`At time 2.69s: between(2.69, ${word9.start}, ${word9.end}) = ${2.69 >= word9.start && 2.69 <= word9.end ? 'TRUE' : 'FALSE'}`);

console.log('\n=== Building Actual Filters ===');
const filterStr = buildDrawtextFilters(userTranscript.words, style);
const filters = filterStr.split(',');

console.log(`Total filters generated: ${filters.length}`);
console.log('\nFilters for word 4 window (should cover 1.84s):');
const word4Filters = filters.filter(f => f.includes(`enable=between(t\\,${word4.start}\\,${word4.end})`));
console.log(`Found ${word4Filters.length} filters with enable=between(t,${word4.start},${word4.end})`);
if (word4Filters.length > 0) {
    console.log('First filter:', word4Filters[0].substring(0, 150) + '...');
}

console.log('\nFilters for word 9 window (should cover 2.69s):');
const word9Filters = filters.filter(f => f.includes(`enable=between(t\\,${word9.start}\\,${word9.end})`));
console.log(`Found ${word9Filters.length} filters with enable=between(t,${word9.start},${word9.end})`);
if (word9Filters.length > 0) {
    console.log('First filter:', word9Filters[0].substring(0, 150) + '...');
}

console.log('\n=== Checking All Time Coverage ===');
// Check what filters cover times 1.84s and 2.69s
const time1 = 1.84;
const time2 = 2.69;

console.log(`\nFilters active at ${time1}s:`);
let count1 = 0;
for (const filter of filters) {
    const match = filter.match(/enable=between\(t\\,([0-9.]+)\\,([0-9.]+)\)/);
    if (match) {
        const start = parseFloat(match[1]);
        const end = parseFloat(match[2]);
        if (time1 >= start && time1 <= end) {
            count1++;
            if (count1 <= 3) {
                console.log(`  ${filter.substring(0, 100)}...`);
            }
        }
    }
}
console.log(`Total: ${count1} filters`);

console.log(`\nFilters active at ${time2}s:`);
let count2 = 0;
for (const filter of filters) {
    const match = filter.match(/enable=between\(t\\,([0-9.]+)\\,([0-9.]+)\)/);
    if (match) {
        const start = parseFloat(match[1]);
        const end = parseFloat(match[2]);
        if (time2 >= start && time2 <= end) {
            count2++;
            if (count2 <= 3) {
                console.log(`  ${filter.substring(0, 100)}...`);
            }
        }
    }
}
console.log(`Total: ${count2} filters`);

if (count1 === 0) {
    console.log(`\n✗ NO FILTERS ACTIVE AT ${time1}s - This explains Gap 3 failure!`);
} else {
    console.log(`\n✓ ${count1} filters active at ${time1}s`);
}

if (count2 === 0) {
    console.log(`✗ NO FILTERS ACTIVE AT ${time2}s - This explains Gap 4 failure!`);
} else {
    console.log(`✓ ${count2} filters active at ${time2}s`);
}
