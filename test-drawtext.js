/**
 * Test drawtext filter generation
 */

// Sample words
const words = [
    { word: 'Hello', start: 0.0, end: 0.5 },
    { word: 'World', start: 0.5, end: 1.0 },
    { word: 'Test', start: 1.0, end: 1.5 },
    { word: 'Caption', start: 1.5, end: 2.0 },
    { word: 'Here', start: 2.0, end: 2.5 }
];

const style = {
    fontSize: 32,
    fontFamily: 'Arial',
    fontColor: '#ffffff',
    bgColor: '#000000',
    bgOpacity: 80,
    position: 'bottom'
};

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
    const wordSpacing = fontSize * 0.3; // Space between words

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

            // Escape text for FFmpeg
            const escapedText = word.word
                .replace(/\\/g, '\\\\')
                .replace(/'/g, "\\\\'")
                .replace(/:/g, '\\:');

            // Build drawtext filter
            let filter = 'drawtext=';
            filter += `text='${escapedText}':`;
            filter += `font='${fontFamily}':`;
            filter += `fontsize=${fontSize}:`;

            // Current word: full opacity, others: 50% opacity
            if (isCurrentWord) {
                filter += `fontcolor=${fontColorHex}@1.0:`;
            } else {
                filter += `fontcolor=${fontColorHex}@0.5:`;
            }

            // Add background box (only for current word to highlight it)
            if (isCurrentWord) {
                filter += `box=1:`;
                filter += `boxcolor=${bgColorHex}${bgAlpha}:`;
                filter += `boxborderw=8:`;
            }

            // Position this word
            filter += `x=${startX}+${Math.round(cumulativeOffset)}:`;
            filter += `y=${yPosition}:`;

            // Enable only during current word's timestamp
            filter += `enable='between(t,${currentWord.start},${currentWord.end})'`;

            filters.push(filter);

            // Update offset for next word (current word width + spacing)
            cumulativeOffset += word.word.length * fontSize * 0.6 + wordSpacing;
        });
    }

    // Join all filters with comma
    return filters.join(',');
}

const result = buildDrawtextFilters(words, style);
console.log('\n=== Generated Filter ===');
console.log(result);
console.log('\n=== Filter Stats ===');
console.log('Length:', result.length);
console.log('Number of filters:', result.split(',').length);

// Test with FFmpeg
console.log('\n=== Test Command ===');
console.log(`ffmpeg -f lavfi -i color=c=blue:s=1280x720:d=3 -vf "${result}" -t 3 test-output.mp4`);
