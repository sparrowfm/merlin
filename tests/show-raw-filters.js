#!/usr/bin/env node
/**
 * Show raw filter output to see actual format
 */

const buildDrawtextFilters = require('../test-filter-builder.js');

const userTranscript = {
    words: [
        { word: "Herman,", start: 0.00, end: 0.60 },
        { word: "what", start: 0.76, end: 0.84 },
        { word: "now?", start: 0.84, end: 1.12 },
        { word: "What", start: 1.38, end: 1.50 },
        { word: "now?", start: 1.50, end: 1.70 },
        { word: "I'll", start: 1.98, end: 2.04 }
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

console.log('=== First 5 Filters (Raw) ===\n');
filters.slice(0, 5).forEach((f, i) => {
    console.log(`Filter ${i}:`);
    console.log(f);
    console.log('');
});

console.log(`\n=== Filter 20-25 ===\n`);
filters.slice(20, 25).forEach((f, i) => {
    console.log(`Filter ${20 + i}:`);
    console.log(f);
    console.log('');
});

console.log(`\n=== Last 5 Filters ===\n`);
filters.slice(-5).forEach((f, i) => {
    console.log(`Filter ${filters.length - 5 + i}:`);
    console.log(f);
    console.log('');
});
