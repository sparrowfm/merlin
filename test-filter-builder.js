/**
 * Extracted filter builder for testing
 * Same logic as main.js buildDrawtextFilters()
 */

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

    // Normalize word timings to eliminate gaps
    const normalizedWords = words.map((word, i) => {
        if (i < words.length - 1) {
            return {
                ...word,
                end: words[i + 1].start
            };
        }
        return word;
    });

    // For each word, create filters showing the 5-word window
    for (let i = 0; i < normalizedWords.length; i++) {
        const currentWord = normalizedWords[i];
        const startIdx = Math.max(0, i - 2);
        const endIdx = Math.min(normalizedWords.length, i + 3);
        const displayWords = normalizedWords.slice(startIdx, endIdx);

        const totalChars = displayWords.reduce((sum, w) => sum + w.word.length, 0);
        const estimatedTotalWidth = totalChars * fontSize * 0.6 + (displayWords.length - 1) * wordSpacing;
        const startX = `(w-${Math.round(estimatedTotalWidth)})/2`;

        let cumulativeOffset = 0;

        displayWords.forEach((word, idx) => {
            const isCurrentWord = (startIdx + idx) === i;

            const escapedText = word.word
                .replace(/\\/g, '\\\\')
                .replace(/'/g, "'")
                .replace(/:/g, '\\:')
                .replace(/%/g, '\\%');

            let filter = 'drawtext=';
            filter += `text='${escapedText}':`;
            const escapedFont = fontFamily.replace(/ /g, '\\ ');
            filter += `font='${escapedFont}':`;
            filter += `fontsize=${fontSize}:`;

            if (isCurrentWord) {
                filter += `fontcolor=${fontColorHex}@1.0:`;
            } else {
                filter += `fontcolor=${fontColorHex}@0.5:`;
            }

            if (isCurrentWord) {
                filter += `box=1:`;
                filter += `boxcolor=${bgColorHex}${bgAlpha}:`;
                filter += `boxborderw=8:`;
            }

            filter += `x=${startX}+${Math.round(cumulativeOffset)}:`;
            filter += `y=${yPosition}:`;
            filter += `enable=between(t\\,${currentWord.start}\\,${currentWord.end})`;

            filters.push(filter);
            cumulativeOffset += word.word.length * fontSize * 0.6 + wordSpacing;
        });
    }

    return filters.join(',');
}

module.exports = buildDrawtextFilters;
