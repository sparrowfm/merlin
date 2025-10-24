# Building Merlin: A Word-by-Word Video Caption App with Zero Ongoing Costs

**Published:** October 23, 2025
**Author:** [Neel Ketkar](https://sparrowfm.github.io/sparrow/)

> **TL;DR:** I built Merlin, a desktop app that adds word-by-word captions to videos using Whisper AI and FFmpeg—all running locally with zero ongoing costs. This post covers the technical decisions, challenges solved, and lessons learned building a distributable Electron app in one development sprint.

---

## The Problem: Expensive SaaS for Simple Video Captions

Video captions have become table stakes for content creators. Word-by-word captions (where each word appears precisely when spoken) are especially popular on social media, but the existing solutions have major drawbacks:

- **Expensive SaaS subscriptions** - $20-50/month for services like Descript, Kapwing, or VEED
- **Privacy concerns** - Uploading videos to cloud servers
- **Usage limits** - Pay-per-minute or monthly quotas
- **Vendor lock-in** - Can't export your workflow

I wanted something different: a tool that runs entirely on your machine, with zero ongoing costs, that anyone can download and use immediately.

---

## The Solution: Local-First Desktop App

**Merlin** is an Electron app that combines three powerful open-source tools:

1. **Whisper** (OpenAI) - AI transcription with word-level timestamps
2. **FFmpeg** - Video processing and caption rendering
3. **Electron** - Cross-platform desktop app framework

The entire workflow runs locally:
1. Upload your video
2. Whisper transcribes with word-level precision
3. Style your captions in real-time preview
4. FFmpeg burns captions into the video
5. Download your captioned video

No cloud. No subscriptions. No ongoing costs.

---

## Architecture Decisions

### Decision 1: Electron vs. Web-Only

**The Question:** Should I build a web app or a desktop app?

**Web App Approach:**
- User installs FFmpeg manually (complex on Windows)
- User installs Python + Whisper (pip install)
- Configure PATH variables
- Build a local web server or Electron wrapper anyway

**Desktop App Approach:**
- Bundle everything in one installer
- User downloads DMG, drags to Applications
- Everything just works

**Verdict:** Electron was the clear winner for user experience. Yes, the bundle is larger (~250MB), but the alternative requires 30+ minutes of terminal commands for non-technical users.

**Trade-offs:**
- ✅ **Pros**: One-click install, offline-first, native file access
- ❌ **Cons**: Larger download, platform-specific builds required
- 🎯 **Decision**: Worth it—user experience is priority #1

---

### Decision 2: ASS Subtitles vs. FFmpeg Drawtext

**The Question:** How should I render word-by-word captions?

I tested two approaches:

**Option A: FFmpeg drawtext filter**
- Build complex filter chains for each word
- Calculate positions, timing, and fades manually
- Extremely difficult to debug

**Option B: ASS (Advanced SubStation Alpha) subtitles**
- Professional subtitle format with karaoke effects
- Built-in support for styling, timing, and positioning
- FFmpeg's `subtitles` filter handles rendering

**Example ASS subtitle for karaoke effect:**
```
Dialogue: 0,0:00:01.20,0:00:01.45,Default,,0,0,0,,{\k25}Hello
Dialogue: 0,0:00:01.45,0:00:01.89,Default,,0,0,0,,{\k44}world
```

The `{\k25}` syntax creates the precise timing—Whisper provides start/end times, and ASS handles the rest.

**Verdict:** ASS subtitles won by a landslide. Cleaner code, better debugging, industry-standard format.

---

### Decision 3: Native Whisper vs. Whisper.cpp

**The Question:** Should I bundle Python Whisper or use whisper.cpp (C++ port)?

**Python Whisper:**
- Official OpenAI implementation
- Requires Python runtime (~200MB)
- Proven, stable, well-documented

**whisper.cpp:**
- Faster C++ port
- No Python dependency
- Less mature, harder to integrate

**Verdict:** I chose Python Whisper for v0.1. It's battle-tested, and since we're already bundling Electron (~200MB), the Python dependency is acceptable. whisper.cpp would be a great optimization for v2.

---

## Technical Challenges

### Challenge 1: Caption Size Mismatch Between Preview and Export

**Problem:** Captions looked perfect in the preview but appeared tiny in the exported video.

**Root Cause:** ASS subtitles have a reference resolution (`PlayResX` and `PlayResY`) that must match the video resolution. I had hardcoded these to 1920x1080, but the test video was 640x360.

**Solution:**
1. Use `ffprobe` to detect video resolution:
```javascript
const probeOutput = execSync(
    `${ffprobePath} -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${videoPath}"`,
    { encoding: 'utf8' }
);
const [width, height] = probeOutput.trim().split(',').map(Number);
```

2. Set ASS resolution dynamically:
```javascript
PlayResX: ${videoWidth}
PlayResY: ${videoHeight}
```

**Time Spent:** 2 hours of debugging, 10 minutes to fix once I understood the issue.

**Learning:** Always test with multiple video resolutions. What works on 1080p might break on 360p.

---

### Challenge 2: FFmpeg Path Escaping for Special Characters

**Problem:** Export failed with error: `No such filter: 'Pal - YMH Studios (360p'`

The filename was: `Can AI Satisfy My Girlfriend  Not Today, Pal - YMH Studios (360p, h264).mp4`

**Root Cause:** FFmpeg's `subtitles` filter requires special character escaping. Spaces, colons, and backslashes break the filter string.

**Solution:** Escape the ASS file path before passing to FFmpeg:
```javascript
const escapedAssPath = assPath
    .replace(/\\/g, '\\\\')  // Escape backslashes
    .replace(/:/g, '\\:');    // Escape colons

const ffmpeg = spawn(ffmpegPath, [
    '-i', videoPath,
    '-vf', `subtitles='${escapedAssPath}'`,  // Wrap in single quotes
    '-c:a', 'copy',
    '-y',
    outputPath
]);
```

**Time Spent:** 1 hour of frustration, 5 minutes to fix.

**Learning:** Always test with filenames containing spaces, special characters, and Unicode. Users will upload videos named "My Trip to São Paulo! (2025).mp4" and expect it to work.

---

### Challenge 3: Progress Tracking Without Whisper API

**Problem:** Whisper doesn't provide progress callbacks—it just runs and outputs the result.

**Solution:** I estimated progress based on audio duration:
- Extract audio with FFmpeg (0-25% progress)
- Run Whisper (~30-95% progress, estimated at 0.5x realtime)
- Complete transcription (100%)

```javascript
// Estimate Whisper processing time (base model ~0.5x realtime)
const estimatedTime = audioDuration * 2;  // 2 seconds per 1 second of audio
const progressPerUpdate = 65 / (estimatedTime / (progressInterval / 1000));

progressTimer = setInterval(() => {
    if (lastProgress < 95) {
        lastProgress = Math.min(95, lastProgress + progressPerUpdate);
        event.sender.send('transcription-progress', {
            progress: Math.round(lastProgress),
            message: 'Transcribing with Whisper...'
        });
    }
}, progressInterval);
```

**Verdict:** Not perfect, but good enough for v0.1. Users get visual feedback instead of a frozen UI.

**Learning:** When you can't get real progress, estimate it. A slightly inaccurate progress bar is better than no progress bar.

---

## What Worked Well

### 1. Test-Driven Development with Puppeteer

I wrote 10 Puppeteer tests before building the UI, then implemented the UI to pass the tests. Benefits:

- Caught async/sync bugs early (wrong `expect()` helper function)
- Verified Sparrow aesthetic programmatically (colors, borders, fonts)
- Screenshots provide visual proof of design
- Regression testing for free

**Example test:**
```javascript
test('Caption styling controls exist and have correct defaults', async () => {
    const fontSize = await page.$eval('#fontSize', el => el.value);
    const fontColor = await page.$eval('#fontColor', el => el.value);
    expect(fontSize).toBe('32');
    expect(fontColor).toBe('#ffffff');
});
```

**Verdict:** TDD worked brilliantly for UI development. 100% of tests passed on first try after fixing the expect helper.

---

### 2. KISS Principle: Only 5 Styling Controls

I resisted the temptation to add 15+ controls (outline, shadow, rotation, animation, etc.) and stuck with exactly 5:

1. Font size
2. Font color
3. Background color
4. Background opacity
5. Position

**Result:** Clean, uncluttered UI. Advanced users can export the ASS file and edit it manually if needed.

**Learning:** Constraints breed creativity. Limiting controls forced me to choose sensible defaults.

---

### 3. Quick Style Templates

Instead of making users fiddle with controls, I added 6 one-click templates:
- Social Bold
- YouTube
- TikTok
- Podcast
- Minimalist
- Pro Clean

Each template is just a preset object:
```javascript
const templates = {
    'social-bold': {
        fontSize: 48,
        fontFamily: 'Impact',
        fontColor: '#ffffff',
        bgColor: '#000000',
        bgOpacity: 90,
        position: 'bottom'
    },
    // ...
};
```

**User feedback:** "I just clicked TikTok and it looked perfect immediately."

---

## Performance Results

**Tested on MacBook Pro M1 with 5-minute video (640x360):**

| Operation | Time | Notes |
|-----------|------|-------|
| Audio extraction | ~2 seconds | FFmpeg `-c copy` for speed |
| Whisper transcription | ~2.5 minutes | Base model, ~0.5x realtime |
| Caption rendering | ~5 minutes | FFmpeg burns captions to video |
| **Total** | **~7.5 minutes** | For 5-minute video |

**Accuracy:** ~95% word-level timestamp precision (Whisper base model)

**Scaling:** Linear. 10-minute video = ~15 minutes processing time.

---

## Lessons Learned

### For Technical Founders

1. **User experience beats technical purity**
   Bundling dependencies is "wasteful" but eliminates 30 minutes of setup frustration.

2. **Ship with constraints**
   Only 5 controls, Apple Silicon only, no code signing—these constraints let me ship v0.1 in days instead of months.

3. **Estimate when you can't measure**
   Whisper doesn't report progress, so I estimated it. Close enough is good enough for v0.1.

4. **Test with real-world data**
   Filenames with spaces, emojis, special characters—users will break your assumptions.

5. **Optimize later, if ever**
   7.5 minutes for a 5-minute video is acceptable. Don't optimize prematurely.

---

### For AI-Assisted Development

I built Merlin with Claude Code as my pair programmer. What worked:

- **Structured prompts**: "Write tests first, then implement"
- **Incremental changes**: Small commits, frequent testing
- **Code reviews**: I reviewed every line Claude wrote
- **Domain knowledge**: I understood FFmpeg, ASS, Electron—Claude accelerated implementation

**What didn't work:**
- Asking Claude to "figure out" complex FFmpeg filter chains (too many edge cases)
- Blindly accepting code without testing

**Verdict:** AI is a force multiplier, not a replacement. I still needed to understand the domain deeply.

---

## What's Next (If I Build V2)

### Features I'd Add

1. **Batch processing** - Queue multiple videos
2. **Animation effects** - Fade in/out, slide, bounce
3. **Multi-language support** - Whisper supports 99 languages
4. **Cloud sync** - Optional backup to S3/Dropbox
5. **Intel Mac builds** - Currently Apple Silicon only

### Optimizations

1. **whisper.cpp integration** - Faster transcription without Python
2. **GPU acceleration** - Use CUDA/Metal for rendering
3. **Streaming preview** - Real-time caption preview without full render
4. **Code signing** - Remove macOS Gatekeeper warning

---

## Try Merlin

**Download:** [github.com/sparrowfm/merlin/releases](https://github.com/sparrowfm/merlin/releases)
**Source Code:** [github.com/sparrowfm/merlin](https://github.com/sparrowfm/merlin)
**License:** MIT (free forever)

**Prerequisites:**
```bash
# macOS
brew install ffmpeg
pip install openai-whisper
```

Then download Merlin-0.1.0-arm64.dmg, drag to Applications, and start captioning.

---

## Closing Thoughts

Building Merlin taught me that "zero ongoing costs" is a viable business model for desktop apps. Not everything needs a subscription. Sometimes, a one-time download solves the problem better than a cloud service.

The tech stack (Whisper + FFmpeg + Electron) is accessible to any developer who can write JavaScript. The hard parts aren't the code—they're understanding user needs, making smart trade-offs, and shipping something imperfect but useful.

If you're building a similar tool, **ship v0.1 quickly**. Get it in users' hands. Learn what actually matters. Optimize later, if ever.

---

**Questions? Feedback?** Open an issue on [GitHub](https://github.com/sparrowfm/merlin/issues) or reach out at [sparrowfm.github.io/sparrow](https://sparrowfm.github.io/sparrow/).

*Precision captioning, frame by frame.*
