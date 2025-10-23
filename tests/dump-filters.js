#!/usr/bin/env node
/**
 * Dump actual filters to see what's being generated
 */

const buildDrawtextFilters = require('../test-filter-builder.js');

const userTranscript = {
    words: [
        { word: "Herman,", start: 0.00, end: 0.60 },
        { word: "what", start: 0.76, end: 0.84 },
        { word: "now?", start: 0.84, end: 1.12 },
        { word: "What", start: 1.38, end: 1.50 },
        { word: "now?", start: 1.50, end: 1.70 },   // Word 4
        { word: "I'll", start: 1.98, end: 2.04 },
        { word: "tell", start: 2.04, end: 2.12 },
        { word: "you", start: 2.12, end: 2.24 },
        { word: "what", start: 2.24, end: 2.38 },
        { word: "now.", start: 2.38, end: 2.54 },   // Word 9
        { word: "My", start: 2.84, end: 2.98 },
        { word: "entire", start: 2.98, end: 3.20 }
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

const filterStr = buildDrawtextFilters(userTranscript.words, style);
const filters = filterStr.split(',');

console.log('=== Filter Dump ===');
console.log(`Total filters: ${filters.length}\n`);

// Find all unique enable patterns
// Don't split by comma - analyze the full filter string
const fullFilter = buildDrawtextFilters(userTranscript.words, style);
const enablePatterns = new Set();
const enableRegex = /enable=between\(t\\,([0-9.]+)\\,([0-9.]+)\)/g;
let match;
while ((match = enableRegex.exec(fullFilter)) !== null) {
    enablePatterns.add(`${match[1]}-${match[2]}`);
}

console.log('Unique enable time ranges:');
Array.from(enablePatterns).sort().forEach(p => {
    console.log(`  ${p}`);
});

console.log('\n=== Looking for filters around problem times ===');
console.log('Word 4 "now?" should have filters: 1.5-1.98');
console.log('Word 9 "now." should have filters: 2.38-2.84');

console.log('\nFilters with enable times in range 1.4-2.0:');
let count1 = 0;
enableRegex.lastIndex = 0; // Reset regex
while ((match = enableRegex.exec(fullFilter)) !== null) {
    const start = parseFloat(match[1]);
    const end = parseFloat(match[2]);
    if (start >= 1.4 && start <= 2.0) {
        count1++;
        console.log(`  enable=between(t,${start},${end})`);
    }
}
if (count1 === 0) {
    console.log('  None found');
}

console.log('\nFilters with enable times in range 2.3-2.9:');
let count2 = 0;
enableRegex.lastIndex = 0; // Reset regex
while ((match = enableRegex.exec(fullFilter)) !== null) {
    const start = parseFloat(match[1]);
    const end = parseFloat(match[2]);
    if (start >= 2.3 && start <= 2.9) {
        count2++;
        console.log(`  enable=between(t,${start},${end})`);
    }
}
if (count2 === 0) {
    console.log('  None found');
}
