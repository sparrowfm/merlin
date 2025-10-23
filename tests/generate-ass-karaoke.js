#!/usr/bin/env node
/**
 * Generate ASS subtitle file with karaoke timing
 * This replaces the 165-filter drawtext approach
 */

function secondsToAssTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const cs = Math.round((seconds % 1) * 100);

    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function toCentiseconds(durationSeconds) {
    return Math.max(1, Math.round(durationSeconds * 100));
}

function generateAssKaraoke(words, style = {}) {
    const fontSize = style.fontSize || 64;
    const fontFamily = style.fontFamily || 'Arial';
    const position = style.position || 'bottom';

    // Calculate alignment and margin
    let alignment = 2; // bottom center
    let marginV = 120;
    if (position === 'top') {
        alignment = 8; // top center
        marginV = 120;
    } else if (position === 'middle') {
        alignment = 5; // middle center
        marginV = 0;
    }

    // ASS color format: &HAABBGGRR (alpha, blue, green, red in hex)
    // Dimmed text: 50% opacity white = &HAAFFFFFF (AA = 170 = ~66% opacity for better visibility)
    // Highlighted: 100% opacity white = &H00FFFFFF

    const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Base,${fontFamily},${fontSize},&H80FFFFFF,&H80FFFFFF,&H00000000,&HC8000000,-1,0,0,0,100,100,0,0,1,3,2,${alignment},120,120,${marginV},1
Style: Highlight,${fontFamily},${fontSize},&H00FFFFFF,&H00FFFFFF,&H00000000,&HC8000000,-1,0,0,0,100,100,0,0,1,3,2,${alignment},120,120,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

    const events = [];

    // For karaoke effect, we need to create events for sentence-like chunks
    // For simplicity with word-level timing, we'll create overlapping base + highlight

    const startTime = words[0].start;
    const endTime = words[words.length - 1].end;

    // Base layer: all words dimmed (shown throughout)
    const baseText = words.map(w => w.word).join(' ');
    events.push(`Dialogue: 0,${secondsToAssTime(startTime)},${secondsToAssTime(endTime)},Base,,0,0,0,,${baseText}`);

    // Highlight layer: karaoke timing with \k tags
    // \k duration advances to next word after 'duration' centiseconds
    const karaokeText = words.map(w => {
        const duration = toCentiseconds(w.end - w.start);
        // Escape special ASS characters
        const text = w.word.replace(/\\/g, '\\\\').replace(/{/g, '\\{').replace(/}/g, '\\}');
        return `{\\k${duration}}${text}`;
    }).join(' ');

    events.push(`Dialogue: 1,${secondsToAssTime(startTime)},${secondsToAssTime(endTime)},Highlight,,0,0,0,,${karaokeText}`);

    return header + '\n' + events.join('\n') + '\n';
}

// Test with user's actual transcript
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

const style = {
    fontSize: 64,
    fontFamily: 'Arial',
    fontColor: '#ffffff',
    bgColor: '#000000',
    bgOpacity: 80,
    position: 'bottom'
};

const assContent = generateAssKaraoke(userTranscript.words, style);

console.log('=== Generated ASS Subtitle ===\n');
console.log(assContent);
console.log('\n=== Writing to file ===');

const fs = require('fs');
fs.writeFileSync('tests/karaoke.ass', assContent);
console.log('✓ Written to tests/karaoke.ass');

module.exports = generateAssKaraoke;
