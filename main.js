/**
 * Merlin - Electron Main Process
 * Minimal Electron wrapper for Whisper + FFmpeg
 */

const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        title: 'Merlin - Precision Video Captions',
        backgroundColor: '#f5f5f5'
    });

    mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function createMenu() {
    const template = [
        {
            label: 'Merlin',
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectAll' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Check for Updates',
                    click: async () => {
                        await shell.openExternal('https://github.com/sparrowfm/merlin/releases');
                    }
                },
                { type: 'separator' },
                {
                    label: 'View on GitHub',
                    click: async () => {
                        await shell.openExternal('https://github.com/sparrowfm/merlin');
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
    createWindow();
    createMenu();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC Handlers

/**
 * Transcribe video using Whisper
 */
ipcMain.handle('transcribe-video', async (event, videoPath) => {
    return new Promise((resolve, reject) => {
        console.log('Starting transcription:', videoPath);

        // Extract audio from video first using FFmpeg
        const audioPath = videoPath.replace(/\.[^.]+$/, '.wav');

        const ffmpeg = spawn('ffmpeg', [
            '-i', videoPath,
            '-ar', '16000',  // Whisper expects 16kHz
            '-ac', '1',      // Mono
            '-y',            // Overwrite
            audioPath
        ]);

        ffmpeg.on('close', (code) => {
            if (code !== 0) {
                reject(new Error('FFmpeg audio extraction failed'));
                return;
            }

            // Run Whisper with word-level timestamps
            const whisper = spawn('whisper', [
                audioPath,
                '--model', 'base',
                '--language', 'en',
                '--output_format', 'json',
                '--word_timestamps', 'True',
                '--output_dir', path.dirname(audioPath)
            ]);

            let output = '';

            whisper.stdout.on('data', (data) => {
                output += data.toString();
                // Send progress to renderer
                event.sender.send('transcription-progress', {
                    message: data.toString()
                });
            });

            whisper.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error('Whisper transcription failed'));
                    return;
                }

                // Read the JSON output
                const jsonPath = audioPath.replace('.wav', '.json');
                try {
                    const transcript = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

                    // Extract word-level timestamps
                    const words = [];
                    for (const segment of transcript.segments) {
                        if (segment.words) {
                            for (const word of segment.words) {
                                words.push({
                                    word: word.word.trim(),
                                    start: word.start,
                                    end: word.end,
                                    confidence: word.probability || 1.0
                                });
                            }
                        }
                    }

                    // Debug: Log word timeline
                    console.log('\n=== Word Timeline ===');
                    words.forEach((w, i) => {
                        const gap = i < words.length - 1 ?
                            (words[i + 1].start - w.end).toFixed(2) : 'N/A';
                        console.log(`${i + 1}. "${w.word}" [${w.start.toFixed(2)}-${w.end.toFixed(2)}] gap: ${gap}s`);
                    });
                    console.log('===================\n');

                    // Clean up temporary files
                    try {
                        fs.unlinkSync(audioPath);
                        fs.unlinkSync(jsonPath);
                    } catch (e) {
                        console.warn('Failed to clean up temp files:', e);
                    }

                    resolve({ words });
                } catch (e) {
                    reject(new Error('Failed to parse Whisper output: ' + e.message));
                }
            });
        });
    });
});

/**
 * Render video with captions using ASS subtitles (libass)
 * Much more stable than 165 overlapping drawtext filters
 */
ipcMain.handle('render-video', async (event, { videoPath, transcript, style, outputPath }) => {
    return new Promise((resolve, reject) => {
        console.log('Starting video rendering:', outputPath);

        // Build ASS subtitle with karaoke timing
        const assContent = buildAssSubtitle(transcript.words, style);

        // Write ASS to temporary file
        const assPath = videoPath.replace(/\.[^.]+$/, '_captions.ass');
        fs.writeFileSync(assPath, assContent);
        console.log('ASS subtitle written to:', assPath);
        console.log('ASS content length:', assContent.length, 'bytes');

        const ffmpeg = spawn('ffmpeg', [
            '-i', videoPath,
            '-vf', `subtitles=${assPath}`,
            '-c:a', 'copy',      // Copy audio without re-encoding
            '-y',                // Overwrite
            outputPath
        ]);

        let errorOutput = '';

        ffmpeg.stderr.on('data', (data) => {
            const output = data.toString();
            errorOutput += output;

            // Log FFmpeg output for debugging
            console.log('FFmpeg:', output);

            // Parse progress from FFmpeg output
            const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2})/);
            if (timeMatch) {
                const seconds = parseInt(timeMatch[1]) * 3600 +
                    parseInt(timeMatch[2]) * 60 +
                    parseInt(timeMatch[3]);

                event.sender.send('render-progress', {
                    seconds,
                    message: output
                });
            }
        });

        ffmpeg.on('close', (code) => {
            // Clean up ASS file
            try {
                fs.unlinkSync(assPath);
            } catch (e) {
                console.warn('Failed to clean up ASS file:', e);
            }

            if (code !== 0) {
                console.error('FFmpeg failed with code:', code);
                console.error('Full error output:', errorOutput);
                reject(new Error('FFmpeg rendering failed: ' + errorOutput.substring(0, 500)));
                return;
            }

            resolve({ outputPath });
        });
    });
});

/**
 * Build ASS subtitle file with karaoke timing
 * Much more reliable than 165+ overlapping drawtext filters
 * Uses libass \k tags for word-by-word highlighting
 */
function buildAssSubtitle(words, style) {
    const fontSize = style.fontSize || 64;
    const fontFamily = style.fontFamily || 'Arial';
    const position = style.position || 'bottom';

    // Calculate alignment and margin based on position
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
    // Convert user's hex colors to ASS format
    function hexToAssColor(hexColor, alpha = 0) {
        const hex = hexColor.replace('#', '');
        const r = hex.substring(0, 2);
        const g = hex.substring(2, 4);
        const b = hex.substring(4, 6);
        const a = alpha.toString(16).padStart(2, '0');
        return `&H${a}${b}${g}${r}`.toUpperCase();
    }

    const fontColor = style.fontColor || '#ffffff';
    const bgColor = style.bgColor || '#000000';
    const bgOpacity = style.bgOpacity !== undefined ? style.bgOpacity : 80;
    const bgAlpha = Math.round((1 - bgOpacity / 100) * 255); // ASS uses inverse (0=opaque, FF=transparent)

    const assFontColor = hexToAssColor(fontColor, 0);  // Full opacity for text
    const assBgColor = hexToAssColor(bgColor, bgAlpha);  // Opacity from bgOpacity

    console.log(`\n=== ASS Color Conversion ===`);
    console.log(`Font: ${fontColor} -> ${assFontColor}`);
    console.log(`Background: ${bgColor} (${bgOpacity}% opacity) -> ${assBgColor}`);
    console.log(`============================\n`);

    const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontFamily},${fontSize},${assFontColor},${assFontColor},&H00000000,${assBgColor},-1,0,0,0,100,100,0,0,4,0,10,${alignment},20,20,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

    const startTime = words[0].start;
    const endTime = words[words.length - 1].end;

    // Helper: convert seconds to ASS time format (H:MM:SS.CS)
    function toAssTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const cs = Math.round((seconds % 1) * 100);
        return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
    }

    // Helper: convert duration to centiseconds
    function toCentiseconds(dur) {
        return Math.max(1, Math.round(dur * 100));
    }

    const events = [];

    // Normalize word timings to eliminate gaps (extend each word's end to next word's start)
    const normalizedWords = words.map((word, i) => {
        if (i < words.length - 1) {
            return {
                ...word,
                end: words[i + 1].start
            };
        }
        return word;
    });

    // Generate separate events for each word's 5-word window
    // Uses inline color overrides for proper highlighting
    for (let i = 0; i < normalizedWords.length; i++) {
        const currentWord = normalizedWords[i];

        // Calculate 5-word window (current + 2 before + 2 after)
        const startIdx = Math.max(0, i - 2);
        const endIdx = Math.min(normalizedWords.length, i + 3);
        const displayWords = normalizedWords.slice(startIdx, endIdx);

        // Build text with inline color overrides
        // Use \1a to only affect text alpha, not background alpha
        // Current word at full opacity (\1a&H00), others at 50% (\1a&H80)
        const currentWordInWindow = i - startIdx;
        const styledText = displayWords.map((w, idx) => {
            const text = w.word.replace(/\\/g, '\\\\').replace(/{/g, '\\{').replace(/}/g, '\\}');
            if (idx === currentWordInWindow) {
                // Current word: full opacity, no override (uses style default)
                return text;
            } else {
                // Other words: 50% opacity (text only, background stays opaque)
                return `{\\1a&H80&}${text}{\\1a&H00&}`;
            }
        }).join(' ');

        // Single event with inline styling
        events.push(`Dialogue: 0,${toAssTime(currentWord.start)},${toAssTime(currentWord.end)},Default,,0,0,0,,${styledText}`);
    }

    console.log('\n=== ASS Subtitle Generated (5-word window) ===');
    console.log(`Words: ${words.length}`);
    console.log(`Events: ${events.length} dialogue lines`);
    console.log(`Duration: ${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`);
    console.log('===================\n');

    return header + '\n' + events.join('\n') + '\n';
}

/**
 * Convert hex color to BGR for FFmpeg (kept for potential future use)
 */
function hexToBGR(hex) {
    const r = hex.slice(1, 3);
    const g = hex.slice(3, 5);
    const b = hex.slice(5, 7);
    return b + g + r;  // Reverse to BGR
}
