# Merlin

> **"Precision captioning, frame by frame."**

Add word-by-word captions to your videos with precision timing. Free, local processing, zero ongoing costs.

---

## ✨ Features

- 🎯 **Word-Level Precision** - Captions appear exactly when each word is spoken
- 🎨 **Customizable Styling** - Font size, colors, position, background opacity, quick templates
- ✏️ **Edit Inline** - Click any word to edit the transcript in real-time
- 🔒 **100% Private** - Everything runs locally on your machine
- 💰 **Zero Ongoing Costs** - No subscriptions, no cloud fees
- 🚀 **Fast Processing** - Powered by OpenAI Whisper and FFmpeg

---

## 🎯 Who Is This For?

- **Content Creators** who want professional captions without expensive SaaS
- **Podcasters** adding video versions with precise transcripts
- **Educators** creating accessible video content
- **Social Media Managers** adding trendy word-by-word captions
- **Anyone** who values privacy and wants to avoid recurring costs

---

## 📥 Installation

### Prerequisites

Before installing Merlin, you need to install Whisper and FFmpeg:

**Install FFmpeg:**
```bash
# macOS (Homebrew)
brew install ffmpeg

# Windows (Chocolatey)
choco install ffmpeg

# Linux (apt)
sudo apt install ffmpeg
```

**Install Whisper:**
```bash
# All platforms (via pip)
pip install -U openai-whisper

# macOS (Homebrew alternative)
brew install openai-whisper
```

### macOS

1. Download `Merlin-0.1.0-arm64.dmg` from [Releases](https://github.com/sparrowfm/merlin/releases)
2. Open the DMG file
3. Drag Merlin to Applications folder
4. Right-click Merlin and select "Open" (first time only, to bypass Gatekeeper)
5. Launch Merlin from Applications

**Note:** Currently only Apple Silicon (M1/M2/M3) builds are available. Intel builds coming soon.

### Windows & Linux

Windows and Linux builds are not yet available, but Electron supports cross-platform builds. If you'd like to help test Windows/Linux versions, please open an issue!

---

## 🚀 How to Use

### 1. Upload Your Video

Drag and drop your video file, or click "BROWSE FILES" to select it.

Supported formats: MP4, MOV, AVI, MKV, WebM

### 2. Transcribe

Click "START TRANSCRIPTION" and wait while Whisper generates word-level timestamps.

Processing time: ~1-2 minutes for a 5-minute video on modern hardware.

### 3. Style Your Captions

**Quick Templates:**
- Social Bold, YouTube, TikTok, Podcast, Minimalist, Pro Clean

**Manual Styling:**
- **Font Size** - 12px to 72px
- **Font Family** - Arial, Impact, Verdana, Georgia, and more
- **Font Color** - Any color (default: white)
- **Background Color** - Any color (default: black)
- **Background Opacity** - 0% to 100% (default: 80%)
- **Position** - Bottom, Top, or Middle

**Edit Transcript:**
- Click any word in the word chip editor to edit it
- Changes update in real-time in the preview

Preview your changes in real-time by playing the video!

### 4. Export

Click "RENDER & DOWNLOAD VIDEO" and wait for FFmpeg to burn the captions into your video.

Your new video will be saved with captions permanently embedded.

---

## 🛠️ Development

### Prerequisites

- Node.js 18+
- FFmpeg (installed globally)
- Whisper (installed globally)

### Setup

```bash
# Clone the repo
git clone https://github.com/sparrowfm/merlin.git
cd merlin

# Install dependencies
npm install

# Run in development mode
npm start

# Run tests
npm test

# Run tests with visible browser
npm run test:headed

# Build distributable
npm run build
```

### Installing Whisper & FFmpeg

**Mac (Homebrew):**
```bash
brew install ffmpeg
pip install openai-whisper
```

**Linux (apt):**
```bash
sudo apt install ffmpeg
pip install openai-whisper
```

**Windows:**
- FFmpeg: Download from [ffmpeg.org](https://ffmpeg.org/download.html)
- Whisper: `pip install openai-whisper`

---

## 🧪 Testing

Merlin uses a TDD (Test-Driven Development) approach with Puppeteer for E2E testing:

```bash
# Run all tests
npm test

# Run with visible browser (for debugging)
npm run test:headed

# Tests include:
# - UI rendering and Sparrow aesthetic
# - Upload interactions
# - Styling controls
# - Responsive design
# - Analytics integration
```

Screenshots are saved to `tests/screenshots/` for visual verification.

---

## 📊 Performance

**Tested on MacBook Pro M1:**
- Transcription: ~2 minutes for 5-minute video
- Rendering: ~3 minutes for 5-minute 1080p video
- Accuracy: ~95% word-level timestamp precision
- Bundle Size: ~250MB (includes Whisper base model + FFmpeg)

---

## 🎨 Design Philosophy

Merlin follows the **Sparrow Blog** aesthetic:
- **Bold Typography** - Arial Black headers, high contrast
- **Brutalist UI** - Thick borders, sharp corners, heavy shadows
- **Red & Yellow Accent** - (#e63946 and #ffb703)
- **KISS Principle** - Only 5 styling controls, no bloat

---

## 📝 License

MIT License - feel free to use, modify, and distribute!

---

## 🙏 Credits

- **Whisper** by OpenAI - [github.com/openai/whisper](https://github.com/openai/whisper)
- **FFmpeg** - [ffmpeg.org](https://ffmpeg.org)
- **Electron** - [electronjs.org](https://electronjs.org)
- **Design Inspiration** - [Sparrow Blog](https://sparrowfm.github.io/sparrow/)

---

## 🤝 Contributing

Pull requests welcome! This project is designed to be simple and maintainable:

1. Fork the repo
2. Create a feature branch
3. Write tests for your changes
4. Ensure tests pass: `npm test`
5. Submit a PR

---

## 📬 Support

- **Bug Reports** - [GitHub Issues](https://github.com/sparrowfm/merlin/issues)
- **Feature Requests** - [GitHub Discussions](https://github.com/sparrowfm/merlin/discussions)
- **Questions** - [@sparrowfm](https://github.com/sparrowfm)

---

**Made with ❤️ by [Neel Ketkar](https://sparrowfm.github.io/sparrow/)**

*Precision captioning, frame by frame.*
