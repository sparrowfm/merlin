/**
 * Merlin - Electron Main Process
 * Minimal Electron wrapper for Whisper + FFmpeg
 */

const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const os = require('os');

let mainWindow;

/**
 * Find command in common paths (for GUI apps that don't have full PATH)
 */
function findCommand(command) {
    const commonPaths = [
        `/opt/homebrew/bin/${command}`,     // Apple Silicon Homebrew
        `/usr/local/bin/${command}`,        // Intel Homebrew
        `/usr/bin/${command}`,              // System
        command                             // Try PATH as fallback
    ];

    for (const cmdPath of commonPaths) {
        try {
            if (fs.existsSync(cmdPath)) {
                return cmdPath;
            }
        } catch (e) {
            // Continue to next path
        }
    }

    // Last resort: try 'which' command
    try {
        const result = execSync(`which ${command}`, { encoding: 'utf8' }).trim();
        if (result) return result;
    } catch (e) {
        // Command not found
    }

    return command; // Return original if not found (will fail with helpful error)
}

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
        // Use temp directory instead of downloads folder
        const videoBasename = path.basename(videoPath, path.extname(videoPath));
        const tempDir = os.tmpdir();
        const audioPath = path.join(tempDir, `${videoBasename}_${Date.now()}.wav`);

        const ffmpegPath = findCommand('ffmpeg');
        console.log('Using FFmpeg at:', ffmpegPath);

        const ffmpeg = spawn(ffmpegPath, [
            '-i', videoPath,
            '-ar', '16000',  // Whisper expects 16kHz
            '-ac', '1',      // Mono
            '-y',            // Overwrite
            '-progress', 'pipe:2',  // Send progress to stderr
            audioPath
        ]);

        let videoDuration = 0;
        let lastExtractProgress = 0;

        ffmpeg.stderr.on('data', (data) => {
            const output = data.toString();

            // Parse video duration from FFmpeg output
            const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
            if (durationMatch && videoDuration === 0) {
                const hours = parseInt(durationMatch[1]);
                const minutes = parseInt(durationMatch[2]);
                const seconds = parseFloat(durationMatch[3]);
                videoDuration = hours * 3600 + minutes * 60 + seconds;
                console.log('Video duration:', videoDuration, 'seconds');
            }

            // Parse progress from FFmpeg output
            const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
            if (timeMatch && videoDuration > 0) {
                const hours = parseInt(timeMatch[1]);
                const minutes = parseInt(timeMatch[2]);
                const seconds = parseFloat(timeMatch[3]);
                const currentTime = hours * 3600 + minutes * 60 + seconds;
                const progress = Math.min(25, Math.round((currentTime / videoDuration) * 25));

                // Only send updates when progress changes
                if (progress > lastExtractProgress) {
                    lastExtractProgress = progress;
                    event.sender.send('transcription-progress', {
                        progress: progress,
                        message: 'Extracting audio...'
                    });
                    console.log('Audio extraction progress:', progress + '%');
                }
            }
        });

        ffmpeg.on('close', (code) => {
            if (code !== 0) {
                reject(new Error('FFmpeg audio extraction failed'));
                return;
            }

            // Get audio duration using ffprobe for progress tracking
            const ffprobePath = findCommand('ffprobe');
            let audioDuration = 0;

            try {
                const durationOutput = execSync(
                    `${ffprobePath} -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`,
                    { encoding: 'utf8' }
                );
                audioDuration = parseFloat(durationOutput.trim());
                console.log('Audio duration for progress:', audioDuration, 'seconds');
            } catch (e) {
                console.warn('Could not get audio duration:', e.message);
            }

            // Run Whisper with word-level timestamps
            const whisperPath = findCommand('whisper');
            console.log('Using Whisper at:', whisperPath);

            const whisper = spawn(whisperPath, [
                audioPath,
                '--model', 'base',
                '--language', 'en',
                '--output_format', 'json',
                '--word_timestamps', 'True',
                '--output_dir', tempDir
            ]);

            let output = '';
            let lastProgress = 30; // Start at 30% (after audio extraction)
            let whisperStarted = false;
            let progressTimer = null;

            whisper.stderr.on('data', (data) => {
                const text = data.toString();
                output += text;
                console.log('Whisper:', text.trim());

                // Start simulated progress after Whisper begins (after FP16 warning)
                if (!whisperStarted && text.includes('FP16')) {
                    whisperStarted = true;

                    // Simulate progress based on estimated processing time
                    // Base model: ~0.5x realtime (43min video = ~21min processing)
                    const estimatedSeconds = audioDuration * 0.5;
                    const progressInterval = 2000; // Update every 2 seconds
                    const progressPerUpdate = (65 / (estimatedSeconds / 2)); // 65% spread over estimated time

                    console.log(`Starting simulated progress: ${estimatedSeconds}s estimated, ${progressPerUpdate}% per 2s`);

                    progressTimer = setInterval(() => {
                        if (lastProgress < 95) {
                            lastProgress = Math.min(95, lastProgress + progressPerUpdate);
                            event.sender.send('transcription-progress', {
                                progress: Math.round(lastProgress),
                                message: 'Transcribing with Whisper...'
                            });
                        }
                    }, progressInterval);
                }
            });

            whisper.stdout.on('data', (data) => {
                output += data.toString();
            });

            whisper.on('close', (code) => {
                // Clear progress timer
                if (progressTimer) {
                    clearInterval(progressTimer);
                    progressTimer = null;
                }

                if (code !== 0) {
                    reject(new Error('Whisper transcription failed'));
                    return;
                }

                // Send 100% progress
                event.sender.send('transcription-progress', {
                    progress: 100,
                    message: 'Transcription complete!'
                });

                // Read the JSON output from temp directory
                // Whisper names the JSON file based on the audio file name
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

        // Get video resolution using ffprobe
        const ffprobePath = findCommand('ffprobe');
        let videoWidth = 1920;
        let videoHeight = 1080;

        try {
            const probeOutput = execSync(
                `${ffprobePath} -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${videoPath}"`,
                { encoding: 'utf8' }
            );
            const [width, height] = probeOutput.trim().split(',').map(Number);
            if (width && height) {
                videoWidth = width;
                videoHeight = height;
                console.log(`Video resolution: ${videoWidth}x${videoHeight}`);
            }
        } catch (e) {
            console.warn('Could not get video resolution, using default 1920x1080:', e.message);
        }

        // Build ASS subtitle with karaoke timing
        const assContent = buildAssSubtitle(transcript.words, style, videoWidth, videoHeight);

        // Write ASS to temporary file
        const assPath = videoPath.replace(/\.[^.]+$/, '_captions.ass');
        fs.writeFileSync(assPath, assContent);
        console.log('ASS subtitle written to:', assPath);
        console.log('ASS content length:', assContent.length, 'bytes');

        const ffmpegPath = findCommand('ffmpeg');
        console.log('Using FFmpeg at:', ffmpegPath);

        // Escape the ASS path for use in FFmpeg filter string
        // Replace backslashes and colons which are special in filter strings
        const escapedAssPath = assPath.replace(/\\/g, '\\\\').replace(/:/g, '\\:');

        const ffmpeg = spawn(ffmpegPath, [
            '-i', videoPath,
            '-vf', `subtitles='${escapedAssPath}'`,
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
function buildAssSubtitle(words, style, videoWidth = 1920, videoHeight = 1080) {
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
PlayResX: ${videoWidth}
PlayResY: ${videoHeight}
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
