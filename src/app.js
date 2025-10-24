/**
 * Merlin - UI Logic
 * Pure JavaScript, no Electron dependencies for testability
 */

// State
const state = {
    videoFile: null,
    transcript: null,
    currentTime: 0,
    captionStyle: {
        fontSize: 32,
        fontFamily: 'Arial',
        fontColor: '#ffffff',
        bgColor: '#000000',
        bgOpacity: 80,
        position: 'bottom'
    }
};

// Style Templates
const templates = {
    'social-bold': {
        fontSize: 48,
        fontFamily: 'Impact',
        fontColor: '#ffffff',
        bgColor: '#000000',
        bgOpacity: 90,
        position: 'bottom'
    },
    'youtube': {
        fontSize: 36,
        fontFamily: 'Verdana',
        fontColor: '#ffffff',
        bgColor: '#000000',
        bgOpacity: 75,
        position: 'bottom'
    },
    'podcast': {
        fontSize: 32,
        fontFamily: 'Georgia',
        fontColor: '#1a1a1a',
        bgColor: '#f5f5dc',
        bgOpacity: 85,
        position: 'top'
    },
    'tiktok': {
        fontSize: 42,
        fontFamily: 'Comic Sans MS',
        fontColor: '#ffffff',
        bgColor: '#ff0050',
        bgOpacity: 80,
        position: 'middle'
    },
    'minimalist': {
        fontSize: 24,
        fontFamily: 'Arial',
        fontColor: '#ffffff',
        bgColor: '#000000',
        bgOpacity: 50,
        position: 'bottom'
    },
    'professional': {
        fontSize: 32,
        fontFamily: 'Arial',
        fontColor: '#2c3e50',
        bgColor: '#ecf0f1',
        bgOpacity: 90,
        position: 'bottom'
    }
};

// DOM Elements
const elements = {
    uploadArea: document.getElementById('uploadArea'),
    videoInput: document.getElementById('videoInput'),
    browseBtn: document.getElementById('browseBtn'),
    uploadInfo: document.getElementById('uploadInfo'),
    filename: document.getElementById('filename'),
    filesize: document.getElementById('filesize'),

    previewSection: document.getElementById('previewSection'),
    videoPlayer: document.getElementById('videoPlayer'),
    captionCanvas: document.getElementById('captionCanvas'),
    transcriptEditor: document.getElementById('transcriptEditor'),
    wordChips: document.getElementById('wordChips'),

    autoOptimizeBtn: document.getElementById('autoOptimizeBtn'),
    fontSize: document.getElementById('fontSize'),
    fontSizeValue: document.getElementById('fontSizeValue'),
    fontFamily: document.getElementById('fontFamily'),
    fontColor: document.getElementById('fontColor'),
    fontColorValue: document.getElementById('fontColorValue'),
    bgColor: document.getElementById('bgColor'),
    bgColorValue: document.getElementById('bgColorValue'),
    bgOpacity: document.getElementById('bgOpacity'),
    bgOpacityValue: document.getElementById('bgOpacityValue'),
    captionPosition: document.getElementById('captionPosition'),

    transcribeSection: document.getElementById('transcribeSection'),
    transcribeBtn: document.getElementById('transcribeBtn'),
    progressContainer: document.getElementById('progressContainer'),
    progressLabel: document.getElementById('progressLabel'),
    progressFill: document.getElementById('progressFill'),
    progressStatus: document.getElementById('progressStatus'),
    spinnerContainer: document.getElementById('spinnerContainer'),
    spinnerLabel: document.getElementById('spinnerLabel'),
    spinnerHint: document.getElementById('spinnerHint'),

    exportSection: document.getElementById('exportSection'),
    exportBtn: document.getElementById('exportBtn'),
    exportProgress: document.getElementById('exportProgress'),
    exportLabel: document.getElementById('exportLabel'),
    exportFill: document.getElementById('exportFill'),
    exportStatus: document.getElementById('exportStatus')
};

// Initialize
function init() {
    setupEventListeners();
    console.log('Merlin initialized');
}

// Event Listeners
function setupEventListeners() {
    // Upload handlers
    elements.browseBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent click from bubbling to uploadArea
        elements.videoInput.click();
    });
    elements.videoInput.addEventListener('change', handleFileSelect);
    elements.uploadArea.addEventListener('click', () => elements.videoInput.click());

    // Drag and drop
    elements.uploadArea.addEventListener('dragover', handleDragOver);
    elements.uploadArea.addEventListener('dragleave', handleDragLeave);
    elements.uploadArea.addEventListener('drop', handleDrop);

    // Video player
    elements.videoPlayer.addEventListener('timeupdate', handleTimeUpdate);
    elements.videoPlayer.addEventListener('loadedmetadata', handleVideoLoaded);

    // Styling controls
    elements.autoOptimizeBtn.addEventListener('click', autoOptimizeStyle);

    // Template buttons
    document.querySelectorAll('.template-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const templateName = btn.dataset.template;
            applyTemplate(templateName);

            // Update active state
            document.querySelectorAll('.template-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    elements.fontSize.addEventListener('input', updateFontSize);
    elements.fontFamily.addEventListener('change', updateFontFamily);
    elements.fontColor.addEventListener('input', updateFontColor);
    elements.bgColor.addEventListener('input', updateBgColor);
    elements.bgOpacity.addEventListener('input', updateBgOpacity);
    elements.captionPosition.addEventListener('change', updatePosition);

    // Transcription
    elements.transcribeBtn.addEventListener('click', startTranscription);

    // Export
    elements.exportBtn.addEventListener('click', startExport);
}

// File handling
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
        loadVideo(file);
    }
}

function handleDragOver(e) {
    e.preventDefault();
    elements.uploadArea.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('drag-over');

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
        loadVideo(file);
    }
}

function loadVideo(file) {
    // Reset state from any previous video
    resetAppState();

    state.videoFile = file;

    // Update upload UI
    elements.filename.textContent = file.name;
    elements.filesize.textContent = formatFileSize(file.size);
    elements.uploadInfo.style.display = 'block';

    // Load video into player (but don't show preview section yet)
    const url = URL.createObjectURL(file);
    elements.videoPlayer.src = url;

    // Show transcription section (step 2)
    elements.transcribeSection.style.display = 'block';

    console.log('Video loaded:', file.name, formatFileSize(file.size));
}

function resetAppState() {
    // Clear transcript state
    state.transcript = null;
    state.currentTime = 0;

    // Reset transcript button
    elements.transcribeBtn.textContent = 'START TRANSCRIPTION';
    elements.transcribeBtn.disabled = false;

    // Hide sections that appear after transcription
    elements.previewSection.style.display = 'none';
    elements.transcriptEditor.style.display = 'none';
    elements.exportSection.style.display = 'none';
    elements.transcribeSection.style.display = 'none';

    // Clear upload info display
    elements.uploadInfo.style.display = 'none';
    elements.filename.textContent = '';
    elements.filesize.textContent = '';

    // Clear progress UI
    elements.progressContainer.style.display = 'none';
    elements.progressFill.style.width = '0%';
    elements.progressStatus.textContent = '0%';
    elements.spinnerContainer.style.display = 'none';

    // Clear export progress
    elements.exportProgress.style.display = 'none';
    elements.exportFill.style.width = '0%';
    elements.exportStatus.textContent = '0%';
    elements.exportBtn.textContent = '⬇ RENDER & DOWNLOAD VIDEO';
    elements.exportBtn.disabled = false;

    // Clear transcript editor
    elements.wordChips.innerHTML = '';

    // Clear video player
    if (elements.videoPlayer.src) {
        elements.videoPlayer.pause();
        elements.videoPlayer.currentTime = 0;
        elements.videoPlayer.src = '';
    }

    // Clear canvas
    const ctx = elements.captionCanvas.getContext('2d');
    ctx.clearRect(0, 0, elements.captionCanvas.width, elements.captionCanvas.height);

    // Reset file input to allow same file to be selected again
    elements.videoInput.value = '';

    console.log('App state reset for new video');
}

function handleVideoLoaded() {
    // Setup canvas with same dimensions as video
    const video = elements.videoPlayer;
    const canvas = elements.captionCanvas;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Set wrapper aspect ratio dynamically to match video
    const wrapper = video.parentElement;
    const aspectRatio = (video.videoHeight / video.videoWidth) * 100;
    wrapper.style.paddingBottom = aspectRatio + '%';
    wrapper.style.height = '0'; // Required for padding-bottom trick

    console.log('Video metadata loaded:', video.videoWidth, 'x', video.videoHeight, video.duration + 's', 'aspect ratio:', aspectRatio.toFixed(2) + '%');

    // Auto-start transcription
    console.log('Auto-starting transcription...');
    startTranscription();
}

function handleTimeUpdate() {
    state.currentTime = elements.videoPlayer.currentTime;
    drawCaptions();
}

// Caption drawing (karaoke-style with context)
function drawCaptions() {
    const canvas = elements.captionCanvas;
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get current word index and surrounding context
    const { currentIndex, words } = getCurrentWordWithContext(state.currentTime);
    if (currentIndex === -1 || !words || words.length === 0) return;

    // Configuration
    const fontSize = state.captionStyle.fontSize;
    const wordsToShow = 5; // Show 5 words at a time (current + 2 before + 2 after)
    const wordSpacing = 15; // Space between words

    // Calculate word range to display
    const startIdx = Math.max(0, currentIndex - 2);
    const endIdx = Math.min(words.length, currentIndex + 3);
    const displayWords = words.slice(startIdx, endIdx);

    // Setup text style
    const fontFamily = state.captionStyle.fontFamily;
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Calculate total width of all words
    let totalWidth = 0;
    const wordWidths = displayWords.map(word => {
        const metrics = ctx.measureText(word.word);
        return metrics.width;
    });
    totalWidth = wordWidths.reduce((a, b) => a + b, 0) + (wordSpacing * (displayWords.length - 1));

    // Calculate position
    const centerX = canvas.width / 2;
    let y;

    switch (state.captionStyle.position) {
        case 'top':
            y = canvas.height * 0.15;
            break;
        case 'middle':
            y = canvas.height * 0.5;
            break;
        case 'bottom':
        default:
            y = canvas.height * 0.85;
            break;
    }

    // Draw background for all words
    const padding = 20;
    const bgOpacity = state.captionStyle.bgOpacity / 100;
    const textHeight = fontSize;
    ctx.fillStyle = hexToRgba(state.captionStyle.bgColor, bgOpacity);
    ctx.fillRect(
        centerX - totalWidth / 2 - padding,
        y - textHeight / 2 - padding,
        totalWidth + padding * 2,
        textHeight + padding * 2
    );

    // Draw each word
    let currentX = centerX - totalWidth / 2;

    displayWords.forEach((word, idx) => {
        const wordWidth = wordWidths[idx];
        const wordCenterX = currentX + wordWidth / 2;
        const isCurrentWord = (startIdx + idx) === currentIndex;

        // Highlight current word
        if (isCurrentWord) {
            // Draw highlight background for current word
            ctx.fillStyle = hexToRgba(state.captionStyle.fontColor, 0.2);
            ctx.fillRect(
                wordCenterX - wordWidth / 2 - 5,
                y - textHeight / 2 - 5,
                wordWidth + 10,
                textHeight + 10
            );

            // Draw current word in full color
            ctx.fillStyle = state.captionStyle.fontColor;
            ctx.font = `bold ${fontSize}px ${fontFamily}`;
        } else {
            // Draw other words dimmed
            ctx.fillStyle = hexToRgba(state.captionStyle.fontColor, 0.5);
            ctx.font = `${fontSize}px ${fontFamily}`; // Not bold
        }

        ctx.fillText(word.word, wordCenterX, y);

        // Move to next word position
        currentX += wordWidth + wordSpacing;
    });
}

function getCurrentWord(currentTime) {
    if (!state.transcript || !state.transcript.words) return null;

    // Find word at current time
    for (const word of state.transcript.words) {
        if (currentTime >= word.start && currentTime <= word.end) {
            return word;
        }
    }

    return null;
}

function getCurrentWordWithContext(currentTime) {
    if (!state.transcript || !state.transcript.words) {
        return { currentIndex: -1, words: [] };
    }

    const words = state.transcript.words;

    // Find current word index
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (currentTime >= word.start && currentTime <= word.end) {
            return {
                currentIndex: i,
                words: words
            };
        }
    }

    // If we're between words, find the nearest word to avoid jumpiness
    // Show the most recently spoken word (or upcoming word if before first)

    // Before first word - show first word
    if (currentTime < words[0].start) {
        return {
            currentIndex: 0,
            words: words
        };
    }

    // After last word - show last word
    if (currentTime > words[words.length - 1].end) {
        return {
            currentIndex: words.length - 1,
            words: words
        };
    }

    // Between words - find the most recent word that has finished
    for (let i = words.length - 1; i >= 0; i--) {
        if (currentTime >= words[i].end) {
            return {
                currentIndex: i,
                words: words
            };
        }
    }

    // Fallback (shouldn't reach here)
    return { currentIndex: 0, words: words };
}

// Styling controls
function applyTemplate(templateName) {
    const template = templates[templateName];
    if (!template) {
        console.error('Template not found:', templateName);
        return;
    }

    console.log('Applying template:', templateName, template);

    // Apply all template settings
    state.captionStyle.fontSize = template.fontSize;
    state.captionStyle.fontFamily = template.fontFamily;
    state.captionStyle.fontColor = template.fontColor;
    state.captionStyle.bgColor = template.bgColor;
    state.captionStyle.bgOpacity = template.bgOpacity;
    state.captionStyle.position = template.position;

    // Update UI controls to reflect template settings
    elements.fontSize.value = template.fontSize;
    elements.fontSizeValue.textContent = template.fontSize + 'px';
    elements.fontFamily.value = template.fontFamily;
    elements.fontColor.value = template.fontColor;
    elements.fontColorValue.textContent = template.fontColor;
    elements.bgColor.value = template.bgColor;
    elements.bgColorValue.textContent = template.bgColor;
    elements.bgOpacity.value = template.bgOpacity;
    elements.bgOpacityValue.textContent = template.bgOpacity + '%';
    elements.captionPosition.value = template.position;

    // Redraw captions with new style
    drawCaptions();

    console.log('Template applied successfully');
}

function updateFontSize(e) {
    state.captionStyle.fontSize = parseInt(e.target.value);
    elements.fontSizeValue.textContent = e.target.value + 'px';
    drawCaptions();
}

function updateFontFamily(e) {
    state.captionStyle.fontFamily = e.target.value;
    drawCaptions();
}

function updateFontColor(e) {
    state.captionStyle.fontColor = e.target.value;
    elements.fontColorValue.textContent = e.target.value;
    drawCaptions();
}

function updateBgColor(e) {
    state.captionStyle.bgColor = e.target.value;
    elements.bgColorValue.textContent = e.target.value;
    drawCaptions();
}

function updateBgOpacity(e) {
    state.captionStyle.bgOpacity = parseInt(e.target.value);
    elements.bgOpacityValue.textContent = e.target.value + '%';
    drawCaptions();
}

function updatePosition(e) {
    state.captionStyle.position = e.target.value;
    drawCaptions();
}

// Transcription
async function startTranscription() {
    if (!state.videoFile) {
        alert('Please upload a video first');
        return;
    }

    elements.transcribeBtn.disabled = true;

    // Show progress bar instead of spinner
    elements.progressContainer.style.display = 'block';
    elements.progressLabel.textContent = 'Starting transcription...';
    elements.progressFill.style.width = '0%';
    elements.progressStatus.textContent = '0%';

    // Check if Electron API is available
    if (!window.electronAPI) {
        console.warn('Electron API not available - using mock transcription for testing');
        mockTranscription();
        return;
    }

    try {
        console.log('Starting Whisper transcription...');

        // Create temporary file path for video
        const videoPath = state.videoFile.path || URL.createObjectURL(state.videoFile);

        // Listen for progress updates with real percentages
        window.electronAPI.onTranscriptionProgress((data) => {
            console.log('Transcription progress:', data);
            if (data.progress !== undefined) {
                // Update progress bar with real percentage
                elements.progressFill.style.width = data.progress + '%';
                elements.progressStatus.textContent = data.progress + '%';
                elements.progressLabel.textContent = data.message || 'Transcribing...';
            }
        });

        // Call Whisper via Electron IPC
        const transcript = await window.electronAPI.transcribeVideo(videoPath);

        console.log('Transcription complete:', transcript.words.length, 'words');
        state.transcript = transcript;

        // Update UI
        elements.transcribeBtn.textContent = `✓ ${transcript.words.length} WORDS TRANSCRIBED`;

        // Show preview section (step 3)
        elements.previewSection.style.display = 'block';

        // Render transcript editor
        renderTranscriptEditor();
        elements.transcriptEditor.style.display = 'block';

        // Show export section (step 4) - user can export after previewing
        elements.exportSection.style.display = 'block';

        // Clean up listeners
        window.electronAPI.removeProgressListeners();

        // Hide progress bar after completion
        setTimeout(() => {
            elements.progressContainer.style.display = 'none';
            elements.transcribeBtn.disabled = false;
        }, 2000);

    } catch (error) {
        console.error('Transcription failed:', error);
        alert('Transcription failed: ' + error.message);

        elements.transcribeBtn.disabled = false;
        elements.transcribeBtn.textContent = 'RETRY TRANSCRIPTION';
        elements.progressContainer.style.display = 'none';
    }
}

// Mock transcription for testing without Electron
function mockTranscription() {
    console.log('Using mock transcription for testing...');

    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        elements.progressFill.style.width = progress + '%';
        elements.progressStatus.textContent = progress + '%';

        if (progress >= 100) {
            clearInterval(interval);
            onTranscriptionComplete();
        }
    }, 200);
}

function onTranscriptionComplete() {
    console.log('Transcription complete');

    // Mock transcript data
    state.transcript = {
        words: [
            { word: 'Hello', start: 0.0, end: 0.5 },
            { word: 'world', start: 0.5, end: 1.0 },
            { word: 'this', start: 1.0, end: 1.3 },
            { word: 'is', start: 1.3, end: 1.5 },
            { word: 'Merlin', start: 1.5, end: 2.0 }
        ]
    };

    elements.transcribeBtn.textContent = '✓ TRANSCRIPTION COMPLETE';

    // Show preview section
    elements.previewSection.style.display = 'block';

    // Render transcript editor
    renderTranscriptEditor();
    elements.transcriptEditor.style.display = 'block';

    elements.exportSection.style.display = 'block';

    // Reset progress after delay
    setTimeout(() => {
        elements.progressContainer.style.display = 'none';
        elements.transcribeBtn.disabled = false;
    }, 1000);
}

// Export
async function startExport() {
    if (!state.transcript) {
        alert('Please transcribe the video first');
        return;
    }

    elements.exportBtn.disabled = true;
    elements.exportProgress.style.display = 'block';
    elements.exportLabel.textContent = 'Rendering video with captions...';

    // Check if Electron API is available
    if (!window.electronAPI) {
        console.warn('Electron API not available - using mock export for testing');
        mockExport();
        return;
    }

    try {
        console.log('Starting FFmpeg rendering...');

        // Get video duration for progress calculation
        const videoDuration = elements.videoPlayer.duration || 1;

        // Create output path
        const videoPath = state.videoFile.path;
        const outputPath = videoPath.replace(/\.[^.]+$/, '_captioned.mp4');

        // Listen for render progress
        window.electronAPI.onRenderProgress((data) => {
            if (data.seconds) {
                const progress = Math.min(100, (data.seconds / videoDuration) * 100);
                elements.exportFill.style.width = progress + '%';
                elements.exportStatus.textContent = Math.round(progress) + '%';
            }
            console.log('Render progress:', data.message);
        });

        // Call FFmpeg via Electron IPC
        const result = await window.electronAPI.renderVideo({
            videoPath: videoPath,
            transcript: state.transcript,
            style: state.captionStyle,
            outputPath: outputPath
        });

        console.log('Rendering complete:', result.outputPath);

        // Update UI
        elements.exportFill.style.width = '100%';
        elements.exportStatus.textContent = '100%';
        elements.exportBtn.textContent = '✓ VIDEO SAVED';
        elements.exportLabel.textContent = `Saved to: ${result.outputPath}`;

        // Clean up listeners
        window.electronAPI.removeProgressListeners();

        // Reset after delay
        setTimeout(() => {
            elements.exportProgress.style.display = 'none';
            elements.exportBtn.disabled = false;
            elements.exportBtn.textContent = '⬇ RENDER & DOWNLOAD VIDEO';
        }, 5000);

    } catch (error) {
        console.error('Export failed:', error);
        alert('Export failed: ' + error.message);

        elements.exportBtn.disabled = false;
        elements.exportBtn.textContent = 'RETRY EXPORT';
        elements.exportProgress.style.display = 'none';
    }
}

// Mock export for testing without Electron
function mockExport() {
    console.log('Using mock export for testing...');

    let progress = 0;
    const interval = setInterval(() => {
        progress += 2;
        elements.exportFill.style.width = progress + '%';
        elements.exportStatus.textContent = progress + '%';

        if (progress >= 100) {
            clearInterval(interval);
            onExportComplete();
        }
    }, 100);
}

function onExportComplete() {
    console.log('Export complete');

    elements.exportBtn.textContent = '✓ VIDEO EXPORTED';

    // Reset after delay
    setTimeout(() => {
        elements.exportProgress.style.display = 'none';
        elements.exportBtn.disabled = false;
        elements.exportBtn.textContent = '⬇ RENDER & DOWNLOAD VIDEO';
    }, 2000);
}

// Transcript Editor
function renderTranscriptEditor() {
    if (!state.transcript || !state.transcript.words) return;

    elements.wordChips.innerHTML = '';

    state.transcript.words.forEach((wordObj, index) => {
        const chip = document.createElement('div');
        chip.className = 'word-chip';
        chip.textContent = wordObj.word;
        chip.dataset.index = index;

        chip.addEventListener('click', () => {
            makeWordEditable(chip, index);
        });

        elements.wordChips.appendChild(chip);
    });

    console.log('Transcript editor rendered:', state.transcript.words.length, 'words');
}

function makeWordEditable(chip, index) {
    // Prevent double-editing
    if (chip.classList.contains('editing')) return;

    const currentWord = chip.textContent;
    chip.classList.add('editing');
    chip.innerHTML = '';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentWord;
    input.style.width = (currentWord.length + 2) + 'ch';

    chip.appendChild(input);
    input.focus();
    input.select();

    function saveEdit() {
        const newWord = input.value.trim();

        if (newWord && newWord !== currentWord) {
            // Update state
            state.transcript.words[index].word = newWord;
            console.log(`Updated word ${index}: "${currentWord}" → "${newWord}"`);

            // Redraw captions to reflect change
            drawCaptions();
        }

        // Restore chip
        chip.classList.remove('editing');
        chip.innerHTML = '';
        chip.textContent = newWord || currentWord;
    }

    input.addEventListener('blur', saveEdit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveEdit();
        } else if (e.key === 'Escape') {
            chip.classList.remove('editing');
            chip.innerHTML = '';
            chip.textContent = currentWord;
        }
    });

    // Auto-adjust input width as user types
    input.addEventListener('input', () => {
        input.style.width = (input.value.length + 2) + 'ch';
    });
}

// Auto-Optimize Style
async function autoOptimizeStyle() {
    const video = elements.videoPlayer;

    if (!video || !video.videoWidth) {
        alert('Please load a video first');
        return;
    }

    console.log('Auto-optimizing caption style...');
    elements.autoOptimizeBtn.textContent = '⏳ ANALYZING...';
    elements.autoOptimizeBtn.disabled = true;

    // Sample video at 3 different points
    const sampleTimes = [
        video.duration * 0.2,  // 20% in
        video.duration * 0.5,  // Middle
        video.duration * 0.8   // 80% in
    ];

    const frameAnalysis = [];

    for (const time of sampleTimes) {
        video.currentTime = time;
        await new Promise(resolve => {
            video.addEventListener('seeked', resolve, { once: true });
        });

        // Give a moment for the frame to render
        await new Promise(resolve => setTimeout(resolve, 100));

        // Analyze this frame
        const analysis = analyzeVideoFrame(video);
        frameAnalysis.push(analysis);
    }

    // Aggregate analysis from all frames
    const avgBrightness = frameAnalysis.reduce((sum, a) => sum + a.brightness, 0) / frameAnalysis.length;

    // Determine best position based on where there's less visual activity
    const topActivity = frameAnalysis.reduce((sum, a) => sum + a.topActivity, 0) / frameAnalysis.length;
    const bottomActivity = frameAnalysis.reduce((sum, a) => sum + a.bottomActivity, 0) / frameAnalysis.length;

    let suggestedPosition;
    if (topActivity < bottomActivity) {
        suggestedPosition = 'top';
    } else if (bottomActivity < topActivity) {
        suggestedPosition = 'bottom';
    } else {
        suggestedPosition = 'bottom'; // Default to bottom for ties
    }

    // Get dominant colors from middle frame
    const dominantColor = frameAnalysis[1].dominantColor;

    // Choose contrasting colors
    const isVideoDark = avgBrightness < 128;
    const suggestedFontColor = isVideoDark ? '#ffffff' : '#000000';
    const suggestedBgColor = isVideoDark ? '#000000' : '#ffffff';

    // Font size based on video height
    let suggestedFontSize;
    if (video.videoHeight >= 1080) {
        suggestedFontSize = 48;
    } else if (video.videoHeight >= 720) {
        suggestedFontSize = 36;
    } else if (video.videoHeight >= 480) {
        suggestedFontSize = 28;
    } else {
        suggestedFontSize = 20;
    }

    // Font based on aspect ratio
    const aspectRatio = video.videoWidth / video.videoHeight;
    let suggestedFont;
    if (aspectRatio < 1) {
        // Portrait - use bold Impact for social media style
        suggestedFont = 'Impact';
    } else if (aspectRatio > 1.5) {
        // Wide landscape - use clean Arial
        suggestedFont = 'Arial';
    } else {
        // Near square or standard - use Verdana for readability
        suggestedFont = 'Verdana';
    }

    // Apply suggestions
    state.captionStyle.fontSize = suggestedFontSize;
    state.captionStyle.fontFamily = suggestedFont;
    state.captionStyle.fontColor = suggestedFontColor;
    state.captionStyle.bgColor = suggestedBgColor;
    state.captionStyle.bgOpacity = 80;
    state.captionStyle.position = suggestedPosition;

    // Update UI controls
    elements.fontSize.value = suggestedFontSize;
    elements.fontSizeValue.textContent = suggestedFontSize + 'px';
    elements.fontFamily.value = suggestedFont;
    elements.fontColor.value = suggestedFontColor;
    elements.fontColorValue.textContent = suggestedFontColor;
    elements.bgColor.value = suggestedBgColor;
    elements.bgColorValue.textContent = suggestedBgColor;
    elements.bgOpacity.value = 80;
    elements.bgOpacityValue.textContent = '80%';
    elements.captionPosition.value = suggestedPosition;

    // Redraw captions
    drawCaptions();

    console.log('Optimized settings:', {
        fontSize: suggestedFontSize,
        fontFamily: suggestedFont,
        position: suggestedPosition,
        avgBrightness: avgBrightness.toFixed(1),
        topActivity: topActivity.toFixed(1),
        bottomActivity: bottomActivity.toFixed(1)
    });

    elements.autoOptimizeBtn.textContent = '✨ AUTO-OPTIMIZE STYLE';
    elements.autoOptimizeBtn.disabled = false;
}

function analyzeVideoFrame(video) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Use a small canvas for faster analysis
    canvas.width = 320;
    canvas.height = 180;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    let totalBrightness = 0;
    let r = 0, g = 0, b = 0;

    // Analyze top 1/3 and bottom 1/3 separately
    let topActivity = 0;
    let bottomActivity = 0;

    const pixelCount = pixels.length / 4;
    const topThird = Math.floor(canvas.height / 3);
    const bottomThird = canvas.height - topThird;

    for (let i = 0; i < pixels.length; i += 4) {
        const pixelR = pixels[i];
        const pixelG = pixels[i + 1];
        const pixelB = pixels[i + 2];

        // Calculate brightness (perceived luminance)
        const brightness = 0.299 * pixelR + 0.587 * pixelG + 0.114 * pixelB;
        totalBrightness += brightness;

        // Sum RGB for dominant color
        r += pixelR;
        g += pixelG;
        b += pixelB;

        // Calculate activity (variance in brightness) for top and bottom regions
        const y = Math.floor((i / 4) / canvas.width);
        const variance = Math.abs(brightness - 128); // Distance from mid-gray

        if (y < topThird) {
            topActivity += variance;
        } else if (y > bottomThird) {
            bottomActivity += variance;
        }
    }

    const avgBrightness = totalBrightness / pixelCount;
    const avgR = Math.floor(r / pixelCount);
    const avgG = Math.floor(g / pixelCount);
    const avgB = Math.floor(b / pixelCount);

    return {
        brightness: avgBrightness,
        dominantColor: `rgb(${avgR}, ${avgG}, ${avgB})`,
        topActivity: topActivity / (canvas.width * topThird),
        bottomActivity: bottomActivity / (canvas.width * topThird)
    };
}

// Utilities
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        state,
        loadVideo,
        getCurrentWord,
        formatFileSize,
        hexToRgba
    };
}
