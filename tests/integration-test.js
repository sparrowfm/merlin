/**
 * Merlin - Integration Test
 * Test Whisper + FFmpeg pipeline directly
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const testVideoPath = path.join(__dirname, 'fixtures', 'test-video.mp4');
const outputDir = path.join(__dirname, 'output');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

console.log('\n🧪 Merlin Integration Test\n');
console.log('='.repeat(50));

// Test 1: Verify test video exists
console.log('\n📹 Test 1: Verify test video exists');
if (fs.existsSync(testVideoPath)) {
    const stats = fs.statSync(testVideoPath);
    console.log(`✅ PASS: Test video found (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
} else {
    console.log('❌ FAIL: Test video not found');
    process.exit(1);
}

// Test 2: Extract audio with FFmpeg
console.log('\n🎵 Test 2: Extract audio with FFmpeg');
const audioPath = path.join(outputDir, 'test-audio.wav');

const ffmpegExtract = spawn('ffmpeg', [
    '-i', testVideoPath,
    '-ar', '16000',  // Whisper expects 16kHz
    '-ac', '1',      // Mono
    '-y',            // Overwrite
    audioPath
]);

let ffmpegOutput = '';
ffmpegExtract.stderr.on('data', (data) => {
    ffmpegOutput += data.toString();
});

ffmpegExtract.on('close', (code) => {
    if (code === 0 && fs.existsSync(audioPath)) {
        const stats = fs.statSync(audioPath);
        console.log(`✅ PASS: Audio extracted (${(stats.size / 1024).toFixed(2)} KB)`);

        // Test 3: Run Whisper transcription
        runWhisperTest();
    } else {
        console.log('❌ FAIL: Audio extraction failed');
        console.log('FFmpeg output:', ffmpegOutput);
        process.exit(1);
    }
});

function runWhisperTest() {
    console.log('\n🎤 Test 3: Transcribe with Whisper (this may take 1-2 minutes)');

    const startTime = Date.now();

    const whisper = spawn('whisper', [
        audioPath,
        '--model', 'base',
        '--language', 'en',
        '--output_format', 'json',
        '--word_timestamps', 'True',
        '--output_dir', outputDir
    ]);

    let whisperOutput = '';

    whisper.stdout.on('data', (data) => {
        whisperOutput += data.toString();
        process.stdout.write('.');
    });

    whisper.stderr.on('data', (data) => {
        whisperOutput += data.toString();
    });

    whisper.on('close', (code) => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(''); // New line after dots

        if (code === 0) {
            const jsonPath = path.join(outputDir, 'test-audio.json');

            if (fs.existsSync(jsonPath)) {
                const transcript = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

                // Extract word-level timestamps
                let wordCount = 0;
                for (const segment of transcript.segments) {
                    if (segment.words) {
                        wordCount += segment.words.length;
                    }
                }

                console.log(`✅ PASS: Transcription complete in ${duration}s`);
                console.log(`   Words detected: ${wordCount}`);
                console.log(`   Segments: ${transcript.segments.length}`);

                if (wordCount > 0) {
                    console.log(`   Sample: "${transcript.segments[0].words[0].word}" at ${transcript.segments[0].words[0].start}s`);
                }

                // Test 4: Render with FFmpeg
                renderVideoTest(transcript, duration);
            } else {
                console.log('❌ FAIL: Whisper JSON output not found');
                process.exit(1);
            }
        } else {
            console.log(`❌ FAIL: Whisper transcription failed (code ${code})`);
            console.log('Output:', whisperOutput);
            process.exit(1);
        }
    });
}

function renderVideoTest(transcript, transcriptionTime) {
    console.log('\n🎬 Test 4: Render video with captions');

    // Generate SRT file
    const srtPath = path.join(outputDir, 'captions.srt');
    let srtContent = '';
    let index = 1;

    for (const segment of transcript.segments) {
        if (segment.words) {
            for (const word of segment.words) {
                const start = formatSRTTime(word.start);
                const end = formatSRTTime(word.end);

                srtContent += `${index}\n`;
                srtContent += `${start} --> ${end}\n`;
                srtContent += `${word.word.trim()}\n\n`;

                index++;
            }
        }
    }

    fs.writeFileSync(srtPath, srtContent);
    console.log(`   Generated SRT: ${index - 1} word-level captions`);

    // Render with FFmpeg
    const outputPath = path.join(outputDir, 'test-output.mp4');
    const startTime = Date.now();

    const subtitlesFilter = `subtitles=${srtPath}:force_style='FontSize=32,PrimaryColour=&HFFFFFF,BackColour=&H000000,BorderStyle=1,Outline=0,Shadow=0,MarginV=50,Alignment=2'`;

    const ffmpegRender = spawn('ffmpeg', [
        '-i', testVideoPath,
        '-vf', subtitlesFilter,
        '-c:a', 'copy',
        '-y',
        outputPath
    ]);

    let renderOutput = '';

    ffmpegRender.stderr.on('data', (data) => {
        renderOutput += data.toString();

        // Parse progress
        const timeMatch = renderOutput.match(/time=(\d{2}):(\d{2}):(\d{2})/);
        if (timeMatch) {
            const seconds = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]);
            process.stdout.write(`\r   Progress: ${seconds}s processed`);
        }
    });

    ffmpegRender.on('close', (code) => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(''); // New line

        if (code === 0 && fs.existsSync(outputPath)) {
            const stats = fs.statSync(outputPath);
            console.log(`✅ PASS: Video rendered in ${duration}s`);
            console.log(`   Output: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

            // Summary
            printSummary(transcriptionTime, duration, stats.size);

            // Cleanup
            cleanup();

            process.exit(0);
        } else {
            console.log(`❌ FAIL: Video rendering failed (code ${code})`);
            console.log('FFmpeg output:', renderOutput.slice(-500)); // Last 500 chars
            process.exit(1);
        }
    });
}

function formatSRTTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${String(hours).padStart(2, '0')}:` +
        `${String(minutes).padStart(2, '0')}:` +
        `${String(secs).padStart(2, '0')},` +
        `${String(ms).padStart(3, '0')}`;
}

function printSummary(transcriptionTime, renderTime, outputSize) {
    console.log('\n' + '='.repeat(50));
    console.log('\n📊 Performance Summary\n');
    console.log(`Transcription time: ${transcriptionTime}s`);
    console.log(`Rendering time: ${renderTime}s`);
    console.log(`Total time: ${(parseFloat(transcriptionTime) + parseFloat(renderTime)).toFixed(1)}s`);
    console.log(`Output size: ${(outputSize / 1024 / 1024).toFixed(2)} MB`);
    console.log('\n✅ All tests passed!\n');
}

function cleanup() {
    console.log('🧹 Cleaning up temporary files...');
    try {
        const tempFiles = [
            path.join(outputDir, 'test-audio.wav'),
            path.join(outputDir, 'test-audio.json'),
            path.join(outputDir, 'captions.srt')
        ];

        tempFiles.forEach(file => {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
            }
        });

        console.log('✓ Cleanup complete');
    } catch (e) {
        console.log('⚠ Cleanup warning:', e.message);
    }
}
